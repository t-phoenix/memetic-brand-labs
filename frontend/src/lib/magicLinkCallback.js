import { getSupabaseClient, isSupabaseConfigured } from './supabaseAuth';

function parseAuthParamsFromHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.includes('access_token=')) return null;

  const tokenIndex = raw.indexOf('access_token=');
  const query = tokenIndex > 0 ? raw.slice(tokenIndex) : raw;
  const params = new URLSearchParams(query);

  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  return {
    access_token: accessToken,
    refresh_token: params.get('refresh_token') ?? '',
    type: params.get('type'),
  };
}

function clearAuthHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', `${pathname}${search}`);
}

/** Complete Supabase magic-link session from URL hash tokens. Returns verified email if any. */
export async function consumeMagicLinkHash() {
  if (!isSupabaseConfigured()) return null;

  const tokens = parseAuthParamsFromHash();
  if (!tokens) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  clearAuthHash();

  if (error) throw error;
  return data.session?.user?.email?.toLowerCase() ?? null;
}

export async function getSupabaseSessionEmail() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email?.toLowerCase() ?? null;
}

/**
 * If the user lands on the wrong page after clicking a magic link (e.g. /#narrative-engine),
 * recover by sending them to verify-email with known query params.
 */
export function buildVerifyEmailPathFromHash() {
  const tokens = parseAuthParamsFromHash();
  if (!tokens) return null;
  return '/narrative-engine/verify-email';
}

export function hasMagicLinkHash() {
  return Boolean(parseAuthParamsFromHash());
}
