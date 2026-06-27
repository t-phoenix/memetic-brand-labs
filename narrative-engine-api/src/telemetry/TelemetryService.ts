import type { SupabaseClient } from '@supabase/supabase-js';

export class TelemetryService {
  constructor(private readonly db: SupabaseClient) {}

  async emit(runId: string, eventType: string, payload: Record<string, unknown> = {}, actor = 'system') {
    try {
      await this.db.from('run_events').insert({ run_id: runId, event_type: eventType, payload, actor });
    } catch {
      // fail-open per plan
    }
  }

  async enterStage(runId: string, stageKey: string, progressPct: number) {
    await this.db.from('pipeline_stages').insert({
      run_id: runId,
      stage_key: stageKey,
      status: 'entered',
      progress_pct: progressPct,
    });
    await this.db.from('engine_runs').update({ current_stage: stageKey, progress_pct: progressPct }).eq('id', runId);
    await this.emit(runId, 'stage.entered', { stage_key: stageKey, progress_pct: progressPct });
  }

  async completeStage(runId: string, stageKey: string, durationMs: number) {
    const { data: stages } = await this.db
      .from('pipeline_stages')
      .select('id')
      .eq('run_id', runId)
      .eq('stage_key', stageKey)
      .eq('status', 'entered')
      .order('entered_at', { ascending: false })
      .limit(1);

    if (stages?.[0]) {
      await this.db
        .from('pipeline_stages')
        .update({ status: 'completed', exited_at: new Date().toISOString(), duration_ms: durationMs })
        .eq('id', stages[0].id);
    }
    await this.emit(runId, 'stage.completed', { stage_key: stageKey, duration_ms: durationMs });
  }

  async recordLlmRequest(params: {
    runId: string;
    layerExecutionId: string;
    provider: string;
    model: string;
    status: string;
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
    inputCostUsd: number;
    outputCostUsd: number;
    pricingVersion: string;
    requestIdProvider?: string;
    errorCode?: string;
  }) {
    const { data: req, error } = await this.db
      .from('llm_requests')
      .insert({
        run_id: params.runId,
        layer_execution_id: params.layerExecutionId,
        provider: params.provider,
        model: params.model,
        status: params.status,
        latency_ms: params.latencyMs,
        request_id_provider: params.requestIdProvider,
        error_code: params.errorCode,
      })
      .select('id')
      .single();

    if (error || !req) return;

    await this.db.from('llm_token_usage').insert({
      llm_request_id: req.id,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.promptTokens + params.completionTokens,
    });

    const totalCost = params.inputCostUsd + params.outputCostUsd;
    await this.db.from('llm_cost_events').insert({
      llm_request_id: req.id,
      run_id: params.runId,
      provider: params.provider,
      model: params.model,
      input_price_per_m: 0,
      output_price_per_m: 0,
      input_cost_usd: params.inputCostUsd,
      output_cost_usd: params.outputCostUsd,
      total_cost_usd: totalCost,
      pricing_table_version: params.pricingVersion,
    });

    await this.updateCostSummary(params.runId, params.promptTokens, params.completionTokens, totalCost);
    await this.emit(params.runId, 'llm.completed', {
      layer_execution_id: params.layerExecutionId,
      model: params.model,
      tokens: params.promptTokens + params.completionTokens,
      cost_usd: totalCost,
    });
  }

  private async updateCostSummary(runId: string, promptTokens: number, completionTokens: number, costUsd: number) {
    const { data: existing } = await this.db.from('run_cost_summaries').select('*').eq('run_id', runId).maybeSingle();

    if (existing) {
      await this.db
        .from('run_cost_summaries')
        .update({
          llm_request_count: existing.llm_request_count + 1,
          total_prompt_tokens: existing.total_prompt_tokens + promptTokens,
          total_completion_tokens: existing.total_completion_tokens + completionTokens,
          total_llm_cost_usd: Number(existing.total_llm_cost_usd) + costUsd,
          total_cogs_usd: Number(existing.total_cogs_usd) + costUsd,
          updated_at: new Date().toISOString(),
        })
        .eq('run_id', runId);
    } else {
      await this.db.from('run_cost_summaries').insert({
        run_id: runId,
        llm_request_count: 1,
        total_prompt_tokens: promptTokens,
        total_completion_tokens: completionTokens,
        total_llm_cost_usd: costUsd,
        total_cogs_usd: costUsd,
      });
    }
  }
}
