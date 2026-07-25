import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NeLayout from '../components/NeLayout';
import { analyzeWebsiteForForm, createNarrativeRun, getPricingTiers } from '../lib/narrativeApi';
import { trackNeRunStart, trackNeWebsiteAnalyze } from '../lib/analytics';
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
  const [processingWebsite, setProcessingWebsite] = useState(false);
  const [error, setError] = useState('');
  const [prefillMessage, setPrefillMessage] = useState('');
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    getPricingTiers()
      .then((data) => setTiers(data.tiers || []))
      .catch(() => {});
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onProcessWebsite = async () => {
    if (!form.website.trim()) {
      setError('Please enter your website URL first.');
      return;
    }

    setProcessingWebsite(true);
    setError('');
    setPrefillMessage('');
    trackNeWebsiteAnalyze();
    try {
      const data = await analyzeWebsiteForForm(form.website.trim());
      setForm((prev) => ({
        ...prev,
        building: data.answers?.building || prev.building,
        audience: data.answers?.audience || prev.audience,
        challenge: data.answers?.challenge || prev.challenge,
        differentiation: data.answers?.differentiation || prev.differentiation,
      }));
      setPrefillMessage('AI drafted answers from your website. You can edit anything before analysis.');
    } catch (err) {
      setError(err.message || 'Failed to process website');
    } finally {
      setProcessingWebsite(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { run_id } = await createNarrativeRun(form);
      trackNeRunStart({ source: 'ne_page', modelTier: form.model_tier });
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
          <label htmlFor="website">Your website</label>
          <input id="website" name="website" type="url" value={form.website} onChange={onChange} placeholder="https://" required />

          <button
            type="button"
            className="ne-btn-secondary ne-btn-secondary--process"
            onClick={onProcessWebsite}
            disabled={processingWebsite || loading}
          >
            {processingWebsite ? 'Processing website…' : 'Process website'}
          </button>
          <p className="ne-footnote">We analyze your homepage and draft the form answers below.</p>

          {prefillMessage && <p className="ne-success">{prefillMessage}</p>}

          <label htmlFor="building">What are you building?</label>
          <textarea id="building" name="building" value={form.building} onChange={onChange} required rows={3} placeholder="e.g. API testing tool for backend teams" />

          <label htmlFor="audience">Who is it for?</label>
          <input id="audience" name="audience" value={form.audience} onChange={onChange} required placeholder="e.g. Backend engineers at startups" />

          <label htmlFor="challenge">What challenge are you solving?</label>
          <textarea id="challenge" name="challenge" value={form.challenge} onChange={onChange} required rows={2} placeholder="e.g. Messaging is too technical" />

          <label htmlFor="differentiation">Why is your approach different?</label>
          <textarea id="differentiation" name="differentiation" value={form.differentiation} onChange={onChange} required rows={2} placeholder="e.g. One-click mocks from OpenAPI specs" />

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
