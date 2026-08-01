import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { enqueueRun } from '../jobs/queue.js';

export class PipelineService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly env: Env,
  ) {}

  async isEnqueued(runId: string): Promise<boolean> {
    const { data } = await this.db
      .from('engine_runs')
      .select('pipeline_enqueued_at')
      .eq('id', runId)
      .maybeSingle();
    return Boolean(data?.pipeline_enqueued_at);
  }

  async startPipeline(runId: string): Promise<boolean> {
    const { data: run } = await this.db
      .from('engine_runs')
      .select('pipeline_enqueued_at, status')
      .eq('id', runId)
      .maybeSingle();

    if (!run || run.pipeline_enqueued_at) return false;

    const now = new Date().toISOString();
    const { error } = await this.db
      .from('engine_runs')
      .update({ pipeline_enqueued_at: now })
      .eq('id', runId)
      .is('pipeline_enqueued_at', null);

    if (error) throw error;

    enqueueRun(this.env, runId);
    return true;
  }
}
