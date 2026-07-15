import { Link } from 'react-router-dom';
import memeStory from '../assets/graphics/figma-v2/meme-story-exact.png';
import './FinalCTA.css';

function FinalCTA() {
  return (
    <section className="final-cta" id="apply" data-nav-tone="cream" data-nav-bg="#7979e3">
      <div className="final-cta__inner">
        <div className="final-cta__left">
          <img className="meme-story-art" src={memeStory} alt="A Good Meme Story" width={548} height={485} />
        </div>
        <div className="final-cta__right">
          <p className="final-cta__resonate">If this resonates, we can work together.</p>
          <div className="final-cta__block">
            <p>Apply for the</p>
            <Link to="/application-form" className="final-cta__btn final-cta__btn--solid">
              Memetic Brand Workshop
            </Link>
          </div>
          <div className="final-cta__block">
            <p>Try the beta version</p>
            <a href="#narrative-engine" className="final-cta__btn final-cta__btn--outline">
              Narrative Engine
            </a>
          </div>
          <p className="final-cta__tagline">
            Communication Intelligence for Emerging Technology Companies. Powered by Memetic
            Systems.
          </p>
        </div>
      </div>
    </section>
  );
}

export default FinalCTA;
