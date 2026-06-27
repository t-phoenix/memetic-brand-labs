import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

let client: SupabaseClient | null = null;

export function getSupabase(env: Env): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
