export const STAGE_LABELS = {
  queued: 'Starting analysis…',
  interpretation: 'Analyzing communication…',
  diagnostics: 'Detecting positioning gaps…',
  translation: 'Translating to human language…',
  positioning: 'Generating narrative directions…',
  memetic_analysis: 'Generating narrative directions…',
  output_generation: 'Finalizing…',
  completed: 'Complete',
};

export const LAYER_LABELS = {
  interpretation: 'Understanding the brand',
  diagnostics: 'Health check',
  translation: 'Messaging translation',
  positioning: 'Market positioning',
  memetic_analysis: 'Memetic analysis',
  output_generation: 'Final outputs',
};

export const EVENT_LABELS = {
  'run.created': 'Run created',
  'run.completed': 'Run completed',
  'run.failed': 'Run failed',
  'stage.entered': 'Stage started',
  'stage.completed': 'Stage completed',
  'llm.completed': 'AI model finished',
  'website.extracted': 'Website analyzed',
};

export function humanizeLayerKey(key) {
  return LAYER_LABELS[key] ?? String(key ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeStatus(status, currentStage) {
  if (status === 'completed') return 'Complete';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Waiting to start';
  if (status === 'running' || status === 'processing') {
    return `In progress — ${STAGE_LABELS[currentStage] ?? 'Processing…'}`;
  }
  return status ?? 'Unknown';
}

export function humanizeEventType(type, payload = {}) {
  if (type === 'stage.entered' && payload.stage_key) {
    return `Started: ${STAGE_LABELS[payload.stage_key] ?? humanizeLayerKey(payload.stage_key)}`;
  }
  if (type === 'stage.completed' && payload.stage_key) {
    return `Finished: ${humanizeLayerKey(payload.stage_key)}`;
  }
  return EVENT_LABELS[type] ?? type?.replace(/\./g, ' ') ?? 'Event';
}

export function scoreBand(score) {
  if (score == null) return '';
  if (score <= 40) return 'Needs attention';
  if (score <= 70) return 'Moderate';
  return 'Strong';
}

export function humanizeScore(dimension, score) {
  const label = String(dimension).replace(/_/g, ' ');
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  return `${cap}: ${score}/100 — ${scoreBand(score)}`;
}

export function formatUsd(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(n));
}

export function formatRelativeTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function truncateId(id, len = 8) {
  if (!id) return '—';
  return `${String(id).slice(0, len)}…`;
}

export function humanizeTier(tier) {
  const map = { fast: 'Fast', standard: 'Standard', quality: 'Quality' };
  return map[tier] ?? tier;
}

export function humanizeModel(model) {
  if (!model) return '—';
  const m = String(model);
  if (m.includes('gpt-4o-mini')) return 'GPT-4o Mini';
  if (m.includes('gpt-4o')) return 'GPT-4o';
  if (m.includes('claude')) return m.replace(/-/g, ' ');
  return m;
}

export function humanizeRunSource(source) {
  if (source === 'admin_test') return 'Test run';
  if (source === 'admin_replay') return 'Cloned test';
  return 'User run';
}

export function humanizePaymentStatus(status) {
  const map = {
    free: 'Free first run',
    paid: 'Paid',
    pending: 'Payment pending',
    admin_test: 'Admin test (not billed)',
  };
  return map[status] ?? status;
}
