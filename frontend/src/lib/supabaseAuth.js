import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

export function getSupabaseClient() {
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set for email verification.');
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}
