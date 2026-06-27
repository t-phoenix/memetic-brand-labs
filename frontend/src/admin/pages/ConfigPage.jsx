import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminApi';
import JsonBlock from '../components/JsonBlock';

export default function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      adminFetch('/v1/admin/config'),
      adminFetch('/v1/admin/patterns'),
    ])
      .then(([cfg, pat]) => {
        setConfig(cfg);
        setPatterns(pat.patterns ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="admin-error">{error}</div>;
  if (!config) return <div className="admin-loading">Loading config…</div>;

  return (
    <>
      <header className="admin-page__header">
        <h1 className="admin-page__title">Configuration</h1>
        <p className="admin-page__subtitle">
          Engine v{config.meta?.version} · {patterns.length} active patterns
        </p>
      </header>

      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card__label">Model routing by tier</div>
        <JsonBlock data={config.model_routing} />
      </div>

      <div className="admin-grid admin-grid--2">
        <div className="admin-card">
          <div className="admin-card__label">Pricing tiers ({config.pricing_tiers?.length})</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Price</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {config.pricing_tiers.map((t) => (
                  <tr key={t.tier_key}>
                    <td>{t.tier_key}</td>
                    <td>{t.label}</td>
                    <td>{t.price_usdc} USDC</td>
                    <td>{t.is_active ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__label">Prompt templates ({config.prompt_templates?.length})</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Version</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {config.prompt_templates.map((p) => (
                  <tr key={p.id}>
                    <td>{p.layer_key}</td>
                    <td>{p.version}</td>
                    <td>{p.is_active ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__label">Schemas ({config.schema_registry?.length})</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Version</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {config.schema_registry.map((s) => (
                  <tr key={s.schema_key}>
                    <td>{s.schema_key}</td>
                    <td>{s.version}</td>
                    <td>{s.is_active ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__label">Enums ({config.enum_definitions?.length})</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Values</th>
                </tr>
              </thead>
              <tbody>
                {config.enum_definitions.map((e) => (
                  <tr key={e.enum_key}>
                    <td>{e.enum_key}</td>
                    <td>{Array.isArray(e.values) ? e.values.length : '—'} values</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card__label">Pattern library (sample)</div>
        <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {patterns.slice(0, 20).map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.category}</td>
                  <td>{(p.tags ?? []).slice(0, 3).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {patterns.length > 20 && (
          <p className="admin-card__meta" style={{ marginTop: '0.75rem' }}>
            Showing 20 of {patterns.length} patterns
          </p>
        )}
      </div>
    </>
  );
}
