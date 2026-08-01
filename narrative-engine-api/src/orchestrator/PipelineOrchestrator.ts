import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { LLMRouter } from '../llm/LLMRouter.js';
import { VariableResolver } from './VariableResolver.js';
import { SchemaValidator } from './SchemaValidator.js';
import { TelemetryService } from '../telemetry/TelemetryService.js';
import { CostCalculator } from '../telemetry/CostCalculator.js';
import { extractHomepage } from '../website/HomepageExtractor.js';
import { OutputGuardrailService } from '../services/OutputGuardrailService.js';
import { ShareService } from '../share/ShareService.js';
import type { ResultsEmailService } from '../services/ResultsEmailService.js';
import type { AdminNotificationService } from '../services/AdminNotificationService.js';
import {
  LAYER_KEYS,
  STAGE_PROGRESS,
  CARD_DEFINITIONS,
  MM_LITE_WEIGHTS,
  DIAGNOSTIC_DIMENSIONS,
  type LayerKey,
} from '../types/index.js';
import { sha256 } from '../utils/hash.js';
import { getPromptForLayer, getSchema, getSchemaForLayer, formatSchemaInstruction } from '../config/narrativeConfig.js';
import { layerIndex } from '../admin/layerSummary.js';
import { buildDiagnosticSummary } from './diagnosticSummary.js';

export interface LayerExecuteOpts {
  modelOverride?: string;
  attemptReason?: 'initial' | 'admin_retry' | 'config_change';
  skipShare?: boolean;
}

export interface RunContext {
  runId: string;
  run: { id: string; model_tier: string; run_source?: string; status: string };
  input: {
    building: string;
    audience: string;
    challenge: string;
    differentiation: string;
    website_url?: string | null;
  };
  routing: Record<string, string>;
  inputVars: Record<string, string>;
  layerOutputs: Record<string, Record<string, unknown>>;
  tier: string;
}

export interface PipelineOrchestratorOpts {
  resultsEmail?: ResultsEmailService;
  adminNotifications?: AdminNotificationService;
}

export class PipelineOrchestrator {
  private readonly llm: LLMRouter;
  private readonly resolver = new VariableResolver();
  private readonly validator = new SchemaValidator();
  private readonly telemetry: TelemetryService;
  private readonly costs: CostCalculator;
  private readonly guardrails = new OutputGuardrailService();
  private readonly share: ShareService;
  private readonly resultsEmail?: ResultsEmailService;
  private readonly adminNotifications?: AdminNotificationService;

  constructor(
    private readonly db: SupabaseClient,
    env: Env,
    opts: PipelineOrchestratorOpts = {},
  ) {
    this.llm = new LLMRouter(env);
    this.telemetry = new TelemetryService(db);
    this.costs = new CostCalculator(db);
    this.share = new ShareService(db, env);
    this.resultsEmail = opts.resultsEmail;
    this.adminNotifications = opts.adminNotifications;
  }

  async execute(runId: string): Promise<void> {
    await this.executeFull(runId);
  }

  async executeFull(runId: string, opts: LayerExecuteOpts = {}): Promise<void> {
    await this.executeFromLayer(runId, 'interpretation', opts);
    await this.finalizeRun(runId, opts);
  }

  async loadRunContext(runId: string): Promise<RunContext> {
    const { data: run } = await this.db.from('engine_runs').select('*').eq('id', runId).single();
    const { data: input } = await this.db.from('run_inputs').select('*').eq('run_id', runId).single();
    if (!run || !input) throw new Error('Run or input not found');

    const { data: tier } = await this.db
      .from('pricing_tiers')
      .select('model_routing')
      .eq('tier_key', run.model_tier)
      .maybeSingle();
    const routing = (tier?.model_routing ?? { default: 'gpt-4o-mini' }) as Record<string, string>;

    const { data: website } = await this.db
      .from('website_extractions')
      .select('extracted, mismatch_flags')
      .eq('run_id', runId)
      .maybeSingle();
    const websiteContext = website?.extracted ? JSON.stringify(website.extracted) : '';
    const mismatchFlags =
      website?.mismatch_flags && Object.keys(website.mismatch_flags as object).length
        ? JSON.stringify(website.mismatch_flags, null, 2)
        : '';

    const layerOutputs = await this.loadLayerOutputs(runId);
    const inputVars = {
      ...this.resolver.buildInputVars(input),
      website_context: websiteContext,
      mismatch_flags: mismatchFlags,
    };

    return {
      runId,
      run: run as RunContext['run'],
      input,
      routing,
      inputVars,
      layerOutputs,
      tier: run.model_tier,
    };
  }

