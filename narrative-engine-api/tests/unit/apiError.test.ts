import { describe, expect, it } from 'vitest';
import { apiError, isConsumerDomain, emailDomain, CONSUMER_DOMAINS } from '../../src/lib/apiError.js';

describe('apiError', () => {
  it('builds structured error body', () => {
    const err = apiError('consumer_domain_blocked', 'blocked', {
      userMessage: 'Use company email',
      retryable: true,
      recoveryActions: [{ action: 'use_oauth', label: 'Google', method: 'oauth' }],
      statusCode: 422,
    });
    expect(err.statusCode).toBe(422);
    expect(err.body.error.code).toBe('consumer_domain_blocked');
    expect(err.body.error.user_message).toBe('Use company email');
    expect(err.body.error.recovery_actions).toHaveLength(1);
  });
});

describe('email domain helpers', () => {
  it('extracts domain', () => {
    expect(emailDomain('founder@acme.io')).toBe('acme.io');
  });

  it('flags consumer domains', () => {
    expect(isConsumerDomain('gmail.com', CONSUMER_DOMAINS)).toBe(true);
    expect(isConsumerDomain('acme.io', CONSUMER_DOMAINS)).toBe(false);
  });
});
