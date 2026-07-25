import speechIcon from '../assets/graphics/figma-v2/card-speech.svg';
import clapIcon from '../assets/graphics/figma-v2/card-clap.svg';
import thumbIcon from '../assets/graphics/figma-v2/card-thumb.svg';
import './WhoThisIsFor.css';

const CARDS = [
  {
    title: 'Shared Language',
    copy: "A simpler way to explain what you're building.",
    detail:
      'Shared language is a vocabulary your audience adopts naturally—terms, metaphors, and framing that make a technical product legible without diluting what makes it distinctive.',
    icon: speechIcon,
    iconClass: 'cards-section__card-icon--speech',
  },
  {
    title: 'Recognisable Narratives',
    copy: 'Stories people immediately recognise.',
    detail:
      'Recognisable narratives are repeatable stories about why a product matters, who it is for, and what changes when it works—stories that investors, users, and communities can retell accurately.',
    icon: clapIcon,
    iconClass: 'cards-section__card-icon--clap',
  },
  {
    title: 'Memetic Potential',
    copy: 'Ideas people recognise, relate to, repeat and share.',
    detail:
      'Memetic potential describes ideas engineered to spread: concepts, visuals, and phrases that people recognise, relate to, repeat, and share across social channels and communities.',
    icon: thumbIcon,
    iconClass: 'cards-section__card-icon--thumb',
  },
];

/** Figma: Group 44 — From technical depth to shared language + 3 cards */
function WhoThisIsFor() {
  return (
    <section className="cards-section" id="who-this-is-for" data-nav-tone="cream" data-nav-bg="#7979e3">
      <div className="cards-section__inner">
        <h2>
          Who is Memetic Brand Labs for?
        </h2>
        <p className="cards-section__intro">
          We help founders across AI, Web3, infrastructure, and deep tech transform complex ideas into:
        </p>
        <div className="cards-section__cards">
          {CARDS.map((card) => (
            <article className="cards-section__card" key={card.title}>
              <div className={`cards-section__card-icon ${card.iconClass}`}>
                <img src={card.icon} alt="" aria-hidden />
              </div>
              <div className="cards-section__card-body">
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="cards-section__seo-copy" aria-hidden="true">
          {CARDS.map((card) => (
            <p key={card.title}>
              <strong>{card.title}.</strong> {card.detail}
            </p>
          ))}
        </div>
        <p className="cards-section__footer">
          Helping products become easier to understand and harder to forget.
        </p>
      </div>
    </section>
  );
}

export default WhoThisIsFor;
