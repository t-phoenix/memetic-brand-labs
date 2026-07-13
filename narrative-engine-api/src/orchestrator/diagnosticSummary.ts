import type { LayerKey } from '../types/index.js';

/** Layers that receive Pattern Library text in their user prompt. */
export const PATTERN_INJECTION_LAYERS: ReadonlySet<LayerKey> = new Set([
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
]);

/**
 * Build a short steering block from L2 diagnostics for L3–L6.
 * Returns empty string when diagnostics are missing so templates stay safe.
 */
export function buildDiagnosticSummary(diagnostics: Record<string, unknown> | undefined): string {
  if (!diagnostics || typeof diagnostics !== 'object') return '';

  const scores = (diagnostics.scores ?? {}) as Record<string, unknown>;
  const findings = (diagnostics.findings ?? {}) as Record<string, unknown>;
  const messagingProblem =
    typeof diagnostics.messaging_problem === 'string' ? diagnostics.messaging_problem : '';

  const lowDims: string[] = [];
  for (const [dim, raw] of Object.entries(scores)) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n) && n < 60) {
      lowDims.push(`${dim} (${Math.round(n)})`);
    }
  }

  const findingBits: string[] = [];
  for (const [key, value] of Object.entries(findings)) {
    if (value == null || value === '') continue;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    findingBits.push(`${key}: ${text}`);
  }

  const parts: string[] = [];
  if (lowDims.length) parts.push(`Low scores: ${lowDims.join(', ')}.`);
  if (messagingProblem) parts.push(`messaging_problem=${messagingProblem}.`);
  if (findingBits.length) {
    parts.push(`Key findings: ${findingBits.slice(0, 5).join('; ')}.`);
  }
  if (!parts.length) return '';

  parts.push('Prioritize fixing these issues in generated narrative.');
  return parts.join(' ');
}
