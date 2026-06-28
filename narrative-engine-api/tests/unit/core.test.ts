import { describe, it, expect } from 'vitest';
import { parseCorsOrigins, resolveRedisUrl } from '../../src/config/env.js';
import { SchemaValidator } from '../../src/orchestrator/SchemaValidator.js';
import { VariableResolver } from '../../src/orchestrator/VariableResolver.js';
import { OutputGuardrailService } from '../../src/services/OutputGuardrailService.js';
import { MM_LITE_WEIGHTS } from '../../src/types/index.js';

describe('SchemaValidator', () => {
  it('validates interpretation schema', () => {
    const v = new SchemaValidator();
    const schema = {
      type: 'object',
      required: ['core_function', 'market'],
      properties: { core_function: { type: 'string' }, market: { type: 'string' } },
    };
    const result = v.validate('test', schema, { core_function: 'x', market: 'Web3' });
    expect(result.valid).toBe(true);
  });
});

describe('VariableResolver', () => {
  it('resolves template variables', () => {
    const r = new VariableResolver();
    expect(r.resolve('Hello {{building}}', { building: 'world' })).toBe('Hello world');
  });
});

describe('OutputGuardrailService', () => {
  it('flags viral language', () => {
    const g = new OutputGuardrailService();
    const result = g.check({ messaging_hook: 'Go viral now' }, false);
    expect(result.passed).toBe(false);
  });
});

describe('MM_LITE_WEIGHTS', () => {
  it('sums to 1', () => {
    const sum = Object.values(MM_LITE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe('resolveRedisUrl', () => {
  const base = {
    NODE_ENV: 'production' as const,
    PORT: 3001,
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    CORS_ORIGIN: 'http://localhost:5173',
    X402_FACILITATOR_URL: 'https://x402.org/facilitator',
    RERUN_PRICE_USDC: 10,
    IP_HASH_SALT: 'salt',
    WORKER_MODE: false,
    STORAGE_BUCKET: 'share-graphics',
  };

  it('ignores localhost Redis in production', () => {
    expect(resolveRedisUrl({ ...base, REDIS_URL: 'redis://localhost:6379' })).toBeUndefined();
    expect(resolveRedisUrl({ ...base, REDIS_URL: 'redis://127.0.0.1:6379' })).toBeUndefined();
  });

  it('keeps remote Redis in production', () => {
    expect(resolveRedisUrl({ ...base, REDIS_URL: 'rediss://default:pass@host.upstash.io:6379' })).toBe(
      'rediss://default:pass@host.upstash.io:6379',
    );
  });
});

describe('parseCorsOrigins', () => {
  it('strips trailing slashes', () => {
    expect(parseCorsOrigins('https://example.com/, https://other.com')).toEqual([
      'https://example.com',
      'https://other.com',
    ]);
  });
});
