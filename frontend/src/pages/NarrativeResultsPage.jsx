import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import { getRunOutputs, getRunStatus, verifyEmail, API_URL } from '../lib/narrativeApi';
import {
  trackCtaClick,
  trackFileDownload,
  trackNeEmailUnlock,
  trackNeRunComplete,
  trackShare,
} from '../lib/analytics';
import shareTelegram from '../assets/graphics/figma-v2/share-telegram.svg';
import shareX from '../assets/graphics/figma-v2/share-x.svg';
import shareLinkedin from '../assets/graphics/figma-v2/share-linkedin.svg';
import './NarrativeFlow.css';

const FALLBACK_TITLES = [
  'Clear Explanation',
  'Positioning Direction',
  'Messaging Hook',
  'Memetic Narrative Angle',
];

export default function NarrativeResultsPage() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [outputs, setOutputs] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loadError, setLoadError] = useState('');
  const completeTracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRunStatus(id);
        if (cancelled) return;
        setRun(data);
        if (data.share_id) setShareId(data.share_id);
        if (data.outputs?.length) setOutputs(data.outputs);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load results');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cards = outputs || [];
  const hasCards = cards.length > 0;
  const showEmailGate = run && run.status === 'completed' && !hasCards;

  useEffect(() => {
    if (hasCards && id && !completeTracked.current) {
      completeTracked.current = true;
      trackNeRunComplete({ runId: id });
    }
  }, [hasCards, id]);

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
      trackNeEmailUnlock({ runId: id });
    } catch (err) {
      setEmailError(err.message || 'Could not verify email');
    } finally {
      setVerifying(false);
    }
  };

  const shareUrl =
    shareId && typeof window !== 'undefined'
      ? `${window.location.origin}/results/${shareId}`
      : '';

  const shareLinks = shareUrl
    ? [
        {
          key: 'telegram',
          href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
          icon: shareTelegram,
          label: 'Share on Telegram',
        },
        {
          key: 'x',
          href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
          icon: shareX,
          label: 'Share on X',
        },
        {
          key: 'linkedin',
          href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          icon: shareLinkedin,
          label: 'Share on LinkedIn',
        },
      ]
    : [];

  return (
    <div className="ne-flow ne-flow--results">
      <SiteNav tone="magenta" />
      <main className="ne-flow__main ne-flow__main--results">
        {loadError && <p className="ne-flow__error">{loadError}</p>}

        {showEmailGate && (
          <form className="ne-flow__email" onSubmit={onVerify}>
            <h1>Enter your email to see results</h1>
            <p>We&apos;ll save your directions — no spam, just your narrative output.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            {emailError && (
              <p className="ne-flow__error" role="alert">
                {emailError}
              </p>
            )}
            <button type="submit" className="ne-flow__pill" disabled={verifying}>
              {verifying ? 'Unlocking…' : 'Continue'}
            </button>
          </form>
        )}

        {hasCards && (
          <>
            <div className="ne-results__grid">
              {cards.slice(0, 4).map((card, i) => (
                <article key={card.key || i} className="ne-results__card">
                  <h2>{card.label || FALLBACK_TITLES[i] || `Direction ${i + 1}`}</h2>
                  <p>{card.content}</p>
                </article>
              ))}
              {cards.length < 4 &&
                FALLBACK_TITLES.slice(cards.length).map((title) => (
                  <article key={title} className="ne-results__card ne-results__card--empty">
                    <h2>{title}</h2>
                  </article>
                ))}
            </div>

            <div className="ne-results__footer">
              <div className="ne-results__col">
                <h3>Not perfect.</h3>
                <p>
                  But a useful start. (
                  <em>If you like it, share it with your community.</em>)
                </p>
                {shareLinks.length > 0 && (
                  <div className="ne-results__share">
                    {shareLinks.map((s) => (
                      <a
                        key={s.key}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        onClick={() =>
                          trackShare({
                            method: s.key,
                            contentType: 'narrative_result',
                            itemId: shareId,
                          })
                        }
                      >
                        <img src={s.icon} alt="" width={80} height={80} />
                      </a>
                    ))}
                  </div>
                )}
                {shareId && (
                  <p className="ne-results__share-url">
                    <Link to={`/results/${shareId}`}>{shareUrl}</Link>
                  </p>
                )}
                {shareId && (
                  <a
                    className="ne-results__download"
                    href={`${API_URL}/v1/results/${shareId}/graphic.png`}
                    download
                    onClick={() =>
                      trackFileDownload({
                        fileName: 'narrative-share-graphic.png',
                        fileExtension: 'png',
                        linkUrl: `${API_URL}/v1/results/${shareId}/graphic.png`,
                      })
                    }
                  >
                    Download share graphic
                  </a>
                )}
              </div>

              <div className="ne-results__col">
                <h3>Perfect?</h3>
                <p>You can still apply, because the workshop goes deeper.</p>
                <Link
                  to="/application-form"
                  className="ne-flow__pill"
                  onClick={() =>
                    trackCtaClick({
                      name: 'memetic_brand_workshop',
                      location: 'ne_results',
                      destination: '/application-form',
                    })
                  }
                >
                  Memetic Brand Workshop
                </Link>
              </div>
            </div>
          </>
        )}

        {!showEmailGate && !hasCards && !loadError && (
          <p className="ne-flow__muted">Loading results…</p>
        )}
      </main>
    </div>
  );
}
