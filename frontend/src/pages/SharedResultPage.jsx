import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import NeLayout from '../components/NeLayout';
import { getPublicShare, API_URL } from '../lib/narrativeApi';
import './NarrativeEngine.css';

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
      <NeLayout>
        <div className="ne-page">
          <p className="ne-error">{error}</p>
          <Link to="/narrative-engine" className="ne-cta">Try the Narrative Engine</Link>
        </div>
      </NeLayout>
    );
  }

  if (!data) {
    return (
      <NeLayout>
        <div className="ne-page ne-page--centered">
          <p>Loading results…</p>
        </div>
      </NeLayout>
    );
  }

  const cards = data.cards || [];

  return (
    <NeLayout>
      <div className="ne-page">
        <p className="ne-eyebrow">Shared results</p>
        <h1>{data.og_title || 'Narrative Engine Results'}</h1>
        <div className="ne-cards">
          {cards.map((card) => (
            <div key={card.key} className={`ne-card ne-card--${card.meta?.color || 'default'}`}>
              <h3>{card.label}</h3>
              <p>{card.content}</p>
            </div>
          ))}
        </div>
        <a href={`${API_URL}/v1/results/${shareId}/graphic.png`} className="ne-btn-secondary" download>
          Download share graphic
        </a>
        <p className="ne-footnote">
          <Link to="/narrative-engine">Run your own analysis →</Link>
        </p>
      </div>
    </NeLayout>
  );
}
