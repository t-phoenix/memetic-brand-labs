import type { FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authOptional(request: FastifyRequest, env: Env) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return;
  const token = header.slice(7);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.auth.getUser(token);
  if (data.user) {
    request.user = { id: data.user.id, email: data.user.email };
  }
}

export function requireAuth(request: FastifyRequest) {
  if (!request.user) {
    const err = new Error('Unauthorized') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
}

export function requireAdmin(request: FastifyRequest, env: Env) {
  const key = request.headers['x-admin-key'];
  if (!env.ADMIN_API_KEY) {
    const err = new Error('ADMIN_API_KEY is not configured on the server') as Error & { statusCode: number };
    err.statusCode = 503;
    throw err;
  }
  if (key === env.ADMIN_API_KEY) return;
  if (key) {
    const err = new Error('Invalid admin key') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
  requireAuth(request);
  if (request.user?.role !== 'admin') {
    const err = new Error('Forbidden') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
}
