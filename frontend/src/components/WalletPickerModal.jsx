import './PaymentConfirmationModal.css';

const WALLET_OPTIONS = [
  { id: 'metamask', label: 'MetaMask', hint: 'Browser extension' },
  { id: 'phantom', label: 'Phantom', hint: 'Browser extension (EVM)' },
  { id: 'coinbase_wallet', label: 'Coinbase Wallet', hint: 'Browser extension' },
  { id: 'rainbow', label: 'Rainbow', hint: 'Browser extension' },
  { id: 'wallet_connect', label: 'WalletConnect', hint: 'QR code or mobile wallet' },
];

export default function WalletPickerModal({ open, busy, onPick, onCancel }) {
  if (!open) return null;

  return (
    <div className="ne-pay-modal" role="dialog" aria-modal="true" aria-labelledby="ne-wallet-picker-title">
      <div className="ne-pay-modal__backdrop" onClick={busy ? undefined : onCancel} />
      <div className="ne-pay-modal__card">
        <h2 id="ne-wallet-picker-title">Choose your wallet</h2>
        <p className="ne-pay-modal__dapp">
          Select MetaMask, Phantom, or another wallet. If you do not have one yet, install MetaMask or Phantom for
          Chrome.
        </p>

        <ul className="ne-wallet-picker__list">
          {WALLET_OPTIONS.map((wallet) => (
            <li key={wallet.id}>
              <button
                type="button"
                className="ne-wallet-picker__option"
                disabled={busy}
                onClick={() => onPick(wallet.id)}
              >
                <span className="ne-wallet-picker__label">{wallet.label}</span>
                <span className="ne-wallet-picker__hint">{wallet.hint}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="ne-pay-modal__actions">
          <button type="button" className="ne-flow__pill ne-flow__pill--ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
