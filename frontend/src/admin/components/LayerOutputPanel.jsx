import StatusBadge from './StatusBadge.jsx';
import { FieldCardGrid } from './FieldCard.jsx';
import { presentLayer } from '../lib/layerPresenters.js';
import { LAYER_COLORS } from '../lib/fieldColors.js';
import { formatDuration } from '../lib/formatters.js';

export default function LayerOutputPanel({ layer }) {
  if (!layer) return null;
  const { label, summary, fields } = presentLayer(layer);
  const color = LAYER_COLORS[layer.layer_key] ?? 'purple';

  const displayFields = [
    ...fields.map((f) => ({
      key: f.label,
      label: f.label,
      value: typeof f.value === 'string' ? f.value : String(f.value),
      color,
    })),
    ...(layer.validation_passed === false
      ? [{ key: 'validation', label: 'Validation', value: 'Failed', color: 'red' }]
      : []),
    ...(layer.output_schema_version
      ? [{ key: 'schema', label: 'Schema', value: layer.output_schema_version, color: 'muted', compact: true }]
      : []),
  ];

  return (
    <div className={`admin-layer-panel admin-layer-panel--tone-${color}`}>
      <div className="admin-layer-panel__head">
        <span className="admin-layer-panel__title">{label}</span>
        <div className="admin-layer-panel__badges">
          <StatusBadge status={layer.status} />
        </div>
      </div>
      <div className="admin-layer-panel__summary">{summary}</div>
      {(layer.duration_ms != null || layer.model) && (
        <div className="admin-layer-panel__meta">
          {layer.duration_ms != null && <span>{formatDuration(layer.duration_ms)}</span>}
          {layer.model && <span>{layer.model}</span>}
          {layer.attempt_number > 1 && <span>Attempt {layer.attempt_number}</span>}
        </div>
      )}
      {displayFields.length > 0 && (
        <div className="admin-layer-panel__fields">
          <FieldCardGrid fields={displayFields} phaseColor={color} columns={2} />
        </div>
      )}
    </div>
  );
}
