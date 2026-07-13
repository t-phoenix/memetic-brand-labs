import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPromptForLayer,
  loadNarrativeConfig,
  resetNarrativeConfigCache,
  getSchemaForLayer,
} from '../../src/config/narrativeConfig.js';
import { LAYER_KEYS } from '../../src/types/index.js';
import { VariableResolver } from '../../src/orchestrator/VariableResolver.js';
import { SchemaValidator } from '../../src/orchestrator/SchemaValidator.js';
import { buildDiagnosticSummary } from '../../src/orchestrator/diagnosticSummary.js';

describe('prompt optimisation wiring (config)', () => {
  beforeEach(() => resetNarrativeConfigCache());

  it('bumps meta to 1.2.0 with diagnose-before-generate principle', () => {
    const { meta } = loadNarrativeConfig();
    expect(meta.version).toBe('1.2.0');
    expect(meta.principles.some((p) => p.toLowerCase().includes('diagnose'))).toBe(true);
  });

  it('injects messaging_problem enum into L2 diagnostics', () => {
    const prompt = getPromptForLayer('diagnostics');
    expect(prompt.system_prompt).toContain('too_technical');
    expect(prompt.system_prompt).toContain('unclear_audience');
    expect(prompt.version).toBe('1.2.0');
  });

  it('L1 and L2 templates include mismatch_flags and website context', () => {
    const l1 = getPromptForLayer('interpretation');
    const l2 = getPromptForLayer('diagnostics');
    expect(l1.user_prompt_template).toContain('{{website_context}}');
    expect(l1.user_prompt_template).toContain('{{mismatch_flags}}');
    expect(l1.system_prompt.toLowerCase()).toContain('website');
    expect(l2.user_prompt_template).toContain('{{building}}');
    expect(l2.user_prompt_template).toContain('{{audience}}');
    expect(l2.user_prompt_template).toContain('{{website_context}}');
    expect(l2.user_prompt_template).toContain('{{mismatch_flags}}');
    expect(l2.user_prompt_template).toContain('{{patterns}}');
  });

  it('L3–L6 templates include diagnostic_summary; L3–L5 include patterns', () => {
    const l3 = getPromptForLayer('translation');
    const l4 = getPromptForLayer('positioning');
    const l5 = getPromptForLayer('memetic_analysis');
    const l6 = getPromptForLayer('output_generation');

    for (const p of [l3, l4, l5, l6]) {
      expect(p.user_prompt_template).toContain('{{diagnostic_summary}}');
    }
    expect(l3.user_prompt_template).toContain('{{patterns}}');
    expect(l4.user_prompt_template).toContain('{{patterns}}');
    expect(l5.user_prompt_template).toContain('{{patterns}}');
    expect(l6.system_prompt).toContain('L4.narrative_hooks');
  });

  it('resolves all layer templates without leftover placeholders for known vars', () => {
    const resolver = new VariableResolver();
    const baseVars = {
      ...resolver.buildInputVars({
        building: 'ZK identity layer',
        audience: 'wallet builders',
        challenge: 'too technical',
        differentiation: 'portable proofs',
        website_url: 'https://example.com',
      }),
      website_context: JSON.stringify({ title: 'Example', h1: 'Identity' }),
      mismatch_flags: JSON.stringify({ audience_mismatch: { form: 'wallet builders', site: 'everyone' } }),
      structured_output: JSON.stringify({ core_function: 'identity', messaging_problem: 'too_technical' }, null, 2),
      patterns: '1. [failure] Too technical: {}',
      prior_layers: JSON.stringify({ interpretation: { market: 'Web3' } }, null, 2),
      diagnostic_summary: buildDiagnosticSummary({
        scores: { clarity: 40, positioning: 70, audience: 50, differentiation: 60, relevance: 80 },
        messaging_problem: 'too_technical',
        findings: { jargon_overload: true },
      }),
    };

    for (const layer of LAYER_KEYS) {
      const prompt = getPromptForLayer(layer);
      const user = resolver.resolve(prompt.user_prompt_template, baseVars);
      expect(user).not.toMatch(/\{\{\w+\}\}/);
      expect(user.length).toBeGreaterThan(20);
    }
  });

  it('keeps existing JSON schemas valid for representative layer outputs', () => {
    const validator = new SchemaValidator();

    const cases: Array<{ layer: (typeof LAYER_KEYS)[number]; output: Record<string, unknown> }> = [
      {
        layer: 'interpretation',
        output: {
          core_function: 'Provide portable identity',
          target_user: 'wallet builders',
          primary_outcome: 'Users prove identity without silos',
          category: 'infrastructure',
          complexity_level: 'high',
          market: 'Web3',
          messaging_problem: 'too_technical',
        },
      },
      {
        layer: 'diagnostics',
        output: {
          scores: { clarity: 40, positioning: 55, audience: 50, differentiation: 60, relevance: 70 },
          findings: { jargon_overload: 'Heavy protocol language' },
          messaging_problem: 'too_technical',
        },
      },
      {
        layer: 'translation',
        output: { simple_explanation: 'Prove who you are without repeating paperwork.' },
      },
      {
        layer: 'positioning',
        output: {
          positioning: 'Identity rails for wallets',
          analogy: null,
          narrative_hooks: ['Own your identity once.', 'Carry proof everywhere.'],
        },
      },
      {
        layer: 'memetic_analysis',
        output: {
          memetic_narrative_angle: 'Carry your identity like a passport',
          memetic_lite: {
            clarity: 70,
            relatability: 65,
            identity_signal: 80,
            analogy_potential: 60,
            simplicity: 55,
            repeatability: 70,
          },
          qualitative: {
            familiarity: 'passport',
            contrast: 'vs siloed logins',
            shared_truth: 'identity is fragmented',
            participation_potential: 'retellable',
          },
        },
      },
      {
        layer: 'output_generation',
        output: {
          simple_explanation: 'Prove who you are without repeating paperwork.',
          positioning: 'Identity rails for wallets',
          messaging_hook: 'Own your identity once.',
          memetic_narrative_angle: 'Carry your identity like a passport',
        },
      },
    ];

    for (const { layer, output } of cases) {
      const schema = getSchemaForLayer(layer);
      const schemaKey = loadNarrativeConfig().prompts[layer].output_schema_ref;
      const result = validator.validate(schemaKey, schema, output);
      expect(result.valid, `${layer}: ${JSON.stringify(result.errors)}`).toBe(true);
    }
  });
});
