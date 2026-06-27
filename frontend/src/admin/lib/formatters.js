export function formatUsd(value) {
  const n = Number(value ?? 0);
  if (n === 0) return '$0.00';
  if (Math.abs(n) < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function formatDuration(ms) {
  if (ms == null) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function truncateId(id) {
  if (!id) return '—';
  return `${id.slice(0, 8)}…`;
}

export function copyText(text) {
  navigator.clipboard?.writeText(text);
}
