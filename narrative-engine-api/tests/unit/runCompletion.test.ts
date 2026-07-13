import { describe, it, expect, vi } from 'vitest';
import { healStuckFinalize, isInFlightStatus } from '../../src/orchestrator/runCompletion.js';

function mockDb(opts: {
  status?: string;
  cardCount?: number;
  updateError?: { message: string } | null;
  selectError?: { message: string } | null;
}) {
  const run = {
    id: 'run-1',
    status: opts.status ?? 'processing',
    started_at: new Date(Date.now() - 60_000).toISOString(),
    current_stage: 'output_generation',
  };

  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }),
  });

  return {
    from(table: string) {
      if (table === 'engine_runs') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: run, error: null }),
            }),
          }),
          update,
        };
      }
      if (table === 'run_outputs') {
        return {
          select: () => ({
            eq: async () => ({
              count: opts.cardCount ?? 4,
              error: opts.selectError ?? null,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    _update: update,
  };
}

describe('healStuckFinalize', () => {
  it('promotes processing runs with 4 cards to completed', async () => {
    const db = mockDb({ status: 'processing', cardCount: 4 });
    const healed = await healStuckFinalize(db as never, 'run-1', { share_error: 'bucket missing' });
    expect(healed).toBe(true);
    expect(db._update).toHaveBeenCalled();
    const patch = db._update.mock.calls[0][0];
    expect(patch.status).toBe('completed');
    expect(patch.current_stage).toBe('completed');
    expect(patch.progress_pct).toBe(100);
    expect(patch.failure_detail.share_error).toBe('bucket missing');
  });

  it('heals failed runs that already have cards', async () => {
    const db = mockDb({ status: 'failed', cardCount: 4 });
    const healed = await healStuckFinalize(db as never, 'run-1', { message: 'Share upload failed' });
    expect(healed).toBe(true);
  });

  it('does nothing when already completed', async () => {
    const db = mockDb({ status: 'completed', cardCount: 4 });
    const healed = await healStuckFinalize(db as never, 'run-1');
    expect(healed).toBe(false);
    expect(db._update).not.toHaveBeenCalled();
  });

  it('does nothing when fewer than 4 cards', async () => {
    const db = mockDb({ status: 'processing', cardCount: 2 });
    const healed = await healStuckFinalize(db as never, 'run-1');
    expect(healed).toBe(false);
    expect(db._update).not.toHaveBeenCalled();
  });
});

describe('isInFlightStatus', () => {
  it('classifies statuses', () => {
    expect(isInFlightStatus('processing')).toBe(true);
    expect(isInFlightStatus('running')).toBe(true);
    expect(isInFlightStatus('pending')).toBe(true);
    expect(isInFlightStatus('completed')).toBe(false);
    expect(isInFlightStatus('failed')).toBe(false);
  });
});
