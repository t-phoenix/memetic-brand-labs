import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeWebsiteForForm, createNarrativeRun } from '../lib/narrativeApi';
import gears from '../assets/graphics/figma-v2/ne-gears.svg';
import mobileHeading from '../assets/graphics/figma-v2/mobile-ne-heading.svg';
import './NarrativeEngineSection.css';

const INITIAL = {
  building: '',
  audience: '',
  challenge: '',
  differentiation: '',
  website: '',
  model_tier: 'fast',
};

export default function NarrativeEngineSection() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onAnalyzeWebsite = async () => {
    const website = form.website.trim();
    if (!website) {
      setAnalyzeError('Enter a website URL first.');
      return;
    }

    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const { answers } = await analyzeWebsiteForForm(website);
      setForm((prev) => ({
        ...prev,
        building: answers.building || prev.building,
        audience: answers.audience || prev.audience,
        challenge: answers.challenge || prev.challenge,
        differentiation: answers.differentiation || prev.differentiation,
      }));
    } catch (err) {
      setAnalyzeError(err.message || 'Could not analyze website');
    } finally {
      setAnalyzing(false);
    }
  };

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
    <section className="ne-section" id="narrative-engine" data-nav-tone="cream" data-nav-bg="#8e4ed5">
      <div className="ne-section__inner">
        <div className="ne-section__left">
          <img className="ne-section__mobile-heading" src={mobileHeading} alt="Try the Narrative Engine (Beta)" />
          <p className="ne-section__try">Try the</p>
          <div className="ne-section__title-row">
            <h2 className="ne-section__title">
              <span>Narrative</span>
              <span>Engine</span>
            </h2>
            <span className="ne-section__beta">(Beta)</span>
          </div>
          <img className="ne-section__gears" src={gears} alt="" width={433} height={526} />
        </div>

        <div className="ne-section__right">
          <p className="ne-section__intro">
            Before committing to a workshop, try a small part of
            <br />
            the system.
            <br />
            <br />
            The Narrative Engine is an early preview of our upcoming Creative Intelligence OS.
            <br />
            <br />
            Designed to help founders explain what they are building
            <br />
            in plain language.
          </p>

          <p className="ne-section__tell">Tell us about your company</p>

          <form className="ne-section__form" onSubmit={onSubmit}>
            <div className="ne-website-intake">
              <label className="ne-website-intake__label">
                <span>Start with your website</span>
                <div className="ne-website-intake__row">
                  <input
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={onChange}
                    required
                    placeholder="https://yourcompany.com"
                    autoComplete="url"
                  />
                  <button
                    type="button"
                    className="ne-website-intake__btn"
                    onClick={onAnalyzeWebsite}
                    disabled={analyzing || loading}
                  >
                    {analyzing ? 'Analyzing…' : 'Analyze'}
                  </button>
                </div>
              </label>
              <p className="ne-website-intake__hint">
                We&apos;ll read your homepage and prefill the fields below.
              </p>
              {analyzeError && (
                <p className="ne-section__error ne-website-intake__error" role="alert">
                  {analyzeError}
                </p>
              )}
            </div>

            <label className="ne-field">
              <span>What are you building?</span>
              <input
                name="building"
                value={form.building}
                onChange={onChange}
                required
                autoComplete="off"
              />
            </label>

            <label className="ne-field">
              <span>Who is it for?</span>
              <input name="audience" value={form.audience} onChange={onChange} required autoComplete="off" />
            </label>

            <label className="ne-field">
              <span>What challenge are you solving?</span>
              <input name="challenge" value={form.challenge} onChange={onChange} required autoComplete="off" />
            </label>

            <label className="ne-field">
              <span>Why is your approach different?</span>
              <input
                name="differentiation"
                value={form.differentiation}
                onChange={onChange}
                required
                autoComplete="off"
              />
            </label>

            {error && (
              <p className="ne-section__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="ne-section__cta" disabled={loading}>
              {loading ? 'Starting…' : 'Analyze Your Narrative'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
