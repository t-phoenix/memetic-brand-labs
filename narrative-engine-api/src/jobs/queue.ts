import { Queue, Worker } from 'bullmq';
import type { Env } from '../config/env.js';
import { resolveRedisUrl } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { PipelineOrchestrator } from '../orchestrator/PipelineOrchestrator.js';

const QUEUE_NAME = 'narrative-pipeline';
const REDIS_ENQUEUE_TIMEOUT_MS = 5_000;

let queue: Queue | null = null;
let queueRedisUrl: string | undefined;

function redisConnection(redisUrl: string) {
  return {
    url: redisUrl,
    connectTimeout: REDIS_ENQUEUE_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
  };
}

export function getQueue(env: Env): Queue | null {
  const redisUrl = resolveRedisUrl(env);
  if (!redisUrl) return null;
  if (queue && queueRedisUrl === redisUrl) return queue;
  queue = new Queue(QUEUE_NAME, { connection: redisConnection(redisUrl) });
  queueRedisUrl = redisUrl;
  return queue;
}

async function queueRun(env: Env, runId: string) {
  const db = getSupabase(env);
  const q = getQueue(env);
  if (!q) {
    await scheduleInlineRun(env, runId);
    return;
  }

  try {
    const job = await Promise.race([
      q.add('process', { runId }, { attempts: 2, backoff: { type: 'exponential', delay: 3000 } }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Redis enqueue timeout')), REDIS_ENQUEUE_TIMEOUT_MS);
      }),
    ]);
    await db.from('pipeline_jobs').insert({
      run_id: runId,
      bull_job_id: job.id,
      queue_name: QUEUE_NAME,
      status: 'queued',
    });
  } catch (err) {
    console.error('[redis] enqueue failed, falling back to inline pipeline:', err);
    await scheduleInlineRun(env, runId);
  }
}

async function scheduleInlineRun(env: Env, runId: string) {
  const db = getSupabase(env);
  await db.from('pipeline_jobs').insert({
    run_id: runId,
    queue_name: QUEUE_NAME,
    status: 'queued',
  });
  void processRunInline(env, runId);
}

/** Fire-and-forget — HTTP handlers should not await this (inline runs can take ~60s). */
export function enqueueRun(env: Env, runId: string) {
  void queueRun(env, runId);
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
  const redisUrl = resolveRedisUrl(env);
  if (!redisUrl) return null;
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processRunInline(env, job.data.runId);
    },
    { connection: redisConnection(redisUrl) },
  );
  return worker;
}
