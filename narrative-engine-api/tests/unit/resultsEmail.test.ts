import { describe, expect, it, vi } from 'vitest';
import { ResultsEmailService } from '../../src/services/ResultsEmailService.js';

function chainWith(data: unknown, opts?: { count?: number }) {
  const c = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    in: vi.fn(() => c),
    order: vi.fn(() => c),
    maybeSingle: vi.fn(async () => ({ data })),
    single: vi.fn(async () => ({ data: { id: 'delivery-1' } })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'delivery-1' } })) })) })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({})) })),
    then: (resolve: (v: { data: unknown; count?: number }) => void) =>
      resolve({ data, count: opts?.count }),
  };
  return c;
}

describe('ResultsEmailService', () => {
  it('enqueueOnComplete skips when no contact_email', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'engine_runs') return chainWith({ contact_email: null, status: 'completed' });
        return chainWith(null);
      }),
    };
    const config = { get: vi.fn(async () => true) };
    const svc = new ResultsEmailService(db as never, { RESEND_API_KEY: 'key', FRONTEND_URL: 'https://x.test' } as never, config as never);
    const enqueueSpy = vi.spyOn(svc, 'enqueue');
    await svc.enqueueOnComplete('run-1');
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('enqueueOnComplete enqueues when contact_email and cards exist', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'engine_runs') return chainWith({ contact_email: 'user@acme.com', status: 'completed' });
        if (table === 'result_email_deliveries') return chainWith(null);
        if (table === 'run_outputs') return chainWith(null, { count: 4 });
        return chainWith(null);
      }),
    };
    const config = { get: vi.fn(async () => true) };
    const svc = new ResultsEmailService(db as never, { RESEND_API_KEY: 'key', FRONTEND_URL: 'https://x.test' } as never, config as never);
    const enqueueSpy = vi.spyOn(svc, 'enqueue').mockResolvedValue(undefined);
    await svc.enqueueOnComplete('run-1');
    expect(enqueueSpy).toHaveBeenCalledWith('run-1', 'user@acme.com');
  });
});
