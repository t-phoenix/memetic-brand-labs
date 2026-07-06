import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getRun,
  getRunPipeline,
  getLlmRequests,
  createPlaygroundRun,
  runPlaygroundPipeline,
} from '../lib/adminApi';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PipelineStepper from '../components/PipelineStepper.jsx';
import LayerOutputPanel from '../components/LayerOutputPanel.jsx';
import OutputCardsPreview from '../components/OutputCardsPreview.jsx';
import DiagnosticRadarChart from '../components/DiagnosticRadarChart.jsx';
import MemeticBarChart from '../components/MemeticBarChart.jsx';
import EventTimeline from '../components/EventTimeline.jsx';
import HelpTooltip from '../components/HelpTooltip.jsx';
import JsonToggle from '../components/JsonToggle.jsx';
import {
  formatUsd,
  humanizeTier,
  humanizeRunSource,
  humanizeLayerKey,
  humanizeModel,
  formatRelativeTime,
  truncateId,
} from '../lib/humanize.js';
import { formatDuration, copyText } from '../lib/formatters';

const TABS = ['pipeline', 'scores', 'results', 'timeline', 'costs', 'advanced'];

export default function RunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('pipeline');
  const [run, setRun] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [llm, setLlm] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const load = () =>
    Promise.all([getRun(id), getRunPipeline(id)]).then(([runRes, pipeRes]) => {
      setRun(runRes);
      setPipeline(pipeRes);
    });

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const er = run?.run;
    if (!er || (er.status !== 'running' && er.status !== 'processing')) return undefined;
    const t = setInterval(() => {
      load().catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [run?.run?.status, id]);

  useEffect(() => {
    if ((tab === 'costs' || tab === 'advanced') && !llm) {
      getLlmRequests(id).then(setLlm).catch((e) => setError(e.message));
    }
  }, [tab, id, llm]);

  const doAction = async (label, fn) => {
    setActionLoading(label);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading('');
    }
  };

  const cloneAsTest = async () => {
    const inputs = run?.inputs;
    if (!inputs) return;
    const res = await createPlaygroundRun({
      building: inputs.building,
      audience: inputs.audience,
      challenge: inputs.challenge,
      differentiation: inputs.differentiation,
      website: inputs.website_url,
      model_tier: run.run.model_tier,
      clone_from_run_id: id,
      mode: 'step',
    });
    navigate(`/admin/playground/${res.run_id}`);
  };

  if (loading) return <div className="admin-skeleton" style={{ minHeight: 200 }} />;
  if (error && !run) return <div className="admin-error">{error}</div>;
  if (!run) return <div className="admin-error">Run not found</div>;

  const er = run.run;
  const costs = run.cost_summary ?? pipeline?.cost_summary;
  const isTest = er.run_source === 'admin_test' || er.run_source === 'admin_replay';

  return (
    <>
      <p className="admin-page__subtitle">
        <Link to="/admin/runs">← All runs</Link>
      </p>

      <div className="admin-run-header">
        <div>
          <div className="ne-eyebrow">{humanizeRunSource(er.run_source)}</div>
          <h1 className="admin-page__title" style={{ marginBottom: '0.5rem' }}>
            {run.inputs?.building ?? 'Run'}
          </h1>
          <StatusBadge status={er.status} currentStage={er.current_stage} />
          <span style={{ marginLeft: '0.75rem', color: 'var(--admin-muted)', fontSize: '0.9rem' }}>
            {humanizeTier(er.model_tier)} · {formatRelativeTime(er.created_at)}
          </span>
          {isTest && <span className="admin-badge admin-badge--test" style={{ marginLeft: '0.5rem' }}>Test — not billed to user</span>}
        </div>
        <div className="admin-run-actions">
          <button type="button" className="admin-btn" onClick={() => copyText(id)} title={id}>
            ID {truncateId(id)}
          </button>
          <button type="button" className="admin-btn" disabled={!!actionLoading} onClick={cloneAsTest}>
            Clone as test
          </button>
          <Link className="admin-btn admin-btn--primary" to={`/admin/playground/${id}`} style={{ textDecoration: 'none' }}>
            Open in Playground
          </Link>
          {er.status === 'failed' && er.current_stage && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={!!actionLoading}
              onClick={() =>
                doAction('retry', () =>
                  runPlaygroundPipeline(id, { mode: 'from_layer', from_layer: er.current_stage }),
                )
              }
            >
              Retry from failed step
            </button>
          )}
        </div>
      </div>

      <div className="admin-grid admin-grid--4" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card admin-card--accent-purple">
          <div className="admin-card__label">Duration</div>
          <div className="admin-card__value" style={{ fontSize: '1.25rem' }}>{formatDuration(er.total_duration_ms)}</div>
        </div>
        <div className="admin-card admin-card--accent-purple">
          <div className="admin-card__label">
            LLM cost
            <HelpTooltip text="Calculated from real API token counts × your pricing table. Not an invoice line item." />
          </div>
          <div className="admin-card__value" style={{ fontSize: '1.25rem' }}>{formatUsd(costs?.total_llm_cost_usd)}</div>
          <div className="admin-cost-note">Based on API token usage</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Tokens</div>
          <div className="admin-card__value" style={{ fontSize: '1.25rem' }}>
            {(costs?.total_prompt_tokens ?? 0).toLocaleString()}
          </div>
          <div className="admin-card__meta">{(costs?.total_completion_tokens ?? 0).toLocaleString()} out</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Progress</div>
          <div className="admin-card__value" style={{ fontSize: '1.25rem' }}>{er.progress_pct ?? 0}%</div>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab${tab === t ? ' admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="admin-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {tab === 'pipeline' && (
        <>
          <PipelineStepper layers={pipeline?.layers} currentStage={er.current_stage} />
          {(pipeline?.layers ?? []).map((layer) => (
            <LayerOutputPanel key={layer.layer_key} layer={layer} />
          ))}
        </>
      )}

      {tab === 'scores' && (
        <div className="admin-grid admin-grid--2">
          <DiagnosticRadarChart scores={pipeline?.diagnostic_scores} />
          <MemeticBarChart scores={pipeline?.memetic_lite_scores} />
        </div>
      )}

      {tab === 'results' && <OutputCardsPreview outputs={pipeline?.outputs} />}

      {tab === 'timeline' && <EventTimeline events={pipeline?.events} />}

      {tab === 'costs' && (
        <>
          <div className="admin-card" style={{ marginBottom: '1rem' }}>
            <div className="admin-card__label">Cost summary</div>
            <p>Total LLM: <strong>{formatUsd(costs?.total_llm_cost_usd)}</strong></p>
            <p className="admin-cost-note">Calculated using pricing table from API token usage — reconcile with OpenAI/Anthropic using provider request IDs below.</p>
            {run.payment && <p>Revenue (paid run): <strong>{formatUsd(run.payment.amount_usdc)}</strong></p>}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Model</th>
                  <th>Tokens in/out</th>
                  <th>Rate ($/M)</th>
                  <th>Cost</th>
                  <th>Request ID</th>
                </tr>
              </thead>
              <tbody>
                {(llm?.requests ?? []).map((req) => (
                  <tr key={req.id}>
                    <td>{humanizeLayerKey(req.layer_key)}</td>
                    <td>{humanizeModel(req.model)}</td>
                    <td>
                      {req.prompt_tokens}
                      {req.cached_prompt_tokens > 0 && ` (${req.cached_prompt_tokens} cached)`}
                      +{req.completion_tokens}
                    </td>
                    <td>{req.input_price_per_m}/{req.output_price_per_m}</td>
                    <td>
                      {formatUsd(req.cost_usd)}
                      {req.cost_warning && <span className="admin-warning-badge">No pricing row</span>}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{req.provider_request_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'advanced' && (
        <div className="admin-grid admin-grid--2">
          <div className="admin-card">
            <div className="admin-card__label">Inputs</div>
            <JsonToggle data={run.inputs} label="Show raw inputs" />
          </div>
          <div className="admin-card">
            <div className="admin-card__label">Config snapshot</div>
            <JsonToggle data={run.config_snapshot} />
          </div>
          <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
            <div className="admin-card__label">Layer outputs (raw)</div>
            <JsonToggle data={pipeline?.layers_legacy} />
          </div>
        </div>
      )}
    </>
  );
}
