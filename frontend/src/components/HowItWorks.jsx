import { Link } from 'react-router-dom';
import { trackCtaClick } from '../lib/analytics';
import workshopWordmark from '../assets/graphics/figma-v2/workshop-art-top.svg';
import workshopBottom from '../assets/graphics/figma-v2/workshop-art-bottom.svg';
import workshopHand from '../assets/graphics/figma-v2/workshop-hand.svg';
import workshopSun from '../assets/graphics/figma-v2/workshop-sun.svg';
import workshopThumb from '../assets/graphics/figma-v2/workshop-thumb.svg';
import bag from '../assets/graphics/figma-v2/bag-bullet.svg';
import mobileWorkshopWordmark from '../assets/graphics/figma-v2/mobile-workshop-wordmark.svg';
import mobileWorkshopBottom from '../assets/graphics/figma-v2/mobile-workshop-bottom.svg';
import mobileWorkshopHand from '../assets/graphics/figma-v2/mobile-workshop-hand.svg';
import mobileWorkshopSun from '../assets/graphics/figma-v2/mobile-workshop-sun.svg';
import mobileWorkshopThumb from '../assets/graphics/figma-v2/mobile-workshop-thumb.svg';
import './HowItWorks.css';

const OUTCOMES = [
  'A Memetic Brand Direction',
  'A Memetic Brand Voice',
  'A Narrative & Content Playbook',
  'Creative Directions with Memetic Potential',
];

/** Figma: Group 162 — Walk in with a product / Workshop CTA */
function HowItWorks() {
  return (
    <section className="workshop-section" id="works" data-nav-tone="purple" data-nav-bg="#f2ddb6">
      <div className="workshop-section__inner">
        <h2 className="workshop-section__title">
          What does a Memetic Brand Workshop include?
        </h2>
        <div className="workshop-section__left">
          <div className="workshop-art" aria-hidden>
            <img className="workshop-art__sun" src={workshopSun} alt="" />
            <img className="workshop-art__thumb" src={workshopThumb} alt="" />
            <img className="workshop-art__wordmark" src={workshopWordmark} alt="" />
            <img className="workshop-art__bottom" src={workshopBottom} alt="" />
            <img className="workshop-art__hand" src={workshopHand} alt="" />
          </div>
          <div className="workshop-art-mobile" aria-hidden>
            <img className="workshop-art-mobile__sun" src={mobileWorkshopSun} alt="" />
            <img className="workshop-art-mobile__thumb" src={mobileWorkshopThumb} alt="" />
            <img className="workshop-art-mobile__wordmark" src={mobileWorkshopWordmark} alt="" />
            <img className="workshop-art-mobile__bottom" src={mobileWorkshopBottom} alt="" />
            <img className="workshop-art-mobile__hand" src={mobileWorkshopHand} alt="" />
          </div>
        </div>
        <div className="workshop-section__right">
          <p className="workshop-section__audience">
            The Memetic Brand Workshop is for emerging technology founders whose products are
            technically strong but difficult to explain—teams preparing for launch, fundraising,
            community growth, or category creation in AI, Web3, and deep tech.
          </p>
          <p className="workshop-section__intro">
            Walk in with a product. Walk out with a story. This focused working session is designed
            to improve clarity, positioning, engagement and adoption readiness.
            <br />
            <br />
            Together we uncover the language, narratives and cultural cues that already exist around
            your category.
          </p>
          <p className="workshop-section__leave">You leave with:</p>
          <ul className="workshop-section__list">
            {OUTCOMES.map((item) => (
              <li key={item}>
                <img src={bag} alt="" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/application-form"
            className="workshop-section__cta"
            onClick={() =>
              trackCtaClick({
                name: 'memetic_brand_workshop',
                location: 'how_it_works',
                destination: '/application-form',
              })
            }
          >
            Memetic Brand Workshop
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
