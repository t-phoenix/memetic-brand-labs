import { describe, expect, it } from 'vitest';
import {
  presentRunInputs,
  presentConfigSnapshot,
  presentLayerLegacyOutput,
  mergeLayerWithLegacy,
  buildPipelineFlow,
  buildRunMetadataFields,
} from './runDataPresenters.js';
import { shouldShowLayerSummary } from './layerPresenters.js';

describe('presentRunInputs', () => {
  it('extracts primary form fields and metadata', () => {
    const result = presentRunInputs({
      input_schema_version: 'ne-input-v1',
      building: 'Acme Corp',
      audience: 'SMB founders',
      challenge: 'unclear messaging',
      differentiation: 'AI-first',
      website_url: 'https://acme.com',
      char_counts: { building: 9, audience: 12 },
    });

    expect(result.primary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Building', value: 'Acme Corp' }),
        expect.objectContaining({ label: 'Audience', value: 'SMB founders' }),
      ]),
    );
    expect(result.metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Input schema', value: 'ne-input-v1' }),
      ]),
    );
    expect(result.charCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'building', count: 9 }),
      ]),
    );
  });

  it('returns empty structure when inputs are missing', () => {
    expect(presentRunInputs(null).primary).toEqual([]);
  });
});

describe('presentConfigSnapshot', () => {
  it('summarizes prompt versions and library versions', () => {
    const result = presentConfigSnapshot({
      prompt_versions: { interpretation: 'v3', diagnostics: 'v2' },
      pattern_library_version: 'seed-v1',
      guardrail_config_version: 'gr-v1',
      pricing_snapshot: { tier_key: 'standard', price_usdc: 5 },
    });

    expect(result.promptVersions).toHaveLength(2);
    expect(result.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Pattern library', value: 'seed-v1' }),
        expect.objectContaining({ label: 'Guardrails', value: 'gr-v1' }),
      ]),
    );
    expect(result.pricing?.tier_key).toBe('standard');
  });
});

describe('presentLayerLegacyOutput', () => {
  it('breaks down output fields and validation metadata', () => {
    const result = presentLayerLegacyOutput({
      layer_key: 'interpretation',
      output_schema_version: 'ne.interpretation.v1',
      validation_passed: true,
      output_hash: 'abc123',
      output: { market: 'SaaS', messaging_problem: 'unclear value' },
    });

    expect(result.layerKey).toBe('interpretation');
    expect(result.validation.passed).toBe(true);
    expect(result.outputFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'market', value: 'SaaS' }),
      ]),
    );
  });

  it('handles nested objects and arrays in output', () => {
    const result = presentLayerLegacyOutput({
      layer_key: 'positioning',
      output_schema_version: 'ne.positioning.v1',
      validation_passed: true,
      output: { narrative_hooks: ['hook one', 'hook two'] },
    });

    expect(result.outputFields.some((f) => f.key === 'narrative_hooks')).toBe(true);
  });
});

describe('mergeLayerWithLegacy', () => {
  it('attaches legacy metadata to processed layer', () => {
    const merged = mergeLayerWithLegacy(
      { layer_key: 'interpretation', status: 'completed' },
      {
        layer_key: 'interpretation',
        output_schema_version: 'ne.interpretation.v1',
        validation_passed: false,
        validation_errors: [{ message: 'missing field' }],
        output_hash: 'hash1',
      },
    );

    expect(merged.validation_passed).toBe(false);
    expect(merged.output_schema_version).toBe('ne.interpretation.v1');
    expect(merged.validation_errors).toHaveLength(1);
  });
});

describe('buildPipelineFlow', () => {
  it('builds serialized phases from inputs through layers to outputs', () => {
    const flow = buildPipelineFlow({
      run: { status: 'completed', model_tier: 'standard', total_duration_ms: 12000 },
      inputs: { building: 'Acme', website_url: 'https://acme.com' },
      pipeline: {
        layers: [
          { layer_key: 'interpretation', label: 'Understanding the brand', status: 'completed', duration_ms: 1000 },
          { layer_key: 'diagnostics', label: 'Health check', status: 'pending' },
        ],
        outputs: [{ card_key: 'clear_explanation', card_label: 'Clear Explanation', content: 'Hello' }],
        pattern_summary: [{ rank: 1, title: 'Pattern A' }],
      },
      costSummary: { total_llm_cost_usd: 0.05, total_prompt_tokens: 1000 },
    });

    expect(flow.phases[0].type).toBe('input');
    expect(flow.phases[0].status).toBe('completed');
    expect(flow.phases[0].fields.length).toBeGreaterThan(0);
    expect(flow.phases.some((p) => p.type === 'layer' && p.key === 'interpretation')).toBe(true);
    expect(flow.phases.some((p) => p.type === 'output')).toBe(true);
    expect(flow.phases.some((p) => p.type === 'metadata')).toBe(true);
    expect(flow.phases.find((p) => p.type === 'preprocess')?.status).toBe('completed');
  });

  it('marks website preprocess as skipped when no URL', () => {
    const flow = buildPipelineFlow({
      run: { status: 'running' },
      inputs: { building: 'Acme' },
      pipeline: { layers: [] },
    });

    expect(flow.phases.find((p) => p.type === 'preprocess')?.status).toBe('skipped');
  });

  it('includes scraped website fields when extraction is present', () => {
    const flow = buildPipelineFlow({
      run: { status: 'completed' },
      inputs: { website_url: 'https://acme.com' },
      pipeline: {
        layers: [],
        website_extraction: {
          url: 'https://acme.com',
          fetch_status: 'success',
          http_status: 200,
          duration_ms: 400,
          extracted: { title: 'Acme', h1: 'Build faster', meta_description: 'Dev tools' },
          mismatch_flags: { audience_mismatch: 'Site says everyone' },
        },
      },
    });

    const web = flow.phases.find((p) => p.id === 'website');
    expect(web.fields.some((f) => f.label === 'H1 headline')).toBe(true);
    expect(web.fields.some((f) => f.label.includes('Mismatch'))).toBe(true);
  });
});

describe('buildRunMetadataFields', () => {
  it('includes engine, payment, and failure metadata', () => {
    const fields = buildRunMetadataFields({
      run: {
        id: 'abc-123',
        engine_type: 'narrative',
        engine_version: '1.0',
        status: 'failed',
        failure_code: 'pipeline_error',
        failure_detail: { message: 'timeout' },
      },
      runDetail: { payment: { amount_usdc: 5, status: 'paid' } },
      pipeline: { events: [{}, {}] },
    });
    expect(fields.some((f) => f.label === 'Run ID')).toBe(true);
    expect(fields.some((f) => f.label === 'Failure code')).toBe(true);
    expect(fields.some((f) => f.label === 'Revenue')).toBe(true);
  });
});

describe('shouldShowLayerSummary', () => {
  it('hides summary when it duplicates a field value', () => {
    expect(
      shouldShowLayerSummary('Positioning: "API for devs"', [{ label: 'Positioning', value: 'API for devs' }]),
    ).toBe(false);
  });
});
