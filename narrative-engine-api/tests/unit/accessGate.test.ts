import { describe, expect, it, vi } from 'vitest';
import { AccessGateService } from '../../src/services/AccessGateService.js';

function makeThenable(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data })),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(async () => ({ data: { id: 'grant-1' }, error: null })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return chain;
}

describe('AccessGateService', () => {
  it('hasAccess returns true for legacy email_verified_for_run', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'engine_runs') {
          return makeThenable({ access_status: 'locked', email_verified_for_run: true });
        }
        return makeThenable([]);
      }),
    };
    const svc = new AccessGateService(db as never);
    expect(await svc.hasAccess('run-1')).toBe(true);
  });

  it('hasAccess returns false when locked without grants', async () => {
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'engine_runs') {
          return makeThenable({ access_status: 'locked', email_verified_for_run: false });
        }
        return makeThenable([]);
      }),
    };
    const svc = new AccessGateService(db as never);
    expect(await svc.hasAccess('run-1')).toBe(false);
  });

  it('grantAccess records grant type oauth', async () => {
    const inserts: unknown[] = [];
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'run_access_grants') {
          const chain = {
            insert: vi.fn((row: unknown) => {
              inserts.push(row);
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: { id: 'grant-1' }, error: null })),
                })),
              };
            }),
          };
          return chain;
        }
        return {
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        };
      }),
    };
    const svc = new AccessGateService(db as never);
    await svc.grantAccess({ runId: 'run-1', grantType: 'oauth', principalId: 'privy-abc' });
    expect(inserts[0]).toMatchObject({ grant_type: 'oauth', principal_id: 'privy-abc' });
  });

  it('hasEmailGrantForPrincipal returns true when email grant exists', async () => {
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
    expect(await svc.hasEmailGrantForPrincipal('hash-abc')).toBe(true);
  });

  it('hasOAuthGrantForPrincipal returns true when oauth grant exists', async () => {
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
    expect(await svc.hasOAuthGrantForPrincipal('privy-abc')).toBe(true);
  });

  it('getOAuthStatus reflects prior oauth usage', async () => {
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
    const status = await svc.getOAuthStatus('privy-abc', 'user@gmail.com');
    expect(status).toMatchObject({
      authenticated: true,
      email: 'user@gmail.com',
      oauth_free_used: true,
      can_use_oauth: false,
    });
  });
});
