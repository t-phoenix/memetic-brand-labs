import { describe, expect, it, vi } from 'vitest';
import { AdminNotificationService } from '../../src/services/AdminNotificationService.js';

function chainWith(data: unknown) {
  const c = {
    select: vi.fn(() => c),
    eq: vi.fn(() => c),
    maybeSingle: vi.fn(async () => ({ data })),
    single: vi.fn(async () => ({ data: { id: 'notify-1' } })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'notify-1' } })) })) })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({})) })),
    then: (resolve: (v: { data: unknown }) => void) => resolve({ data }),
  };
  return c;
}

describe('AdminNotificationService', () => {
  it('skips admin_test runs', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'admin_notification_deliveries') return chainWith(null);
        if (table === 'engine_runs') {
          return chainWith({ id: 'run-1', status: 'completed', run_source: 'admin_test' });
        }
        return chainWith(null);
      }),
    };
    const config = {
      get: vi.fn(async (key: string) => {
        if (key === 'email.admin_notify_enabled') return true;
        return ['ops@example.com'];
      }),
    };
    const svc = new AdminNotificationService(
      db as never,
      { RESEND_API_KEY: 'key', FRONTEND_URL: 'https://x.test', PORT: 3001 } as never,
      config as never,
    );
    await svc.notifyRunCompleted('run-1');
    expect(db.from).not.toHaveBeenCalledWith('run_inputs');
  });

  it('skips when notifications disabled', async () => {
    const db = { from: vi.fn() };
    const config = { get: vi.fn(async () => false) };
    const svc = new AdminNotificationService(db as never, {} as never, config as never);
    await svc.notifyRunCompleted('run-1');
    expect(db.from).not.toHaveBeenCalled();
  });
});
