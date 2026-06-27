import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { LLMRouter } from '../llm/LLMRouter.js';
import { VariableResolver } from './VariableResolver.js';
import { SchemaValidator } from './SchemaValidator.js';
import { PatternRetriever } from '../patterns/PatternRetriever.js';
import { TelemetryService } from '../telemetry/TelemetryService.js';
import { CostCalculator } from '../telemetry/CostCalculator.js';
import { extractHomepage } from '../website/HomepageExtractor.js';
import { OutputGuardrailService } from '../services/OutputGuardrailService.js';
import { ShareService } from '../share/ShareService.js';
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

export class PipelineOrchestrator {
  private readonly llm: LLMRouter;
  private readonly resolver = new VariableResolver();
  private readonly validator = new SchemaValidator();
  private readonly patterns: PatternRetriever;
  private readonly telemetry: TelemetryService;
  private readonly costs: CostCalculator;
  private readonly guardrails = new OutputGuardrailService();
  private readonly share: ShareService;

  constructor(
    private readonly db: SupabaseClient,
    env: Env,
  ) {
    this.llm = new LLMRouter(env);
    this.patterns = new PatternRetriever(db);
    this.telemetry = new TelemetryService(db);
    this.costs = new CostCalculator(db);
    this.share = new ShareService(db, env);
  }

  async execute(runId: string): Promise<void> {
    const started = Date.now();
    await this.db
      .from('engine_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', runId);

    const { data: run } = await this.db.from('engine_runs').select('*').eq('id', runId).single();
    const { data: input } = await this.db.from('run_inputs').select('*').eq('run_id', runId).single();
    if (!run || !input) throw new Error('Run or input not found');

    const { data: tier } = await this.db
      .from('pricing_tiers')
      .select('model_routing')
      .eq('tier_key', run.model_tier)
      .maybeSingle();
    const routing = (tier?.model_routing ?? { default: 'gpt-4o-mini' }) as Record<string, string>;

    let websiteContext = '';
    if (input.website_url) {
      const extract = await extractHomepage(input.website_url, input.audience);
      await this.db.from('website_extractions').insert({
        run_id: runId,
        url: input.website_url,
        fetch_status: extract.fetch_status,
        http_status: extract.http_status,
        duration_ms: extract.duration_ms,
        extracted: extract.extracted,
        mismatch_flags: extract.mismatch_flags,
      });
      websiteContext = JSON.stringify(extract.extracted);
      await this.telemetry.emit(runId, 'website.extracted', { status: extract.fetch_status });
    }

    const layerOutputs: Record<string, Record<string, unknown>> = {};
    const inputVars = {
      ...this.resolver.buildInputVars(input),
      website_context: websiteContext,
    };

    for (const layerKey of LAYER_KEYS) {
      const stage = STAGE_PROGRESS[layerKey];
      await this.telemetry.enterStage(runId, layerKey, stage?.pct ?? 50);
      const stageStart = Date.now();

      const output = await this.runLayer(runId, layerKey, routing, inputVars, layerOutputs, run.model_tier);
      layerOutputs[layerKey] = output;

      await this.telemetry.completeStage(runId, layerKey, Date.now() - stageStart);
    }

    const cards = this.buildCards(layerOutputs);
    const showAnalogy = Boolean(layerOutputs.positioning?.analogy);
    const guard = this.guardrails.check(
      {
        clear_explanation: String(cards.clear_explanation),
        positioning: String(cards.positioning),
        messaging_hook: String(cards.messaging_hook),
        memetic_angle: String(cards.memetic_angle),
      },
      showAnalogy,
    );

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

    await this.share.createForRun(runId, String(cards.clear_explanation), String(cards.positioning));

    const duration = Date.now() - started;
    await this.db
      .from('engine_runs')
      .update({
        status: 'completed',
        current_stage: 'completed',
        progress_pct: 100,
        completed_at: new Date().toISOString(),
        total_duration_ms: duration,
      })
      .eq('id', runId);

    await this.telemetry.emit(runId, 'run.completed', { duration_ms: duration });
  }

  private async runLayer(
    runId: string,
    layerKey: LayerKey,
    routing: Record<string, string>,
    inputVars: Record<string, string>,
    prior: Record<string, Record<string, unknown>>,
    tier: string,
  ): Promise<Record<string, unknown>> {
    const attempt = await this.createLayerExecution(runId, layerKey);

    const { data: dbPrompt } = await this.db
      .from('prompt_templates')
      .select('*')
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

    let patternsText = '';
    if (layerKey === 'diagnostics' || layerKey === 'memetic_analysis') {
      const interp = prior.interpretation ?? {};
      const matched = await this.patterns.retrieve({
        market: String(interp.market ?? ''),
        category: String(interp.category ?? ''),
        messaging_problem: String(interp.messaging_problem ?? ''),
      });
      patternsText = this.patterns.formatForPrompt(matched);
      for (let i = 0; i < matched.length; i++) {
        await this.db.from('pattern_matches').insert({
          run_id: runId,
          layer_execution_id: attempt.id,
          pattern_id: matched[i].id,
          match_method: 'tag_filter',
          rank: i + 1,
        });
      }
    }

    const vars = {
      ...inputVars,
      structured_output: JSON.stringify(prior.interpretation ?? prior.diagnostics ?? {}, null, 2),
      patterns: patternsText,
      prior_layers: JSON.stringify(prior, null, 2),
    };

    const system = `${this.resolver.resolve(prompt.system_prompt, vars)}\n\n${formatSchemaInstruction(schema)}`;
    const user = this.resolver.resolve(prompt.user_prompt_template, vars);

    await this.db.from('layer_prompt_snapshots').insert({
      layer_execution_id: attempt.id,
      system_prompt: system,
      user_prompt: user,
      variables_resolved: vars,
    });

    const model = this.llm.resolveModel(tier, layerKey, routing);
    const result = await this.llm.complete(model, system, user);
    const parsed = JSON.parse(result.content) as Record<string, unknown>;

    const validation = this.validator.validate(schemaKey, schema as object, parsed);

    const cost = await this.costs.calculate(
      result.provider,
      result.model,
      result.promptTokens,
      result.completionTokens,
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
      inputCostUsd: cost.inputCostUsd,
      outputCostUsd: cost.outputCostUsd,
      pricingVersion: cost.version,
      requestIdProvider: result.requestId,
      errorCode: validation.valid ? undefined : 'schema_invalid',
    });

    if (!validation.valid) {
      const detail = JSON.stringify(validation.errors);
      throw new Error(`Schema validation failed for ${layerKey}: ${detail}`);
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
      output_schema_version: schemaKey,
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

    return parsed;
  }

  private async createLayerExecution(runId: string, layerKey: string) {
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
