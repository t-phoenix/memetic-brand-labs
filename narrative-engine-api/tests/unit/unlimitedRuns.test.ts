import { describe, expect, it, vi } from 'vitest';
import { BusinessConfigService } from '../../src/services/BusinessConfigService.js';
import { AccessGateService } from '../../src/services/AccessGateService.js';

function makeConfig(getImpl: (key: string) => unknown) {
  return {
    get: vi.fn(async (key: string) => getImpl(key)),
    hasUnlimitedRunsForEmail: BusinessConfigService.prototype.hasUnlimitedRunsForEmail.bind({
      get: vi.fn(async (key: string) => getImpl(key)),
      adminNotifyRecipients: BusinessConfigService.prototype.adminNotifyRecipients.bind({
        get: vi.fn(async (key: string) => getImpl(key)),
      }),
    }),
  };
}

describe('BusinessConfigService unlimited runs', () => {
  it('hasUnlimitedRunsForEmail returns false when toggle disabled', async () => {
    const db = { from: vi.fn() };
    const config = new BusinessConfigService(db as never, {} as never);
    config.get = vi.fn(async (key: string) => {
      if (key === 'access.admin_recipient_unlimited_runs_enabled') return false;
      if (key === 'email.admin_notify_recipients') return ['ops@example.com'];
      return undefined;
    });

    expect(await config.hasUnlimitedRunsForEmail('ops@example.com')).toBe(false);
  });

  it('hasUnlimitedRunsForEmail returns true for listed recipient when enabled', async () => {
    const db = { from: vi.fn() };
    const config = new BusinessConfigService(db as never, {} as never);
    config.get = vi.fn(async (key: string) => {
      if (key === 'access.admin_recipient_unlimited_runs_enabled') return true;
      if (key === 'email.admin_notify_recipients') return ['Ops@Example.com', 'other@test.com'];
      return undefined;
    });

    expect(await config.hasUnlimitedRunsForEmail('ops@example.com')).toBe(true);
    expect(await config.hasUnlimitedRunsForEmail('notlisted@test.com')).toBe(false);
  });
});

describe('AccessGateService unlimited bypass', () => {
  it('isEmailFreeUnlockBlocked returns false for unlimited admin recipient', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ count: 1 })),
            })),
          })),
        })),
      })),
    };
    const svc = new AccessGateService(db as never);
    const config = makeConfig((key) => {
      if (key === 'access.admin_recipient_unlimited_runs_enabled') return true;
      if (key === 'email.admin_notify_recipients') return ['admin@example.com'];
      return undefined;
    });

    expect(await svc.isEmailFreeUnlockBlocked('admin@example.com', 'hash-abc', config as never)).toBe(false);
    expect(await svc.isEmailFreeUnlockBlocked('user@example.com', 'hash-abc', config as never)).toBe(true);
  });

  it('isOAuthFreeUnlockBlocked returns false for unlimited admin recipient', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ count: 1 })),
            })),
          })),
        })),
      })),
    };
    const svc = new AccessGateService(db as never);
    const config = makeConfig((key) => {
      if (key === 'access.admin_recipient_unlimited_runs_enabled') return true;
      if (key === 'email.admin_notify_recipients') return ['admin@example.com'];
      return undefined;
    });

    expect(await svc.isOAuthFreeUnlockBlocked('privy-abc', 'admin@example.com', config as never)).toBe(false);
    expect(await svc.isOAuthFreeUnlockBlocked('privy-abc', 'user@example.com', config as never)).toBe(true);
  });

  it('getOAuthStatus allows oauth when unlimited recipient', async () => {
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ count: 1 })),
            })),
          })),
        })),
      })),
    };
    const svc = new AccessGateService(db as never);
    const config = makeConfig((key) => {
      if (key === 'access.admin_recipient_unlimited_runs_enabled') return true;
      if (key === 'email.admin_notify_recipients') return ['admin@example.com'];
      return undefined;
    });

    const status = await svc.getOAuthStatus('privy-abc', 'admin@example.com', config as never);
    expect(status).toMatchObject({
      oauth_free_used: false,
      can_use_oauth: true,
    });
  });
});
