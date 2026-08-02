import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminApi';
import ConfigFieldEditor from '../components/ConfigFieldEditor.jsx';
import {
  EnumRegistryPanel,
  PromptTemplatesRegistry,
  SchemaRegistryPanel,
} from '../components/VersionRegistryPanel.jsx';
import { groupCommerceConfig } from '../lib/configFieldMeta';

export default function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [businessConfig, setBusinessConfig] = useState([]);
  const [skus, setSkus] = useState([]);
  const [tierPrices, setTierPrices] = useState([]);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const load = () =>
    Promise.all([
      adminFetch('/v1/admin/config'),
      adminFetch('/v1/admin/patterns'),
      adminFetch('/v1/admin/business-config'),
      adminFetch('/v1/admin/product-sku-tier-prices'),
    ])
      .then(([cfg, pat, biz, tierData]) => {
        setConfig(cfg);
        setPatterns(pat.patterns ?? []);
        setBusinessConfig(biz.config ?? []);
        setSkus(tierData.skus ?? []);
        setTierPrices(tierData.prices ?? []);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const patchTierPrice = async (skuKey, tierKey, price_usdc) => {
    setSaveMsg('');
    await adminFetch(
      `/v1/admin/product-sku-tier-prices/${encodeURIComponent(skuKey)}/${encodeURIComponent(tierKey)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ price_usdc: Number(price_usdc) }),
      },
    );
    setSaveMsg(`Updated ${skuKey} / ${tierKey}`);
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
    setSaveMsg(`Saved ${key}`);
    await load();
  };

  if (error) return <div className="admin-error">{error}</div>;
  if (!config) return <div className="admin-loading">Loading config…</div>;

  const commerceKeys = businessConfig.filter(
    (c) =>
      ['x402.', 'access.', 'email.', 'discovery.'].some((p) => c.config_key.startsWith(p)) &&
      ![
        'access.free_email_model_tier',
        'access.admin_recipient_unlimited_runs_enabled',
        'email.admin_notify_enabled',
        'email.admin_notify_recipients',
      ].includes(c.config_key) &&
      !c.config_key.startsWith('pricing.human_unlock') &&
      !c.config_key.startsWith('pricing.agent_'),
  );
  const commerceGroups = groupCommerceConfig(commerceKeys);
  const freeEmailTier = businessConfig.find((c) => c.config_key === 'access.free_email_model_tier');
  const adminNotifyEnabled = businessConfig.find((c) => c.config_key === 'email.admin_notify_enabled');
  const adminNotifyRecipients = businessConfig.find((c) => c.config_key === 'email.admin_notify_recipients');
  const adminUnlimitedRuns = businessConfig.find(
    (c) => c.config_key === 'access.admin_recipient_unlimited_runs_enabled',
  );

  return (
    <div className="admin-config-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Configuration</h1>
        <p className="admin-page__subtitle">
          Engine v{config.meta?.version} · {patterns.length} active patterns
        </p>
        {saveMsg && <p className="admin-config-page__save-msg" role="status">{saveMsg}</p>}
      </header>

      <section className="admin-config-section admin-card">
        <div className="admin-config-section__head">
          <h2 className="admin-config-section__title">Commerce pricing</h2>
          <p className="admin-config-section__desc">
            USDC prices per SKU and model tier (x402 on Base). Paying users and agents choose tier at checkout.
          </p>
        </div>
        {freeEmailTier && <FreeEmailTierSelect row={freeEmailTier} onSave={patchConfig} />}
        <div className="admin-pricing-matrix">
          <table className="admin-table admin-pricing-matrix__table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Audience</th>
                <th>Scope</th>
                <th>Fast</th>
                <th>Standard</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((s) => (
                <SkuTierMatrixRow
                  key={s.sku_key}
                  sku={s}
                  prices={tierPrices.filter((p) => p.sku_key === s.sku_key)}
                  onSave={patchTierPrice}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-config-section admin-card">
        <div className="admin-config-section__head">
          <h2 className="admin-config-section__title">Commerce settings</h2>
          <p className="admin-config-section__desc">
            Runtime business rules for access, payments, email, and agent discovery. Booleans save instantly; other fields use Save.
          </p>
        </div>
        <div className="admin-config-groups">
          {commerceGroups.map((group) => (
            <div key={group.id} className="admin-config-group">
              <h3 className="admin-config-group__title">{group.title}</h3>
              {group.description && <p className="admin-config-group__desc">{group.description}</p>}
              <div className="admin-config-group__fields">
                {group.rows.map((row) => (
                  <ConfigFieldEditor key={row.config_key} row={row} onSave={patchConfig} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-config-section admin-card">
        <div className="admin-config-section__head">
          <h2 className="admin-config-section__title">Admin notifications</h2>
          <p className="admin-config-section__desc">
            Internal email when a user run completes (result graphic + dashboard link). Sent via Resend to the
            recipients below — same API key and From address as results email. Playground test runs are excluded.
          </p>
          <p className="admin-config-section__desc admin-config-section__desc--note">
            Resend setup: verify your domain at{' '}
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer">
              resend.com/domains
            </a>
            , add DNS records (SPF, DKIM), then set <code>RESEND_API_KEY</code> on the API. Full guide:{' '}
            <code>docs/narrative-engine/resend-email-setup.md</code>
          </p>
        </div>
        {adminNotifyEnabled && <AdminNotifyToggle row={adminNotifyEnabled} onSave={patchConfig} />}
        {adminUnlimitedRuns && <AdminUnlimitedRunsToggle row={adminUnlimitedRuns} onSave={patchConfig} />}
        {adminNotifyRecipients && <AdminNotifyRecipients row={adminNotifyRecipients} onSave={patchConfig} />}
      </section>

      <section className="admin-config-section admin-card">
        <div className="admin-config-section__head">
          <h2 className="admin-config-section__title">Engine registry</h2>
          <p className="admin-config-section__desc">
            Active prompt, schema, and enum versions. Expand a row to see archived versions.
          </p>
        </div>
        <div className="admin-config-registry-grid">
          <PromptTemplatesRegistry items={config.prompt_templates ?? []} />
          <SchemaRegistryPanel items={config.schema_registry ?? []} />
          <EnumRegistryPanel items={config.enum_definitions ?? []} />
        </div>
      </section>

      <section className="admin-config-section admin-card">
        <div className="admin-config-section__head">
          <h2 className="admin-config-section__title">Pattern library</h2>
          <p className="admin-config-section__desc">Sample of active memetic patterns used in analysis.</p>
        </div>
        <div className="admin-table-wrap admin-table-wrap--flush">
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
      </section>
    </div>
  );
}

function FreeEmailTierSelect({ row, onSave }) {
  const raw = row.config_value;
  const current = typeof raw === 'string' ? raw.replace(/"/g, '') : String(raw ?? 'quality');
  const [tier, setTier] = useState(current);

  return (
    <div className="admin-config-field admin-config-field--inline">
      <div className="admin-config-field__head">
        <div className="admin-config-field__label">Complimentary email tier</div>
      </div>
      <p className="admin-config-field__hint">
        Model tier for verified company-email runs (free). OAuth free runs always use Quality.
      </p>
      <div className="admin-config-field__row">
        <select
          className="admin-config-input admin-config-input--select"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="fast">Fast</option>
          <option value="standard">Standard</option>
          <option value="quality">Quality</option>
        </select>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => onSave(row.config_key, JSON.stringify(tier))}>
          Save
        </button>
      </div>
    </div>
  );
}

function SkuTierMatrixRow({ sku, prices, onSave }) {
  const tiers = ['fast', 'standard', 'quality'];
  const [vals, setVals] = useState(() =>
    Object.fromEntries(tiers.map((t) => [t, String(prices.find((p) => p.tier_key === t)?.price_usdc ?? '')])),
  );
  const [savedTier, setSavedTier] = useState(null);

  const saveTier = async (t) => {
    await onSave(sku.sku_key, t, vals[t]);
    setSavedTier(t);
    setTimeout(() => setSavedTier(null), 2000);
  };

  return (
    <tr>
      <td><code className="admin-config-field__key">{sku.sku_key}</code></td>
      <td>{sku.audience}</td>
      <td>{sku.output_scope}</td>
      {tiers.map((t) => (
        <td key={t}>
          <div className="admin-pricing-cell">
            <input
              className="admin-config-input admin-config-input--price"
              type="number"
              step="0.01"
              min="0"
              value={vals[t]}
              onChange={(e) => setVals({ ...vals, [t]: e.target.value })}
            />
            <button type="button" className="admin-btn admin-btn--compact" onClick={() => saveTier(t)}>
              {savedTier === t ? 'Saved' : 'Save'}
            </button>
          </div>
        </td>
      ))}
    </tr>
  );
}

function AdminNotifyToggle({ row, onSave }) {
  const enabled = row.config_value === true || row.config_value === 'true';
  return (
    <label className="admin-toggle admin-toggle--block">
      <input
        type="checkbox"
        className="admin-toggle__input"
        checked={enabled}
        onChange={(e) => onSave(row.config_key, JSON.stringify(e.target.checked))}
      />
      <span className="admin-toggle__track" aria-hidden="true" />
      <span className="admin-toggle__text">Send notification emails on run completion</span>
    </label>
  );
}

function AdminUnlimitedRunsToggle({ row, onSave }) {
  const enabled = row.config_value === true || row.config_value === 'true';
  return (
    <label className="admin-toggle admin-toggle--block">
      <input
        type="checkbox"
        className="admin-toggle__input"
        checked={enabled}
        onChange={(e) => onSave(row.config_key, JSON.stringify(e.target.checked))}
      />
      <span className="admin-toggle__track" aria-hidden="true" />
      <span className="admin-toggle__text">Allow notification recipients unlimited free runs</span>
    </label>
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
    <div className="admin-recipients">
      <div className="admin-config-field__label">Notification recipients</div>
      <ul className="admin-recipients__list">
        {emails.map((email) => (
          <li key={email} className="admin-recipients__item">
            <span>{email}</span>
            <button type="button" className="admin-btn admin-btn--compact" onClick={() => removeEmail(email)}>
              Remove
            </button>
          </li>
        ))}
        {emails.length === 0 && <li className="admin-recipients__empty">No recipients configured</li>}
      </ul>
      <div className="admin-recipients__add">
        <input
          className="admin-config-input"
          type="email"
          placeholder="Add email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
        />
        <button type="button" className="admin-btn" onClick={addEmail}>Add</button>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => onSave(row.config_key, JSON.stringify(emails))}>
          Save list
        </button>
      </div>
    </div>
  );
}
