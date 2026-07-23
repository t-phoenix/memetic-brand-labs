import { FieldCardGrid } from './FieldCard.jsx';
import { presentRunInputs } from '../lib/runDataPresenters.js';
import { INPUT_FIELD_COLORS } from '../lib/fieldColors.js';

export default function RunInputsPanel({ inputs }) {
  const presented = presentRunInputs(inputs);

  if (!presented.hasData) {
    return <p className="admin-data-empty">No input data recorded for this run.</p>;
  }

  return (
    <div className="admin-data-panel">
      <p className="admin-data-panel__intro">
        Form answers submitted at run creation — they flow into every LLM layer as template variables.
      </p>

      <FieldCardGrid
        fields={presented.primary.map((f) => ({
          key: f.key,
          label: f.label,
          description: f.description,
          value: f.value,
          color: INPUT_FIELD_COLORS[f.key] ?? 'purple',
        }))}
        columns={2}
      />

      {presented.charCounts.length > 0 && (
        <div className="admin-data-section" style={{ marginTop: '1rem' }}>
          <div className="admin-data-section__title">Character counts</div>
          <div className="admin-data-badges">
            {presented.charCounts.map((c) => (
              <span key={c.field} className="admin-data-badge">
                {c.field}: {c.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="admin-data-section" style={{ marginTop: '1rem' }}>
        <FieldCardGrid fields={presented.metadata.map((m) => ({ ...m, key: m.label, color: 'muted' }))} columns={2} />
      </div>
    </div>
  );
}
