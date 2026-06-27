export default function ServiceCard({ name, status, children }) {
  const statusClass = `admin-status--${status ?? 'unknown'}`;
  return (
    <div className="admin-card">
      <div className="admin-card__label">{name}</div>
      <div className={`admin-card__value ${statusClass}`}>{status}</div>
      {children && <div className="admin-card__meta">{children}</div>}
    </div>
  );
}
