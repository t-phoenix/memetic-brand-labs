import { useState } from 'react';

function groupBy(items, keyField) {
  const map = new Map();
  for (const item of items) {
    const k = item[keyField];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return [...map.entries()].map(([key, versions]) => ({
    key,
    versions: versions.sort((a, b) => String(b.version).localeCompare(String(a.version), undefined, { numeric: true })),
  }));
}

function VersionGroup({ name, versions, activeField = 'is_active' }) {
  const [open, setOpen] = useState(false);
  const active = versions.find((v) => v[activeField]);
  const inactive = versions.filter((v) => !v[activeField]);
  const hasHistory = inactive.length > 0;

  return (
    <div className="admin-version-group">
      <button
        type="button"
        className="admin-version-group__summary"
        onClick={() => hasHistory && setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!hasHistory}
      >
        <span className="admin-version-group__name">{name}</span>
        <span className="admin-version-group__active">
          v{active?.version ?? versions[0]?.version ?? '—'}
          {active?.[activeField] && <span className="admin-badge admin-badge--live">Active</span>}
        </span>
        {hasHistory && (
          <span className="admin-version-group__toggle">
            {inactive.length} older {open ? '▴' : '▾'}
          </span>
        )}
      </button>
      {open && hasHistory && (
        <ul className="admin-version-group__history">
          {inactive.map((v) => (
            <li key={v.id ?? `${name}-${v.version}`}>
              <span>v{v.version}</span>
              <span className="admin-version-group__archived">Archived</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PromptTemplatesRegistry({ items }) {
  const groups = groupBy(items, 'layer_key');
  return (
    <div className="admin-version-registry">
      <div className="admin-version-registry__header">
        <span className="admin-version-registry__title">Prompt templates</span>
        <span className="admin-version-registry__count">{groups.length} layers</span>
      </div>
      <div className="admin-version-registry__list">
        {groups.map((g) => (
          <VersionGroup key={g.key} name={g.key} versions={g.versions} />
        ))}
      </div>
    </div>
  );
}

export function SchemaRegistryPanel({ items }) {
  const groups = groupBy(items, 'schema_key');
  return (
    <div className="admin-version-registry">
      <div className="admin-version-registry__header">
        <span className="admin-version-registry__title">Output schemas</span>
        <span className="admin-version-registry__count">{groups.length} keys</span>
      </div>
      <div className="admin-version-registry__list">
        {groups.map((g) => (
          <VersionGroup key={g.key} name={g.key} versions={g.versions} />
        ))}
      </div>
    </div>
  );
}

export function EnumRegistryPanel({ items }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="admin-version-registry">
      <div className="admin-version-registry__header">
        <span className="admin-version-registry__title">Enum definitions</span>
        <span className="admin-version-registry__count">{items.length} enums</span>
      </div>
      <div className="admin-version-registry__list">
        {items.map((e) => {
          const values = Array.isArray(e.values) ? e.values : [];
          const open = expanded === e.enum_key;
          return (
            <div key={e.enum_key} className="admin-version-group">
              <button
                type="button"
                className="admin-version-group__summary"
                onClick={() => setExpanded(open ? null : e.enum_key)}
                aria-expanded={open}
              >
                <span className="admin-version-group__name">{e.enum_key}</span>
                <span className="admin-version-group__active">{values.length} values</span>
                <span className="admin-version-group__toggle">{open ? '▴' : '▾'}</span>
              </button>
              {open && (
                <ul className="admin-version-group__history admin-version-group__values">
                  {values.map((v) => (
                    <li key={String(v)}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
