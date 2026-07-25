import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import { getPublicShare, API_URL } from '../lib/narrativeApi';
import { trackCtaClick, trackFileDownload, trackShare } from '../lib/analytics';
import shareTelegram from '../assets/graphics/figma-v2/share-telegram.svg';
import shareX from '../assets/graphics/figma-v2/share-x.svg';
import shareLinkedin from '../assets/graphics/figma-v2/share-linkedin.svg';
import './NarrativeFlow.css';

export default function SharedResultPage() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicShare(shareId)
      .then(setData)
      .catch((err) => setError(err.message || 'Share not found'));
  }, [shareId]);

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
  const shareLinks = [
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
  ];

  return (
    <div className="ne-flow ne-flow--results">
      <SiteNav tone="magenta" />
      <main className="ne-flow__main ne-flow__main--results">
        <div className="ne-results__grid">
          {cards.map((card) => (
            <article key={card.key} className="ne-results__card">
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
                      contentType: 'shared_narrative_result',
                      itemId: shareId,
                    })
                  }
                >
                  <img src={s.icon} alt="" width={80} height={80} />
                </a>
              ))}
            </div>
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
