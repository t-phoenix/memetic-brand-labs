export default function DataFieldGrid({ fields = [], columns = 1 }) {
  if (!fields.length) return <p className="admin-data-empty">No data available.</p>;

  return (
    <div className={`admin-data-grid admin-data-grid--cols-${columns}`}>
      {fields.map((field) => (
        <div key={field.label ?? field.key} className="admin-data-field">
          <div className="admin-data-field__label">{field.label}</div>
          {field.description && <div className="admin-data-field__desc">{field.description}</div>}
          <div className="admin-data-field__value">{field.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
