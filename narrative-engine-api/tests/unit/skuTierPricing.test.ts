import { describe, expect, it, vi } from 'vitest';
import { BusinessConfigService } from '../../src/services/BusinessConfigService.js';
import { SkuPricingService, normalizeModelTier } from '../../src/services/SkuPricingService.js';

describe('normalizeModelTier', () => {
  it('defaults invalid tiers to fast', () => {
    expect(normalizeModelTier(undefined)).toBe('fast');
    expect(normalizeModelTier('bogus')).toBe('fast');
  });

  it('accepts valid tiers', () => {
    expect(normalizeModelTier('quality')).toBe('quality');
  });
});

describe('BusinessConfigService free email tier', () => {
  it('getFreeEmailModelTier defaults to quality', async () => {
    const db = { from: vi.fn() };
    const config = new BusinessConfigService(db as never, {} as never);
    config.get = vi.fn(async (key: string, fallback: string) => {
      if (key === 'access.free_email_model_tier') return fallback;
      return fallback;
    });
    expect(await config.getFreeEmailModelTier()).toBe('quality');
  });

  it('getFreeEmailModelTier reads admin value', async () => {
    const db = { from: vi.fn() };
    const config = new BusinessConfigService(db as never, {} as never);
    config.get = vi.fn(async (key: string) => {
      if (key === 'access.free_email_model_tier') return 'standard';
      return undefined;
    });
    expect(await config.getFreeEmailModelTier()).toBe('standard');
  });

  it('getFreeEmailModelTier falls back on invalid', async () => {
    const db = { from: vi.fn() };
    const config = new BusinessConfigService(db as never, {} as never);
    config.get = vi.fn(async (key: string) => {
      if (key === 'access.free_email_model_tier') return 'invalid';
      return undefined;
    });
    expect(await config.getFreeEmailModelTier()).toBe('quality');
  });
});

describe('SkuPricingService tier matrix', () => {
  it('getTierPrice uses matrix row', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'product_sku_tier_prices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: { price_usdc: 0.4 } })),
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })),
          })),
        };
      }),
    };
    const config = { get: vi.fn() };
    const svc = new SkuPricingService(db as never, config as never);
    expect(await svc.getTierPrice('human_unlock', 'quality')).toBe(0.4);
  });

  it('getSku applies tier price', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'product_sku_tier_prices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: { price_usdc: 0.2 } })),
                })),
              })),
            })),
          };
        }
        if (table === 'product_skus') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    sku_key: 'human_unlock',
                    label: 'Human',
                    price_usdc: 0.1,
                    output_scope: 'cards',
                    audience: 'human',
                    model_tier_key: 'fast',
                    is_active: true,
                    x402_route_template: 'POST',
                    bazaar_metadata: {},
                  },
                })),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })) })) };
      }),
    };
    const config = { get: vi.fn(async () => undefined) };
    const svc = new SkuPricingService(db as never, config as never);
    const sku = await svc.getSku('human_unlock', 'standard');
    expect(sku?.price_usdc).toBe(0.2);
    expect(sku?.model_tier_key).toBe('standard');
  });
});
