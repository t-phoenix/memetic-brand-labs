import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminApi';
import JsonBlock from '../components/JsonBlock';

export default function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [businessConfig, setBusinessConfig] = useState([]);
  const [skus, setSkus] = useState([]);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const load = () =>
    Promise.all([
      adminFetch('/v1/admin/config'),
      adminFetch('/v1/admin/patterns'),
      adminFetch('/v1/admin/business-config'),
      adminFetch('/v1/admin/product-skus'),
    ])
      .then(([cfg, pat, biz, skuData]) => {
        setConfig(cfg);
        setPatterns(pat.patterns ?? []);
        setBusinessConfig(biz.config ?? []);
        setSkus(skuData.skus ?? []);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const patchSku = async (skuKey, price_usdc) => {
    setSaveMsg('');
    await adminFetch(`/v1/admin/product-skus/${skuKey}`, {
      method: 'PATCH',
      body: JSON.stringify({ price_usdc: Number(price_usdc) }),
    });
    setSaveMsg(`Updated ${skuKey}`);
    await load();
  };

  const patchConfig = async (key, rawValue) => {
    setSaveMsg('');
    let value;
    try {
      value = JSON.parse(rawValue);
    } catch {
      value = rawValue;
    }
    await adminFetch(`/v1/admin/business-config/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
    setSaveMsg(`Updated ${key}`);
    await load();
  };

  if (error) return <div className="admin-error">{error}</div>;
  if (!config) return <div className="admin-loading">Loading config…</div>;

  const commerceKeys = businessConfig.filter((c) =>
    ['pricing.', 'x402.', 'access.', 'email.results', 'email.workshop', 'discovery.'].some((p) =>
      c.config_key.startsWith(p),
    ),
  );
  const adminNotifyEnabled = businessConfig.find((c) => c.config_key === 'email.admin_notify_enabled');
  const adminNotifyRecipients = businessConfig.find((c) => c.config_key === 'email.admin_notify_recipients');

  return (
    <>
      <header className="admin-page__header">
        <h1 className="admin-page__title">Configuration</h1>
        <p className="admin-page__subtitle">
          Engine v{config.meta?.version} · {patterns.length} active patterns
          {saveMsg && ` · ${saveMsg}`}
        </p>
      </header>

      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card__label">Commerce — product SKUs</div>
        <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Audience</th>
                <th>Scope</th>
                <th>Price (USDC)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {skus.map((s) => (
                <SkuRow key={s.sku_key} sku={s} onSave={patchSku} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card__label">Admin run notifications</div>
        <p className="admin-card__meta" style={{ marginTop: '0.5rem' }}>
          Internal email when a user run completes (includes result graphic and admin dashboard link).
        </p>
        {adminNotifyEnabled && (
          <AdminNotifyToggle row={adminNotifyEnabled} onSave={patchConfig} />
        )}
        {adminNotifyRecipients && (
          <AdminNotifyRecipients row={adminNotifyRecipients} onSave={patchConfig} />
        )}
      </div>

      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card__label">Commerce — business config</div>
        <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {commerceKeys.map((c) => (
                <ConfigRow key={c.config_key} row={c} onSave={patchConfig} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

function SkuRow({ sku, onSave }) {
  const [price, setPrice] = useState(String(sku.price_usdc));
  return (
    <tr>
      <td>{sku.sku_key}</td>
      <td>{sku.audience}</td>
      <td>{sku.output_scope}</td>
      <td>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ width: '5rem' }}
        />
      </td>
      <td>
        <button type="button" className="admin-btn" onClick={() => onSave(sku.sku_key, price)}>
          Save
        </button>
      </td>
    </tr>
  );
}

function ConfigRow({ row, onSave }) {
  const [val, setVal] = useState(JSON.stringify(row.config_value));
  return (
    <tr>
      <td>{row.config_key}</td>
      <td>
        <input value={val} onChange={(e) => setVal(e.target.value)} style={{ width: '100%', maxWidth: '20rem' }} />
      </td>
      <td>
        <button type="button" className="admin-btn" onClick={() => onSave(row.config_key, val)}>
          Save
        </button>
      </td>
    </tr>
  );
}

function AdminNotifyToggle({ row, onSave }) {
  const enabled = row.config_value === true || row.config_value === 'true';
  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onSave(row.config_key, JSON.stringify(e.target.checked))}
        />
        Send notification emails on run completion
      </label>
    </div>
  );
}

function AdminNotifyRecipients({ row, onSave }) {
  const initial = Array.isArray(row.config_value) ? row.config_value : [];
  const [emails, setEmails] = useState(initial);
  const [newEmail, setNewEmail] = useState('');

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || emails.includes(trimmed)) return;
    setEmails([...emails, trimmed]);
    setNewEmail('');
  };

  const removeEmail = (email) => {
    setEmails(emails.filter((e) => e !== email));
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="admin-card__label" style={{ marginBottom: '0.5rem' }}>Recipients</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
        {emails.map((email) => (
          <li key={email} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span>{email}</span>
            <button type="button" className="admin-btn" onClick={() => removeEmail(email)}>
              Remove
            </button>
          </li>
        ))}
        {emails.length === 0 && <li style={{ color: 'var(--admin-muted)' }}>No recipients configured</li>}
      </ul>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          className="admin-input"
          type="email"
          placeholder="Add email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
        />
        <button type="button" className="admin-btn" onClick={addEmail}>
          Add
        </button>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => onSave(row.config_key, JSON.stringify(emails))}>
          Save recipients
        </button>
      </div>
    </div>
  );
}
