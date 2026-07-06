import type { SupabaseClient } from '@supabase/supabase-js';

export interface ModelPricing {
  provider: string;
  model: string;
  input_price_per_m: number;
  output_price_per_m: number;
  version: string;
}

export interface CostResult {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  version: string;
  inputPricePerM: number;
  outputPricePerM: number;
  costWarning?: 'no_pricing_row';
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

  async calculate(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    cachedPromptTokens = 0,
  ): Promise<CostResult> {
    const pricing = await this.loadPricing();
    const rate = pricing.find((p) => p.provider === provider && p.model === model);
    if (!rate) {
      return {
        inputCostUsd: 0,
        outputCostUsd: 0,
        totalCostUsd: 0,
        version: 'unknown',
        inputPricePerM: 0,
        outputPricePerM: 0,
        costWarning: 'no_pricing_row',
      };
    }
    const uncachedPrompt = Math.max(0, promptTokens - cachedPromptTokens);
    const cachedRate = rate.input_price_per_m * 0.5;
    const inputCostUsd =
      (uncachedPrompt / 1_000_000) * rate.input_price_per_m +
      (cachedPromptTokens / 1_000_000) * cachedRate;
    const outputCostUsd = (completionTokens / 1_000_000) * rate.output_price_per_m;
    return {
      inputCostUsd,
      outputCostUsd,
      totalCostUsd: inputCostUsd + outputCostUsd,
      version: rate.version,
      inputPricePerM: rate.input_price_per_m,
      outputPricePerM: rate.output_price_per_m,
    };
  }

  estimateFromTokenCount(provider: string, model: string, promptTokens: number, completionTokens: number) {
    return this.calculate(provider, model, promptTokens, completionTokens, 0);
  }
}