  async previewLayer(runId: string, layerKey: LayerKey) {
    const ctx = await this.loadRunContext(runId);
    const resolved = await this.resolvePrompts(runId, layerKey, ctx, { dryRun: true });
    const model = this.llm.resolveModel(ctx.tier, layerKey, ctx.routing);
    const estTokens = Math.ceil((resolved.system.length + resolved.user.length) / 4);
    const estCost = await this.costs.estimateFromTokenCount('openai', model, estTokens, 512);
    return {
      layer_key: layerKey,
      model,
      system_prompt: resolved.system,
      user_prompt: resolved.user,
      estimated_input_tokens: estTokens,
      estimated_cost_usd: estCost.totalCostUsd,
    };
  }

  async executeLayer(runId: string, layerKey: LayerKey, opts: LayerExecuteOpts = {}): Promise<Record<string, unknown>> {
    const ctx = await this.loadRunContext(runId);
    const stage = STAGE_PROGRESS[layerKey];
    await this.telemetry.enterStage(runId, layerKey, stage?.pct ?? 50);
    const stageStart = Date.now();
    try {
      const output = await this.runLayer(runId, layerKey, ctx, opts);
      await this.telemetry.completeStage(runId, layerKey, Date.now() - stageStart);
      await this.db
        .from('engine_runs')
        .update({ status: 'processing', current_stage: layerKey, progress_pct: stage?.pct ?? 50 })
        .eq('id', runId);
      return output;
    } catch (err) {
      await this.markFailed(runId, err);
      throw err;
    }
  }

  async executeFromLayer(runId: string, fromLayerKey: LayerKey, opts: LayerExecuteOpts = {}): Promise<void> {
    await this.markRunning(runId);
    await this.ensureWebsiteContext(runId);
    const startIdx = layerIndex(fromLayerKey);
    if (startIdx < 0) throw new Error(`Invalid layer: ${fromLayerKey}`);

    for (let i = startIdx; i < LAYER_KEYS.length; i++) {
      await this.executeLayer(runId, LAYER_KEYS[i], opts);
    }
  }

  async finalizeRun(runId: string, opts: LayerExecuteOpts = {}): Promise<void> {
    const ctx = await this.loadRunContext(runId);
    const cards = this.buildCards(ctx.layerOutputs);
    const showAnalogy = Boolean(ctx.layerOutputs.positioning?.analogy);
    const guard = this.guardrails.check(
      {
        clear_explanation: String(cards.clear_explanation),
        positioning: String(cards.positioning),
        messaging_hook: String(cards.messaging_hook),
        memetic_angle: String(cards.memetic_angle),
      },
      showAnalogy,
    );

    // Mark finalizing so UI/admin reflect progress before share work.
    await this.db
      .from('engine_runs')
      .update({
        status: 'processing',
        current_stage: 'output_generation',
        progress_pct: 97,
      })
      .eq('id', runId);

    await this.db.from('run_outputs').delete().eq('run_id', runId);
    await this.db.from('output_guardrail_events').delete().eq('run_id', runId);

    for (const ev of guard.events) {
      await this.db.from('output_guardrail_events').insert({
        run_id: runId,
        check_key: ev.check_key,
        passed: ev.passed,
        details: ev.details,
        action_taken: ev.action_taken,
      });
    }

    for (const def of CARD_DEFINITIONS) {
      const content = String(cards[def.key as keyof typeof cards] ?? '');
      await this.db.from('run_outputs').insert({
        run_id: runId,
        card_key: def.key,
        card_label: def.label,
        content,
        content_hash: sha256(content),
        source_layer_keys: [def.key === 'clear_explanation' ? 'translation' : def.key.replace('_', '')],
        card_meta: { color: def.color, order: def.order },
        guardrail_passed: guard.passed,
      });
    }

    // Share graphics are best-effort. Cards are the product deliverable —
    // never leave the run stuck in "finalizing" because storage/sharp failed.
    let shareError: string | undefined;
    const skipShare = opts.skipShare ?? ctx.run.run_source === 'admin_test';
    if (!skipShare) {
      try {
        await this.share.createForRun(runId, String(cards.clear_explanation), String(cards.positioning));
      } catch (err) {
        shareError = err instanceof Error ? err.message : 'Share generation failed';
        console.error(`[finalize] share failed for run ${runId}:`, err);
        await this.telemetry.emit(
          runId,
          'run.share_failed',
          { message: shareError },
          'system',
        );
      }
    }

    await this.markCompleted(runId, shareError ? { share_error: shareError } : undefined);
    await this.telemetry.emit(runId, 'run.completed', {
      finalized: true,
      share_ok: !shareError,
      ...(shareError ? { share_error: shareError } : {}),
    });
    void this.resultsEmail?.enqueueOnComplete(runId);
    void this.adminNotifications?.notifyRunCompleted(runId);
  }

