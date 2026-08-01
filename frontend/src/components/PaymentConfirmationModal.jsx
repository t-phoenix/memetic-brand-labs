import './PaymentConfirmationModal.css';

export default function PaymentConfirmationModal({ open, summary, balance, sufficient, onConfirm, onCancel, busy, confirmLabel }) {
  if (!open || !summary) return null;

  return (
    <div className="ne-pay-modal" role="dialog" aria-modal="true" aria-labelledby="ne-pay-modal-title">
      <div className="ne-pay-modal__backdrop" onClick={busy ? undefined : onCancel} />
      <div className="ne-pay-modal__card">
        <h2 id="ne-pay-modal-title">Confirm payment</h2>
        <p className="ne-pay-modal__dapp">{summary.dapp}</p>

        <dl className="ne-pay-modal__details">
          <div>
            <dt>Amount</dt>
            <dd>
              {summary.amount} {summary.asset}
            </dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{summary.chain}</dd>
          </div>
          <div>
            <dt>Recipient</dt>
            <dd>{summary.recipient}</dd>
          </div>
          <div>
            <dt>Your wallet</dt>
            <dd>{summary.payer}</dd>
          </div>
          <div>
            <dt>USDC balance</dt>
            <dd className={sufficient ? '' : 'ne-pay-modal__warn'}>
              {balance != null ? `${formatBalance(balance)} USDC` : 'Checking…'}
              {!sufficient && balance != null && ' — insufficient'}
            </dd>
          </div>
        </dl>

        <p className="ne-pay-modal__note">
          Your wallet will ask you to sign an authorization for this exact amount. No funds leave your wallet until
          you approve in your wallet app.
        </p>

        {!sufficient && balance != null && (
          <p className="ne-pay-modal__error" role="alert">
            Add USDC on {summary.chain} to your wallet, or use Google / company email instead.
          </p>
        )}

        <div className="ne-pay-modal__actions">
          <button type="button" className="ne-pay-modal__btn ne-pay-modal__btn--ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ne-pay-modal__btn ne-pay-modal__btn--primary"
            disabled={busy || !sufficient}
            onClick={onConfirm}
          >
            {busy ? 'Opening wallet…' : confirmLabel || `Sign & pay ${summary.amount} USDC`}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBalance(n) {
  return n < 0.01 ? n.toFixed(4) : n.toFixed(2);
}
