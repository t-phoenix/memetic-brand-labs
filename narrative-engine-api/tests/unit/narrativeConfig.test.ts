import { describe, it, expect, beforeEach } from 'vitest';
import { getPromptForLayer, loadNarrativeConfig, resetNarrativeConfigCache } from '../../src/config/narrativeConfig.js';

describe('narrativeConfig', () => {
  beforeEach(() => resetNarrativeConfigCache());

  it('includes master role from architecture doc', () => {
    const prompt = getPromptForLayer('interpretation');
    expect(prompt.system_prompt).toContain('narrative compression engine');
    expect(prompt.system_prompt).toContain('12-year-old');
  });

  it('L1 uses dynamic free-form market guidance', () => {
    const prompt = getPromptForLayer('interpretation');
    expect(prompt.system_prompt).toContain('free-form');
    expect(prompt.system_prompt).toContain('too_technical');
    expect(prompt.system_prompt).toContain('infrastructure');
  });

  it('translation layer asks for source_message', () => {
    const prompt = getPromptForLayer('translation');
    expect(prompt.system_prompt).toContain('source_message');
  });

  it('includes messaging_problem enum constraints for L2', () => {
    const prompt = getPromptForLayer('diagnostics');
    expect(prompt.system_prompt).toContain('Allowed enum keys');
    expect(prompt.system_prompt).toContain('too_technical');
  });

  it('includes MM Lite dimensions for L5', () => {
    const prompt = getPromptForLayer('memetic_analysis');
    expect(prompt.system_prompt).toContain('clarity');
    expect(prompt.system_prompt).toContain('repeatability');
  });

  it('loads all six schemas with properties', () => {
    const { schemas } = loadNarrativeConfig();
    expect(Object.keys(schemas)).toHaveLength(6);
    for (const schema of Object.values(schemas)) {
      expect(schema).toHaveProperty('properties');
    }
  });
});
