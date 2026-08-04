import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusinessConfigService } from './BusinessConfigService.js';

import type { RecoveryAction } from '../lib/apiError.js';

export type AccessPrincipal = {
  type: 'privy_user' | 'email_hash' | 'wallet' | 'user_id';
  id: string;
  email?: string;
};

export type GrantType = 'oauth' | 'email_verified' | 'x402_payment' | 'admin_override';

export class AccessGateService {
  constructor(private readonly db: SupabaseClient) {}

  /** Whether this Privy user already consumed their one-time free Google/OAuth unlock. */
  async hasOAuthGrantForPrincipal(principalId: string): Promise<boolean> {
    const { count } = await this.db
      .from('run_access_grants')
      .select('id', { count: 'exact', head: true })
      .eq('principal_type', 'privy_user')
      .eq('principal_id', principalId)
      .eq('grant_type', 'oauth');
    return (count ?? 0) > 0;
  }

  /** Whether this company email already consumed its one-time free email verification unlock. */
  async hasEmailGrantForPrincipal(emailHash: string): Promise<boolean> {
    const { count } = await this.db
      .from('run_access_grants')
      .select('id', { count: 'exact', head: true })
      .eq('principal_type', 'email_hash')
      .eq('principal_id', emailHash)
      .eq('grant_type', 'email_verified');
    return (count ?? 0) > 0;
  }

  async getOAuthStatus(privyUserId: string, email?: string, config?: BusinessConfigService) {
    const oauthFreeUsed = await this.hasOAuthGrantForPrincipal(privyUserId);
    const unlimited = email && config ? await config.hasUnlimitedRunsForEmail(email) : false;
    return {
      authenticated: true,
      email,
      privy_user_id: privyUserId,
      oauth_free_used: oauthFreeUsed && !unlimited,
      can_use_oauth: unlimited || !oauthFreeUsed,
    };
  }

  async isEmailFreeUnlockBlocked(email: string, emailHash: string, config: BusinessConfigService): Promise<boolean> {
    if (await config.hasUnlimitedRunsForEmail(email)) return false;
    return await this.hasEmailGrantForPrincipal(emailHash);
  }

  async isOAuthFreeUnlockBlocked(
    privyUserId: string,
    email: string | undefined,
    config: BusinessConfigService,
  ): Promise<boolean> {
    if (email && (await config.hasUnlimitedRunsForEmail(email))) return false;
    return await this.hasOAuthGrantForPrincipal(privyUserId);
  }

  async hasAccess(runId: string, scope: 'cards' | 'full_pipeline' = 'cards'): Promise<boolean> {
    const { data: run } = await this.db.from('engine_runs').select('access_status, email_verified_for_run').eq('id', runId).maybeSingle();
    if (!run) return false;
    if (run.access_status === 'unlocked' || run.email_verified_for_run) return true;

    const { data: grants } = await this.db
      .from('run_access_grants')
      .select('output_scope')
      .eq('run_id', runId);

    if (!grants?.length) return false;
    if (scope === 'cards') return true;
    return grants.some((g) => g.output_scope === 'full_pipeline');
  }

  async grantAccess(opts: {
    runId: string;
    grantType: GrantType;
    outputScope?: 'cards' | 'full_pipeline';
    principalType?: string;
    principalId?: string;
    paymentTxId?: string;
    metadata?: Record<string, unknown>;
    recipientEmail?: string;
    unlockMethod?: string;
  }) {
    const { data: grant, error } = await this.db
      .from('run_access_grants')
      .insert({
        run_id: opts.runId,
        grant_type: opts.grantType,
        output_scope: opts.outputScope ?? 'cards',
        principal_type: opts.principalType ?? null,
        principal_id: opts.principalId ?? null,
        payment_tx_id: opts.paymentTxId ?? null,
        metadata: opts.metadata ?? {},
      })
      .select('id')
      .single();

    if (error) throw error;

    const runPatch: Record<string, unknown> = {
      access_status: 'unlocked',
      unlock_method: opts.unlockMethod ?? opts.grantType,
      email_verified_for_run: opts.grantType === 'email_verified' || opts.grantType === 'oauth',
      access_failure_code: null,
      access_failure_at: null,
    };
    if (opts.recipientEmail) {
      runPatch.contact_email = opts.recipientEmail.toLowerCase();
    }
    await this.db.from('engine_runs').update(runPatch).eq('id', opts.runId);

    return grant;
  }

  async getAccessStatus(runId: string, humanX402Enabled = true) {
    const { data: run } = await this.db
      .from('engine_runs')
      .select('access_status, access_failure_code, unlock_method, status')
      .eq('id', runId)
      .maybeSingle();

    const unlocked = await this.hasAccess(runId);
    const { data: emailDelivery } = await this.db
      .from('result_email_deliveries')
      .select('status')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      run_id: runId,
      pipeline_status: run?.status,
      access_status: unlocked ? 'unlocked' : (run?.access_status ?? 'locked'),
      failure_code: run?.access_failure_code,
      unlock_method: run?.unlock_method,
      unlocked,
      results_email_status: emailDelivery?.status ?? null,
      recovery_actions: unlocked ? [] : defaultRecoveryActions(run?.access_failure_code, humanX402Enabled),
    };
  }
}

function defaultRecoveryActions(failureCode?: string | null, humanX402Enabled = true): RecoveryAction[] {
  const x402: RecoveryAction[] = humanX402Enabled
    ? [{ action: 'pay_unlock', label: 'Unlock with USDC', method: 'x402' as const }]
    : [];
  const x402Instead: RecoveryAction[] = humanX402Enabled
    ? [{ action: 'pay_unlock', label: 'Unlock with USDC instead', method: 'x402' as const }]
    : [];
  const payUsdc: RecoveryAction[] = humanX402Enabled
    ? [{ action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' as const }]
    : [];

  const base: RecoveryAction[] = [
    { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' as const },
    { action: 'use_email', label: 'Use company email', method: 'email' as const },
    ...x402,
  ];
  if (failureCode === 'consumer_domain_blocked') {
    return [
      { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' as const },
      { action: 'change_email', label: 'Try a different company email', method: 'email' as const },
      ...x402Instead,
    ];
  }
  if (failureCode === 'magic_link_expired') {
    return [
      { action: 'resend_email', label: 'Resend verification link', method: 'resend' as const },
      { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' as const },
      ...x402,
    ];
  }
  if (failureCode === 'email_free_used') {
    return [
      ...payUsdc,
      { action: 'use_oauth', label: 'Try Google sign-in', method: 'oauth' as const },
      { action: 'change_email', label: 'Try a different company email', method: 'email' as const },
    ];
  }
  return base;
}
