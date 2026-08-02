import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { CONSUMER_DOMAINS } from '../lib/apiError.js';

type CacheEntry = { value: unknown; expires: number };

const CACHE_MS = 60_000;

export class BusinessConfigService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
  ) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;

    const { data } = await this.db.from('business_config').select('config_value').eq('config_key', key).maybeSingle();
    const envFallback = this.envFallback<T>(key, fallback);
    const value = data?.config_value !== undefined ? (data.config_value as T) : envFallback;
    this.cache.set(key, { value, expires: Date.now() + CACHE_MS });
    return value;
  }

  async set(key: string, value: unknown, updatedBy?: string) {
    await this.db
      .from('business_config')
      .upsert({
        config_key: key,
        config_value: value,
        updated_by: updatedBy ?? 'admin',
        updated_at: new Date().toISOString(),
      });
    this.cache.delete(key);
  }

  async list() {
    const { data } = await this.db.from('business_config').select('*').order('config_key');
    return data ?? [];
  }

  invalidate() {
    this.cache.clear();
  }

  async consumerBlocklist(): Promise<string[]> {
    return this.get<string[]>('access.consumer_domain_blocklist', CONSUMER_DOMAINS);
  }

  /** Emails listed under admin run notification recipients (normalized, lowercase). */
  async adminNotifyRecipients(): Promise<string[]> {
    const recipients = await this.get<string[]>('email.admin_notify_recipients', []);
    return (recipients ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  }

  /**
   * Admin notification recipients can run the narrative engine multiple times without
   * the one-time free email/OAuth unlock limit (when toggle is enabled).
   */
  async hasUnlimitedRunsForEmail(email: string): Promise<boolean> {
    const enabled = await this.get<boolean>('access.admin_recipient_unlimited_runs_enabled', false);
    if (!enabled) return false;
    const normalized = email.trim().toLowerCase();
    if (!normalized) return false;
    const recipients = await this.adminNotifyRecipients();
    return recipients.includes(normalized);
  }

  /** Complimentary tier for verified company-email runs (admin-configurable). */
  async getFreeEmailModelTier(): Promise<'fast' | 'standard' | 'quality'> {
    const raw = await this.get<string>('access.free_email_model_tier', 'quality');
    const tier = typeof raw === 'string' ? raw.replace(/"/g, '').toLowerCase() : 'quality';
    if (tier === 'fast' || tier === 'standard' || tier === 'quality') return tier;
    return 'quality';
  }

  async getFreeOAuthModelTier(): Promise<'quality'> {
    return 'quality';
  }

  async x402PayTo(): Promise<string> {
    const fromDb = await this.get<string>('x402.pay_to', '');
    return fromDb || this.env.X402_PAY_TO || '';
  }

  async x402FacilitatorUrl(): Promise<string> {
    const configured = await this.get<string>('x402.facilitator_url', this.env.X402_FACILITATOR_URL ?? '');
    const network = await this.x402Network();
    const mainnetFacilitator = 'https://facilitator.xpay.sh';
    const testnetFacilitator = 'https://x402.org/facilitator';

    // x402.org only supports testnets (e.g. Base Sepolia). Base mainnet needs a production facilitator.
    if (network === 'eip155:8453') {
      if (!configured || configured.includes('x402.org')) {
        return mainnetFacilitator;
      }
      return configured;
    }

    return configured || testnetFacilitator;
  }

  async x402Network(): Promise<string> {
    return this.get<string>('x402.network', 'eip155:8453');
  }

  private envFallback<T>(key: string, fallback: T): T {
    const map: Record<string, unknown> = {
      'x402.pay_to': this.env.X402_PAY_TO ?? fallback,
      'x402.facilitator_url': this.env.X402_FACILITATOR_URL,
      'pricing.human_unlock_usdc': this.env.HUMAN_UNLOCK_PRICE_USDC,
    };
    return (map[key] as T) ?? fallback;
  }
}
