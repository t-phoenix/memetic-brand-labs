import { describe, it, expect } from 'vitest';
import { isRedisQuotaError } from '../../src/jobs/queue.js';

describe('isRedisQuotaError', () => {
  it('detects Upstash max requests errors', () => {
    expect(
      isRedisQuotaError(
        new Error('ReplyError: ERR max requests limit exceeded. Limit: 500000, Usage: 500000'),
      ),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isRedisQuotaError(new Error('Redis enqueue timeout'))).toBe(false);
    expect(isRedisQuotaError(new Error('ECONNREFUSED'))).toBe(false);
  });
});