  private async markCompleted(runId: string, warn?: { share_error?: string }) {
    const { data: runRow } = await this.db.from('engine_runs').select('started_at').eq('id', runId).single();
    const startedMs = runRow?.started_at ? new Date(runRow.started_at).getTime() : Date.now();
    const patch: Record<string, unknown> = {
      status: 'completed',
      current_stage: 'completed',
      progress_pct: 100,
      completed_at: new Date().toISOString(),
      total_duration_ms: Date.now() - startedMs,
      failure_code: null,
    };
    if (warn?.share_error) {
      patch.failure_detail = {
        share_error: warn.share_error,
        note: 'Run completed; share graphic generation failed (non-fatal).',
      };
    }
    await this.db.from('engine_runs').update(patch).eq('id', runId);
  }

  private async markRunning(runId: string) {
    await this.db
      .from('engine_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', runId);
  }

  private async markFailed(runId: string, err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await this.db
      .from('engine_runs')
      .update({
        status: 'failed',
        failure_code: 'pipeline_error',
        failure_detail: { message },
      })
      .eq('id', runId);
    await this.telemetry.emit(runId, 'run.failed', { message }, 'system');
  }

  private async ensureWebsiteContext(runId: string) {
    const { data: existing } = await this.db.from('website_extractions').select('id').eq('run_id', runId).maybeSingle();
    if (existing) return;

    const { data: input } = await this.db
      .from('run_inputs')
      .select('website_url, audience, building')
      .eq('run_id', runId)
      .single();
    if (!input?.website_url) return;

    const extract = await extractHomepage(input.website_url, input.audience, input.building);
    await this.db.from('website_extractions').insert({
      run_id: runId,
      url: input.website_url,
      fetch_status: extract.fetch_status,
      http_status: extract.http_status,
      duration_ms: extract.duration_ms,
      extracted: extract.extracted,
      mismatch_flags: extract.mismatch_flags,
    });
    await this.telemetry.emit(runId, 'website.extracted', { status: extract.fetch_status });
  }

  private async loadLayerOutputs(runId: string): Promise<Record<string, Record<string, unknown>>> {
    const { data: rows } = await this.db
      .from('layer_outputs')
      .select('layer_key, output, created_at')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    const out: Record<string, Record<string, unknown>> = {};
    for (const row of rows ?? []) {
      out[row.layer_key] = row.output as Record<string, unknown>;
    }
    return out;
  }

  private async resolvePrompts(
    runId: string,
    layerKey: LayerKey,
    ctx: RunContext,
    _opts: { dryRun?: boolean; attemptId?: string } = {},
  ) {
    const prior = ctx.layerOutputs;
    // Prompt *text* is always from filesystem config (getPromptForLayer).
    // DB prompt_templates is consulted only for the active version label (admin/sync mirror).
    const { data: dbPrompt } = await this.db
      .from('prompt_templates')
      .select('version')
      .eq('engine_type', 'narrative')
      .eq('layer_key', layerKey)
      .eq('is_active', true)
      .maybeSingle();

    const canonical = getPromptForLayer(layerKey);
    const prompt = {
      system_prompt: canonical.system_prompt,
      user_prompt_template: canonical.user_prompt_template,
      output_schema_ref: canonical.output_schema_ref,
      version: dbPrompt?.version ?? canonical.version,
    };
    const schemaKey = prompt.output_schema_ref ?? `ne.${layerKey}.v1`;
    const schema = getSchema(schemaKey) ?? getSchemaForLayer(layerKey);

    const vars = {
      ...ctx.inputVars,
      structured_output: JSON.stringify(prior.interpretation ?? prior.diagnostics ?? {}, null, 2),
      prior_layers: JSON.stringify(prior, null, 2),
      diagnostic_summary: buildDiagnosticSummary(prior.diagnostics),
    };

    const system = `${this.resolver.resolve(prompt.system_prompt, vars)}\n\n${formatSchemaInstruction(schema)}`;
    const user = this.resolver.resolve(prompt.user_prompt_template, vars);
    return { system, user, schemaKey, schema, vars };
  }

