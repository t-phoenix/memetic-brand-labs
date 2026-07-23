import { colorForField } from '../lib/fieldColors.js';

export default function FieldCard({ label, value, description, color = 'muted', compact = false }) {
  if (value == null || value === '') return null;

  return (
    <article className={`admin-field-card admin-field-card--${color}${compact ? ' admin-field-card--compact' : ''}`}>
      <div className="admin-field-card__label">{label}</div>
      {description && <div className="admin-field-card__desc">{description}</div>}
      <div className="admin-field-card__value">{value}</div>
    </article>
  );
}

export function FieldCardGrid({ fields = [], phaseColor = 'muted', columns = 2 }) {
  const visible = fields.filter((f) => f.value != null && f.value !== '');
  if (!visible.length) return null;

  return (
    <div className={`admin-field-card-grid admin-field-card-grid--cols-${columns}`}>
      {visible.map((field) => (
        <FieldCard
          key={field.key ?? field.label}
          label={field.label}
          value={field.value}
          description={field.description}
          color={field.color ?? colorForField(field.label, field.value, phaseColor)}
          compact={field.compact}
        />
      ))}
    </div>
  );
}
