import { humanizeStatus } from '../lib/humanize.js';

export default function StatusBadge({ status, currentStage }) {
  const s = (status ?? '').toLowerCase();
  const cls = ['completed', 'failed', 'pending', 'processing', 'running', 'skipped'].includes(s)
    ? `admin-badge--${s === 'processing' ? 'processing' : s}`
    : 'admin-badge--pending';
  return <span className={`admin-badge ${cls}`}>{humanizeStatus(status, currentStage)}</span>;
}
