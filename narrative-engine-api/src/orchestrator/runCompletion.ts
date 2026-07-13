import type { SupabaseClient } from '@supabase/supabase-js';

const TERMINAL = new Set(['completed', 'failed']);

/**
 * If a run already has the four public cards but never reached `completed`
 * (e.g. share-graphic upload failed after cards were written), promote it to completed.
 * Returns true when healing was applied.
 */
export async function healStuckFinalize(
  db: SupabaseClient,
  runId: string,
  detail?: { message?: string; share_error?: string },
): Promise<boolean> {
  const { data: run } = await db
    .from('engine_runs')
    .select('id, status, started_at, current_stage')
    .eq('id', runId)
    .maybeSingle();

  if (!run || run.status === 'completed') return false;

  const { count, error } = await db
    .from('run_outputs')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId);

  if (error || (count ?? 0) < 4) return false;

  const startedMs = run.started_at ? new Date(run.started_at).getTime() : Date.now();
  const patch: Record<string, unknown> = {
    status: 'completed',
    current_stage: 'completed',
    progress_pct: 100,
    completed_at: new Date().toISOString(),
    total_duration_ms: Date.now() - startedMs,
    failure_code: null,
  };

  if (detail?.share_error || detail?.message) {
    patch.failure_detail = {
      healed: true,
      note: 'Cards were ready; run completed despite a non-fatal finalize/share issue.',
      ...(detail.message ? { message: detail.message } : {}),
      ...(detail.share_error ? { share_error: detail.share_error } : {}),
    };
  }

  const { error: updateError } = await db.from('engine_runs').update(patch).eq('id', runId);
  return !updateError;
}

/** True when status is still in-flight (not terminal). */
export function isInFlightStatus(status: string | null | undefined): boolean {
  return Boolean(status) && !TERMINAL.has(status!);
}
