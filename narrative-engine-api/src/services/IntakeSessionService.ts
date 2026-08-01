import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import type { NarrativeRunInput } from '../types/index.js';
import type { RunService } from './RunService.js';
import type { AccessGateService } from './AccessGateService.js';
import type { PipelineService } from './PipelineService.js';
import type { BusinessConfigService } from './BusinessConfigService.js';
import { apiError, emailDomain, isConsumerDomain } from '../lib/apiError.js';
import { buildMagicLinkRedirect } from '../lib/magicLinkRedirect.js';
import { sha256 } from '../utils/hash.js';

export type IntakePayload = NarrativeRunInput;

export class IntakeSessionService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
    private readonly config: BusinessConfigService,
    private readonly runs: RunService,
    private readonly access: AccessGateService,
    private readonly pipeline: PipelineService,
  ) {}

  async createSession(intake: IntakePayload, sessionId?: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.db
      .from('narrative_intake_sessions')
      .insert({
        session_id: sessionId ?? randomUUID(),
        intake,
        status: 'pending_auth',
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single();

    if (error) throw error;
    return { intake_id: data!.id as string, expires_at: data!.expires_at };
  }

  async getSession(intakeId: string) {
    const { data } = await this.db
      .from('narrative_intake_sessions')
      .select('*')
      .eq('id', intakeId)
      .maybeSingle();

    if (!data) {
      throw apiError('not_found', 'Intake session not found', { statusCode: 404 });
    }
    if (data.status === 'consumed') {
      throw apiError('intake_consumed', 'Intake already used', { statusCode: 409 });
    }
    if (new Date(data.expires_at as string) < new Date()) {
      await this.db.from('narrative_intake_sessions').update({ status: 'expired' }).eq('id', intakeId);
      throw apiError('intake_expired', 'Intake session expired', {
        statusCode: 410,
        userMessage: 'Your session expired. Please start again from the form.',
        retryable: true,
      });
    }
    return data;
  }

  async startRunFromIntake(
    intake: IntakePayload,
    opts: {
      userId?: string;
      grantType: 'oauth' | 'email_verified' | 'x402_payment';
      principalType?: string;
      principalId?: string;
      paymentTxId?: string;
      recipientEmail?: string;
      unlockMethod?: string;
      metadata?: Record<string, unknown>;
      intakeSessionId?: string;
      isFirstRun?: boolean;
    },
  ) {
    const { runId, sessionId } = await this.runs.createRun(intake, {
      userId: opts.userId,
      isFirstRun: opts.isFirstRun ?? false,
      paymentStatus: opts.grantType === 'x402_payment' ? 'paid' : 'free',
      runSource: opts.grantType === 'x402_payment' ? 'human_paid' : 'user',
    });

    await this.access.grantAccess({
      runId,
      grantType: opts.grantType,
      principalType: opts.principalType,
      principalId: opts.principalId,
      paymentTxId: opts.paymentTxId,
      recipientEmail: opts.recipientEmail,
      unlockMethod: opts.unlockMethod ?? opts.grantType,
      metadata: opts.metadata,
    });

    await this.pipeline.startPipeline(runId);

    if (opts.intakeSessionId) {
      await this.db
        .from('narrative_intake_sessions')
        .update({ status: 'consumed', run_id: runId, auth_method: opts.grantType === 'email_verified' ? 'email' : opts.grantType })
        .eq('id', opts.intakeSessionId);
    }

    return { run_id: runId, session_id: sessionId, status: 'pending' };
  }

  async requestEmailVerification(
    intakeId: string,
    email: string,
    opts?: { resend?: boolean },
  ) {
    const session = await this.getSession(intakeId);
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw apiError('invalid_email_format', 'Invalid email format', {
        userMessage: "That doesn't look like a valid email address.",
        retryable: true,
      });
    }

    const domain = emailDomain(normalized);
    const blocklist = await this.config.consumerBlocklist();
    if (isConsumerDomain(domain, blocklist)) {
      throw apiError('consumer_domain_blocked', 'Consumer email domain blocked', {
        statusCode: 422,
        userMessage:
          'Personal emails like Gmail cannot be used here. Continue with Google above, or use your company email.',
        retryable: true,
        recoveryActions: [
          { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
          { action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' },
        ],
      });
    }

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
          { action: 'change_email', label: 'Try a different company email', method: 'email' },
        ],
      });
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: attempt, error: attemptErr } = await this.db
      .from('access_attempts')
      .insert({
        intake_session_id: intakeId,
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
      intakeId,
      attemptId: attempt!.id as string,
      email: normalized,
    });

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    if (otpError) {
      throw apiError('magic_link_send_failed', otpError.message, {
        userMessage: 'We could not send the verification email. Please try again.',
        retryable: true,
        attemptId: attempt!.id as string,
      });
    }

    await this.db
      .from('narrative_intake_sessions')
      .update({ auth_method: 'email', email_hash: emailHash })
      .eq('id', intakeId);

    return {
      sent: true,
      attempt_id: attempt!.id,
      expires_at: expiresAt,
      message: 'Check your inbox for a verification link (and spam folder).',
      intake: session.intake,
    };
  }

  async confirmEmailAndStart(intakeId: string, email: string, attemptId?: string) {
    await this.getSession(intakeId);
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
        .eq('intake_session_id', intakeId)
        .maybeSingle();

      if (attempt?.expires_at && new Date(attempt.expires_at) < new Date()) {
        throw apiError('magic_link_expired', 'Magic link expired', {
          userMessage: 'Your verification link expired. Request a new one.',
          retryable: true,
        });
      }
      await this.db.from('access_attempts').update({ status: 'succeeded' }).eq('id', attemptId);
    }

    const { data: session } = await this.db.from('narrative_intake_sessions').select('intake, session_id').eq('id', intakeId).single();
    const intake = session!.intake as IntakePayload;

    return this.startRunFromIntake(
      { ...intake, session_id: intake.session_id ?? (session!.session_id as string) },
      {
        grantType: 'email_verified',
        principalType: 'email_hash',
        principalId: emailHash,
        recipientEmail: normalized,
        intakeSessionId: intakeId,
        metadata: { email_domain: emailDomain(normalized) },
      },
    );
  }
}
