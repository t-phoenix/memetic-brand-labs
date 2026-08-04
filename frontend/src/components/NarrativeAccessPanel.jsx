import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useExternalWallet } from '../lib/useExternalWallet';
import {
  getAccessStatus,
  getHumanUnlockQuote,
  getRunOutputs,
  getRunStatus,
  getOAuthStatus,
  getEmailStatus,
  requestEmailVerification,
  resendEmailVerification,
  unlockWithOAuth,
  getPaymentStatus,
  startNarrativeRunWithOAuth,
  createIntakeSession,
  requestIntakeEmailVerification,
  resendIntakeEmailVerification,
} from '../lib/narrativeApi';
import { startRunWithX402, unlockRunWithX402 } from '../lib/x402Payment';
import {
  ensureBaseNetwork,
  getUsdcBalance,
  hasSufficientBalance,
  buildPaymentSummary,
  getChainName,
  truncateAddress,
} from '../lib/walletPayment';
import { savePendingIntake } from '../lib/pendingIntake';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import PaymentProgressPanel from './PaymentProgressPanel';
import WalletPickerModal from './WalletPickerModal';

const CONSUMER_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
];

function isConsumerEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return CONSUMER_DOMAINS.includes(domain);
}

/**
 * @param {'pre_run' | 'unlock'} mode - pre_run: auth before pipeline; unlock: legacy post-completion gate
 */
