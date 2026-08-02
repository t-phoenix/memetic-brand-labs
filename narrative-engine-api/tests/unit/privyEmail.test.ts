import { describe, expect, it } from 'vitest';
import { extractPrivyEmail } from '../../src/services/PrivyAuthService.js';
import type { User } from '@privy-io/server-auth';

describe('extractPrivyEmail', () => {
  it('prefers Google OAuth email', () => {
    const user = {
      id: 'did:privy:abc',
      google: { email: 'User@Gmail.com', subject: 'sub', name: 'User' },
      email: { address: 'other@company.com' },
      linkedAccounts: [],
    } as User;
    expect(extractPrivyEmail(user)).toBe('user@gmail.com');
  });

  it('falls back to linked account email', () => {
    const user = {
      id: 'did:privy:abc',
      linkedAccounts: [{ type: 'google_oauth', email: 'Found@Example.com', subject: 'sub', name: null }],
    } as User;
    expect(extractPrivyEmail(user)).toBe('found@example.com');
  });

  it('returns undefined when no email is linked', () => {
    const user = { id: 'did:privy:abc', linkedAccounts: [] } as User;
    expect(extractPrivyEmail(user)).toBeUndefined();
  });
});
