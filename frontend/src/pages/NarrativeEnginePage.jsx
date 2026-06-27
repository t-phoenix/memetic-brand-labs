import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NeLayout from '../components/NeLayout';
import { createNarrativeRun, getPricingTiers } from '../lib/narrativeApi';
import './NarrativeEngine.css';

const TIER_LABELS = {
  fast: 'Fast — quickest turnaround',
  standard: 'Standard — balanced quality',
  quality: 'Quality — deepest analysis',
};

export default function NarrativeEnginePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    building: '',
    audience: '',
    challenge: '',
    differentiation: '',
    website: '',
    model_tier: 'fast',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    getPricingTiers()
      .then((data) => setTiers(data.tiers || []))
      .catch(() => {});
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { run_id } = await createNarrativeRun(form);
      navigate(`/narrative-engine/run/${run_id}`);
    } catch (err) {
      setError(err.message || 'Failed to start analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeLayout>
      <div className="ne-page">
        <p className="ne-eyebrow">Narrative Engine · Beta</p>
        <h1>Explain what you&apos;re building</h1>
        <p className="ne-sub">We diagnose your communication first — then generate four narrative directions.</p>

        <form className="ne-form" onSubmit={onSubmit}>
          <label htmlFor="building">What are you building?</label>
          <textarea id="building" name="building" value={form.building} onChange={onChange} required rows={3} placeholder="e.g. API testing tool for backend teams" />

          <label htmlFor="audience">Who is it for?</label>
          <input id="audience" name="audience" value={form.audience} onChange={onChange} required placeholder="e.g. Backend engineers at startups" />

          <label htmlFor="challenge">What challenge are you solving?</label>
          <textarea id="challenge" name="challenge" value={form.challenge} onChange={onChange} required rows={2} placeholder="e.g. Messaging is too technical" />

          <label htmlFor="differentiation">Why is your approach different?</label>
          <textarea id="differentiation" name="differentiation" value={form.differentiation} onChange={onChange} required rows={2} placeholder="e.g. One-click mocks from OpenAPI specs" />

          <label htmlFor="website">Your website <span className="ne-optional">(optional)</span></label>
          <input id="website" name="website" type="url" value={form.website} onChange={onChange} placeholder="https://" />

          <label htmlFor="model_tier">Analysis depth</label>
          <select id="model_tier" name="model_tier" value={form.model_tier} onChange={onChange}>
            {(tiers.length ? tiers : [{ tier_key: 'fast' }, { tier_key: 'standard' }, { tier_key: 'quality' }]).map((t) => (
              <option key={t.tier_key} value={t.tier_key}>
                {TIER_LABELS[t.tier_key] || t.label || t.tier_key}
              </option>
            ))}
          </select>

          {error && <p className="ne-error" role="alert">{error}</p>}

          <button type="submit" className="ne-btn-primary" disabled={loading}>
            {loading ? 'Starting analysis…' : 'Analyze your narrative'}
          </button>
          <p className="ne-footnote">First run is free after email verification.</p>
        </form>
      </div>
    </NeLayout>
  );
}
