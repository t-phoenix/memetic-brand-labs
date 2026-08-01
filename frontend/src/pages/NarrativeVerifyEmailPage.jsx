import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import {
  confirmEmailVerification,
  confirmIntakeEmailVerification,
} from '../lib/narrativeApi';
import { consumeMagicLinkHash, getSupabaseSessionEmail } from '../lib/magicLinkCallback';
import sun from '../assets/graphics/figma-v2/mobile-hero-sun.svg';
import './NarrativeFlow.css';

const VERIFY_STEPS = [
  { key: 'session', label: 'Confirming your sign-in link' },
  { key: 'verify', label: 'Verifying your company email' },
  { key: 'start', label: 'Starting your analysis' },
];

function stepIndex(status) {
  if (status === 'success') return VERIFY_STEPS.length;
  if (status === 'verify') return 1;
  if (status === 'start') return 2;
  return 0;
}

export default function NarrativeVerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('session');
  const [error, setError] = useState(null);
  const [recoveryActions, setRecoveryActions] = useState([]);

  const runId = params.get('run_id');
  const intakeId = params.get('intake_id');
  const attemptId = params.get('attempt_id');
  const emailFromUrl = params.get('email');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        let email =
          emailFromUrl?.trim().toLowerCase() ||
          sessionStorage.getItem('ne_pending_email')?.trim().toLowerCase() ||
          null;

        try {
          const hashEmail = await consumeMagicLinkHash();
          if (hashEmail) email = hashEmail;
        } catch {
          // Hash tokens may already be consumed; fall back to URL/session email.
        }

        if (!email) {
          const sessionEmail = await getSupabaseSessionEmail();
          if (sessionEmail) email = sessionEmail;
        }

        if (!email) {
          if (!cancelled) {
            setStatus('failed');
            setError('We could not read your email from this link. Request a new verification link.');
            setRecoveryActions([
              { action: 'authorize', label: 'Back to verification', method: 'authorize' },
            ]);
          }
          return;
        }

        if (!cancelled) setStatus('verify');

        const confirm = intakeId
          ? confirmIntakeEmailVerification(intakeId, email, attemptId || undefined)
          : runId
            ? confirmEmailVerification(runId, email, attemptId || undefined)
            : Promise.reject(new Error('missing session'));

        if (!cancelled) setStatus('start');

        const result = await confirm;
        sessionStorage.removeItem('ne_pending_email');
        sessionStorage.removeItem('ne_pending_intake_id');

        if (!cancelled) {
          setStatus('success');
          const id = result.run_id || runId;
          setTimeout(() => {
            if (!cancelled) navigate(`/narrative-engine/run/${id}`, { replace: true });
          }, 1200);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('failed');
          setError(err.userMessage || err.message || 'Email verification failed.');
          setRecoveryActions(err.recoveryActions || [
            { action: 'authorize', label: 'Try again', method: 'authorize' },
            { action: 'pay_unlock', label: 'Pay with USDC', method: 'authorize_pay' },
          ]);
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [runId, intakeId, attemptId, emailFromUrl, navigate]);

  const currentIdx = stepIndex(status);
  const isLoading = status === 'session' || status === 'verify' || status === 'start';
  const headline =
    status === 'success'
      ? 'Email verified!'
      : status === 'failed'
        ? 'Verification didn’t work'
        : 'Verifying your email…';

  const subtext =
    status === 'success'
      ? 'Starting your Narrative Engine analysis…'
      : status === 'failed'
        ? error
        : status === 'start'
          ? 'Almost there — we’re starting your analysis.'
          : 'Hang tight while we confirm your company email.';

  const handleRecovery = (action) => {
    if (action.method === 'authorize' || action.method === 'authorize_pay') {
      navigate('/narrative-engine/authorize', { replace: true });
    }
  };

  return (
    <div className="ne-flow ne-flow--verify">
      <SiteNav tone="cream" />
      <main className="ne-flow__main ne-flow__main--verify">
        <div className="ne-verify ne-flow__email" role="status" aria-live="polite">
          {isLoading && (
            <div className="ne-verify__sun-wrap" aria-hidden="true">
              <img className="ne-verify__sun" src={sun} alt="" width={120} height={118} />
            </div>
          )}

          {status === 'success' && (
            <div className="ne-verify__badge ne-verify__badge--success" aria-hidden="true">✓</div>
          )}
          {status === 'failed' && (
            <div className="ne-verify__badge ne-verify__badge--failed" aria-hidden="true">!</div>
          )}

          <h1>{headline}</h1>
          <p className="ne-verify__sub">{subtext}</p>

          {isLoading && (
            <ol className="ne-verify__steps">
              {VERIFY_STEPS.map((step, index) => {
                const done = index < currentIdx;
                const active = index === currentIdx;
                return (
                  <li
                    key={step.key}
                    className={[done && 'is-done', active && 'is-active'].filter(Boolean).join(' ')}
                  >
                    <span className="ne-verify__marker" aria-hidden="true">
                      {done ? '✓' : active ? '…' : index + 1}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {status === 'failed' && recoveryActions.length > 0 && (
            <div className="ne-unlock__recovery">
              {recoveryActions.map((a) => (
                <button
                  key={a.action}
                  type="button"
                  className="ne-flow__pill ne-flow__pill--light"
                  onClick={() => handleRecovery(a)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {status === 'failed' && (
            <Link to="/#narrative-engine" className="ne-verify__back">
              Back to Narrative Engine
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
