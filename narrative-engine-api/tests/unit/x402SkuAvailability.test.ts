import { describe, expect, it, vi } from 'vitest';
import { BusinessConfigService } from '../../src/services/BusinessConfigService.js';
import { filterX402RecoveryActions } from '../../src/lib/apiError.js';
import { SkuPricingService } from '../../src/services/SkuPricingService.js';

describe('filterX402RecoveryActions', () => {
  it('removes x402 actions when human payment disabled', () => {
    const actions = [
      { action: 'use_oauth', label: 'Google', method: 'oauth' as const },
      { action: 'pay_unlock', label: 'USDC', method: 'x402' as const },
    ];
    expect(filterX402RecoveryActions(actions, false)).toEqual([
      { action: 'use_oauth', label: 'Google', method: 'oauth' },
    ]);
  });

  it('returns undefined when only x402 actions remain', () => {
    expect(
      filterX402RecoveryActions([{ action: 'pay_unlock', label: 'USDC', method: 'x402' }], false),
    ).toBeUndefined();
  });
});

describe('BusinessConfigService.isSkuX402Enabled', () => {
  it('returns true when product_skus.is_active is true', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { is_active: true } })),
          })),
        })),
      })),
    };
    const config = new BusinessConfigService(db as never, {} as never);
    expect(await config.isSkuX402Enabled('human_unlock')).toBe(true);
  });

  it('returns false when product_skus.is_active is false', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { is_active: false } })),
          })),
        })),
      })),
    };
    const config = new BusinessConfigService(db as never, {} as never);
    expect(await config.isHumanX402Enabled()).toBe(false);
  });
});

describe('SkuPricingService.isSkuActive', () => {
  it('reads is_active from product_skus', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { is_active: false } })),
          })),
        })),
      })),
    };
    const svc = new SkuPricingService(db as never, {} as never);
    expect(await svc.isSkuActive('agent_cards')).toBe(false);
  });
});
