import { FieldCardGrid } from './FieldCard.jsx';
import { presentConfigSnapshot } from '../lib/runDataPresenters.js';
import { formatUsd } from '../lib/humanize.js';

export default function RunConfigSnapshotPanel({ config }) {
  const presented = presentConfigSnapshot(config);

  if (!presented.hasData) {
    return <p className="admin-data-empty">No config snapshot for this run.</p>;
  }

  return (
    <div className="admin-data-panel">
      <p className="admin-data-panel__intro">
        Frozen at run creation — prompt versions, pricing, and enum definitions used for this execution.
      </p>

      <FieldCardGrid
        fields={presented.versions.map((v) => ({ key: v.label, ...v, color: 'purple' }))}
        columns={3}
      />

      {presented.enumCount > 0 && (
        <p className="admin-data-panel__note">{presented.enumCount} enum definitions snapshotted</p>
      )}

      {presented.pricing && (
        <div className="admin-data-section" style={{ marginTop: '1rem' }}>
          <div className="admin-data-section__title">Pricing tier</div>
          <FieldCardGrid
            fields={[
              { key: 'tier', label: 'Tier', value: presented.pricing.tier_key ?? presented.pricing.key ?? '—', color: 'green' },
              { key: 'price', label: 'Price', value: formatUsd(presented.pricing.price_usdc ?? presented.pricing.amount_usdc), color: 'yellow' },
            ]}
            columns={2}
          />
        </div>
      )}

      {presented.promptVersions.length > 0 && (
        <div className="admin-data-section" style={{ marginTop: '1rem' }}>
          <div className="admin-data-section__title">Prompt versions per layer</div>
          <FieldCardGrid
            fields={presented.promptVersions.map((pv) => ({
              key: pv.layer,
              label: pv.layerLabel,
              value: `v${pv.version}${pv.templateId ? ` · ${String(pv.templateId).slice(0, 8)}…` : ''}`,
              color: 'teal',
              compact: true,
            }))}
            columns={2}
          />
        </div>
      )}

      {presented.schemaVersions.length > 0 && (
        <div className="admin-data-section" style={{ marginTop: '1rem' }}>
          <div className="admin-data-section__title">Schema versions</div>
          <FieldCardGrid
            fields={presented.schemaVersions.map((s) => ({ key: s.key, label: s.key, value: s.version, color: 'muted' }))}
            columns={2}
          />
        </div>
      )}
    </div>
  );
}
