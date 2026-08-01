import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createPlaygroundRun,
  getRun,
  getRunPipeline,
  runPlaygroundLayer,
  runPlaygroundPipeline,
  previewPlaygroundLayer,
  finalizePlaygroundRun,
  retryPlaygroundLayer,
} from '../lib/adminApi';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import PipelineStepper from '../components/PipelineStepper.jsx';
import LayerOutputPanel from '../components/LayerOutputPanel.jsx';
import OutputCardsPreview from '../components/OutputCardsPreview.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { humanizeLayerKey, formatUsd, humanizeModel } from '../lib/humanize.js';

const LAYERS = [
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
];

export default function PlaygroundPage() {
  const { id: runIdParam } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(runIdParam ? 'control' : 'create');
  const [runId, setRunId] = useState(runIdParam ?? '');
  const [pipeline, setPipeline] = useState(null);
  const [run, setRun] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({
    building: '',
    audience: '',
    challenge: '',
    differentiation: '',
    website: '',
    model_tier: 'standard',
    execution_mode: 'step',
  });

  const loadRun = async (id) => {
    const [r, p] = await Promise.all([getRun(id), getRunPipeline(id)]);
    setRun(r);
    setPipeline(p);
  };

  useEffect(() => {
    if (runIdParam) {
      setRunId(runIdParam);
      setMode('control');
      loadRun(runIdParam).catch((e) => setError(e.message));
    }
  }, [runIdParam]);

  useEffect(() => {
    if (!runId || mode !== 'control') return undefined;
    const er = run?.run;
    if (er?.status === 'running' || er?.status === 'processing') {
      const t = setInterval(() => loadRun(runId).catch(() => {}), 3000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [runId, run?.run, mode]);

  const onCreate = async (e) => {
    e.preventDefault();
    setBusy('create');
    setError('');
    try {
      const res = await createPlaygroundRun({
        ...form,
        mode: form.execution_mode === 'full' ? 'full' : 'step',
      });
      setRunId(res.run_id);
      setMode('control');
      navigate(`/admin/playground/${res.run_id}`, { replace: true });
      await loadRun(res.run_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const confirmRun = (layerKey, estCost, model) => {
    const msg = `Run "${humanizeLayerKey(layerKey)}" using ${humanizeModel(model)}?\nEstimated cost: ~${formatUsd(estCost)}`;
    return window.confirm(msg);
  };

  const doPreview = async (layerKey) => {
    setBusy(`preview-${layerKey}`);
    try {
      const p = await previewPlaygroundLayer(runId, layerKey);
      setPreview(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const doRunLayer = async (layerKey, retry = false) => {
    setError('');
    try {
      const p = await previewPlaygroundLayer(runId, layerKey);
      if (!confirmRun(layerKey, p.estimated_cost_usd, p.model)) return;
      setBusy(`run-${layerKey}`);
      if (retry) await retryPlaygroundLayer(runId, layerKey);
      else await runPlaygroundLayer(runId, layerKey);
      setTimeout(() => loadRun(runId).catch(() => {}), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const doRunRemaining = async () => {
    const layers = pipeline?.layers ?? [];
    const next = LAYERS.find((k) => {
      const l = layers.find((x) => x.layer_key === k);
      return !l || l.status !== 'completed';
    });
    if (!next) return;
    if (!window.confirm(`Run all remaining layers starting from ${humanizeLayerKey(next)}?`)) return;
    setBusy('remaining');
    try {
      await runPlaygroundPipeline(runId, { mode: 'from_layer', from_layer: next });
      setTimeout(() => loadRun(runId).catch(() => {}), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const doFinalize = async () => {
    if (!window.confirm('Build final result cards from completed layers?')) return;
    setBusy('finalize');
    try {
      await finalizePlaygroundRun(runId);
      setTimeout(() => loadRun(runId).catch(() => {}), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  if (mode === 'create') {
    return (
      <>
        <AdminPageHeader
          eyebrow="Playground"
          title="Test the engine"
          subtitle="Create a sandbox run — step through each layer or run the full pipeline."
        />
        <div className="admin-tabs">
          <button type="button" className="admin-tab admin-tab--active">New test run</button>
        </div>
        {error && <div className="admin-error">{error}</div>}
        <form className="ne-form admin-card" onSubmit={onCreate} style={{ maxWidth: 560 }}>
          <label>What are you building?</label>
          <textarea required rows={2} value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
          <label>Who is it for?</label>
          <textarea required rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          <label>What challenge are you solving?</label>
          <textarea required rows={2} value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} />
          <label>What makes you different?</label>
          <textarea required rows={2} value={form.differentiation} onChange={(e) => setForm({ ...form, differentiation: e.target.value })} />
          <label>Website <span className="ne-optional">(optional)</span></label>
          <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <label>Quality tier</label>
          <select value={form.model_tier} onChange={(e) => setForm({ ...form, model_tier: e.target.value })}>
            <option value="fast">Fast</option>
            <option value="standard">Standard</option>
            <option value="quality">Quality</option>
          </select>
          <label>Execution</label>
          <select value={form.execution_mode} onChange={(e) => setForm({ ...form, execution_mode: e.target.value })}>
            <option value="step">Step by step</option>
            <option value="full">Full pipeline</option>
          </select>
          <button type="submit" className="ne-btn-primary" disabled={!!busy}>
            {busy ? 'Creating…' : 'Create & start'}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Playground"
        title={run?.inputs?.building ?? 'Test run'}
        subtitle="Run layers one at a time, preview prompts, and finalize outputs."
      >
        <span className="admin-badge admin-badge--test">Test — not billed to user</span>
        {run?.run && <StatusBadge status={run.run.status} currentStage={run.run.current_stage} />}
      </AdminPageHeader>

      <div className="admin-run-actions" style={{ marginBottom: '1rem' }}>
        <Link to="/admin/playground" className="admin-btn">New test run</Link>
        <Link to={`/admin/runs/${runId}`} className="admin-btn">Full run detail →</Link>
        <button type="button" className="admin-btn admin-btn--primary" disabled={!!busy} onClick={doRunRemaining}>
          Run remaining layers
        </button>
        <button type="button" className="admin-btn" disabled={!!busy} onClick={doFinalize}>
          Finalize outputs
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <PipelineStepper layers={pipeline?.layers} currentStage={run?.run?.current_stage} />

      {LAYERS.map((layerKey) => {
        const layer = pipeline?.layers?.find((l) => l.layer_key === layerKey);
        return (
          <div key={layerKey}>
            <LayerOutputPanel layer={layer ?? { layer_key: layerKey, status: 'pending', label: humanizeLayerKey(layerKey) }} />
            <div className="admin-toolbar" style={{ margin: '0 0 1rem 1rem' }}>
              <button type="button" className="admin-btn" disabled={!!busy} onClick={() => doPreview(layerKey)}>
                Preview prompt
              </button>
              <button type="button" className="admin-btn admin-btn--primary" disabled={!!busy} onClick={() => doRunLayer(layerKey)}>
                Run this layer
              </button>
              {layer?.status === 'completed' && (
                <button type="button" className="admin-btn" disabled={!!busy} onClick={() => doRunLayer(layerKey, true)}>
                  Re-run
                </button>
              )}
            </div>
          </div>
        );
      })}

      {preview && (
        <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-card__label">Prompt preview — {humanizeLayerKey(preview.layer_key)}</div>
          <p className="admin-card__meta">Model: {humanizeModel(preview.model)} · ~{preview.estimated_input_tokens} input tokens · ~{formatUsd(preview.estimated_cost_usd)}</p>
          <details>
            <summary>System prompt</summary>
            <pre className="admin-json">{preview.system_prompt}</pre>
          </details>
          <details>
            <summary>User prompt</summary>
            <pre className="admin-json">{preview.user_prompt}</pre>
          </details>
        </div>
      )}

      {(pipeline?.outputs?.length ?? 0) > 0 && (
        <>
          <h2 className="admin-page__title" style={{ fontSize: '1.25rem', marginTop: '1.5rem' }}>Result cards</h2>
          <OutputCardsPreview outputs={pipeline.outputs} />
        </>
      )}
    </>
  );
}
