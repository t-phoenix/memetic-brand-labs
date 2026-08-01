import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusinessConfigService } from './BusinessConfigService.js';

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

const CONFIG_FALLBACK: Record<string, string> = {
  human_unlock: 'pricing.human_unlock_usdc',
  agent_cards: 'pricing.agent_cards_usdc',
  agent_full: 'pricing.agent_full_usdc',
};

export class SkuPricingService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly config: BusinessConfigService,
  ) {}

  async getSku(skuKey: string): Promise<ProductSku | null> {
    const { data } = await this.db.from('product_skus').select('*').eq('sku_key', skuKey).maybeSingle();
    if (!data) return null;
    const configKey = CONFIG_FALLBACK[skuKey];
    let price = Number(data.price_usdc);
    if (configKey) {
      const override = await this.config.get<number>(configKey, price);
      if (override > 0) price = override;
    }
    return { ...data, price_usdc: price } as ProductSku;
  }

  async listSkus(audience?: 'human' | 'agent') {
    let q = this.db.from('product_skus').select('*').eq('is_active', true);
    if (audience) q = q.eq('audience', audience);
    const { data } = await q.order('sku_key');
    return data ?? [];
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

  /** USDC atomic units (6 decimals) for x402 amount field */
  usdcToAtomic(priceUsdc: number): string {
    return String(Math.round(priceUsdc * 1_000_000));
  }
}
