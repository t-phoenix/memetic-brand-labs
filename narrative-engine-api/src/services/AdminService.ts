import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { resolveRedisUrl } from '../config/env.js';
import { loadNarrativeConfig } from '../config/narrativeConfig.js';
import { getQueue } from '../jobs/queue.js';

export class AdminService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
  ) {}

  async getHealth() {
    const checkedAt = new Date().toISOString();
    const api = { status: 'ok' as const, version: 'ne-v1.0.0' };

    const supabaseStart = Date.now();
    let supabase: { status: 'ok' | 'error'; latency_ms: number; error?: string };
    try {
      const { error } = await this.db.from('pricing_tiers').select('tier_key').limit(1);
      supabase = error
        ? { status: 'error', latency_ms: Date.now() - supabaseStart, error: error.message }
        : { status: 'ok', latency_ms: Date.now() - supabaseStart };
    } catch (e) {
      supabase = {
        status: 'error',
        latency_ms: Date.now() - supabaseStart,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }

    let redis: { status: string; mode: string; latency_ms?: number; error?: string };
    const redisUrl = resolveRedisUrl(this.env);
    if (!redisUrl) {
      redis = { status: 'disabled', mode: 'inline' };
    } else {
      const redisStart = Date.now();
      try {
        const q = getQueue(this.env);
        if (!q) throw new Error('Queue not initialized');
        await q.getJobCounts();
        redis = { status: 'ok', mode: 'queue', latency_ms: Date.now() - redisStart };
      } catch (e) {
        redis = {
          status: 'error',
          mode: 'queue',
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    }

    let storage: { status: 'ok' | 'error'; bucket: string; error?: string };
    try {
      const { error } = await this.db.storage.from(this.env.STORAGE_BUCKET).list('', { limit: 1 });
      storage = error
        ? { status: 'error', bucket: this.env.STORAGE_BUCKET, error: error.message }
        : { status: 'ok', bucket: this.env.STORAGE_BUCKET };
    } catch (e) {
      storage = {
        status: 'error',
        bucket: this.env.STORAGE_BUCKET,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCompletions } = await this.db
      .from('engine_runs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', tenMinAgo);

    const { count: stuckRuns } = await this.db
      .from('engine_runs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing'])
      .lt('created_at', tenMinAgo);

    let workerStatus: 'ok' | 'idle' | 'unknown' | 'inline';
    if (!redisUrl) {
      workerStatus = 'inline';
    } else if ((recentCompletions ?? 0) > 0) {
      workerStatus = 'ok';
    } else if ((stuckRuns ?? 0) > 0) {
      workerStatus = 'unknown';
    } else {
      workerStatus = 'idle';
    }

    const worker = {
      status: workerStatus,
      mode: redisUrl ? 'queue' : 'inline',
      recent_completions_10m: recentCompletions ?? 0,
      stuck_runs: stuckRuns ?? 0,
      worker_mode_env: this.env.WORKER_MODE,
    };

    const { data: recentEvents } = await this.db
      .from('run_events')
      .select('event_type, payload, created_at, run_id')
      .in('event_type', ['run.completed', 'run.failed', 'stage.entered', 'llm.completed'])
      .order('created_at', { ascending: false })
      .limit(30);

    return {
      api,
      supabase,
      redis,
      storage,
      worker,
      recent_events: recentEvents ?? [],
      checked_at: checkedAt,
    };
  }

  async getStats(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: runs } = await this.db
      .from('engine_runs')
      .select('id, status, model_tier, created_at')
      .gte('created_at', since);

    const runList = runs ?? [];
    const runsByStatus = {
      total: runList.length,
      completed: runList.filter((r) => r.status === 'completed').length,
      failed: runList.filter((r) => r.status === 'failed').length,
      pending: runList.filter((r) => r.status === 'pending' || r.status === 'processing').length,
    };

    const runIds = runList.map((r) => r.id);
    let costRows: Array<{ total_llm_cost_usd: number; total_cogs_usd: number; revenue_usdc: number | null }> = [];
    if (runIds.length > 0) {
      const { data } = await this.db
        .from('run_cost_summaries')
        .select('total_llm_cost_usd, total_cogs_usd, revenue_usdc')
        .in('run_id', runIds);
      costRows = (data ?? []) as typeof costRows;
    }

    const totalLlm = costRows.reduce((s, r) => s + Number(r.total_llm_cost_usd ?? 0), 0);
    const totalRevenue = costRows.reduce((s, r) => s + Number(r.revenue_usdc ?? 0), 0);
    const completedCount = runsByStatus.completed || 1;

    let tokenPrompt = 0;
    let tokenCompletion = 0;
    if (runIds.length > 0) {
      const { data: summaries } = await this.db
        .from('run_cost_summaries')
        .select('total_prompt_tokens, total_completion_tokens')
        .in('run_id', runIds);
      for (const s of summaries ?? []) {
        tokenPrompt += s.total_prompt_tokens ?? 0;
        tokenCompletion += s.total_completion_tokens ?? 0;
      }
    }

    const { data: byTier } = await this.db.from('v_model_tier_performance').select('*');

    const { data: byDay } = await this.db
      .from('v_cogs_vs_revenue_daily')
      .select('*')
      .gte('day', since)
      .order('day', { ascending: false })
      .limit(days);

    return {
      period_days: days,
      runs: runsByStatus,
      costs: {
        total_llm_usd: roundUsd(totalLlm),
        avg_per_run_usd: roundUsd(totalLlm / completedCount),
        revenue_usdc: roundUsd(totalRevenue),
      },
      tokens: { prompt: tokenPrompt, completion: tokenCompletion },
      by_tier: (byTier ?? []).map((t) => ({
        model_tier: t.model_tier,
        runs: t.runs,
        avg_duration_ms: t.avg_duration_ms,
        avg_cogs_usd: Number(t.avg_cogs ?? 0),
        completion_rate: Number(t.completion_rate ?? 0),
      })),
      by_day: (byDay ?? []).map((d) => ({
        day: d.day,
        runs: d.runs,
        cogs_usd: Number(d.cogs_usd ?? 0),
        revenue_usdc: Number(d.revenue_usdc ?? 0),
      })),
    };
  }

  async listRuns(params: { limit: number; offset: number; status?: string; q?: string }) {
    const { limit, offset, status, q } = params;

    let runIds: string[] | null = null;
    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      const { data: inputs } = await this.db
        .from('run_inputs')
        .select('run_id')
        .or(`building.ilike.${term},audience.ilike.${term}`);
      runIds = (inputs ?? []).map((i) => i.run_id);
      if (runIds.length === 0) return { runs: [], total: 0 };
    }

    let query = this.db
      .from('engine_runs')
      .select(
        `id, status, model_tier, created_at, completed_at, progress_pct, total_duration_ms,
         run_inputs(building, audience),
         run_cost_summaries(total_llm_cost_usd)`,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (runIds) query = query.in('id', runIds);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const runs = (data ?? []).map((row) => {
      const inputs = Array.isArray(row.run_inputs) ? row.run_inputs[0] : row.run_inputs;
      const costs = Array.isArray(row.run_cost_summaries) ? row.run_cost_summaries[0] : row.run_cost_summaries;
      return {
        id: row.id,
        status: row.status,
        model_tier: row.model_tier,
        created_at: row.created_at,
        completed_at: row.completed_at,
        progress_pct: row.progress_pct,
        building: inputs?.building ?? null,
        audience: inputs?.audience ?? null,
        total_llm_cost_usd: costs?.total_llm_cost_usd != null ? Number(costs.total_llm_cost_usd) : null,
        duration_ms: row.total_duration_ms,
      };
    });

    return { runs, total: count ?? runs.length };
  }

  async getRun(id: string) {
    const { data: run, error } = await this.db
      .from('engine_runs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) return null;

    const [{ data: inputs }, { data: config }, { data: costs }, { data: share }] = await Promise.all([
      this.db.from('run_inputs').select('*').eq('run_id', id).maybeSingle(),
      this.db.from('run_config_snapshots').select('*').eq('run_id', id).maybeSingle(),
      this.db.from('run_cost_summaries').select('*').eq('run_id', id).maybeSingle(),
      this.db.from('share_assets').select('share_id, is_public, og_title').eq('run_id', id).maybeSingle(),
    ]);

    return {
      run,
      inputs,
      config_snapshot: config,
      cost_summary: costs,
      share,
    };
  }

  async getRunLayers(id: string) {
    const [{ data: layers }, { data: scores }, { data: events }, { data: costs }] = await Promise.all([
      this.db.from('layer_outputs').select('*').eq('run_id', id).order('created_at'),
      this.db.from('diagnostic_scores').select('*').eq('run_id', id),
      this.db.from('run_events').select('*').eq('run_id', id).order('created_at'),
      this.db.from('run_cost_summaries').select('*').eq('run_id', id).maybeSingle(),
    ]);
    return { layers, diagnostic_scores: scores, events, cost_summary: costs };
  }

  async getLlmRequests(runId: string) {
    const { data, error } = await this.db
      .from('llm_requests')
      .select(
        `id, provider, model, status, latency_ms, created_at, error_code,
         layer_executions(layer_key),
         llm_token_usage(prompt_tokens, completion_tokens),
         llm_cost_events(total_cost_usd)`,
      )
      .eq('run_id', runId)
      .order('created_at');

    if (error) throw new Error(error.message);

    const requests = (data ?? []).map((row) => {
      const layer = Array.isArray(row.layer_executions) ? row.layer_executions[0] : row.layer_executions;
      const usage = Array.isArray(row.llm_token_usage) ? row.llm_token_usage[0] : row.llm_token_usage;
      const cost = Array.isArray(row.llm_cost_events) ? row.llm_cost_events[0] : row.llm_cost_events;
      return {
        id: row.id,
        layer_key: layer?.layer_key ?? null,
        provider: row.provider,
        model: row.model,
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        cost_usd: cost?.total_cost_usd != null ? Number(cost.total_cost_usd) : 0,
        latency_ms: row.latency_ms,
        status: row.status,
        error_code: row.error_code,
        created_at: row.created_at,
      };
    });

    return { requests };
  }

  async getConfig() {
    const { meta } = loadNarrativeConfig();

    const [
      { data: pricing_tiers },
      { data: prompt_templates },
      { data: schema_registry },
      { data: enum_definitions },
    ] = await Promise.all([
      this.db.from('pricing_tiers').select('*').order('tier_key'),
      this.db.from('prompt_templates').select('id, layer_key, version, is_active, created_at').order('layer_key'),
      this.db.from('schema_registry').select('schema_key, version, is_active, created_at').order('schema_key'),
      this.db.from('enum_definitions').select('enum_key, version, values, is_active').order('enum_key'),
    ]);

    const model_routing: Record<string, Record<string, string>> = {};
    for (const tier of pricing_tiers ?? []) {
      if (tier.model_routing && typeof tier.model_routing === 'object') {
        model_routing[tier.tier_key] = tier.model_routing as Record<string, string>;
      }
    }

    return {
      meta: { version: meta.version, engine_type: meta.engine_type },
      pricing_tiers: pricing_tiers ?? [],
      prompt_templates: prompt_templates ?? [],
      schema_registry: schema_registry ?? [],
      enum_definitions: enum_definitions ?? [],
      model_routing,
    };
  }

  async getPatterns() {
    const { data } = await this.db.from('pattern_entries').select('*').eq('is_active', true);
    return { patterns: data ?? [] };
  }
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}
