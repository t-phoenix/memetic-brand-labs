import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NarrativeRunInput } from '../types/index.js';
import { normalizeText, sha256 } from '../utils/hash.js';
import { TelemetryService } from '../telemetry/TelemetryService.js';

export class RunService {
  private readonly telemetry: TelemetryService;

  constructor(private readonly db: SupabaseClient) {
    this.telemetry = new TelemetryService(db);
  }

  async ensureSession(sessionId: string, meta: { ipHash?: string; userAgent?: string; landingPath?: string }) {
    const { data } = await this.db.from('user_sessions').select('id').eq('session_id', sessionId).maybeSingle();
    if (data) {
      await this.db.from('user_sessions').update({ last_seen_at: new Date().toISOString() }).eq('session_id', sessionId);
      return;
    }
    await this.db.from('user_sessions').insert({
      session_id: sessionId,
      ip_hash: meta.ipHash,
      user_agent: meta.userAgent,
      landing_path: meta.landingPath ?? '/narrative-engine',
    });
  }

  async createRun(input: NarrativeRunInput, opts: { userId?: string; isFirstRun?: boolean; paymentStatus?: string }) {
    const sessionId = input.session_id ?? randomUUID();
    await this.ensureSession(sessionId, {});

    const modelTier = input.model_tier ?? 'fast';
    const { data: tier } = await this.db.from('pricing_tiers').select('*').eq('tier_key', modelTier).maybeSingle();

    const { data: run, error } = await this.db
      .from('engine_runs')
      .insert({
        session_id: sessionId,
        user_id: opts.userId ?? null,
        model_tier: modelTier,
        pricing_tier_key: modelTier,
        is_first_run: opts.isFirstRun ?? false,
        payment_status: opts.paymentStatus ?? (opts.isFirstRun ? 'free' : 'paid'),
        status: 'pending',
        current_stage: 'queued',
        progress_pct: 5,
      })
      .select('id')
      .single();

    if (error || !run) throw error ?? new Error('Failed to create run');

    const building = normalizeText(input.building);
    const audience = normalizeText(input.audience);
    const challenge = normalizeText(input.challenge);
    const differentiation = normalizeText(input.differentiation);

    await this.db.from('run_inputs').insert({
      run_id: run.id,
      building,
      audience,
      challenge,
      differentiation,
      website_url: input.website,
      inputs_raw: input,
      inputs_normalized: { building, audience, challenge, differentiation, website: input.website },
      char_counts: {
        building: building.length,
        audience: audience.length,
        challenge: challenge.length,
        differentiation: differentiation.length,
      },
    });

    const rootId = input.parent_run_id ?? run.id;
    let depth = 0;
    if (input.parent_run_id) {
      const { data: parent } = await this.db.from('run_lineage').select('depth, lineage_root_id').eq('run_id', input.parent_run_id).maybeSingle();
      depth = (parent?.depth ?? 0) + 1;
    }

    await this.db.from('run_lineage').insert({
      run_id: run.id,
      parent_run_id: input.parent_run_id ?? null,
      lineage_root_id: parentRoot(input.parent_run_id, rootId, depth),
      depth,
      change_summary: {},
    });

    const { data: prompts } = await this.db
      .from('prompt_templates')
      .select('id, layer_key, version')
      .eq('engine_type', 'narrative')
      .eq('is_active', true);

    const { data: enums } = await this.db.from('enum_definitions').select('*');
    await this.db.from('run_config_snapshots').insert({
      run_id: run.id,
      prompt_template_ids: Object.fromEntries((prompts ?? []).map((p) => [p.layer_key, p.id])),
      prompt_versions: Object.fromEntries((prompts ?? []).map((p) => [p.layer_key, p.version])),
      schema_versions: {},
      enum_snapshot: enums ?? [],
      pricing_snapshot: tier ?? { tier_key: modelTier },
      pattern_library_version: 'seed-v1',
      guardrail_config_version: 'v1',
    });

    await this.db.from('run_cost_summaries').insert({ run_id: run.id });
    await this.telemetry.emit(run.id, 'run.created', { model_tier: modelTier, session_id: sessionId });

    return { runId: run.id as string, sessionId };
  }

  async getRunStatus(runId: string) {
    const { data: run } = await this.db.from('engine_runs').select('*').eq('id', runId).single();
    return run;
  }

  async getOutputs(runId: string) {
    const { data: cards } = await this.db.from('run_outputs').select('*').eq('run_id', runId).order('card_meta->order');
    const { data: share } = await this.db.from('share_assets').select('share_id, og_image_path').eq('run_id', runId).maybeSingle();
    return {
      cards: (cards ?? []).map((c) => ({
        key: c.card_key,
        label: c.card_label,
        content: c.content,
        meta: c.card_meta,
      })),
      share_id: share?.share_id,
      graphic_path: share?.og_image_path,
    };
  }

  async verifyEmail(runId: string, email: string) {
    const emailHash = sha256(email.toLowerCase());
    await this.db.from('auth_events').insert({
      run_id: runId,
      event_type: 'magic_link.sent',
      email_hash: emailHash,
    });
    await this.db.from('engine_runs').update({ email_verified_for_run: true }).eq('id', runId);
    return { sent: true };
  }

  async deleteRun(runId: string, userId: string) {
    const { data: req } = await this.db
      .from('data_deletion_requests')
      .insert({ user_id: userId, scope: 'single_run', run_id: runId, status: 'completed', completed_at: new Date().toISOString() })
      .select('id')
      .single();

    await this.db.from('deleted_runs_tombstones').insert({
      run_id: runId,
      user_id: userId,
      deletion_request_id: req?.id,
    });

    await this.db.from('share_assets').update({ is_public: false, revoked_at: new Date().toISOString() }).eq('run_id', runId);
    await this.db.from('engine_runs').delete().eq('id', runId);
  }
}

function parentRoot(parentRunId: string | undefined, defaultRoot: string, depth: number): string {
  if (!parentRunId || depth === 0) return defaultRoot;
  return defaultRoot;
}
