import { Link } from 'react-router-dom';
import './NarrativeEngineCTA.css';

function NarrativeEngineCTA() {
  return (
    <section className="ne-cta-band" id="narrative-engine-cta">
      <div className="ne-cta-band__inner">
        <div className="ne-cta-band__copy">
          <p className="ne-cta-band__eyebrow">Free beta</p>
          <h2 className="ne-cta-band__title">
            Try the <span>Narrative Engine</span>
          </h2>
          <p className="ne-cta-band__desc">
            Diagnose how you explain your product — then get four narrative directions in minutes.
          </p>
        </div>
        <Link to="/narrative-engine" className="ne-cta-band__button">
          Analyze your narrative
        </Link>
      </div>
    </section>
  );
}

export default NarrativeEngineCTA;
