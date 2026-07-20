import arrow from '../assets/graphics/figma-v2/clarity-arrow.svg';
import heroArrow from '../assets/graphics/figma-v2/clarity-hero-arrow.svg';
import './ClaritySection.css';

const TRAVEL = ['People', 'Communities', 'Participation', 'Repetition'];
const SUPPORT = ['Creator activation', 'Community engagement', 'Communication reinforcement'];

/** Figma: Group 168 / Clarity is where it starts */
export default function ClaritySection() {
  return (
    <section className="clarity-section" id="clarity" data-nav-tone="cream" data-nav-bg="#d9595e">
      <div className="clarity-section__inner">
        <div className="clarity-section__left">
          <h2>
            Clarity is where it starts.
            <br />
            Not where it ends.
          </h2>
          <img className="clarity-section__hero-arrow" src={heroArrow} alt="" width={428} height={425} />
        </div>
        <div className="clarity-section__right">
          <p className="clarity-section__lead">Strong communication is only the beginning.</p>
          <p className="clarity-section__sub">Ideas travel through:</p>
          <ul className="clarity-section__grid">
            {TRAVEL.map((item) => (
              <li key={item}>
                <img className="clarity-section__bullet" src={arrow} alt="" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="clarity-section__sub clarity-section__sub--mt">When needed, we can support:</p>
          <ul className="clarity-section__support">
            {SUPPORT.map((item) => (
              <li key={item}>
                <img className="clarity-section__bullet" src={arrow} alt="" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="clarity-section__footnote">
        Not everything spreads. Clarity improves the chances.
      </p>
    </section>
  );
}
