import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import NeLayout from '../components/NeLayout';
import { getRunStatus, verifyEmail, getRunOutputs } from '../lib/narrativeApi';
import './NarrativeEngine.css';

const STAGE_LABELS = {
  queued: 'Starting analysis…',
  interpretation: 'Analyzing communication…',
  diagnostics: 'Detecting positioning gaps…',
  translation: 'Translating to human language…',
  positioning: 'Generating narrative directions…',
  memetic_analysis: 'Generating narrative directions…',
  output_generation: 'Finalizing…',
  completed: 'Complete',
};

const POLL_MS = 2500;
/** Keep polling through transient network blips before surfacing a soft warning. */
const MAX_TRANSIENT_ERRORS = 5;

export default function NarrativeRunPage() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [outputs, setOutputs] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [pollWarning, setPollWarning] = useState('');
  const transientErrors = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let interval;

    const applyRunPayload = (data) => {
      setRun(data);
      if (data.share_id) setShareId(data.share_id);
      if (data.outputs?.length) {
        setOutputs(data.outputs);
      }
    };

    const poll = async () => {
      try {
        const data = await getRunStatus(id);
        if (cancelled) return;
        transientErrors.current = 0;
        setPollWarning('');
        applyRunPayload(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        if (cancelled) return;
        transientErrors.current += 1;
        // Never treat a single network/API blip as a permanent pipeline failure.
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
  }, [id]);

  const onVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setEmailError('');
    try {
      await verifyEmail(id, email);
      const out = await getRunOutputs(id);
      if (out.cards) setOutputs(out.cards);
      if (out.share_url) {
        const match = out.share_url.match(/\/results\/([^/]+)/);
        if (match) setShareId(match[1]);
      }
      const refreshed = await getRunStatus(id);
      if (refreshed.share_id) setShareId(refreshed.share_id);
      if (refreshed.outputs?.length) setOutputs(refreshed.outputs);
    } catch (err) {
      setEmailError(err.message || 'Could not verify email');
    } finally {
      setVerifying(false);
    }
  };

  const stageLabel = run ? STAGE_LABELS[run.current_stage] || STAGE_LABELS[run.status] || 'Processing…' : 'Starting…';
  const cards = outputs || [];
  const hasCards = cards.length > 0;
  // If cards already arrived, treat the UX as successful even if status briefly lags.
  const showProgress = run && run.status !== 'completed' && run.status !== 'failed' && !hasCards;
  const showEmailGate = (run?.status === 'completed' || hasCards) && !hasCards;
  const showFailed = run?.status === 'failed' && !hasCards;

  return (
    <NeLayout>
      <div className="ne-page">
        {showProgress && (
          <div className="ne-progress">
            <p className="ne-progress__label">{stageLabel}</p>
            <div className="ne-bar" aria-hidden>
              <div style={{ width: `${run?.progress_pct ?? 8}%` }} />
            </div>
            <p className="ne-progress__pct">{run?.progress_pct ?? 0}%</p>
            {pollWarning && (
              <p className="ne-sub" role="status">
                {pollWarning}
              </p>
            )}
          </div>
        )}

        {showEmailGate && (
          <form className="ne-email-gate" onSubmit={onVerify}>
            <h2>Enter your email to see results</h2>
            <p className="ne-sub">We&apos;ll save your directions — no spam, just your narrative output.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            {emailError && <p className="ne-error" role="alert">{emailError}</p>}
            <button type="submit" className="ne-btn-primary" disabled={verifying}>
              {verifying ? 'Unlocking…' : 'Continue'}
            </button>
          </form>
        )}

        {hasCards && (
          <div className="ne-cards">
            <h2>Your narrative directions</h2>
            <p className="ne-sub">Not perfect — but a useful start.</p>
            {cards.map((card) => (
              <div key={card.key} className={`ne-card ne-card--${card.meta?.color || 'default'}`}>
                <h3>{card.label}</h3>
                <p>{card.content}</p>
              </div>
            ))}
            {shareId && (
              <p className="ne-share">
                Share:{' '}
                <Link to={`/results/${shareId}`}>
                  {window.location.origin}/results/{shareId}
                </Link>
              </p>
            )}
            <Link to="/application-form" className="ne-cta">
              Apply for the Memetic Brand Workshop →
            </Link>
          </div>
        )}

        {showFailed && (
          <div className="ne-failed">
            <p className="ne-error">Analysis failed. Please try again.</p>
            {pollWarning && <p className="ne-sub">{pollWarning}</p>}
            <Link to="/narrative-engine" className="ne-btn-primary ne-btn-primary--inline">
              Start over
            </Link>
          </div>
        )}
      </div>
    </NeLayout>
  );
}
