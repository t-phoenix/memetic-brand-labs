import { createClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../routes/auth.js';

export class PrivyAuthService {
  private verifyFn: ((token: string) => Promise<{ userId: string; email?: string }>) | null = null;

  constructor(private readonly env: Env) {
    if (env.PRIVY_APP_ID && env.PRIVY_APP_SECRET) {
      void this.init();
    }
  }

  private async init() {
    try {
      const { PrivyClient } = await import('@privy-io/server-auth');
      const client = new PrivyClient(this.env.PRIVY_APP_ID!, this.env.PRIVY_APP_SECRET!);
      this.verifyFn = async (token: string) => {
        const claims = await client.verifyAuthToken(token);
        return { userId: claims.userId, email: (claims as { email?: string }).email };
      };
    } catch (e) {
      console.warn('[privy] Failed to init PrivyClient:', e);
    }
  }

  async verifyToken(token: string) {
    if (!this.verifyFn) {
      if (this.env.PRIVY_APP_ID) await this.init();
      if (!this.verifyFn) return null;
    }
    try {
      return await this.verifyFn(token);
    } catch {
      return null;
    }
  }

  async authFromRequest(request: FastifyRequest, env: Env): Promise<AuthUser | null> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7);

    const privy = await this.verifyToken(token);
    if (privy) {
      return { id: privy.userId, email: privy.email, privyUserId: privy.userId, isPrivy: true };
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase.auth.getUser(token);
    if (data.user) {
      return { id: data.user.id, email: data.user.email ?? undefined };
    }
    return null;
  }
}