  private async runLayer(
    runId: string,
    layerKey: LayerKey,
    ctx: RunContext,
    opts: LayerExecuteOpts,
  ): Promise<Record<string, unknown>> {
    const attempt = await this.createLayerExecution(runId, layerKey, opts.attemptReason ?? 'initial');
    const resolved = await this.resolvePrompts(runId, layerKey, ctx, { attemptId: attempt.id });

    await this.db.from('layer_prompt_snapshots').insert({
      layer_execution_id: attempt.id,
      system_prompt: resolved.system,
      user_prompt: resolved.user,
      variables_resolved: resolved.vars,
    });

    const model = opts.modelOverride ?? this.llm.resolveModel(ctx.tier, layerKey, ctx.routing);
    const result = await this.llm.complete(model, resolved.system, resolved.user);
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    const validation = this.validator.validate(resolved.schemaKey, resolved.schema as object, parsed);

    const cost = await this.costs.calculate(
      result.provider,
      result.model,
      result.promptTokens,
      result.completionTokens,
      result.cachedPromptTokens,
    );

    await this.telemetry.recordLlmRequest({
      runId,
      layerExecutionId: attempt.id,
      provider: result.provider,
      model: result.model,
      status: validation.valid ? 'success' : 'error',
      latencyMs: result.latencyMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      cachedPromptTokens: result.cachedPromptTokens,
      inputCostUsd: cost.inputCostUsd,
      outputCostUsd: cost.outputCostUsd,
      inputPricePerM: cost.inputPricePerM,
      outputPricePerM: cost.outputPricePerM,
      pricingVersion: cost.version,
      costWarning: cost.costWarning,
      requestIdProvider: result.requestId,
      errorCode: validation.valid ? undefined : 'schema_invalid',
    });

    if (!validation.valid) {
      throw new Error(`Schema validation failed for ${layerKey}: ${JSON.stringify(validation.errors)}`);
    }

    await this.db
      .from('layer_executions')
      .update({
        status: 'completed',
        model,
        completed_at: new Date().toISOString(),
        duration_ms: result.latencyMs,
      })
      .eq('id', attempt.id);

    await this.db.from('layer_outputs').insert({
      layer_execution_id: attempt.id,
      run_id: runId,
      layer_key: layerKey,
      output_schema_version: resolved.schemaKey,
      output: parsed,
      output_hash: sha256(JSON.stringify(parsed)),
      validation_passed: true,
    });

    if (layerKey === 'diagnostics' && parsed.scores) {
      await this.persistDiagnosticScores(runId, attempt.id, parsed.scores as Record<string, number>, parsed);
    }
    if (layerKey === 'memetic_analysis') {
      await this.persistMemeticScores(runId, attempt.id, parsed);
    }

    ctx.layerOutputs[layerKey] = parsed;
    return parsed;
  }

  private async createLayerExecution(runId: string, layerKey: string, attemptReason: string) {
    const { data: existing } = await this.db
      .from('layer_executions')
      .select('attempt_number')
      .eq('run_id', runId)
      .eq('layer_key', layerKey)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const attemptNumber = (existing?.[0]?.attempt_number ?? 0) + 1;
    const { data, error } = await this.db
      .from('layer_executions')
      .insert({
        run_id: runId,
        layer_key: layerKey,
        attempt_number: attemptNumber,
        attempt_reason: attemptReason,
        status: 'running',
        output_schema_key: `ne.${layerKey}.v1`,
      })
      .select('id')
      .single();

    if (error || !data) throw error ?? new Error('Failed to create layer execution');
    return { id: data.id as string };
  }

  private async persistDiagnosticScores(
    runId: string,
    layerExecutionId: string,
    scores: Record<string, number>,
    output: Record<string, unknown>,
  ) {
    await this.db.from('diagnostic_scores').delete().eq('run_id', runId);
    for (const dim of DIAGNOSTIC_DIMENSIONS) {
      if (scores[dim] == null) continue;
      await this.db.from('diagnostic_scores').insert({
        run_id: runId,
        layer_execution_id: layerExecutionId,
        dimension: dim,
        score: scores[dim],
        findings: output.findings ?? {},
      });
    }
  }

  private async persistMemeticScores(runId: string, layerExecutionId: string, output: Record<string, unknown>) {
    await this.db.from('memetic_lite_scores').delete().eq('run_id', runId);
    const lite = (output.memetic_lite ?? output.scores ?? {}) as Record<string, number>;
    let composite = 0;
    for (const [dim, weight] of Object.entries(MM_LITE_WEIGHTS)) {
      const score = lite[dim] ?? 0;
      const contribution = score * weight;
      composite += contribution;
      await this.db.from('memetic_lite_scores').insert({
        run_id: runId,
        layer_execution_id: layerExecutionId,
        dimension: dim,
        score,
        weight,
        weighted_contribution: contribution,
        composite_score: composite,
      });
    }
  }

  private buildCards(layers: Record<string, Record<string, unknown>>) {
    const l3 = layers.translation ?? {};
    const l4 = layers.positioning ?? {};
    const l5 = layers.memetic_analysis ?? {};
    const l6 = layers.output_generation ?? {};

    return {
      clear_explanation: l6.simple_explanation ?? l3.simple_explanation ?? '',
      positioning: l6.positioning ?? l4.positioning ?? '',
      messaging_hook: l6.messaging_hook ?? (Array.isArray(l4.narrative_hooks) ? l4.narrative_hooks[0] : '') ?? '',
      memetic_angle: l6.memetic_narrative_angle ?? l5.memetic_narrative_angle ?? '',
    };
  }
}
