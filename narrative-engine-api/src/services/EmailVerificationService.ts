import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import type { BusinessConfigService } from './BusinessConfigService.js';
import type { AccessGateService } from './AccessGateService.js';
import type { PipelineService } from './PipelineService.js';
import { apiError, emailDomain, isConsumerDomain } from '../lib/apiError.js';
import { buildMagicLinkRedirect } from '../lib/magicLinkRedirect.js';
import { sha256 } from '../utils/hash.js';

export class EmailVerificationService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
    private readonly config: BusinessConfigService,
    private readonly access: AccessGateService,
    private readonly pipeline?: PipelineService,
  ) {}

  async requestVerification(runId: string, email: string, opts?: { resend?: boolean }) {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw apiError('invalid_email_format', 'Invalid email format', {
        userMessage: "That doesn't look like a valid email address.",
        retryable: true,
        recoveryActions: [{ action: 'change_email', label: 'Try again', method: 'email' }],
      });
    }

    const domain = emailDomain(normalized);
    const blocklist = await this.config.consumerBlocklist();
    if (isConsumerDomain(domain, blocklist)) {
      await this.recordFailure(runId, 'consumer_domain_blocked', 'email');
      throw apiError('consumer_domain_blocked', 'Consumer email domain blocked', {
        statusCode: 422,
        userMessage:
          'Personal emails like Gmail cannot be used here. Continue with Google above, or use your company email.',
        retryable: true,
        recoveryActions: [
          { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
          { action: 'change_email', label: 'Try a company email', method: 'email' },
          { action: 'pay_unlock', label: 'Unlock with USDC', method: 'x402' },
        ],
      });
    }

    const emailHash = sha256(normalized);
    if (await this.access.hasEmailGrantForPrincipal(emailHash)) {
      await this.recordFailure(runId, 'email_free_used', 'email');
      throw apiError('email_free_used', 'Email free unlock already used', {
        statusCode: 403,
        userMessage:
          'Your free company email verification was already used. Try a different company email, sign in with Google, or pay with USDC.',
        retryable: false,
        recoveryActions: [
          { action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' },
          { action: 'use_oauth', label: 'Try Google sign-in', method: 'oauth' },
          { action: 'change_email', label: 'Try a different company email', method: 'email' },
        ],
      });
    }

    const run = await this.ensureUnlockable(runId);

    if (!opts?.resend) {
      const recent = await this.countRecentAttempts(runId);
      if (recent >= 3) {
        throw apiError('rate_limit_exceeded', 'Too many email attempts', {
          statusCode: 429,
          userMessage: 'Too many attempts. Wait a few minutes or use Google sign-in / USDC unlock.',
          retryable: true,
          recoveryActions: [
            { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
            { action: 'pay_unlock', label: 'Unlock with USDC', method: 'x402' },
          ],
        });
      }
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: attempt, error: attemptErr } = await this.db
      .from('access_attempts')
      .insert({
        run_id: runId,
        attempt_type: 'email',
        status: 'pending',
        recipient_email_hash: emailHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (attemptErr) throw attemptErr;

    const supabase = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const redirectTo = buildMagicLinkRedirect(this.env.FRONTEND_URL, {
      runId,
      attemptId: attempt.id as string,
      email: normalized,
    });

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (otpError) {
      await this.db
        .from('access_attempts')
        .update({ status: 'failed', failure_code: 'magic_link_send_failed', failure_detail: { message: otpError.message } })
        .eq('id', attempt.id);
      throw apiError('magic_link_send_failed', otpError.message, {
        userMessage: 'We could not send the verification email. Please try again.',
        retryable: true,
        attemptId: attempt.id as string,
        recoveryActions: [
          { action: 'resend_email', label: 'Try sending again', method: 'resend' },
          { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
        ],
      });
    }

    await this.db.from('engine_runs').update({
      access_status: 'email_pending',
      pending_verification_email_hash: emailHash,
      access_failure_code: null,
    }).eq('id', runId);

    await this.db.from('auth_events').insert({
      run_id: runId,
      event_type: 'magic_link.sent',
      email_hash: emailHash,
      email_domain: domain,
      verification_provider: 'supabase',
    });

    return {
      sent: true,
      attempt_id: attempt.id,
      expires_at: expiresAt,
      message: 'Check your inbox for a verification link (and spam folder).',
    };
  }

  async confirmVerification(runId: string, email: string, attemptId?: string) {
    const normalized = email.trim().toLowerCase();
    const emailHash = sha256(normalized);

    if (await this.access.hasEmailGrantForPrincipal(emailHash)) {
      throw apiError('email_free_used', 'Email free unlock already used', {
        statusCode: 403,
        userMessage:
          'Your free company email verification was already used. Try a different company email, sign in with Google, or pay with USDC.',
        retryable: false,
        recoveryActions: [
          { action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' },
          { action: 'use_oauth', label: 'Try Google sign-in', method: 'oauth' },
        ],
      });
    }

    if (attemptId) {
      const { data: attempt } = await this.db
        .from('access_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('run_id', runId)
        .maybeSingle();

      if (attempt?.expires_at && new Date(attempt.expires_at) < new Date()) {
        await this.recordFailure(runId, 'magic_link_expired', 'email', attemptId);
        throw apiError('magic_link_expired', 'Magic link expired', {
          userMessage: 'Your verification link expired. Request a new one.',
          retryable: true,
          recoveryActions: [
            { action: 'resend_email', label: 'Resend link', method: 'resend' },
            { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
          ],
        });
      }

      await this.db.from('access_attempts').update({ status: 'succeeded' }).eq('id', attemptId);
    }

    await this.access.grantAccess({
      runId,
      grantType: 'email_verified',
      principalType: 'email_hash',
      principalId: emailHash,
      recipientEmail: normalized,
      unlockMethod: 'email_verified',
      metadata: { email_domain: emailDomain(normalized) },
    });

    await this.pipeline?.startPipeline(runId);

    await this.db.from('auth_events').insert({
      run_id: runId,
      event_type: 'magic_link.verified',
      email_hash: emailHash,
      grant_type: 'email_verified',
    });

    return { verified: true, run_id: runId };
  }

  async grantOAuthAccess(runId: string, privyUserId: string, email?: string) {
    if (await this.access.hasOAuthGrantForPrincipal(privyUserId)) {
      throw apiError('oauth_free_used', 'OAuth free unlock already used', {
        statusCode: 403,
        userMessage:
          'Your free Google sign-in was already used on another analysis. Pay with USDC to unlock this one.',
        retryable: false,
        recoveryActions: [{ action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' }],
      });
    }
    await this.ensureUnlockable(runId);
    const allowPersonal = await this.config.get<boolean>('access.allow_oauth_personal_email', true);
    if (email && !allowPersonal) {
      const domain = emailDomain(email);
      const blocklist = await this.config.consumerBlocklist();
      if (isConsumerDomain(domain, blocklist)) {
        throw apiError('consumer_domain_blocked', 'OAuth personal email not allowed', { statusCode: 422 });
      }
    }

    await this.db.from('access_attempts').insert({
      run_id: runId,
      attempt_type: 'oauth',
      status: 'succeeded',
    });

    await this.access.grantAccess({
      runId,
      grantType: 'oauth',
      principalType: 'privy_user',
      principalId: privyUserId,
      recipientEmail: email,
      unlockMethod: 'oauth',
      metadata: { email },
    });

    await this.pipeline?.startPipeline(runId);

    return { verified: true, run_id: runId };
  }

  private async ensureUnlockable(runId: string) {
    const { data: run } = await this.db
      .from('engine_runs')
      .select('status, pipeline_enqueued_at')
      .eq('id', runId)
      .maybeSingle();
    if (!run) throw apiError('not_found', 'Run not found', { statusCode: 404 });
    if (run.status === 'completed') return run;
    if (!run.pipeline_enqueued_at) return run;
    throw apiError('run_not_ready', 'Analysis not complete yet', {
      statusCode: 409,
      userMessage: 'Your analysis is still running. Results unlock when processing finishes.',
      retryable: true,
    });
  }

  private async countRecentAttempts(runId: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await this.db
      .from('access_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('run_id', runId)
      .eq('attempt_type', 'email')
      .gte('created_at', since);
    return count ?? 0;
  }

  private async recordFailure(runId: string, code: string, type: string, attemptId?: string) {
    await this.db.from('engine_runs').update({
      access_status: type === 'email' ? 'email_failed' : 'payment_failed',
      access_failure_code: code,
      access_failure_at: new Date().toISOString(),
    }).eq('id', runId);
    if (attemptId) {
      await this.db.from('access_attempts').update({ status: 'failed', failure_code: code }).eq('id', attemptId);
    }
  }
}
