import { humanizeLayerKey } from './humanize.js';

export function presentLayer(layer) {
  const key = layer?.layer_key;
  const output = layer?.structured ?? layer?.raw ?? null;
  const summary = layer?.summary_plain ?? summarizeFromOutput(key, output);

  return {
    label: layer?.label ?? humanizeLayerKey(key),
    summary,
    fields: extractFields(key, output),
  };
}

function summarizeFromOutput(layerKey, output) {
  if (!output || typeof output !== 'object') return 'No output yet for this step.';
  switch (layerKey) {
    case 'interpretation': {
      const market = output.market ?? output.industry;
      const problem = output.messaging_problem ?? output.primary_theme;
      return `Operates in ${market ?? 'unspecified market'}${problem ? `; key issue: ${problem}` : ''}.`;
    }
    case 'diagnostics': {
      const problem = output.messaging_problem ?? output.primary_problem;
      return `Top issue: ${problem ?? 'not identified'}.`;
    }
    case 'translation':
      return output.simple_explanation ? String(output.simple_explanation).slice(0, 300) : 'Translation completed.';
    case 'positioning':
      return output.positioning ?? output.positioning_statement ?? 'Positioning generated.';
    case 'memetic_analysis':
      return output.memetic_narrative_angle ?? output.narrative_hook ?? 'Memetic analysis completed.';
    case 'output_generation':
      return 'Final cards ready for the user.';
    default:
      return 'Step completed.';
  }
}

function extractFields(layerKey, output) {
  if (!output || typeof output !== 'object') return [];
  const fields = [];
  switch (layerKey) {
    case 'interpretation':
      if (output.market) fields.push({ label: 'Market', value: output.market });
      if (output.category) fields.push({ label: 'Category', value: output.category });
      if (output.messaging_problem) fields.push({ label: 'Messaging problem', value: output.messaging_problem });
      break;
    case 'diagnostics':
      if (output.messaging_problem) fields.push({ label: 'Primary problem', value: output.messaging_problem });
      if (output.scores && typeof output.scores === 'object') {
        for (const [k, v] of Object.entries(output.scores)) {
          fields.push({ label: k.replace(/_/g, ' '), value: `${v}/100` });
        }
      }
      break;
    case 'translation':
      if (output.original_message) fields.push({ label: 'Before', value: output.original_message });
      if (output.simple_explanation) fields.push({ label: 'After', value: output.simple_explanation });
      break;
    case 'positioning':
      if (output.positioning) fields.push({ label: 'Positioning', value: output.positioning });
      if (output.target_audience) fields.push({ label: 'Audience', value: output.target_audience });
      break;
    case 'memetic_analysis':
      if (output.memetic_narrative_angle) fields.push({ label: 'Narrative angle', value: output.memetic_narrative_angle });
      break;
    default:
      break;
  }
  return fields;
}
