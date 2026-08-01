import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/jobs/queue.js', () => ({
  enqueueRun: vi.fn(),
}));

import { PipelineService } from '../../src/services/PipelineService.js';
import { enqueueRun } from '../../src/jobs/queue.js';

describe('PipelineService', () => {
  beforeEach(() => {
    vi.mocked(enqueueRun).mockClear();
  });

  it('startPipeline enqueues only once', async () => {
    let enqueuedAt: string | null = null;
    const updates: unknown[] = [];
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { pipeline_enqueued_at: enqueuedAt, status: 'pending' } })),
          })),
        })),
        update: vi.fn((patch: { pipeline_enqueued_at?: string }) => {
          updates.push(patch);
          if (patch.pipeline_enqueued_at) enqueuedAt = patch.pipeline_enqueued_at;
          return {
            eq: vi.fn(() => ({
              is: vi.fn(async () => ({ error: null })),
            })),
          };
        }),
      })),
    };

    const env = { PORT: 3001 } as never;
    const svc = new PipelineService(db as never, env);
    const first = await svc.startPipeline('run-1');
    const second = await svc.startPipeline('run-1');

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(updates).toHaveLength(1);
    expect(enqueueRun).toHaveBeenCalledTimes(1);
    expect(updates[0]).toMatchObject({ pipeline_enqueued_at: expect.any(String) });
  });

  it('isEnqueued returns true when timestamp set', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { pipeline_enqueued_at: '2026-01-01T00:00:00Z' } })),
          })),
        })),
      })),
    };
    const svc = new PipelineService(db as never, {} as never);
    expect(await svc.isEnqueued('run-1')).toBe(true);
  });
});
