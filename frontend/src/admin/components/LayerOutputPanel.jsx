import StatusBadge from './StatusBadge.jsx';
import JsonToggle from './JsonToggle.jsx';
import { presentLayer } from '../lib/layerPresenters.js';

export default function LayerOutputPanel({ layer }) {
  if (!layer) return null;
  const { label, summary, fields } = presentLayer(layer);

  return (
    <div className="admin-layer-panel">
      <div className="admin-layer-panel__head">
        <span className="admin-layer-panel__title">{label}</span>
        <StatusBadge status={layer.status} />
      </div>
      <div className="admin-layer-panel__summary">{summary}</div>
      {fields.length > 0 && (
        <div className="admin-layer-panel__fields">
          {fields.map((f) => (
            <div key={f.label} className="admin-layer-panel__field">
              <div className="admin-layer-panel__field-label">{f.label}</div>
              <div>{typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '0 1.25rem 1rem' }}>
        <JsonToggle data={layer.raw ?? layer.structured} />
      </div>
    </div>
  );
}
