import { humanizeLayerKey, humanizeMarket, humanizeEnumKey } from './humanize.js';

export function presentLayer(layer, context = {}) {
  const key = layer?.layer_key;
  const output = layer?.structured ?? layer?.raw ?? null;
  const summary = layer?.summary_plain ?? summarizeFromOutput(key, output);

  return {
    label: layer?.label ?? humanizeLayerKey(key),
    summary,
    fields: extractFields(key, output, context),
  };
}

function summarizeFromOutput(layerKey, output) {
  if (!output || typeof output !== 'object') return 'No output yet for this step.';
  switch (layerKey) {
    case 'interpretation': {
      const market = humanizeMarket(output.market, output.market_detail);
      const problem = output.messaging_problem ?? output.primary_theme;
      return `Operates in ${market}${problem ? `; key issue: ${humanizeEnumKey(problem)}` : ''}.`;
    }
    case 'diagnostics': {
      const problem = output.messaging_problem ?? output.primary_problem;
      return `Top issue: ${problem ? humanizeEnumKey(problem) : 'not identified'}.`;
    }
    case 'translation':
      return output.simple_explanation ? String(output.simple_explanation).slice(0, 300) : 'Translation completed.';
    case 'positioning':
      return output.positioning ? 'Category placement and hooks ready.' : 'Positioning generated.';
    case 'memetic_analysis':
      return output.memetic_narrative_angle ?? output.narrative_hook ?? 'Memetic analysis completed.';
    case 'output_generation':
      return 'Final cards ready for the user.';
    default:
      return 'Step completed.';
  }
}

function buildSourceMessage(inputs, output) {
  if (output?.source_message) return output.source_message;
  if (output?.original_message) return output.original_message;
  if (!inputs) return null;
  const parts = [inputs.building, inputs.challenge].filter(Boolean);
  return parts.length ? parts.join(' — ') : inputs.building ?? null;
}

function extractFields(layerKey, output, context = {}) {
  if (!output || typeof output !== 'object') return [];
  const fields = [];
  const { inputs } = context;

  switch (layerKey) {
    case 'interpretation':
      if (output.core_function) fields.push({ label: 'Core function', value: output.core_function });
      if (output.target_user) fields.push({ label: 'Target user', value: output.target_user });
      if (output.primary_outcome) fields.push({ label: 'Primary outcome', value: output.primary_outcome });
      if (output.market) {
        fields.push({
          label: 'Market',
          value: humanizeMarket(output.market, output.market_detail),
        });
      }
      if (output.category) fields.push({ label: 'Category', value: humanizeEnumKey(output.category) });
      if (output.complexity_level) fields.push({ label: 'Complexity', value: humanizeEnumKey(output.complexity_level) });
      if (output.messaging_problem) fields.push({ label: 'Messaging problem', value: humanizeEnumKey(output.messaging_problem) });
      break;
    case 'diagnostics':
      if (output.messaging_problem) fields.push({ label: 'Primary problem', value: humanizeEnumKey(output.messaging_problem) });
      if (output.scores && typeof output.scores === 'object') {
        for (const [k, v] of Object.entries(output.scores)) {
          fields.push({ label: k.replace(/_/g, ' '), value: `${v}/100` });
        }
      }
      if (output.findings && typeof output.findings === 'object') {
        for (const [k, v] of Object.entries(output.findings)) {
          if (typeof v === 'string') fields.push({ label: `Finding: ${k.replace(/_/g, ' ')}`, value: v });
        }
      }
      break;
    case 'translation': {
      const before = buildSourceMessage(inputs, output);
      const after = output.simple_explanation;
      if (before) fields.push({ label: 'Before (technical)', value: before, color: 'red' });
      if (after) fields.push({ label: 'After (plain language)', value: after, color: 'green' });
      break;
    }
    case 'positioning':
      if (output.positioning) fields.push({ label: 'Positioning', value: output.positioning });
      if (output.analogy) fields.push({ label: 'Analogy', value: output.analogy });
      if (Array.isArray(output.narrative_hooks) && output.narrative_hooks.length) {
        output.narrative_hooks.forEach((hook, i) => {
          fields.push({ label: `Hook ${i + 1}`, value: hook });
        });
      }
      break;
    case 'memetic_analysis':
      if (output.memetic_narrative_angle) fields.push({ label: 'Narrative angle', value: output.memetic_narrative_angle });
      if (output.memetic_lite && typeof output.memetic_lite === 'object') {
        for (const [k, v] of Object.entries(output.memetic_lite)) {
          fields.push({ label: `Memetic: ${k.replace(/_/g, ' ')}`, value: `${v}/100` });
        }
      }
      if (output.qualitative && typeof output.qualitative === 'object') {
        for (const [k, v] of Object.entries(output.qualitative)) {
          fields.push({ label: k.replace(/_/g, ' '), value: String(v) });
        }
      }
      break;
    case 'output_generation':
      if (output.simple_explanation) fields.push({ label: 'Clear explanation', value: output.simple_explanation });
      if (output.positioning) fields.push({ label: 'Positioning', value: output.positioning });
      if (output.messaging_hook) fields.push({ label: 'Messaging hook', value: output.messaging_hook });
      if (output.memetic_narrative_angle) fields.push({ label: 'Memetic angle', value: output.memetic_narrative_angle });
      break;
    default:
      break;
  }
  return fields;
}

/** Hide summary when it repeats the same text as a field card. */
export function shouldShowLayerSummary(summary, fields) {
  if (!summary || !fields?.length) return Boolean(summary);
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const summaryNorm = norm(summary);
  for (const f of fields) {
    const val = norm(f.value);
    if (val && val.length > 10 && summaryNorm.includes(val)) return false;
  }
  return true;
}
