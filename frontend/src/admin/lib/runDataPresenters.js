import { humanizeLayerKey, humanizeTier, formatUsd } from './humanize.js';
import { presentLayer, shouldShowLayerSummary } from './layerPresenters.js';
import { formatDuration } from './formatters.js';
import { INPUT_FIELD_COLORS, LAYER_COLORS, PHASE_TYPE_COLORS, OUTPUT_CARD_COLORS } from './fieldColors.js';

const LAYER_ORDER = [
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
];

const INPUT_FIELD_DEFS = [
  { key: 'building', label: 'Building', description: 'What the company does' },
  { key: 'audience', label: 'Audience', description: 'Who they serve' },
  { key: 'challenge', label: 'Challenge', description: 'Messaging problem they face' },
  { key: 'differentiation', label: 'Differentiation', description: 'What sets them apart' },
  { key: 'website_url', label: 'Website', description: 'Optional homepage for context' },
];

export function presentRunInputs(inputs) {
  if (!inputs) {
    return { primary: [], metadata: [], charCounts: [], hasData: false };
  }

  const primary = INPUT_FIELD_DEFS.map(({ key, label, description }) => ({
    key,
    label,
    description,
    value: inputs[key] ?? null,
    present: Boolean(inputs[key]),
  })).filter((f) => f.present);

  const metadata = [
    { label: 'Input schema', value: inputs.input_schema_version ?? '—' },
    { label: 'Captured at', value: inputs.created_at ?? '—' },
  ];

  const charCounts = Object.entries(inputs.char_counts ?? {}).map(([field, count]) => ({
    field: field.replace(/_/g, ' '),
    count,
  }));

  return { primary, metadata, charCounts, hasData: primary.length > 0 };
}

export function presentConfigSnapshot(config) {
  if (!config) {
    return { promptVersions: [], versions: [], pricing: null, hasData: false };
  }

  const promptVersions = Object.entries(config.prompt_versions ?? {}).map(([layer, version]) => ({
    layer,
    layerLabel: humanizeLayerKey(layer),
    version,
    templateId: config.prompt_template_ids?.[layer] ?? null,
  }));

  const versions = [
    { label: 'Pattern library', value: config.pattern_library_version ?? '—' },
    { label: 'Guardrails', value: config.guardrail_config_version ?? '—' },
    { label: 'Snapshot created', value: config.created_at ?? '—' },
  ];

  const schemaVersions = Object.entries(config.schema_versions ?? {}).map(([key, version]) => ({
    key,
    version,
  }));

  return {
    promptVersions,
    schemaVersions,
    versions,
    pricing: config.pricing_snapshot ?? null,
    enumCount: Array.isArray(config.enum_snapshot) ? config.enum_snapshot.length : 0,
    hasData: true,
  };
}

function flattenOutputField(key, value, prefix = '') {
  const fullKey = prefix ? `${prefix}.${key}` : key;

  if (value == null) return [];
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== 'object')) {
      return [{ key: fullKey, value: value.join(', '), type: 'array' }];
    }
    return value.flatMap((item, i) =>
      typeof item === 'object' && item
        ? Object.entries(item).flatMap(([k, v]) => flattenOutputField(k, v, `${fullKey}[${i}]`))
        : [{ key: `${fullKey}[${i}]`, value: String(item), type: 'primitive' }],
    );
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => flattenOutputField(k, v, fullKey));
  }
  return [{ key: fullKey, value: String(value), type: typeof value }];
}

export function presentLayerLegacyOutput(legacyRow) {
  if (!legacyRow) return null;

  const output = legacyRow.output ?? {};
  const outputFields = flattenOutputField('', output).map((f) => ({
    ...f,
    key: f.key.replace(/^\./, ''),
    label: f.key.replace(/^\./, '').replace(/_/g, ' ').replace(/\./g, ' › '),
  }));

  return {
    layerKey: legacyRow.layer_key,
    layerLabel: humanizeLayerKey(legacyRow.layer_key),
    schemaVersion: legacyRow.output_schema_version ?? '—',
    outputHash: legacyRow.output_hash ?? '—',
    createdAt: legacyRow.created_at ?? null,
    validation: {
      passed: legacyRow.validation_passed ?? true,
      errors: legacyRow.validation_errors ?? [],
    },
    outputFields,
    rawOutput: output,
  };
}

