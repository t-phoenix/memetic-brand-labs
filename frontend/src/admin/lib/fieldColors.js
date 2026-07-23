/** Color tokens for admin pipeline / data cards (maps to admin-field-card--* in Admin.css). */

export const INPUT_FIELD_COLORS = {
  building: 'purple',
  audience: 'blue',
  challenge: 'yellow',
  differentiation: 'green',
  website_url: 'teal',
};

export const LAYER_COLORS = {
  interpretation: 'purple',
  diagnostics: 'yellow',
  translation: 'green',
  positioning: 'orange',
  memetic_analysis: 'red',
  output_generation: 'brown',
};

export const PHASE_TYPE_COLORS = {
  input: 'purple',
  preprocess: 'teal',
  layer: 'purple',
  output: 'green',
  metadata: 'muted',
};

export const OUTPUT_CARD_COLORS = {
  clear_explanation: 'green',
  positioning: 'yellow',
  messaging_hook: 'brown',
  memetic_angle: 'red',
};

/** Parse "clarity (42)/100" or numeric score for band coloring. */
export function scoreColorBand(value) {
  const match = String(value ?? '').match(/(\d+)\s*\/\s*100/);
  const score = match ? Number(match[1]) : null;
  if (score == null) return 'muted';
  if (score <= 40) return 'red';
  if (score <= 70) return 'yellow';
  return 'green';
}

export function colorForField(label, value, phaseColor) {
  const band = scoreColorBand(value);
  if (band !== 'muted') return band;
  return phaseColor ?? 'muted';
}
