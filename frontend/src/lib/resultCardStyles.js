const CARD_THEMES = ['coral', 'purple', 'magenta', 'blue'];

/** Brand color theme per card index (homepage section palette) */
export function resultCardClassName(index) {
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  return `ne-results__card ne-results__card--${theme}`;
}