export function mergeLayerWithLegacy(layer, legacyRow) {
  if (!layer) return null;
  if (!legacyRow) return { ...layer };

  return {
    ...layer,
    output_schema_version: legacyRow.output_schema_version ?? null,
    validation_passed: legacyRow.validation_passed ?? null,
    validation_errors: legacyRow.validation_errors ?? null,
    output_hash: legacyRow.output_hash ?? null,
    layer_execution_id: legacyRow.layer_execution_id ?? null,
  };
}

export function presentWebsiteExtraction(website) {
  if (!website) return { hasData: false, fields: [], status: 'skipped' };

  const extracted = website.extracted ?? {};
  const flags = website.mismatch_flags ?? {};
  const fields = [];

  if (website.url) fields.push({ key: 'url', label: 'URL', value: website.url, color: 'teal' });
  fields.push({ key: 'status', label: 'Fetch status', value: website.fetch_status ?? '—', color: website.fetch_status === 'success' ? 'green' : 'red' });
  if (website.http_status) fields.push({ key: 'http', label: 'HTTP status', value: String(website.http_status), color: 'muted' });
  if (website.duration_ms != null) fields.push({ key: 'duration', label: 'Scrape duration', value: formatDuration(website.duration_ms), color: 'muted' });
  if (extracted.title) fields.push({ key: 'title', label: 'Page title', value: extracted.title, color: 'purple' });
  if (extracted.meta_description) fields.push({ key: 'meta', label: 'Meta description', value: extracted.meta_description, color: 'blue' });
  if (extracted.h1) fields.push({ key: 'h1', label: 'H1 headline', value: extracted.h1, color: 'yellow' });
  if (Array.isArray(extracted.h2) && extracted.h2.length) {
    fields.push({ key: 'h2', label: 'H2 headings', value: extracted.h2.join(' · '), color: 'orange' });
  }
  if (extracted.cta) fields.push({ key: 'cta', label: 'Primary CTA', value: extracted.cta, color: 'green' });
  const og = extracted.og_tags ?? {};
  if (og.title) fields.push({ key: 'og_title', label: 'OG title', value: og.title, color: 'muted' });
  if (og.description) fields.push({ key: 'og_desc', label: 'OG description', value: og.description, color: 'muted' });

  const flagEntries = Object.entries(flags).filter(([, v]) => v != null && v !== '' && v !== false);
  for (const [key, value] of flagEntries) {
    fields.push({
      key: `flag_${key}`,
      label: `Mismatch: ${key.replace(/_/g, ' ')}`,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      color: 'red',
    });
  }

  return {
    hasData: true,
    status: website.fetch_status === 'success' ? 'completed' : 'failed',
    fields,
  };
}

export function indexLegacyByLayer(layersLegacy) {
  const map = new Map();
  for (const row of layersLegacy ?? []) {
    map.set(row.layer_key, row);
  }
  return map;
}

function layerPhaseStatus(layer) {
  if (!layer) return 'pending';
  if (layer.status === 'completed') return 'completed';
  if (layer.status === 'failed') return 'failed';
  if (layer.status === 'running') return 'active';
  return layer.status ?? 'pending';
}

