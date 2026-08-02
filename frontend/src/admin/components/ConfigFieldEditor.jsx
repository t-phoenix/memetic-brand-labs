import { useState } from 'react';
import { CONFIG_FIELD_META, inferFieldType, humanizeConfigKey } from '../lib/configFieldMeta';

function parseTags(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  return '';
}

function tagsToArray(text) {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

export default function ConfigFieldEditor({ row, onSave, autoSaveBoolean = true }) {
  const key = row.config_key;
  const meta = CONFIG_FIELD_META[key] ?? {};
  const type = meta.type ?? inferFieldType(key, row.config_value);
  const label = meta.label ?? humanizeConfigKey(key);
  const hint = meta.hint ?? row.description ?? '';

  const [draft, setDraft] = useState(() => initialDraft(row.config_value, type));
  const [dirty, setDirty] = useState(false);
  const [synced, setSynced] = useState({ configValue: row.config_value, type });

  if (synced.configValue !== row.config_value || synced.type !== type) {
    setSynced({ configValue: row.config_value, type });
    setDraft(initialDraft(row.config_value, type));
    setDirty(false);
  }

  const save = (value) => {
    const payload = serialize(value, type);
    onSave(key, JSON.stringify(payload));
    setDirty(false);
  };

  const onBooleanChange = (checked) => {
    setDraft(checked);
    if (autoSaveBoolean) save(checked);
    else setDirty(true);
  };

  return (
    <div className="admin-config-field">
      <div className="admin-config-field__head">
        <div className="admin-config-field__label">{label}</div>
        <code className="admin-config-field__key">{key}</code>
      </div>
      {hint && <p className="admin-config-field__hint">{hint}</p>}

      {type === 'boolean' && (
        <label className="admin-toggle">
          <input
            type="checkbox"
            className="admin-toggle__input"
            checked={Boolean(draft)}
            onChange={(e) => onBooleanChange(e.target.checked)}
          />
          <span className="admin-toggle__track" aria-hidden="true" />
          <span className="admin-toggle__text">{draft ? 'Enabled' : 'Disabled'}</span>
        </label>
      )}

      {type === 'select' && (
        <div className="admin-config-field__row">
          <select
            className="admin-config-input admin-config-input--select"
            value={String(draft)}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
          >
            {(meta.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {dirty && (
            <button type="button" className="admin-btn admin-btn--primary admin-config-field__save" onClick={() => save(draft)}>
              Save
            </button>
          )}
        </div>
      )}

      {(type === 'text' || type === 'url' || type === 'email') && (
        <div className="admin-config-field__row">
          <input
            className="admin-config-input"
            type={type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}
            value={String(draft ?? '')}
            placeholder={meta.placeholder ?? ''}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-config-field__save"
            disabled={!dirty}
            onClick={() => save(draft)}
          >
            Save
          </button>
        </div>
      )}

      {type === 'tags' && (
        <div className="admin-config-field__row">
          <textarea
            className="admin-config-input admin-config-input--textarea"
            rows={3}
            value={parseTags(draft)}
            placeholder="Comma-separated values"
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-config-field__save"
            disabled={!dirty}
            onClick={() => save(draft)}
          >
            Save
          </button>
        </div>
      )}

      {type === 'json' && (
        <div className="admin-config-field__row">
          <textarea
            className="admin-config-input admin-config-input--textarea admin-config-input--mono"
            rows={4}
            value={typeof draft === 'string' ? draft : JSON.stringify(draft, null, 2)}
            onChange={(e) => {
              setDraft(e.target.value);
              setDirty(true);
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-config-field__save"
            disabled={!dirty}
            onClick={() => save(draft)}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function initialDraft(value, type) {
  if (type === 'boolean') return value === true || value === 'true';
  if (type === 'tags') return parseTags(value);
  if (type === 'select' || type === 'text' || type === 'url' || type === 'email') {
    if (typeof value === 'string') return value.replace(/^"|"$/g, '');
    return value ?? '';
  }
  if (type === 'json') return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return value;
}

function serialize(draft, type) {
  if (type === 'boolean') return Boolean(draft);
  if (type === 'tags') return tagsToArray(String(draft));
  if (type === 'json') {
    try {
      return JSON.parse(String(draft));
    } catch {
      return draft;
    }
  }
  return draft;
}