export default function NarrativeAccessPanel({ mode = 'unlock', intake, runId, onSuccess }) {
  const { login, logout, authenticated, getAccessToken, user } = usePrivy();
  const { connectSpecificWallet } = useExternalWallet();
  const pendingOAuth = useRef(false);

  const [email, setEmail] = useState('');
  const [intakeId, setIntakeId] = useState(null);
  const [phase, setPhase] = useState('choose');
  const [error, setError] = useState(null);
  const [recoveryActions, setRecoveryActions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resultsEmailStatus, setResultsEmailStatus] = useState(null);
  const [oauthStatus, setOauthStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailStatusLoading, setEmailStatusLoading] = useState(false);

  const [quote, setQuote] = useState(null);
  const [selectedTier, setSelectedTier] = useState('fast');
  const [walletInfo, setWalletInfo] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [paySummary, setPaySummary] = useState(null);
  const [balance, setBalance] = useState(null);
  const [sufficient, setSufficient] = useState(false);
  const [paymentStep, setPaymentStep] = useState('wallet');
  const [paymentStatusDetail, setPaymentStatusDetail] = useState(null);

  const isPreRun = mode === 'pre_run';
  const paymentEnabled = quote?.payment_enabled === true;
  const title = isPreRun ? 'Verify to start your analysis' : 'Your analysis is ready';
  const subtitle = isPreRun
    ? 'Confirm your identity before we run the Narrative Engine. No LLM processing starts until you verify.'
    : 'Unlock your four narrative direction cards.';

  useEffect(() => {
    getHumanUnlockQuote(selectedTier)
      .then(setQuote)
      .catch(() => undefined);
  }, [selectedTier]);

  useEffect(() => {
    if (!walletInfo?.wallet || !quote) return;
    void (async () => {
      try {
        const provider = await walletInfo.wallet.getEthereumProvider();
        const bal = await getUsdcBalance(walletInfo.address, provider);
        setBalance(bal.numeric);
        setSufficient(hasSufficientBalance(bal.numeric, quote.price_usdc));
        setPaySummary(buildPaymentSummary({ quote, walletAddress: walletInfo.address }));
      } catch {
        /* ignore balance refresh errors */
      }
    })();
  }, [walletInfo, quote]);

  const refreshOAuthStatus = useCallback(async () => {
    if (!authenticated) {
      setOauthStatus(null);
      return null;
    }
    try {
      const token = await getAccessToken();
      const status = await getOAuthStatus(token);
      setOauthStatus(status);
      return status;
    } catch {
      const fallback = {
        authenticated: true,
        email: user?.email?.address,
        oauth_free_used: false,
        can_use_oauth: true,
      };
      setOauthStatus(fallback);
      return fallback;
    }
  }, [authenticated, getAccessToken, user?.email?.address]);

  useEffect(() => {
    refreshOAuthStatus();
  }, [refreshOAuthStatus]);

  const refreshEmailStatus = useCallback(async (value) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailStatus(null);
      return null;
    }
    setEmailStatusLoading(true);
    try {
      const status = await getEmailStatus(normalized);
      setEmailStatus(status);
      return status;
    } catch {
      setEmailStatus(null);
      return null;
    } finally {
      setEmailStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailStatus(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      void refreshEmailStatus(normalized);
    }, 400);
    return () => clearTimeout(timer);
  }, [email, refreshEmailStatus]);

  const refreshAccess = useCallback(async () => {
    if (isPreRun || !runId) return false;
    try {
      const status = await getAccessStatus(runId);
      if (status.unlocked) {
        const out = await getRunOutputs(runId);
        onSuccess(out);
        return true;
      }
      if (status.access_status === 'email_pending') setPhase('email_pending');
      if (status.access_status === 'payment_pending') setPhase('payment_pending');
      setRecoveryActions(status.recovery_actions || []);
      setResultsEmailStatus(status.results_email_status);
      return false;
    } catch {
      return false;
    }
  }, [isPreRun, runId, onSuccess]);

  useEffect(() => {
    if (!isPreRun) refreshAccess();
  }, [isPreRun, refreshAccess]);

  useEffect(() => {
    if (isPreRun || (phase !== 'email_pending' && phase !== 'payment_pending')) return undefined;
    const t = setInterval(() => refreshAccess(), 3000);
    return () => clearInterval(t);
  }, [isPreRun, phase, refreshAccess]);

  const handleApiError = (err) => {
    setError(err.userMessage || err.message || 'Something went wrong');
    const actions = err.recoveryActions || [];
    setRecoveryActions(paymentEnabled ? actions : actions.filter((a) => a.method !== 'x402'));
  };

  const x402Recovery = (actions) => (paymentEnabled ? actions : actions.filter((a) => a.method !== 'x402'));

  const completeOAuth = async () => {
    const token = await getAccessToken();
    if (isPreRun) {
      const result = await startNarrativeRunWithOAuth(intake, token);
      onSuccess(result);
      return;
    }
    await unlockWithOAuth(runId, token);
    const unlocked = await refreshAccess();
    if (!unlocked) {
      const out = await getRunStatus(runId, token);
      if (out.outputs?.length) onSuccess({ cards: out.outputs, share_id: out.share_id });
    }
  };

  const onOAuth = async () => {
    if (oauthStatus?.oauth_free_used) {
      setError(
        paymentEnabled
          ? 'Your free Google sign-in was already used. Disconnect and sign in with a different account, or pay with USDC.'
          : 'Your free Google sign-in was already used. Disconnect and sign in with a different account.',
      );
      setRecoveryActions(x402Recovery([{ action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' }]));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!authenticated) {
        pendingOAuth.current = true;
        if (isPreRun && intake) savePendingIntake(intake);
        await login({ loginMethods: ['google'] });
        return;
      }
      await completeOAuth();
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
      pendingOAuth.current = false;
    }
  };

  const onDisconnectGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await logout();
      setOauthStatus(null);
      pendingOAuth.current = false;
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!authenticated || !pendingOAuth.current || busy) return;
    pendingOAuth.current = false;
    void (async () => {
      const status = await refreshOAuthStatus();
      if (status?.oauth_free_used) {
        setError(
          paymentEnabled
            ? 'This Google account already used its free analysis. Disconnect to use another account, or pay with USDC.'
            : 'This Google account already used its free analysis. Disconnect to use another account.',
        );
        setRecoveryActions(x402Recovery([{ action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' }]));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await completeOAuth();
      } catch (err) {
        handleApiError(err);
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const onSendEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (isConsumerEmail(email)) {
      setError('Personal emails like Gmail cannot be used here. Continue with Google above, or use your company email.');
      setRecoveryActions(
        x402Recovery([
          { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
          { action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' },
        ]),
      );
      setBusy(false);
      return;
    }
    try {
      const status = emailStatus ?? (await refreshEmailStatus(email));
      if (status?.email_free_used) {
        setError(
          paymentEnabled
            ? 'Your free company email verification was already used. Try a different company email, sign in with Google, or pay with USDC.'
            : 'Your free company email verification was already used. Try a different company email or sign in with Google.',
        );
        setRecoveryActions(
          x402Recovery([
            { action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' },
            { action: 'use_oauth', label: 'Try Google sign-in', method: 'oauth' },
            { action: 'change_email', label: 'Try a different company email', method: 'email' },
          ]),
        );
        return;
      }
      if (status?.consumer_domain) {
        setError('Personal emails like Gmail cannot be used here. Continue with Google above, or use your company email.');
        setRecoveryActions(
          x402Recovery([
            { action: 'use_oauth', label: 'Continue with Google', method: 'oauth' },
            { action: 'pay_unlock', label: 'Pay with USDC', method: 'x402' },
          ]),
        );
        return;
      }
      if (isPreRun) {
        let id = intakeId;
        if (!id) {
          const session = await createIntakeSession(intake);
          id = session.intake_id;
          setIntakeId(id);
        }
        await requestIntakeEmailVerification(id, email);
        sessionStorage.setItem('ne_pending_intake_id', id);
      } else {
        await requestEmailVerification(runId, email);
      }
      sessionStorage.setItem('ne_pending_email', email);
      setEmailSent(true);
      setPhase('email_pending');
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const onResendEmail = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isPreRun && intakeId) {
        await resendIntakeEmailVerification(intakeId, email);
      } else {
        await resendEmailVerification(runId, email);
      }
      setEmailSent(true);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const connectSelectedWallet = async (walletId) => {
    const wallet = await connectSpecificWallet(walletId);
    if (!wallet?.address) {
      throw new Error('Wallet connection failed. Please try again.');
    }
    return wallet;
  };

  const loadWalletDetails = async (wallet) => {
    const provider = await wallet.getEthereumProvider();
    const network = await ensureBaseNetwork(provider);
    const bal = await getUsdcBalance(wallet.address, provider);
    return { network, balance: bal };
  };

  const onPickWallet = async (walletId) => {
    setWalletPickerOpen(false);
    setBusy(true);
    setError(null);
    try {
      const wallet = await connectSelectedWallet(walletId);
      const { network, balance: bal } = await loadWalletDetails(wallet);
      const q = quote ?? (await getHumanUnlockQuote(selectedTier));
      const enough = hasSufficientBalance(bal.numeric, q.price_usdc);

      setWalletInfo({ wallet, network, address: wallet.address });
      setBalance(bal.numeric);
      setSufficient(enough);
      setPaySummary(buildPaymentSummary({ quote: q, walletAddress: wallet.address }));
      setPayModalOpen(true);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const openWalletPicker = () => {
    if (!paymentEnabled) return;
    setError(null);
    setWalletPickerOpen(true);
  };

  const handlePaymentProgress = (step) => {
    setPaymentStep(step);
    if (step === 'wallet') {
      setPaymentStatusDetail('Waiting for wallet approval…');
    } else if (step === 'settling') {
      setPaymentStatusDetail('Broadcasting your USDC payment on Base…');
    } else if (step === 'verifying') {
      setPaymentStatusDetail('Confirming payment with the facilitator…');
    } else if (step === 'confirmed') {
      setPaymentStatusDetail('Payment confirmed. Finishing up…');
    } else if (step === 'starting') {
      setPaymentStatusDetail(
        isPreRun ? 'Creating your run and starting the pipeline…' : 'Unlocking your results and starting the pipeline…',
      );
    }
  };

  const pollPaymentUntilConfirmed = async (targetRunId) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const ps = await getPaymentStatus(targetRunId);
      if (ps.status === 'confirmed') {
        setPaymentStep('confirmed');
        setPaymentStatusDetail('Payment confirmed.');
        if (ps.pipeline_started) {
          setPaymentStep('starting');
          setPaymentStatusDetail('Pipeline started. Loading your results…');
        }
        return true;
      }
      if (ps.failure_code) {
        throw new Error(ps.failure_code);
      }
      setPaymentStatusDetail(
        ps.status === 'pending' ? 'Payment received — waiting for confirmation…' : 'Checking payment status…',
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  };

  const executePayment = async () => {
    if (!walletInfo?.wallet) return;
    setBusy(true);
    setError(null);
    setPaymentStep('wallet');
    setPaymentStatusDetail('Waiting for wallet approval…');
    setPayModalOpen(false);
    setPhase('payment_processing');
    try {
      const onProgress = handlePaymentProgress;
      if (isPreRun) {
        const result = await startRunWithX402({ ...intake, model_tier: selectedTier }, walletInfo.wallet, { onProgress });
        setPaymentStep('done');
        setPaymentStatusDetail('Payment confirmed. Starting your analysis…');
        await new Promise((r) => setTimeout(r, 500));
        onSuccess(result);
        return;
      }

      const result = await unlockRunWithX402(runId, walletInfo.wallet, { onProgress, modelTier: selectedTier });
      if (result?.unlocked) {
        setPaymentStep('done');
        setPaymentStatusDetail('Unlocked. Loading your directions…');
        await new Promise((r) => setTimeout(r, 400));
        onSuccess({ cards: result.cards, share_id: result.share_id });
        return;
      }

      const confirmed = await pollPaymentUntilConfirmed(runId);
      if (confirmed) {
        setPaymentStep('done');
        const unlocked = await refreshAccess();
        if (!unlocked) {
          const out = await getRunStatus(runId);
          if (out.outputs?.length) {
            onSuccess({ cards: out.outputs, share_id: out.share_id });
          }
        }
        return;
      }
      setError('Payment is taking longer than usual. Try again or use email / Google sign-in.');
      setPhase('choose');
      setPayModalOpen(true);
    } catch (err) {
      handleApiError(err);
      setPhase('choose');
      setPayModalOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const priceLabel = paymentEnabled && quote ? `${quote.price_usdc} USDC` : null;
  const tierOptions = paymentEnabled ? (quote?.tiers ?? []) : [];
  const freeEmailTierLabel = quote?.free_email_tier_label ?? 'Quality';
  const complimentaryEmailNote = `Verified company emails receive our ${freeEmailTierLabel.toLowerCase()}-tier analysis at no charge — we invest in giving you the clearest possible output.`;
  const googleEmail = user?.google?.email || oauthStatus?.email || user?.email?.address;
  const googleSignedIn = authenticated && Boolean(user?.google || oauthStatus?.email);
  const googleFreeUsed = Boolean(oauthStatus?.oauth_free_used);
  const canUseGoogle = !googleSignedIn || oauthStatus?.can_use_oauth !== false;
  const emailFreeUsed = Boolean(emailStatus?.email_free_used);

  const renderGoogleSection = () => {
    if (googleSignedIn) {
      return (
        <div className="ne-oauth-status" role="status">
          <p className="ne-oauth-status__title">Signed in with Google</p>
          {googleEmail && <p className="ne-oauth-status__email">{googleEmail}</p>}
          {googleFreeUsed ? (
            <p className="ne-oauth-status__note">
              {paymentEnabled
                ? 'Your free Google analysis was already used. To run another analysis, pay with USDC below — or disconnect and sign in with a different Google account.'
                : 'Your free Google analysis was already used. Disconnect and sign in with a different Google account to try again.'}
            </p>
          ) : (
            <p className="ne-oauth-status__note">
              {isPreRun
                ? 'Your free Google verification is available for this analysis.'
                : 'Your free Google unlock is available for these results.'}
            </p>
          )}
          <div className="ne-oauth-status__actions">
            {canUseGoogle && (
              <button type="button" className="ne-flow__pill ne-flow__pill--dark" disabled={busy} onClick={onOAuth}>
                {isPreRun ? 'Start with Google' : 'Unlock with Google'}
              </button>
            )}
            <button
              type="button"
              className="ne-flow__pill ne-flow__pill--ghost"
              disabled={busy}
              onClick={onDisconnectGoogle}
            >
              Disconnect Google
            </button>
          </div>
        </div>
      );
    }

    return (
      <button type="button" className="ne-flow__pill ne-flow__pill--dark" disabled={busy} onClick={onOAuth}>
        Continue with Google
      </button>
    );
  };

  const renderRecovery = () =>
    recoveryActions.length > 0 && (
      <div className="ne-unlock__recovery">
        {recoveryActions
          .filter((a) => paymentEnabled || a.method !== 'x402')
          .map((a) => {
          if (a.method === 'oauth' && googleFreeUsed) return null;
          return (
            <button
              key={a.action}
              type="button"
              className="ne-flow__pill ne-flow__pill--ghost"
              onClick={() => {
                if (a.method === 'oauth') onOAuth();
                else if (a.method === 'email' || a.method === 'change_email') setPhase('choose');
                else if (a.method === 'resend') onResendEmail();
                else if (a.method === 'x402') openWalletPicker();
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    );

  if (phase === 'email_pending') {
    return (
      <div className="ne-unlock ne-flow__email">
        <h1>Check your inbox</h1>
        <p>
          We sent a verification link to <strong>{email || user?.email?.address}</strong>.
          {isPreRun ? ' Open it to start your analysis.' : ' Open it to unlock your directions.'} (Check spam too.)
        </p>
        {error && (
          <p className="ne-flow__error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="ne-flow__pill" disabled={busy} onClick={onResendEmail}>
          Resend link
        </button>
        {canUseGoogle && (
          <button type="button" className="ne-flow__pill ne-flow__pill--ghost" disabled={busy} onClick={onOAuth}>
            Use Google instead
          </button>
        )}
        {renderRecovery()}
      </div>
    );
  }

  if (phase === 'payment_processing' || phase === 'payment_pending') {
    return (
      <PaymentProgressPanel
        mode={isPreRun ? 'pre_run' : 'unlock'}
        step={phase === 'payment_pending' ? 'verifying' : paymentStep}
        statusDetail={paymentStatusDetail}
        error={error}
        recoveryActions={recoveryActions.filter((a) => paymentEnabled || a.method !== 'x402')}
        onRecovery={(a) => {
          if (a.method === 'oauth' && canUseGoogle) onOAuth();
          else if (a.method === 'x402' && paymentEnabled) openWalletPicker();
          else if (a.method === 'email') setPhase('choose');
        }}
      />
    );
  }

  return (
    <>
      <div className="ne-unlock ne-flow__email">
        <h1>{title}</h1>
        <p className="ne-unlock__sub">{subtitle}</p>

        {renderGoogleSection()}

        <p className="ne-unlock__divider">— or use your company email —</p>

        {email && emailStatus?.email_free_used && (
          <div className="ne-oauth-status" role="status">
            <p className="ne-oauth-status__title">Company email already used</p>
            <p className="ne-oauth-status__email">{email}</p>
            <p className="ne-oauth-status__note">
              {paymentEnabled
                ? 'Your free company email verification was already used. To run another analysis, pay with USDC below — or try Google sign-in with a different account.'
                : 'Your free company email verification was already used. Try Google sign-in with a different account.'}
            </p>
            <div className="ne-oauth-status__actions">
              {paymentEnabled && (
                <button type="button" className="ne-flow__pill ne-flow__pill--dark" disabled={busy} onClick={openWalletPicker}>
                  Pay with USDC
                </button>
              )}
              {canUseGoogle && (
                <button type="button" className="ne-flow__pill ne-flow__pill--ghost" disabled={busy} onClick={onOAuth}>
                  Try Google sign-in
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSendEmail}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
          />
          <p className="ne-unlock__hint">No Gmail/Yahoo — use Google sign-in above for personal email.</p>
          <p className="ne-unlock__hint ne-unlock__hint--subtle">{complimentaryEmailNote}</p>
          <button
            type="submit"
            className="ne-flow__pill"
            disabled={busy || emailSent || emailFreeUsed || emailStatusLoading}
          >
            {busy ? 'Sending…' : emailStatusLoading ? 'Checking email…' : 'Send verification link'}
          </button>
        </form>

        {paymentEnabled && (
          <>
        <p className="ne-unlock__divider">— or pay with USDC on {getChainName()} —</p>

        {tierOptions.length > 0 && (
          <div className="ne-tier-picker">
            <label className="ne-tier-picker__label" htmlFor="ne-tier-select">Analysis depth</label>
            <select
              id="ne-tier-select"
              className="ne-tier-picker__select"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              disabled={busy}
            >
              {tierOptions.map((t) => (
                <option key={t.tier_key} value={t.tier_key}>
                  {t.label} — {t.price_usdc} USDC
                </option>
              ))}
            </select>
          </div>
        )}

        {walletInfo && (
          <div
            className={`ne-wallet-status ${
              balance != null && !sufficient ? 'ne-wallet-status--warn' : 'ne-wallet-status--ok'
            }`}
            role="status"
          >
            <div className="ne-wallet-status__row">
              <span className="ne-wallet-status__label">Wallet</span>
              <span>{truncateAddress(walletInfo.address)}</span>
            </div>
            <div className="ne-wallet-status__row">
              <span className="ne-wallet-status__label">Chain</span>
              <span>{walletInfo.network?.chainName ?? getChainName()}</span>
            </div>
            <div className="ne-wallet-status__row">
              <span className="ne-wallet-status__label">USDC balance</span>
              <span>{balance != null ? `${balance.toFixed(2)} USDC` : 'Checking…'}</span>
            </div>
            {balance != null && !sufficient && (
              <p className="ne-wallet-status__note">Add USDC on Base to continue with payment.</p>
            )}
          </div>
        )}

        <button
          type="button"
          className="ne-flow__pill ne-flow__pill--ghost"
          disabled={busy}
          onClick={openWalletPicker}
        >
          {busy
            ? 'Connecting wallet…'
            : walletInfo
              ? 'Change wallet'
              : isPreRun
                ? `Pay ${priceLabel} & start`
                : `Unlock for ${priceLabel}`}
        </button>

        {walletInfo && sufficient && (
          <button type="button" className="ne-flow__pill" disabled={busy} onClick={() => setPayModalOpen(true)}>
            Review payment
          </button>
        )}
          </>
        )}

        {error && (
          <p className="ne-flow__error" role="alert">
            {error}
          </p>
        )}
        {renderRecovery()}

        {!isPreRun && resultsEmailStatus === 'sent' && (
          <p className="ne-unlock__hint" role="status">
            We emailed your directions too.
          </p>
        )}
      </div>

      <WalletPickerModal
        open={paymentEnabled && walletPickerOpen}
        busy={busy}
        onPick={onPickWallet}
        onCancel={() => setWalletPickerOpen(false)}
      />

      <PaymentConfirmationModal
        open={paymentEnabled && payModalOpen}
        summary={paySummary}
        balance={balance}
        sufficient={sufficient}
        busy={busy}
        onConfirm={executePayment}
        onCancel={() => setPayModalOpen(false)}
      />
    </>
  );
}
