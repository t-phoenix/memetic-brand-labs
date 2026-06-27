import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminFetch } from '../lib/adminApi';
import RunStatusBadge from '../components/RunStatusBadge';
import JsonBlock from '../components/JsonBlock';
import EventTimeline from '../components/EventTimeline';
import { formatDate, formatDuration, formatUsd, copyText } from '../lib/formatters';

const TABS = ['summary', 'layers', 'events', 'llm'];

export default function RunDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState('summary');
  const [run, setRun] = useState(null);
  const [layers, setLayers] = useState(null);
  const [llm, setLlm] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetch(`/v1/admin/runs/${id}`),
      adminFetch(`/v1/admin/runs/${id}/layers`),
    ])
      .then(([runRes, layersRes]) => {
        setRun(runRes);
        setLayers(layersRes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'llm' && !llm) {
      adminFetch(`/v1/admin/llm-requests?run_id=${id}`)
        .then(setLlm)
        .catch((e) => setError(e.message));
    }
  }, [tab, id, llm]);

  if (loading) return <div className="admin-loading">Loading run…</div>;
  if (error) return <div className="admin-error">{error}</div>;
  if (!run) return <div className="admin-error">Run not found</div>;

  const er = run.run;
  const costs = run.cost_summary ?? layers?.cost_summary;

  return (
    <>
      <header className="admin-page__header">
        <p className="admin-page__subtitle">
          <Link to="/admin/runs">← Runs</Link>
        </p>
        <h1 className="admin-page__title">
          Run <code style={{ fontSize: '0.85em' }}>{id}</code>
          <button
            type="button"
            className="admin-btn"
            style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}
            onClick={() => copyText(id)}
          >
            Copy ID
          </button>
        </h1>
        <p className="admin-page__subtitle">
          <RunStatusBadge status={er.status} /> · {er.model_tier} · {formatDate(er.created_at)}
        </p>
      </header>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab${tab === t ? ' admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="admin-grid admin-grid--2">
          <div className="admin-card">
            <div className="admin-card__label">Inputs</div>
            <JsonBlock data={run.inputs} />
          </div>
          <div className="admin-card">
            <div className="admin-card__label">Metrics</div>
            <p>Duration: {formatDuration(er.total_duration_ms)}</p>
            <p>Progress: {er.progress_pct}%</p>
            <p>Stage: {er.current_stage ?? '—'}</p>
            <p>LLM cost: {costs ? formatUsd(costs.total_llm_cost_usd) : '—'}</p>
            <p>Tokens: {costs ? `${costs.total_prompt_tokens} in / ${costs.total_completion_tokens} out` : '—'}</p>
            {run.share?.share_id && (
              <p>
                Share: <a href={`/results/${run.share.share_id}`} target="_blank" rel="noreferrer">{run.share.share_id}</a>
              </p>
            )}
            {er.failure_detail && (
              <>
                <p style={{ color: '#ef5560', marginTop: '1rem' }}>Failure</p>
                <JsonBlock data={er.failure_detail} />
              </>
            )}
          </div>
          {run.config_snapshot && (
            <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
              <div className="admin-card__label">Config snapshot</div>
              <JsonBlock data={run.config_snapshot} />
            </div>
          )}
        </div>
      )}

      {tab === 'layers' && (
        <div>
          {(layers?.layers ?? []).map((layer) => (
            <details key={layer.id} className="admin-layer-panel" open>
              <summary>{layer.layer_key}</summary>
              <JsonBlock data={layer.output} />
            </details>
          ))}
          {(layers?.diagnostic_scores?.length ?? 0) > 0 && (
            <div className="admin-card" style={{ marginTop: '1rem' }}>
              <div className="admin-card__label">Diagnostic scores</div>
              <JsonBlock data={layers.diagnostic_scores} />
            </div>
          )}
        </div>
      )}

      {tab === 'events' && <EventTimeline events={layers?.events} />}

      {tab === 'llm' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Latency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(llm?.requests ?? []).map((req) => (
                <tr key={req.id}>
                  <td>{req.layer_key}</td>
                  <td>{req.model}</td>
                  <td>{req.prompt_tokens}+{req.completion_tokens}</td>
                  <td>{formatUsd(req.cost_usd)}</td>
                  <td>{req.latency_ms}ms</td>
                  <td>{req.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
