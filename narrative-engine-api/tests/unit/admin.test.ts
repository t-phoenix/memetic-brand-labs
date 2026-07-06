import { describe, expect, it } from 'vitest';
import { summarizeLayerOutput, layerLabel } from '../../src/admin/layerSummary.js';
import { buildPipelineLayers } from '../../src/admin/pipelineDto.js';

describe('layerSummary', () => {
  it('labels layers in plain English', () => {
    expect(layerLabel('memetic_analysis')).toBe('Memetic analysis');
  });

  it('summarizes interpretation output', () => {
    const s = summarizeLayerOutput('interpretation', { market: 'SaaS', messaging_problem: 'unclear value' });
    expect(s).toContain('SaaS');
    expect(s).toContain('unclear value');
  });
});

describe('pipelineDto', () => {
  it('merges executions and outputs per layer', () => {
    const layers = buildPipelineLayers({
      executions: [
        {
          layer_key: 'interpretation',
          status: 'completed',
          duration_ms: 1200,
          model: 'gpt-4o-mini',
          attempt_number: 1,
          started_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-01-01T00:00:02Z',
        },
      ],
      outputs: [{ layer_key: 'interpretation', output: { market: 'Tech' } }],
    });
    expect(layers).toHaveLength(6);
    expect(layers[0].status).toBe('completed');
    expect(layers[0].summary_plain).toContain('Tech');
    expect(layers[1].status).toBe('pending');
  });
});
