import { createClient } from '@supabase/supabase-js';
import type { User } from '@privy-io/server-auth';
import type { Env } from '../config/env.js';
import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../routes/auth.js';

type PrivyClientLike = {
  verifyAuthToken: (token: string) => Promise<{ userId: string }>;
  getUser: (userId: string) => Promise<User>;
};

/** Resolve a verified email from Privy linked accounts (Google OAuth, Apple, email, etc.). */
export function extractPrivyEmail(user: User): string | undefined {
  if (user.google?.email) return user.google.email.toLowerCase();
  if (user.apple?.email) return user.apple.email.toLowerCase();
  if (user.email?.address) return user.email.address.toLowerCase();

  for (const account of user.linkedAccounts ?? []) {
    if (account.type === 'google_oauth' && 'email' in account && account.email) {
      return account.email.toLowerCase();
    }
    if (account.type === 'apple_oauth' && 'email' in account && account.email) {
      return account.email.toLowerCase();
    }
    if (account.type === 'email' && 'address' in account && account.address) {
      return account.address.toLowerCase();
    }
  }

  return undefined;
}

export class PrivyAuthService {
  private client: PrivyClientLike | null = null;

  constructor(private readonly env: Env) {
    if (env.PRIVY_APP_ID && env.PRIVY_APP_SECRET) {
      void this.init();
    }
  }

  private async init() {
    try {
      const { PrivyClient } = await import('@privy-io/server-auth');
      this.client = new PrivyClient(this.env.PRIVY_APP_ID!, this.env.PRIVY_APP_SECRET!);
    } catch (e) {
      console.warn('[privy] Failed to init PrivyClient:', e);
    }
  }

  async verifyToken(token: string) {
    if (!this.client) {
      if (this.env.PRIVY_APP_ID) await this.init();
      if (!this.client) return null;
    }
    try {
      const claims = await this.client.verifyAuthToken(token);
      try {
        const user = await this.client.getUser(claims.userId);
        return { userId: claims.userId, email: extractPrivyEmail(user) };
      } catch (e) {
        console.warn('[privy] getUser failed:', e);
        return { userId: claims.userId };
      }
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
