import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { resolveRedisUrl } from '../config/env.js';
import { loadNarrativeConfig } from '../config/narrativeConfig.js';
import { getQueue } from '../jobs/queue.js';
import { buildPipelineLayers, buildStages } from '../admin/pipelineDto.js';
import { LAYER_KEYS } from '../types/index.js';

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

  async getStats(days = 7, includeTestRuns = false) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let runsQuery = this.db
      .from('engine_runs')
      .select('id, status, model_tier, created_at, run_source')
      .gte('created_at', since);

    if (!includeTestRuns) {
      runsQuery = runsQuery.eq('run_source', 'user');
    }

    const { data: runs } = await runsQuery;
    const runList = runs ?? [];

    const runsByStatus = {
      total: runList.length,
      completed: runList.filter((r) => r.status === 'completed').length,
      failed: runList.filter((r) => r.status === 'failed').length,
      pending: runList.filter((r) => r.status === 'pending' || r.status === 'processing' || r.status === 'running').length,
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
    const completedCount = runsByStatus.completed || 1;

    const { data: payments } = await this.db
      .from('payment_transactions')
      .select('amount_usdc, run_id')
      .gte('created_at', since);
    const paymentRunIds = new Set((payments ?? []).map((p) => p.run_id));
    const userRunIds = new Set(runList.map((r) => r.id));
    const totalRevenue = (payments ?? [])
      .filter((p) => userRunIds.has(p.run_id) || includeTestRuns)
      .reduce((s, p) => s + Number(p.amount_usdc ?? 0), 0);

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

    const recent7 = runList.filter((r) => r.created_at >= sevenDaysAgo);
    const completed7 = recent7.filter((r) => r.status === 'completed').length;
    const failed7 = recent7.filter((r) => r.status === 'failed').length;
    const total7 = recent7.length || 1;

    const { data: layerExecs } = await this.db
      .from('layer_executions')
      .select('layer_key, duration_ms, status')
      .eq('status', 'completed')
      .gte('started_at', since);

    const avgDurationByLayer: Record<string, number> = {};
    const layerGroups = new Map<string, number[]>();
    for (const e of layerExecs ?? []) {
      if (e.duration_ms == null) continue;
      const arr = layerGroups.get(e.layer_key) ?? [];
      arr.push(e.duration_ms);
      layerGroups.set(e.layer_key, arr);
    }
    for (const key of LAYER_KEYS) {
      const arr = layerGroups.get(key);
      avgDurationByLayer[key] = arr?.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
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
      include_test_runs: includeTestRuns,
      runs: runsByStatus,
      rates: {
        completion_rate_7d: Math.round((completed7 / total7) * 1000) / 1000,
        failure_rate_7d: Math.round((failed7 / total7) * 1000) / 1000,
      },
      avg_duration_by_layer: avgDurationByLayer,
      costs: {
        total_llm_usd: roundUsd(totalLlm),
        avg_per_run_usd: roundUsd(totalLlm / completedCount),
        revenue_usdc: roundUsd(totalRevenue),
        cost_source: 'token_usage_x_pricing_table',
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
      payment_count: paymentRunIds.size,
    };
  }

  async listRuns(params: {
    limit: number;
    offset: number;
    status?: string;
    q?: string;
    run_source?: string;
  }) {
    const { limit, offset, status, q, run_source } = params;

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
        `id, status, model_tier, created_at, completed_at, progress_pct, total_duration_ms, run_source, current_stage,
         run_inputs(building, audience),
         run_cost_summaries(total_llm_cost_usd)`,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (run_source === 'all') {
      // no filter
    } else if (run_source) {
      query = query.eq('run_source', run_source);
    } else {
      query = query.eq('run_source', 'user');
    }
    if (runIds) query = query.in('id', runIds);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((r) => r.id);
    const layerCounts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: outputs } = await this.db.from('layer_outputs').select('run_id').in('run_id', ids);
      for (const o of outputs ?? []) {
        layerCounts.set(o.run_id, (layerCounts.get(o.run_id) ?? 0) + 1);
      }
    }

    const runs = (data ?? []).map((row) => {
      const inputs = Array.isArray(row.run_inputs) ? row.run_inputs[0] : row.run_inputs;
      const costs = Array.isArray(row.run_cost_summaries) ? row.run_cost_summaries[0] : row.run_cost_summaries;
      const layersComplete = layerCounts.get(row.id) ?? 0;
      return {
        id: row.id,
        status: row.status,
        model_tier: row.model_tier,
        run_source: row.run_source ?? 'user',
        current_stage: row.current_stage,
        created_at: row.created_at,
        completed_at: row.completed_at,
        progress_pct: row.progress_pct,
        building: inputs?.building ?? null,
        audience: inputs?.audience ?? null,
        total_llm_cost_usd: costs?.total_llm_cost_usd != null ? Number(costs.total_llm_cost_usd) : null,
        duration_ms: row.total_duration_ms,
        layers_complete: layersComplete,
        layers_total: LAYER_KEYS.length,
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

    const [{ data: inputs }, { data: config }, { data: costs }, { data: share }, { data: payments }] =
      await Promise.all([
        this.db.from('run_inputs').select('*').eq('run_id', id).maybeSingle(),
        this.db.from('run_config_snapshots').select('*').eq('run_id', id).maybeSingle(),
        this.db.from('run_cost_summaries').select('*').eq('run_id', id).maybeSingle(),
        this.db.from('share_assets').select('share_id, is_public, og_title').eq('run_id', id).maybeSingle(),
        this.db.from('payment_transactions').select('amount_usdc, status, created_at').eq('run_id', id).maybeSingle(),
      ]);

    return {
      run,
      inputs,
      config_snapshot: config,
      cost_summary: costs,
      share,
      payment: payments,
    };
  }

  async getRunLayers(id: string) {
    const [
      { data: run },
      { data: stages },
      { data: executions },
      { data: outputs },
      { data: scores },
      { data: memetic },
      { data: events },
      { data: costs },
      { data: runOutputs },
      { data: patterns },
    ] = await Promise.all([
      this.db.from('engine_runs').select('*').eq('id', id).maybeSingle(),
      this.db.from('pipeline_stages').select('*').eq('run_id', id).order('entered_at'),
      this.db.from('layer_executions').select('*').eq('run_id', id).order('started_at'),
      this.db.from('layer_outputs').select('*').eq('run_id', id).order('created_at'),
      this.db.from('diagnostic_scores').select('*').eq('run_id', id),
      this.db.from('memetic_lite_scores').select('*').eq('run_id', id),
      this.db.from('run_events').select('*').eq('run_id', id).order('created_at'),
      this.db.from('run_cost_summaries').select('*').eq('run_id', id).maybeSingle(),
      this.db.from('run_outputs').select('*').eq('run_id', id).order('card_meta->order'),
      this.db
        .from('pattern_matches')
        .select('pattern_id, rank, pattern_entries(title)')
        .eq('run_id', id)
        .order('rank'),
    ]);

    const layers = buildPipelineLayers({
      executions: executions ?? [],
      outputs: (outputs ?? []).map((o) => ({ layer_key: o.layer_key, output: o.output as Record<string, unknown> })),
    });

    const patternSummary = (patterns ?? []).map((p) => {
      const entry = Array.isArray(p.pattern_entries) ? p.pattern_entries[0] : p.pattern_entries;
      return { rank: p.rank, title: (entry as { title?: string })?.title ?? 'Pattern' };
    });

    return {
      run: run ?? null,
      stages: buildStages(stages ?? []),
      layers,
      outputs: (runOutputs ?? []).map((o) => ({
        card_key: o.card_key,
        card_label: o.card_label,
        content: o.content,
        meta: o.card_meta,
      })),
      diagnostic_scores: scores ?? [],
      memetic_lite_scores: memetic ?? [],
      events: events ?? [],
      cost_summary: costs,
      pattern_summary: patternSummary,
      layers_legacy: outputs,
    };
  }

  async getLlmRequests(runId: string) {
    const { data, error } = await this.db
      .from('llm_requests')
      .select(
        `id, provider, model, status, latency_ms, created_at, error_code, request_id_provider,
         layer_executions(layer_key),
         llm_token_usage(prompt_tokens, completion_tokens, cached_prompt_tokens),
         llm_cost_events(total_cost_usd, input_cost_usd, output_cost_usd, input_price_per_m, output_price_per_m, pricing_table_version)`,
      )
      .eq('run_id', runId)
      .order('created_at');

    if (error) throw new Error(error.message);

    const requests = (data ?? []).map((row) => {
      const layer = Array.isArray(row.layer_executions) ? row.layer_executions[0] : row.layer_executions;
      const usage = Array.isArray(row.llm_token_usage) ? row.llm_token_usage[0] : row.llm_token_usage;
      const cost = Array.isArray(row.llm_cost_events) ? row.llm_cost_events[0] : row.llm_cost_events;
      const pricingVersion = cost?.pricing_table_version ?? 'unknown';
      return {
        id: row.id,
        layer_key: layer?.layer_key ?? null,
        provider: row.provider,
        model: row.model,
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        cached_prompt_tokens: usage?.cached_prompt_tokens ?? 0,
        input_price_per_m: cost?.input_price_per_m != null ? Number(cost.input_price_per_m) : 0,
        output_price_per_m: cost?.output_price_per_m != null ? Number(cost.output_price_per_m) : 0,
        input_cost_usd: cost?.input_cost_usd != null ? Number(cost.input_cost_usd) : 0,
        output_cost_usd: cost?.output_cost_usd != null ? Number(cost.output_cost_usd) : 0,
        cost_usd: cost?.total_cost_usd != null ? Number(cost.total_cost_usd) : 0,
        pricing_table_version: pricingVersion,
        cost_source: 'token_usage_x_pricing_table',
        cost_warning: pricingVersion === 'unknown' ? 'no_pricing_row' : undefined,
        provider_request_id: row.request_id_provider,
        latency_ms: row.latency_ms,
        status: row.status,
        error_code: row.error_code,
        created_at: row.created_at,
      };
    });

    return { requests };
  }

  async getAnalyticsMessaging() {
    const { data } = await this.db.from('v_messaging_problem_distribution').select('*');
    return { items: data ?? [] };
  }

  async getAnalyticsModels() {
    const { data } = await this.db.from('v_model_tier_performance').select('*');
    return { items: data ?? [] };
  }

  async getAnalyticsCogs(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await this.db
      .from('v_cogs_vs_revenue_daily')
      .select('*')
      .gte('day', since)
      .order('day', { ascending: true });
    return { items: data ?? [] };
  }

  async getAnalyticsFailures(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: failed } = await this.db
      .from('engine_runs')
      .select('id, failure_code, failure_detail, current_stage, created_at')
      .eq('status', 'failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    const byStage: Record<string, number> = {};
    for (const r of failed ?? []) {
      const key = r.current_stage ?? r.failure_code ?? 'unknown';
      byStage[key] = (byStage[key] ?? 0) + 1;
    }

    return {
      recent: failed ?? [],
      by_stage: Object.entries(byStage).map(([stage, count]) => ({ stage, count })),
    };
  }

  async exportRunsCsv(params: { from?: string; to?: string; status?: string }) {
    let query = this.db
      .from('engine_runs')
      .select('id, status, model_tier, run_source, created_at, completed_at, total_duration_ms, run_inputs(building, audience), run_cost_summaries(total_llm_cost_usd)')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (params.from) query = query.gte('created_at', params.from);
    if (params.to) query = query.lte('created_at', params.to);
    if (params.status) query = query.eq('status', params.status);

    const { data } = await query;
    const rows = [['run_id', 'status', 'tier', 'source', 'building', 'audience', 'cost_usd', 'created_at', 'completed_at']];
    for (const r of data ?? []) {
      const inputs = Array.isArray(r.run_inputs) ? r.run_inputs[0] : r.run_inputs;
      const costs = Array.isArray(r.run_cost_summaries) ? r.run_cost_summaries[0] : r.run_cost_summaries;
      rows.push([
        r.id,
        r.status,
        r.model_tier,
        r.run_source ?? 'user',
        inputs?.building ?? '',
        inputs?.audience ?? '',
        String(costs?.total_llm_cost_usd ?? ''),
        r.created_at,
        r.completed_at ?? '',
      ]);
    }
    return rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async exportCostsCsv(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await this.db
      .from('v_cogs_vs_revenue_daily')
      .select('*')
      .gte('day', since)
      .order('day', { ascending: true });
    const rows = [['day', 'runs', 'cogs_usd', 'revenue_usdc']];
    for (const d of data ?? []) {
      rows.push([d.day, String(d.runs), String(d.cogs_usd ?? 0), String(d.revenue_usdc ?? 0)]);
    }
    return rows.map((row) => row.join(',')).join('\n');
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
