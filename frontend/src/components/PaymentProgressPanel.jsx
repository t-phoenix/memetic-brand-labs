import './PaymentProgressPanel.css';

const PRE_RUN_STEPS = [
  { key: 'wallet', label: 'Approve USDC payment in your wallet' },
  { key: 'settling', label: 'Submitting payment to Base' },
  { key: 'verifying', label: 'Verifying payment' },
  { key: 'confirmed', label: 'Payment confirmed' },
  { key: 'starting', label: 'Starting your analysis' },
];

const UNLOCK_STEPS = [
  { key: 'wallet', label: 'Approve USDC payment in your wallet' },
  { key: 'settling', label: 'Submitting payment to Base' },
  { key: 'verifying', label: 'Verifying payment' },
  { key: 'confirmed', label: 'Payment confirmed' },
  { key: 'starting', label: 'Unlocking results and starting pipeline' },
];

const STEP_ORDER = ['wallet', 'settling', 'verifying', 'confirmed', 'starting', 'done'];

function stepIndex(key) {
  const idx = STEP_ORDER.indexOf(key);
  return idx < 0 ? 0 : idx;
}

export default function PaymentProgressPanel({
  mode = 'pre_run',
  step = 'wallet',
  statusDetail = null,
  error = null,
  recoveryActions = [],
  onRecovery,
}) {
  const steps = mode === 'unlock' ? UNLOCK_STEPS : PRE_RUN_STEPS;
  const currentIdx = step === 'done' ? steps.length : stepIndex(step);
  const headline = step === 'done' ? 'All set!' : 'Processing payment…';

  return (
    <div className="ne-pay-progress ne-flow__email" role="status" aria-live="polite">
      <div className="ne-pay-progress__spinner" aria-hidden="true" />

      <h1>{headline}</h1>
      <p className="ne-pay-progress__sub">
        {statusDetail ||
          (step === 'wallet'
            ? 'Check your wallet app for the USDC authorization prompt.'
            : 'This usually takes a few seconds. Please keep this tab open.')}
      </p>

      <ol className="ne-pay-progress__steps">
        {steps.map((item, index) => {
          const done = step === 'done' || index < currentIdx;
          const active = step !== 'done' && item.key === step;
          return (
            <li key={item.key} className={[done && 'is-done', active && 'is-active'].filter(Boolean).join(' ')}>
              <span className="ne-pay-progress__marker" aria-hidden="true">
                {done ? '✓' : active ? '…' : index + 1}
              </span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="ne-flow__error" role="alert">
          {error}
        </p>
      )}

      {recoveryActions.length > 0 && onRecovery && (
        <div className="ne-unlock__recovery">
          {recoveryActions.map((a) => (
            <button
              key={a.action}
              type="button"
              className="ne-flow__pill ne-flow__pill--ghost"
              onClick={() => onRecovery(a)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