export function buildPipelineFlow({ run, inputs, pipeline, costSummary, runDetail }) {
  const layers = pipeline?.layers ?? [];
  const layersByKey = Object.fromEntries(layers.map((l) => [l.layer_key, l]));
  const legacyByKey = indexLegacyByLayer(pipeline?.layers_legacy);

  const phases = [];

  const inputFields = presentRunInputs(inputs);
  phases.push({
    id: 'inputs',
    type: 'input',
    order: 0,
    stepIndex: null,
    color: PHASE_TYPE_COLORS.input,
    label: 'User inputs',
    description: 'Form answers captured at run creation — fed into every LLM layer',
    status: inputFields.hasData ? 'completed' : 'pending',
    fields: inputFields.primary.map((f) => ({
      key: f.key,
      label: f.label,
      description: f.description,
      value: f.value,
      color: INPUT_FIELD_COLORS[f.key] ?? PHASE_TYPE_COLORS.input,
    })),
  });

  const hasWebsite = Boolean(inputs?.website_url);
  const websitePresented = presentWebsiteExtraction(pipeline?.website_extraction);
  phases.push({
    id: 'website',
    type: 'preprocess',
    order: 1,
    stepIndex: null,
    color: PHASE_TYPE_COLORS.preprocess,
    label: 'Website context',
    description: hasWebsite
      ? 'Homepage scraped — title, headings, meta, and mismatch flags vs form answers'
      : 'Skipped — no website URL provided',
    status: !hasWebsite ? 'skipped' : websitePresented.status === 'completed' ? 'completed' : hasWebsite ? 'completed' : 'pending',
    fields: hasWebsite
      ? websitePresented.fields.length > 0
        ? websitePresented.fields
        : [{ key: 'url', label: 'Website URL', value: inputs.website_url, color: 'teal' }]
      : [],
  });

  LAYER_ORDER.forEach((key, index) => {
    const layer = layersByKey[key];
    const legacy = legacyByKey.get(key);
    const presented = layer ? presentLayer(layer, { inputs }) : null;
    const legacyPresented = legacy ? presentLayerLegacyOutput(legacy) : null;
    const fields = [
      ...(presented?.fields ?? []).map((f) => ({
        key: f.label,
        label: f.label,
        value: typeof f.value === 'string' ? f.value : String(f.value),
        color: f.color ?? LAYER_COLORS[key],
      })),
      ...(legacyPresented?.validation.passed === false
        ? [{ key: 'validation', label: 'Validation', value: 'Failed — see errors below', color: 'red' }]
        : []),
    ];
    const summary = presented?.summary ?? 'Not executed yet';

    phases.push({
      id: key,
      type: 'layer',
      order: index + 2,
      stepIndex: index + 1,
      key,
      color: LAYER_COLORS[key] ?? PHASE_TYPE_COLORS.layer,
      label: layer?.label ?? humanizeLayerKey(key),
      description: getLayerDescription(key),
      status: layerPhaseStatus(layer),
      durationMs: layer?.duration_ms ?? null,
      model: layer?.model ?? null,
      attemptNumber: layer?.attempt_number ?? null,
      summary: shouldShowLayerSummary(summary, fields) ? summary : null,
      fields,
      metaBadges: [
        ...(legacyPresented
          ? [
              { label: 'Schema', value: legacyPresented.schemaVersion },
              { label: 'Valid', value: legacyPresented.validation.passed ? 'Yes' : 'No' },
            ]
          : []),
        ...(layer?.model ? [{ label: 'Model', value: layer.model }] : []),
        ...(layer?.duration_ms != null ? [{ label: 'Duration', value: formatDuration(layer.duration_ms) }] : []),
      ],
      validationErrors: legacyPresented?.validation.errors ?? [],
      layout: key === 'translation' && fields.some((f) => f.label?.includes('Before')) ? 'compare' : 'grid',
    });
  });

  const outputs = pipeline?.outputs ?? [];
  phases.push({
    id: 'finalize',
    type: 'output',
    order: 8,
    stepIndex: null,
    color: PHASE_TYPE_COLORS.output,
    label: 'Final output cards',
    description: 'User-facing narrative cards assembled from layer outputs',
    status: outputs.length > 0 ? 'completed' : run?.status === 'completed' ? 'completed' : 'pending',
    outputCards: outputs.map((o) => ({
      key: o.card_key,
      label: o.card_label ?? o.card_key,
      value: o.content,
      color: OUTPUT_CARD_COLORS[o.card_key] ?? 'green',
    })),
  });

  const metadataItems = buildRunMetadataFields({ run, inputs, pipeline, costSummary, runDetail });

  phases.push({
    id: 'metadata',
    type: 'metadata',
    order: 9,
    stepIndex: null,
    color: PHASE_TYPE_COLORS.metadata,
    label: 'Run metadata',
    description: 'Cost, timing, and configuration context',
    status: 'completed',
    fields: metadataItems.map((item) => ({
      key: item.label,
      label: item.label,
      value: item.value,
      color: 'muted',
    })),
  });

  return { phases };
}

