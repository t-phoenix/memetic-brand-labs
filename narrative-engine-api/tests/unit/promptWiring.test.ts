import { describe, expect, it } from 'vitest';
import { buildDiagnosticSummary, PATTERN_INJECTION_LAYERS } from '../../src/orchestrator/diagnosticSummary.js';

describe('buildDiagnosticSummary', () => {
  it('returns empty string without diagnostics', () => {
    expect(buildDiagnosticSummary(undefined)).toBe('');
    expect(buildDiagnosticSummary({})).toBe('');
  });

  it('summarizes low scores, messaging problem, and findings', () => {
    const summary = buildDiagnosticSummary({
      scores: { clarity: 42, positioning: 80, audience: 55, differentiation: 70, relevance: 90 },
      messaging_problem: 'too_technical',
      findings: { jargon_overload: 'Heavy API language', vague_outcome: 'No user benefit stated' },
    });
    expect(summary).toContain('clarity (42)');
    expect(summary).toContain('audience (55)');
    expect(summary).not.toContain('positioning (80)');
    expect(summary).toContain('messaging_problem=too_technical');
    expect(summary).toContain('jargon_overload');
    expect(summary).toContain('Prioritize fixing');
  });
});

describe('PATTERN_INJECTION_LAYERS', () => {
  it('is empty — pattern DB injection disabled (see pattern-library-roadmap.md)', () => {
    expect(PATTERN_INJECTION_LAYERS.size).toBe(0);
  });
});
