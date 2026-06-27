export default function RunStatusBadge({ status }) {
  const s = status ?? 'unknown';
  return <span className={`admin-badge admin-badge--${s}`}>{s}</span>;
}
