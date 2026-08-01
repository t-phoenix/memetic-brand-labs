import { Queue, Worker } from 'bullmq';
import type { Env } from '../config/env.js';
import { resolveRedisUrl } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { PipelineOrchestrator } from '../orchestrator/PipelineOrchestrator.js';
import { healStuckFinalize } from '../orchestrator/runCompletion.js';
import { BusinessConfigService } from '../services/BusinessConfigService.js';
import { ResultsEmailService } from '../services/ResultsEmailService.js';
import { AdminNotificationService } from '../services/AdminNotificationService.js';

const QUEUE_NAME = 'narrative-pipeline';
const REDIS_ENQUEUE_TIMEOUT_MS = 5_000;

/** Keep Redis Cloud free tier (~30MB) from filling with old job payloads. */
const JOB_RETENTION = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: { age: 3600, count: 1000 }, // 1 hour / keep last 1000
  removeOnFail: { age: 86400, count: 500 }, // 24 hours / keep last 500
};

/** Reduce idle polling so free Redis plans aren't hammered. */
const WORKER_OPTS = {
  concurrency: 1,
  stalledInterval: 300_000,
  drainDelay: 30,
  lockDuration: 120_000,
};

let queue: Queue | null = null;
let queueRedisUrl: string | undefined;
/** Once Redis quota is exhausted, skip Redis for the rest of the process lifetime. */
let redisDisabledReason: string | null = null;

function redisConnection(redisUrl: string) {
  return {
    url: redisUrl,
    connectTimeout: REDIS_ENQUEUE_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };
}

export function isRedisQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /max requests limit exceeded/i.test(message) || /ERR max requests/i.test(message);
}

export function disableRedis(reason: string) {
  redisDisabledReason = reason;
  console.warn(`[redis] disabled for this process: ${reason}`);
  if (queue) {
    void queue.close().catch(() => undefined);
    queue = null;
    queueRedisUrl = undefined;
  }
}

export function getRedisDisabledReason(): string | null {
  return redisDisabledReason;
}

export function getQueue(env: Env): Queue | null {
  if (redisDisabledReason) return null;
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
      q.add('process', { runId }, JOB_RETENTION),
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
    if (isRedisQuotaError(err)) {
      disableRedis('Redis max requests limit exceeded — falling back to inline pipeline');
    } else {
      console.error('[redis] enqueue failed, falling back to inline pipeline:', err);
    }
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
  const config = new BusinessConfigService(db, env);
  const resultsEmail = new ResultsEmailService(db, env, config);
  const adminNotifications = new AdminNotificationService(db, env, config);
  const orchestrator = new PipelineOrchestrator(db, env, { resultsEmail, adminNotifications });
  try {
    await orchestrator.execute(runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const healed = await healStuckFinalize(db, runId, { message });
    if (healed) {
      console.warn(`[pipeline] run ${runId} healed to completed after error:`, message);
      return;
    }
    await db
      .from('engine_runs')
      .update({
        status: 'failed',
        failure_code: 'pipeline_error',
        failure_detail: { message },
      })
      .eq('id', runId);
  }
}

export function startWorker(env: Env) {
  if (redisDisabledReason) return null;
  const redisUrl = resolveRedisUrl(env);
  if (!redisUrl) return null;

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processRunInline(env, job.data.runId);
    },
    {
      connection: redisConnection(redisUrl),
      ...WORKER_OPTS,
    },
  );

  worker.on('error', (err) => {
    console.error('[worker] error:', err);
    if (isRedisQuotaError(err)) {
      disableRedis('Worker hit Redis max requests limit');
      void worker.close().catch(() => undefined);
    }
  });

  return worker;
}
