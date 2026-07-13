import { describe, it, expect } from 'vitest';
import { VariableResolver } from '../../src/orchestrator/VariableResolver.js';
import { buildDiagnosticSummary, PATTERN_INJECTION_LAYERS } from '../../src/orchestrator/diagnosticSummary.js';
import type { LayerKey } from '../../src/types/index.js';

describe('VariableResolver', () => {
  const resolver = new VariableResolver();

  it('resolves template variables and blanks missing keys', () => {
    expect(resolver.resolve('Hello {{building}} {{missing}}', { building: 'world' })).toBe('Hello world ');
  });

  it('maps form fields including website_url from DB shape', () => {
    const vars = resolver.buildInputVars({
      building: 'ZK identity',
      audience: 'wallets',
      challenge: 'too technical',
      differentiation: 'portable proofs',
      website_url: 'https://example.com',
    });
    expect(vars.building).toBe('ZK identity');
    expect(vars.audience).toBe('wallets');
    expect(vars.challenge).toBe('too technical');
    expect(vars.differentiation).toBe('portable proofs');
    expect(vars.website_url).toBe('https://example.com');
    expect(vars.product_description).toBe('ZK identity');
  });

  it('falls back to legacy website field', () => {
    const vars = resolver.buildInputVars({
      building: 'a',
      audience: 'b',
      challenge: 'c',
      differentiation: 'd',
      website: 'https://legacy.example',
    });
    expect(vars.website_url).toBe('https://legacy.example');
  });

  it('prefers website_url over website', () => {
    const vars = resolver.buildInputVars({
      building: 'a',
      audience: 'b',
      challenge: 'c',
      differentiation: 'd',
      website_url: 'https://primary.example',
      website: 'https://legacy.example',
    });
    expect(vars.website_url).toBe('https://primary.example');
  });
});

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
  it('covers L2–L5 but not L1 or L6', () => {
    expect(PATTERN_INJECTION_LAYERS.has('diagnostics')).toBe(true);
    expect(PATTERN_INJECTION_LAYERS.has('translation')).toBe(true);
    expect(PATTERN_INJECTION_LAYERS.has('positioning')).toBe(true);
    expect(PATTERN_INJECTION_LAYERS.has('memetic_analysis')).toBe(true);
    expect(PATTERN_INJECTION_LAYERS.has('interpretation')).toBe(false);
    expect(PATTERN_INJECTION_LAYERS.has('output_generation')).toBe(false);
  });

  it('only contains known layer keys', () => {
    for (const key of PATTERN_INJECTION_LAYERS) {
      expect(['diagnostics', 'translation', 'positioning', 'memetic_analysis']).toContain(key as LayerKey);
    }
  });
});
