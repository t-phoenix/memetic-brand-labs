import { describe, expect, it } from 'vitest';
import { isPatternLibraryEnabled } from '../../src/patterns/patternLibrary.js';

describe('isPatternLibraryEnabled', () => {
  it('is off by default', () => {
    expect(isPatternLibraryEnabled({ PATTERN_LIBRARY_ENABLED: false } as never)).toBe(false);
  });

  it('can be enabled via env', () => {
    expect(isPatternLibraryEnabled({ PATTERN_LIBRARY_ENABLED: true } as never)).toBe(true);
  });
});
