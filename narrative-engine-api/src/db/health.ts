import type { SupabaseClient } from '@supabase/supabase-js';

export function formatDbError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Database request failed';
  const err = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [err.message, err.details, err.hint, err.code].filter(Boolean);
  const text = parts.join(' | ');
  if (text.includes('ENOTFOUND') || text.includes('fetch failed')) {
    return 'Database unreachable. Check SUPABASE_URL in narrative-engine-api/.env and that the Supabase project exists.';
  }
  return text || 'Database request failed';
}

export async function pingDatabase(db: SupabaseClient): Promise<{ ok: boolean; message?: string }> {
  const { error } = await db.from('pricing_tiers').select('tier_key').limit(1);
  if (error) return { ok: false, message: formatDbError(error) };
  return { ok: true };
}
