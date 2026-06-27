import type { SupabaseClient } from '@supabase/supabase-js';

export interface ModelPricing {
  provider: string;
  model: string;
  input_price_per_m: number;
  output_price_per_m: number;
  version: string;
}

export class CostCalculator {
  private cache: ModelPricing[] | null = null;

  constructor(private readonly db: SupabaseClient) {}

  async loadPricing(): Promise<ModelPricing[]> {
    if (this.cache) return this.cache;
    const { data } = await this.db.from('llm_model_pricing').select('*').eq('is_active', true);
    this.cache = (data ?? []).map((r) => ({
      provider: r.provider,
      model: r.model,
      input_price_per_m: Number(r.input_price_per_m),
      output_price_per_m: Number(r.output_price_per_m),
      version: r.version,
    }));
    return this.cache;
  }

  async calculate(provider: string, model: string, promptTokens: number, completionTokens: number) {
    const pricing = await this.loadPricing();
    const rate = pricing.find((p) => p.provider === provider && p.model === model);
    if (!rate) {
      return { inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0, version: 'unknown' };
    }
    const inputCostUsd = (promptTokens / 1_000_000) * rate.input_price_per_m;
    const outputCostUsd = (completionTokens / 1_000_000) * rate.output_price_per_m;
    return {
      inputCostUsd,
      outputCostUsd,
      totalCostUsd: inputCostUsd + outputCostUsd,
      version: rate.version,
    };
  }
}
