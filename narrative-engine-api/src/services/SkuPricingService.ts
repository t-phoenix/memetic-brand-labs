import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusinessConfigService } from './BusinessConfigService.js';

export type ModelTierKey = 'fast' | 'standard' | 'quality';

export const MODEL_TIER_KEYS: ModelTierKey[] = ['fast', 'standard', 'quality'];

export type ProductSku = {
  sku_key: string;
  label: string;
  price_usdc: number;
  output_scope: 'cards' | 'full_pipeline';
  audience: 'human' | 'agent';
  model_tier_key: string | null;
  is_active: boolean;
  x402_route_template: string | null;
  bazaar_metadata: Record<string, unknown>;
};

export type SkuTierPriceRow = {
  sku_key: string;
  tier_key: string;
  price_usdc: number;
};

const CONFIG_FALLBACK: Record<string, string> = {
  human_unlock: 'pricing.human_unlock_usdc',
  agent_cards: 'pricing.agent_cards_usdc',
  agent_full: 'pricing.agent_full_usdc',
};

export function normalizeModelTier(tier: string | undefined | null, fallback: ModelTierKey = 'fast'): ModelTierKey {
  const t = (tier ?? fallback).toLowerCase();
  if (MODEL_TIER_KEYS.includes(t as ModelTierKey)) return t as ModelTierKey;
  return fallback;
}

export class SkuPricingService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly config: BusinessConfigService,
  ) {}

  async getTierPrice(skuKey: string, tierKey: ModelTierKey): Promise<number | null> {
    const { data } = await this.db
      .from('product_sku_tier_prices')
      .select('price_usdc')
      .eq('sku_key', skuKey)
      .eq('tier_key', tierKey)
      .maybeSingle();

    if (data?.price_usdc != null) return Number(data.price_usdc);

    if (tierKey === 'fast') {
      const sku = await this.getSkuBase(skuKey);
      if (!sku) return null;
      const configKey = CONFIG_FALLBACK[skuKey];
      let price = Number(sku.price_usdc);
      if (configKey) {
        const override = await this.config.get<number>(configKey, price);
        if (override > 0) price = override;
      }
      return price;
    }

    return null;
  }

  private async getSkuBase(skuKey: string) {
    const { data } = await this.db.from('product_skus').select('*').eq('sku_key', skuKey).maybeSingle();
    return data;
  }

  async getSku(skuKey: string, tierKey?: ModelTierKey): Promise<ProductSku | null> {
    const data = await this.getSkuBase(skuKey);
    if (!data) return null;

    const tier = tierKey ?? normalizeModelTier(data.model_tier_key as string, 'fast');
    const tierPrice = await this.getTierPrice(skuKey, tier);
    let price = tierPrice ?? Number(data.price_usdc);

    if (!tierPrice && tier === 'fast') {
      const configKey = CONFIG_FALLBACK[skuKey];
      if (configKey) {
        const override = await this.config.get<number>(configKey, price);
        if (override > 0) price = override;
      }
    }

    return { ...data, price_usdc: price, model_tier_key: tier } as ProductSku;
  }

  async listSkuTierPrices(): Promise<SkuTierPriceRow[]> {
    const { data } = await this.db.from('product_sku_tier_prices').select('sku_key, tier_key, price_usdc').order('sku_key');
    return (data ?? []).map((r) => ({
      sku_key: r.sku_key as string,
      tier_key: r.tier_key as string,
      price_usdc: Number(r.price_usdc),
    }));
  }

  async updateTierPrice(skuKey: string, tierKey: ModelTierKey, priceUsdc: number) {
    const { data, error } = await this.db
      .from('product_sku_tier_prices')
      .upsert({
        sku_key: skuKey,
        tier_key: tierKey,
        price_usdc: priceUsdc,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listSkus(audience?: 'human' | 'agent') {
    let q = this.db.from('product_skus').select('*').eq('is_active', true);
    if (audience) q = q.eq('audience', audience);
    const { data } = await q.order('sku_key');
    return data ?? [];
  }

  /** Admin: include inactive SKUs so toggles reflect true state. */
  async listAllSkus(audience?: 'human' | 'agent') {
    let q = this.db.from('product_skus').select('*');
    if (audience) q = q.eq('audience', audience);
    const { data } = await q.order('sku_key');
    return data ?? [];
  }

  async isSkuActive(skuKey: string): Promise<boolean> {
    const { data } = await this.db.from('product_skus').select('is_active').eq('sku_key', skuKey).maybeSingle();
    return data?.is_active === true;
  }

  async updateSku(skuKey: string, patch: Partial<ProductSku>) {
    const { data, error } = await this.db
      .from('product_skus')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('sku_key', skuKey)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getTierPricesForSku(skuKey: string): Promise<Array<{ tier_key: ModelTierKey; price_usdc: number; amount_atomic: string }>> {
    const rows: Array<{ tier_key: ModelTierKey; price_usdc: number; amount_atomic: string }> = [];
    for (const tierKey of MODEL_TIER_KEYS) {
      const price = await this.getTierPrice(skuKey, tierKey);
      if (price == null) continue;
      rows.push({
        tier_key: tierKey,
        price_usdc: price,
        amount_atomic: this.usdcToAtomic(price),
      });
    }
    return rows;
  }

  /** USDC atomic units (6 decimals) for x402 amount field */
  usdcToAtomic(priceUsdc: number): string {
    return String(Math.round(priceUsdc * 1_000_000));
  }
}
