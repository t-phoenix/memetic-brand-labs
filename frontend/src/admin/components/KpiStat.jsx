export default function KpiStat({ label, value, meta }) {
  return (
    <div className="admin-card">
      <div className="admin-card__label">{label}</div>
      <div className="admin-card__value">{value}</div>
      {meta && <div className="admin-card__meta">{meta}</div>}
    </div>
  );
}
