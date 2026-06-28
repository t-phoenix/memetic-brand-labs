import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_ANON_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  X402_PAY_TO: z.string().optional(),
  X402_FACILITATOR_URL: z.string().default('https://x402.org/facilitator'),
  RERUN_PRICE_USDC: z.coerce.number().default(10),
  IP_HASH_SALT: z.string().default('mbl-ne-dev-salt'),
  ADMIN_API_KEY: z.string().optional(),
  /** Set true only on the Render worker service — avoids duplicate BullMQ consumers on the web dyno */
  WORKER_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SENTRY_DSN: z.string().optional(),
  STORAGE_BUCKET: z.string().default('share-graphics'),
});

export type Env = z.infer<typeof envSchema>;

/** Comma-separated origins — strips whitespace and trailing slashes (CORS requires exact match). */
export function parseCorsOrigins(corsOrigin: string): string[] {
  return corsOrigin
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/** Localhost Redis is never reachable on Render — treat as unset so the inline pipeline runs. */
const LOCAL_REDIS_HOST =
  /^(?:rediss?:\/\/)(?:localhost|127\.0\.0\.1|\[::1\]|::1)(?::\d+)?(?:\/\d+)?$/i;

export function resolveRedisUrl(env: Env): string | undefined {
  const url = env.REDIS_URL?.trim();
  if (!url) return undefined;
  if (env.NODE_ENV === 'production' && LOCAL_REDIS_HOST.test(url)) {
    console.warn('[redis] Ignoring localhost REDIS_URL in production — using inline pipeline');
    return undefined;
  }
  return url;
}

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
