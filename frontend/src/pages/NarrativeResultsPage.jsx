import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import UnlockResultsPanel from '../components/UnlockResultsPanel';
import ResultsShareActions from '../components/ResultsShareActions';
import { getRunStatus } from '../lib/narrativeApi';
import {
  trackCtaClick,
  trackNeEmailUnlock,
  trackNeRunComplete,
} from '../lib/analytics';
import { resultCardClassName } from '../lib/resultCardStyles';
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
  const [loadError, setLoadError] = useState('');
  const completeTracked = useRef(false);

  const handleUnlocked = (out) => {
    if (out.cards) setOutputs(out.cards);
    if (out.share_id) setShareId(out.share_id);
    if (out.share_url) {
      const match = out.share_url.match(/\/results\/([^/]+)/);
      if (match) setShareId(match[1]);
    }
    trackNeEmailUnlock({ runId: id });
  };

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

  const shareUrl =
    shareId && typeof window !== 'undefined'
      ? `${window.location.origin}/results/${shareId}`
      : '';

  return (
    <div className="ne-flow ne-flow--results">
      <SiteNav tone="magenta" />
      <main className="ne-flow__main ne-flow__main--results">
        {loadError && <p className="ne-flow__error">{loadError}</p>}

        {showEmailGate && <UnlockResultsPanel runId={id} onUnlocked={handleUnlocked} />}

        {hasCards && (
          <>
            <div className="ne-results__grid">
              {cards.slice(0, 4).map((card, i) => (
                <article key={card.key || i} className={resultCardClassName(i)}>
                  <h2>{card.label || FALLBACK_TITLES[i] || `Direction ${i + 1}`}</h2>
                  <p>{card.content}</p>
                </article>
              ))}
              {cards.length < 4 &&
                FALLBACK_TITLES.slice(cards.length).map((title, i) => (
                  <article
                    key={title}
                    className={`ne-results__card ne-results__card--${['coral', 'purple', 'magenta', 'blue'][(cards.length + i) % 4]} ne-results__card--empty`}
                  >
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
                <ResultsShareActions shareId={shareId} shareUrl={shareUrl} />
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
