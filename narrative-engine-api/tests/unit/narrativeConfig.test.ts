import { describe, it, expect, beforeEach } from 'vitest';
import { getPromptForLayer, loadNarrativeConfig, resetNarrativeConfigCache } from '../../src/config/narrativeConfig.js';

describe('narrativeConfig', () => {
  beforeEach(() => resetNarrativeConfigCache());

  it('includes master role from architecture doc', () => {
    const prompt = getPromptForLayer('interpretation');
    expect(prompt.system_prompt).toContain('narrative compression engine');
    expect(prompt.system_prompt).toContain('12-year-old');
  });

  it('includes enum constraints for L1', () => {
    const prompt = getPromptForLayer('interpretation');
    expect(prompt.system_prompt).toContain('too_technical');
    expect(prompt.system_prompt).toContain('infrastructure');
  });

  it('includes MM Lite dimensions for L5', () => {
    const prompt = getPromptForLayer('memetic_analysis');
    expect(prompt.system_prompt).toContain('clarity (20%)');
    expect(prompt.system_prompt).toContain('repeatability (15%)');
  });

  it('loads all six schemas with properties', () => {
    const { schemas } = loadNarrativeConfig();
    expect(Object.keys(schemas)).toHaveLength(6);
    for (const schema of Object.values(schemas)) {
      expect(schema).toHaveProperty('properties');
    }
  });
});