function getLayerDescription(layerKey) {
  const descriptions = {
    interpretation: 'L1 — Structured understanding of brand, market, and messaging problem',
    diagnostics: 'L2 — Health scores across clarity, positioning, audience, differentiation, relevance',
    translation: 'L3 — Plain-language simplification of the brand message',
    positioning: 'L4 — Positioning statement, analogy, and narrative hooks',
    memetic_analysis: 'L5 — Memetic narrative angle and lite scores for shareability',
    output_generation: 'L6 — Final card content assembled for the user',
  };
  return descriptions[layerKey] ?? '';
}

function pushMeta(items, label, value, color = 'muted') {
  if (value == null || value === '' || value === '—') return;
  items.push({ key: label, label, value: String(value), color });
}

export function buildRunMetadataFields({ run, inputs, pipeline, costSummary, runDetail }) {
  const items = [];
  const share = runDetail?.share;
  const payment = runDetail?.payment;

  pushMeta(items, 'Run ID', run?.id, 'purple');
  pushMeta(items, 'Engine', `${run?.engine_type ?? 'narrative'} v${run?.engine_version ?? '—'}`);
  pushMeta(items, 'Model tier', humanizeTier(run?.model_tier), 'purple');
  pushMeta(items, 'Run source', run?.run_source?.replace(/_/g, ' '));
  pushMeta(items, 'Payment status', run?.payment_status);
  pushMeta(items, 'Pricing tier', run?.pricing_tier_key);
  pushMeta(items, 'API version', run?.api_version);
  pushMeta(items, 'Client version', run?.client_version);
  pushMeta(items, 'Locale', run?.locale);
  pushMeta(items, 'Current stage', run?.current_stage);
  pushMeta(items, 'Run status', run?.status);
  pushMeta(items, 'Progress', run?.progress_pct != null ? `${run.progress_pct}%` : null);
  pushMeta(items, 'Started', run?.started_at);
  pushMeta(items, 'Completed', run?.completed_at);
  pushMeta(items, 'Duration', formatDuration(run?.total_duration_ms));
  pushMeta(items, 'LLM cost', formatUsd(costSummary?.total_llm_cost_usd), 'green');
  pushMeta(
    items,
    'Tokens (in / out)',
    costSummary
      ? `${costSummary.total_prompt_tokens ?? 0} / ${costSummary.total_completion_tokens ?? 0}`
      : null,
  );
  pushMeta(items, 'COGS total', formatUsd(costSummary?.total_cogs_usd));
  pushMeta(items, 'Margin', formatUsd(costSummary?.margin_usd));

  if (run?.failure_code) pushMeta(items, 'Failure code', run.failure_code, 'red');
  if (run?.failure_detail) {
    const detail =
      typeof run.failure_detail === 'string'
        ? run.failure_detail
        : run.failure_detail.message ?? JSON.stringify(run.failure_detail);
    pushMeta(items, 'Failure detail', detail, 'red');
  }

  if (inputs?.input_schema_version) pushMeta(items, 'Input schema', inputs.input_schema_version);
  if (inputs?.created_at) pushMeta(items, 'Inputs captured', inputs.created_at);

  if (share?.share_id) pushMeta(items, 'Share ID', share.share_id, 'teal');
  if (share?.is_public != null) pushMeta(items, 'Share public', share.is_public ? 'Yes' : 'No');
  if (share?.og_title) pushMeta(items, 'Share OG title', share.og_title);

  if (payment?.amount_usdc != null) pushMeta(items, 'Revenue', formatUsd(payment.amount_usdc), 'green');
  if (payment?.status) pushMeta(items, 'Payment', payment.status);

  if (pipeline?.events?.length) pushMeta(items, 'Events logged', String(pipeline.events.length));

  return items;
}
