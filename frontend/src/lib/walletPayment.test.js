import { describe, expect, it } from 'vitest';
import {
  formatUsdc,
  getUsdcAddress,
  hasSufficientBalance,
  truncateAddress,
  buildPaymentSummary,
} from '../../src/lib/walletPayment.js';

describe('walletPayment helpers', () => {
  it('getUsdcAddress returns Base mainnet USDC', () => {
    expect(getUsdcAddress()).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  });

  it('truncateAddress shortens hex addresses', () => {
    expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('hasSufficientBalance compares with small epsilon', () => {
    expect(hasSufficientBalance(0.1, 0.1)).toBe(true);
    expect(hasSufficientBalance(0.09, 0.1)).toBe(false);
    expect(hasSufficientBalance(0.1000001, 0.1)).toBe(true);
  });

  it('formatUsdc shows 4 decimals for tiny amounts', () => {
    expect(formatUsdc(0.001)).toBe('0.0010');
    expect(formatUsdc(0.1)).toBe('0.10');
  });

  it('buildPaymentSummary formats quote for modal', () => {
    const summary = buildPaymentSummary({
      quote: {
        price_usdc: 0.1,
        asset: 'USDC',
        chain_name: 'Base',
        pay_to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        description: 'Test analysis',
      },
      walletAddress: '0x1111111111111111111111111111111111111111',
    });
    expect(summary.amount).toBe('0.10');
    expect(summary.chain).toBe('Base');
    expect(summary.payer).toBe('0x1111…1111');
    expect(summary.dapp).toContain('Narrative Engine');
  });
});
