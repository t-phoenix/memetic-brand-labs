import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import ResultsShareActions from '../components/ResultsShareActions';
import { useSeoOverride } from '../components/useSeoOverride';
import { getPublicShare, API_URL } from '../lib/narrativeApi';
import { SITE_URL, DEFAULT_SEO } from '../lib/seo';
import { trackCtaClick } from '../lib/analytics';
import { resultCardClassName } from '../lib/resultCardStyles';
import './NarrativeFlow.css';

export default function SharedResultPage() {
  const { shareId } = useParams();
  const { setOverride } = useSeoOverride();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicShare(shareId)
      .then(setData)
      .catch((err) => setError(err.message || 'Share not found'));
  }, [shareId]);

  useEffect(() => {
    if (!data) return undefined;

    const shareGraphic = data.og_image_path || data.graphic_path_square
      ? `${API_URL}/v1/results/${shareId}/graphic.png`
      : DEFAULT_SEO.image;
    const description =
      data.og_description ||
      data.cards?.[0]?.content?.slice(0, 155) ||
      DEFAULT_SEO.description;

    setOverride({
      title: data.og_title
        ? `${data.og_title} | Memetic Brand Labs`
        : 'Narrative Results | Memetic Brand Labs',
      description,
      image: shareGraphic,
      imageAlt: data.og_title || DEFAULT_SEO.imageAlt,
      canonical: `${SITE_URL}/results/${shareId}`,
      robots: 'index, follow',
    });

    return () => setOverride(null);
  }, [data, shareId, setOverride]);

  if (error) {
    return (
      <div className="ne-flow ne-flow--results">
        <SiteNav tone="magenta" />
        <main className="ne-flow__main">
          <p className="ne-flow__error">{error}</p>
          <Link to="/#narrative-engine" className="ne-flow__pill">
            Try the Narrative Engine
          </Link>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ne-flow ne-flow--results">
        <SiteNav tone="magenta" />
        <main className="ne-flow__main">
          <p className="ne-flow__muted">Loading results…</p>
        </main>
      </div>
    );
  }

  const cards = data.cards || [];
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/results/${shareId}` : '';

  return (
    <div className="ne-flow ne-flow--results">
      <SiteNav tone="magenta" />
      <main className="ne-flow__main ne-flow__main--results">
        <div className="ne-results__grid">
          {cards.map((card, i) => (
            <article key={card.key || i} className={resultCardClassName(i)}>
              <h2>{card.label}</h2>
              <p>{card.content}</p>
            </article>
          ))}
        </div>

        <div className="ne-results__footer">
          <div className="ne-results__col">
            <h3>Not perfect.</h3>
            <p>
              But a useful start. (<em>If you like it, share it with your community.</em>)
            </p>
            <ResultsShareActions
              shareId={shareId}
              shareUrl={shareUrl}
              contentType="shared_narrative_result"
            />
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
                  location: 'shared_result',
                  destination: '/application-form',
                })
              }
            >
              Memetic Brand Workshop
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
