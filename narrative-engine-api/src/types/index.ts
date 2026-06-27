export const LAYER_KEYS = [
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
] as const;

export type LayerKey = (typeof LAYER_KEYS)[number];

export const STAGE_PROGRESS: Record<string, { pct: number; label: string }> = {
  queued: { pct: 5, label: 'Starting analysis…' },
  interpretation: { pct: 15, label: 'Analyzing communication…' },
  diagnostics: { pct: 35, label: 'Detecting positioning gaps…' },
  translation: { pct: 55, label: 'Analyzing communication…' },
  positioning: { pct: 70, label: 'Generating narrative directions…' },
  memetic_analysis: { pct: 85, label: 'Generating narrative directions…' },
  output_generation: { pct: 95, label: 'Finalizing…' },
  completed: { pct: 100, label: 'Complete' },
};

export interface NarrativeRunInput {
  building: string;
  audience: string;
  challenge: string;
  differentiation: string;
  website?: string;
  model_tier?: 'fast' | 'standard' | 'quality';
  session_id?: string;
  parent_run_id?: string;
}

export interface CardOutput {
  key: string;
  label: string;
  content: string;
  meta: Record<string, unknown>;
}

export const CARD_DEFINITIONS = [
  { key: 'clear_explanation', label: 'Clear Explanation', color: 'green', order: 1 },
  { key: 'positioning', label: 'Positioning Direction', color: 'yellow', order: 2 },
  { key: 'messaging_hook', label: 'Messaging Hook', color: 'brown', order: 3 },
  { key: 'memetic_angle', label: 'Memetic Narrative Angle', color: 'red', order: 4 },
] as const;

export const MM_LITE_WEIGHTS: Record<string, number> = {
  clarity: 0.2,
  relatability: 0.2,
  identity_signal: 0.15,
  analogy_potential: 0.15,
  simplicity: 0.15,
  repeatability: 0.15,
};

export const DIAGNOSTIC_DIMENSIONS = [
  'clarity',
  'positioning',
  'audience',
  'differentiation',
  'relevance',
] as const;
