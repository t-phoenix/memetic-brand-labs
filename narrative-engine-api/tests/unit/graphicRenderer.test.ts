import { describe, expect, it } from 'vitest';
import { wrapText } from '../../src/share/GraphicRenderer.js';

describe('wrapText', () => {
  it('wraps long lines to fit card width', () => {
    const lines = wrapText(
      'Trade more coins than anywhere else in India with our platform.',
      472,
      24,
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toContain('Trade more coins');
  });

  it('preserves explicit newlines', () => {
    const lines = wrapText('Line one\nLine two', 472, 24);
    expect(lines).toEqual(['Line one', 'Line two']);
  });
});
