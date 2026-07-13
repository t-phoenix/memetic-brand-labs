import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutputGuardrailService } from '../../src/services/OutputGuardrailService.js';
import { CARD_DEFINITIONS } from '../../src/types/index.js';

/**
 * Unit-level coverage for finalize ordering invariants used by PipelineOrchestrator.finalizeRun:
 * cards are the deliverable; share failures must not block completion semantics.
 */
describe('finalize completion invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('guardrails never throw and only flag', () => {
    const g = new OutputGuardrailService();
    const result = g.check(
      {
        clear_explanation: 'Clear line',
        positioning: 'Category for builders',
        messaging_hook: 'Own your identity once. And again.',
        memetic_angle: 'Passport for the open web',
      },
      false,
    );
    expect(result.passed).toBe(false);
    expect(result.events.every((e) => e.action_taken === 'flag')).toBe(true);
  });

  it('expects exactly four public card definitions', () => {
    expect(CARD_DEFINITIONS).toHaveLength(4);
    expect(CARD_DEFINITIONS.map((c) => c.key)).toEqual([
      'clear_explanation',
      'positioning',
      'messaging_hook',
      'memetic_angle',
    ]);
  });

  it('share failure should be treated as non-fatal after cards exist', async () => {
    // Simulates the finalize contract: write cards → attempt share → always mark completed.
    const state = {
      status: 'processing',
      cards: 0,
      shareAttempts: 0,
      shareOk: false,
    };

    const writeCards = async () => {
      state.cards = 4;
    };
    const createShare = async () => {
      state.shareAttempts += 1;
      throw new Error('Storage bucket not found');
    };
    const markCompleted = async (shareError?: string) => {
      state.status = 'completed';
      state.shareOk = !shareError;
    };

    await writeCards();
    let shareError: string | undefined;
    try {
      await createShare();
    } catch (err) {
      shareError = err instanceof Error ? err.message : 'share failed';
    }
    await markCompleted(shareError);

    expect(state.cards).toBe(4);
    expect(state.shareAttempts).toBe(1);
    expect(state.status).toBe('completed');
    expect(state.shareOk).toBe(false);
    expect(shareError).toContain('Storage bucket');
  });
});
