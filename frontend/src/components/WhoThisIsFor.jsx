import speechIcon from '../assets/graphics/figma-v2/card-speech.svg';
import clapIcon from '../assets/graphics/figma-v2/card-clap.svg';
import thumbIcon from '../assets/graphics/figma-v2/card-thumb.svg';
import './WhoThisIsFor.css';

/** Figma: Group 44 — From technical depth to shared language + 3 cards */
function WhoThisIsFor() {
  const cards = [
    {
      title: 'Shared Language',
      copy: "A simpler way to explain what you're building.",
      icon: speechIcon,
    },
    {
      title: 'Recognisable Narratives',
      copy: 'Stories people immediately recognise.',
      icon: clapIcon,
    },
    {
      title: 'Memetic Potential',
      copy: 'Ideas people recognise, relate to, repeat and share.',
      icon: thumbIcon,
    },
  ];

  return (
    <section className="cards-section" id="who-this-is-for" data-nav-tone="cream" data-nav-bg="#7979e3">
      <div className="cards-section__inner">
        <h2>
          From technical depth
          <br />
          to shared language.
        </h2>
        <p className="cards-section__intro">We help founders transform complex ideas into:</p>
        <div className="cards-section__cards">
          {cards.map((card) => (
            <article className="cards-section__card" key={card.title}>
              <img src={card.icon} alt="" />
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
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
