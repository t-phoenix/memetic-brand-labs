import type { LayerKey } from '../types/index.js';

export const LAYER_LABELS: Record<string, string> = {
  interpretation: 'Understanding the brand',
  diagnostics: 'Health check',
  translation: 'Messaging translation',
  positioning: 'Market positioning',
  memetic_analysis: 'Memetic analysis',
  output_generation: 'Final outputs',
};

export function layerLabel(key: string): string {
  return LAYER_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function summarizeLayerOutput(layerKey: string, output: Record<string, unknown> | null | undefined): string {
  if (!output || Object.keys(output).length === 0) {
    return 'No output yet for this step.';
  }

  switch (layerKey) {
    case 'interpretation': {
      const market = output.market ?? output.industry;
      const problem = output.messaging_problem ?? output.primary_theme;
      return `This brand operates in ${market ?? 'an unspecified market'}${problem ? ` and faces: ${problem}` : ''}.`;
    }
    case 'diagnostics': {
      const problem = output.messaging_problem ?? output.primary_problem;
      const scores = output.scores as Record<string, number> | undefined;
      const avg = scores ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length) : null;
      return `Top issue: ${problem ?? 'not identified'}${avg != null ? `. Overall health score: ${avg}/100` : ''}.`;
    }
    case 'translation': {
      const before = output.source_message ?? output.original_message ?? output.before;
      const after = output.simple_explanation ?? output.after;
      if (before && after) return `Simplified from technical language to a ${String(after).split(' ').length}-word plain explanation.`;
      return after ? `Plain-language result: "${String(after).slice(0, 120)}"` : 'Translation completed.';
    }
    case 'positioning': {
      const hooks = output.narrative_hooks as string[] | undefined;
      const hookCount = Array.isArray(hooks) ? hooks.length : 0;
      return hookCount > 0
        ? `Positioning direction with ${hookCount} narrative hook${hookCount > 1 ? 's' : ''}.`
        : 'Positioning direction generated.';
    }
    case 'memetic_analysis': {
      const hook = output.memetic_narrative_angle ?? output.narrative_hook;
      return hook ? `Memetic angle: ${String(hook).slice(0, 200)}` : 'Memetic analysis completed.';
    }
    case 'output_generation':
      return 'Final output cards assembled for the user.';
    default:
      return 'Step completed.';
  }
}

export function layerIndex(key: LayerKey): number {
  const keys: LayerKey[] = [
    'interpretation',
    'diagnostics',
    'translation',
    'positioning',
    'memetic_analysis',
    'output_generation',
  ];
  return keys.indexOf(key);
}
