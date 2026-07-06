export default function AdminCard({ label, value, meta, accent, children }) {
  const accentClass = accent ? ` admin-card--accent-${accent}` : '';
  return (
    <div className={`admin-card${accentClass}`}>
      {label && <div className="admin-card__label">{label}</div>}
      {value != null && <div className="admin-card__value">{value}</div>}
      {meta && <div className="admin-card__meta">{meta}</div>}
      {children}
    </div>
  );
}
