import { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import JsonToggle from './JsonToggle.jsx';
import DataFieldGrid from './DataFieldGrid.jsx';
import { presentLayerLegacyOutput } from '../lib/runDataPresenters.js';
import { humanizeLayerKey } from '../lib/humanize.js';
import { formatDuration } from '../lib/formatters.js';

const LAYER_ORDER = [
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
];

export default function LayerLegacyOutputsPanel({ layersLegacy = [], processedLayers = [] }) {
  const [expanded, setExpanded] = useState(null);

  const byKey = Object.fromEntries((layersLegacy ?? []).map((r) => [r.layer_key, r]));
  const processedByKey = Object.fromEntries((processedLayers ?? []).map((l) => [l.layer_key, l]));

  const orderedKeys = LAYER_ORDER.filter((k) => byKey[k] || processedByKey[k]);
  const remaining = (layersLegacy ?? [])
    .map((r) => r.layer_key)
    .filter((k) => !LAYER_ORDER.includes(k));
  const allKeys = [...orderedKeys, ...remaining];

  if (!allKeys.length) {
    return <p className="admin-data-empty">No layer outputs stored yet.</p>;
  }

  return (
    <div className="admin-data-panel">
      <p className="admin-data-panel__intro">
        Granular per-layer output records from the database — schema version, validation status, output hash, and every field from the LLM response.
      </p>

      <div className="admin-legacy-layers">
        {allKeys.map((key) => {
          const legacy = byKey[key];
          const processed = processedByKey[key];
          const presented = legacy ? presentLayerLegacyOutput(legacy) : null;
          const isOpen = expanded === key;

          return (
            <div key={key} className={`admin-legacy-layer${isOpen ? ' admin-legacy-layer--open' : ''}`}>
              <button
                type="button"
                className="admin-legacy-layer__head"
                onClick={() => setExpanded(isOpen ? null : key)}
              >
                <div className="admin-legacy-layer__title-row">
                  <span className="admin-legacy-layer__step">{LAYER_ORDER.indexOf(key) + 1 || '·'}</span>
                  <span className="admin-legacy-layer__title">{humanizeLayerKey(key)}</span>
                  {processed && <StatusBadge status={processed.status} />}
                  {presented && (
                    <span className={`admin-legacy-layer__validation admin-legacy-layer__validation--${presented.validation.passed ? 'pass' : 'fail'}`}>
                      {presented.validation.passed ? 'Valid' : 'Invalid'}
                    </span>
                  )}
                </div>
                <div className="admin-legacy-layer__meta">
                  {presented && <span>Schema: {presented.schemaVersion}</span>}
                  {processed?.duration_ms != null && <span>{formatDuration(processed.duration_ms)}</span>}
                  {processed?.model && <span>{processed.model}</span>}
                </div>
              </button>

              {isOpen && presented && (
                <div className="admin-legacy-layer__body">
                  <div className="admin-data-section">
                    <div className="admin-data-section__title">Validation & integrity</div>
                    <DataFieldGrid
                      fields={[
                        { label: 'Schema version', value: presented.schemaVersion },
                        { label: 'Validation', value: presented.validation.passed ? 'Passed' : 'Failed' },
                        { label: 'Output hash', value: presented.outputHash },
                        { label: 'Created', value: presented.createdAt ?? '—' },
                      ]}
                      columns={2}
                    />
                    {!presented.validation.passed && presented.validation.errors.length > 0 && (
                      <div className="admin-legacy-layer__errors">
                        {presented.validation.errors.map((err, i) => (
                          <div key={i} className="admin-legacy-layer__error">
                            {typeof err === 'string' ? err : JSON.stringify(err)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {presented.outputFields.length > 0 && (
                    <div className="admin-data-section">
                      <div className="admin-data-section__title">Output fields</div>
                      <DataFieldGrid
                        fields={presented.outputFields.map((f) => ({
                          label: f.label,
                          value: f.value,
                        }))}
                        columns={1}
                      />
                    </div>
                  )}

                  <JsonToggle data={presented.rawOutput} label="Show raw output JSON" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <JsonToggle data={layersLegacy} label="Show all raw layer output rows" />
    </div>
  );
}
