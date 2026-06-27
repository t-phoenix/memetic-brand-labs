import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../../src/orchestrator/SchemaValidator.js';
import { VariableResolver } from '../../src/orchestrator/VariableResolver.js';
import { OutputGuardrailService } from '../../src/services/OutputGuardrailService.js';
import { MM_LITE_WEIGHTS } from '../../src/types/index.js';

describe('SchemaValidator', () => {
  it('validates interpretation schema', () => {
    const v = new SchemaValidator();
    const schema = {
      type: 'object',
      required: ['core_function', 'market'],
      properties: { core_function: { type: 'string' }, market: { type: 'string' } },
    };
    const result = v.validate('test', schema, { core_function: 'x', market: 'Web3' });
    expect(result.valid).toBe(true);
  });
});

describe('VariableResolver', () => {
  it('resolves template variables', () => {
    const r = new VariableResolver();
    expect(r.resolve('Hello {{building}}', { building: 'world' })).toBe('Hello world');
  });
});

describe('OutputGuardrailService', () => {
  it('flags viral language', () => {
    const g = new OutputGuardrailService();
    const result = g.check({ messaging_hook: 'Go viral now' }, false);
    expect(result.passed).toBe(false);
  });
});

describe('MM_LITE_WEIGHTS', () => {
  it('sums to 1', () => {
    const sum = Object.values(MM_LITE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});
