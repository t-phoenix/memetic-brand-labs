import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import type { LayerKey } from '../types/index.js';
import { LAYER_KEYS } from '../types/index.js';
import { RunService } from './RunService.js';
import { PipelineOrchestrator } from '../orchestrator/PipelineOrchestrator.js';
import { layerIndex } from '../admin/layerSummary.js';

const runningLocks = new Set<string>();

export class AdminPlaygroundService {
  private readonly runs: RunService;
  private readonly orchestrator: PipelineOrchestrator;

  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
  ) {
    this.runs = new RunService(db);
    this.orchestrator = new PipelineOrchestrator(db, env);
  }

  async createTestRun(body: {
    building: string;
    audience: string;
    challenge: string;
    differentiation: string;
    website?: string;
    model_tier?: 'fast' | 'standard' | 'quality';
    clone_from_run_id?: string;
    mode?: 'full' | 'step';
  }) {
    await this.checkDailyLimit();

    let input = {
      building: body.building,
      audience: body.audience,
      challenge: body.challenge,
      differentiation: body.differentiation,
      website: body.website,
      model_tier: body.model_tier ?? 'standard',
      session_id: `admin-${randomUUID()}`,
    };

    if (body.clone_from_run_id) {
      const { data: src } = await this.db.from('run_inputs').select('*').eq('run_id', body.clone_from_run_id).maybeSingle();
      if (src) {
        input = {
          ...input,
          building: src.building,
          audience: src.audience,
          challenge: src.challenge,
          differentiation: src.differentiation,
          website: src.website_url ?? undefined,
        };
      }
    }

    const { runId } = await this.runs.createRun(input, {
      paymentStatus: 'admin_test',
      runSource: body.clone_from_run_id ? 'admin_replay' : 'admin_test',
      clientVersion: 'admin-playground',
    });

    if (body.mode === 'full') {
      this.scheduleRun(runId, 'full');
    }

    return { run_id: runId, status: body.mode === 'full' ? 'running' : 'pending' };
  }

  async runPipeline(runId: string, body: { mode: 'full' | 'from_layer'; from_layer?: LayerKey }) {
    await this.assertNotRunning(runId);
    if (body.mode === 'full') {
      this.scheduleRun(runId, 'full');
      return { run_id: runId, status: 'running' };
    }
    if (!body.from_layer) throw Object.assign(new Error('from_layer required'), { statusCode: 400 });
    this.scheduleRun(runId, 'from_layer', body.from_layer);
    return { run_id: runId, status: 'running' };
  }

  async runLayer(runId: string, layerKey: LayerKey, opts: { force?: boolean; retry?: boolean } = {}) {
    await this.assertNotRunning(runId);
    if (!opts.force) await this.assertPrerequisites(runId, layerKey);

    const attemptReason = opts.retry ? 'admin_retry' : 'initial';
    this.scheduleRun(runId, 'layer', layerKey, attemptReason);
    return { run_id: runId, layer_key: layerKey, status: 'running' };
  }

  async previewLayer(runId: string, layerKey: LayerKey) {
    return this.orchestrator.previewLayer(runId, layerKey);
  }

  async finalize(runId: string) {
    await this.assertNotRunning(runId);
    this.scheduleRun(runId, 'finalize');
    return { run_id: runId, status: 'running' };
  }

  private scheduleRun(
    runId: string,
    kind: 'full' | 'from_layer' | 'layer' | 'finalize',
    layerKey?: LayerKey,
    attemptReason?: string,
  ) {
    runningLocks.add(runId);
    void (async () => {
      try {
        if (kind === 'full') {
          await this.orchestrator.executeFull(runId, { skipShare: true });
        } else if (kind === 'from_layer' && layerKey) {
          await this.orchestrator.executeFromLayer(runId, layerKey, { skipShare: true });
        } else if (kind === 'layer' && layerKey) {
          await this.orchestrator.executeLayer(runId, layerKey, {
            attemptReason: (attemptReason as 'admin_retry') ?? 'initial',
            skipShare: true,
          });
        } else if (kind === 'finalize') {
          await this.orchestrator.finalizeRun(runId, { skipShare: true });
        }
      } catch (err) {
        console.error('[playground] run failed:', err);
      } finally {
        runningLocks.delete(runId);
      }
    })();
  }

  private async assertNotRunning(runId: string) {
    if (runningLocks.has(runId)) {
      throw Object.assign(new Error('Run is already processing'), { statusCode: 409 });
    }
    const { data: run } = await this.db.from('engine_runs').select('status').eq('id', runId).maybeSingle();
    if (run?.status === 'running') {
      throw Object.assign(new Error('Run is already processing'), { statusCode: 409 });
    }
  }

  private async assertPrerequisites(runId: string, layerKey: LayerKey) {
    const idx = layerIndex(layerKey);
    if (idx <= 0) return;
    const ctx = await this.orchestrator.loadRunContext(runId);
    for (let i = 0; i < idx; i++) {
      const key = LAYER_KEYS[i];
      if (!ctx.layerOutputs[key]) {
        throw Object.assign(new Error(`Complete "${key}" before running "${layerKey}"`), { statusCode: 400 });
      }
    }
  }

  private async checkDailyLimit() {
    const limit = this.env.ADMIN_PLAYGROUND_DAILY_LIMIT ?? 50;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await this.db
      .from('engine_runs')
      .select('*', { count: 'exact', head: true })
      .eq('run_source', 'admin_test')
      .gte('created_at', since);
    if ((count ?? 0) >= limit) {
      throw Object.assign(new Error('Admin playground daily limit reached'), { statusCode: 429 });
    }
  }
}
