import { Queue, Worker } from 'bullmq';
import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { PipelineOrchestrator } from '../orchestrator/PipelineOrchestrator.js';

const QUEUE_NAME = 'narrative-pipeline';

let queue: Queue | null = null;

export function getQueue(env: Env): Queue | null {
  if (!env.REDIS_URL) return null;
  if (queue) return queue;
  const connection = { url: env.REDIS_URL };
  queue = new Queue(QUEUE_NAME, { connection });
  return queue;
}

export async function enqueueRun(env: Env, runId: string) {
  const db = getSupabase(env);
  const q = getQueue(env);

  if (q) {
    const job = await q.add('process', { runId }, { attempts: 2, backoff: { type: 'exponential', delay: 3000 } });
    await db.from('pipeline_jobs').insert({
      run_id: runId,
      bull_job_id: job.id,
      queue_name: QUEUE_NAME,
      status: 'queued',
    });
  } else {
    await db.from('pipeline_jobs').insert({
      run_id: runId,
      queue_name: QUEUE_NAME,
      status: 'queued',
    });
    await processRunInline(env, runId);
  }
}

export async function processRunInline(env: Env, runId: string) {
  const db = getSupabase(env);
  const orchestrator = new PipelineOrchestrator(db, env);
  try {
    await orchestrator.execute(runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db
      .from('engine_runs')
      .update({
        status: 'failed',
        failure_code: 'pipeline_error',
        failure_detail: { message },
      })
      .eq('id', runId);
    // Inline runs: failure is persisted; route already returned 201 — do not rethrow
  }
}

export function startWorker(env: Env) {
  if (!env.REDIS_URL) return null;
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processRunInline(env, job.data.runId);
    },
    { connection: { url: env.REDIS_URL } },
  );
  return worker;
}
