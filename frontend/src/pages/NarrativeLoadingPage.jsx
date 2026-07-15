import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import { getRunStatus } from '../lib/narrativeApi';
import sun from '../assets/graphics/figma-v2/sun-loading.png';
import './NarrativeFlow.css';

const STEPS = [
  { key: 'interpretation', label: 'Analysing communication...' },
  { key: 'diagnostics', label: 'Detecting positioning gaps...' },
  {
    key: 'positioning',
    label: 'Generating narrative directions…',
    also: ['translation', 'memetic_analysis', 'output_generation'],
  },
];

const POLL_MS = 2500;
const MAX_TRANSIENT_ERRORS = 5;

function stepDone(stage, step, index, stagesOrder) {
  const stageIdx = stagesOrder.indexOf(stage);
  const stepIdx = index;
  if (stage === 'completed') return true;
  if (stageIdx < 0) return false;
  // Mark previous steps complete once we've moved past them
  const keys = [step.key, ...(step.also || [])];
  const thisIdx = Math.min(...keys.map((k) => stagesOrder.indexOf(k)).filter((i) => i >= 0));
  if (thisIdx < 0) return stepIdx < 0;
  return stageIdx > thisIdx;
}

const STAGE_ORDER = [
  'queued',
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
  'completed',
];

export default function NarrativeLoadingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [pollWarning, setPollWarning] = useState('');
  const transientErrors = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let interval;

    const poll = async () => {
      try {
        const data = await getRunStatus(id);
        if (cancelled) return;
        transientErrors.current = 0;
        setPollWarning('');
        setRun(data);

        const done =
          data.status === 'completed' ||
          data.status === 'failed' ||
          (data.outputs && data.outputs.length > 0);
        if (done) {
          clearInterval(interval);
          if (data.status === 'failed' && !(data.outputs && data.outputs.length)) return;
          navigate(`/narrative-engine/run/${id}/results`, { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        transientErrors.current += 1;
        if (transientErrors.current >= MAX_TRANSIENT_ERRORS) {
          setPollWarning(
            err?.message
              ? `Having trouble refreshing status (${err.message}). Still retrying…`
              : 'Having trouble refreshing status. Still retrying…',
          );
        }
      }
    };

    poll();
    interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, navigate]);

  const pct = Math.max(8, Math.min(100, run?.progress_pct ?? 8));
  const stage = run?.current_stage || run?.status || 'queued';
  const failed = run?.status === 'failed';

  return (
    <div className="ne-flow ne-flow--loading">
      <SiteNav tone="cream" />
      <main className="ne-flow__main ne-flow__main--loading">
        {failed ? (
          <div className="ne-flow__failed">
            <p>Analysis failed. Please try again.</p>
            {pollWarning && <p className="ne-flow__warn">{pollWarning}</p>}
            <Link to="/#narrative-engine" className="ne-flow__pill ne-flow__pill--light">
              Start over
            </Link>
          </div>
        ) : (
          <div className="ne-loading">
            <div className="ne-loading__track-wrap">
              <div className="ne-loading__sun" style={{ left: `calc(${pct}% - 82px)` }}>
                <img src={sun} alt="" width={163} height={160} />
              </div>
              <div className="ne-loading__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="ne-loading__fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="ne-loading__meta">
              <ul className="ne-loading__steps">
                {STEPS.map((step, i) => {
                  const done = stepDone(stage, step, i, STAGE_ORDER);
                  return (
                    <li key={step.key} className={done ? 'is-done' : ''}>
                      {step.label}
                    </li>
                  );
                })}
              </ul>
              <p className="ne-loading__pct">{pct}%</p>
            </div>
            {pollWarning && (
              <p className="ne-flow__warn" role="status">
                {pollWarning}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
