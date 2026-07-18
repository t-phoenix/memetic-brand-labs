import scrollQuill from '../assets/graphics/figma-v2/story-scroll-full.svg';
import './TurnOrdinary.css';

/** Figma: Group 169 — magenta story section */
function TurnOrdinary() {
  return (
    <section className="story-section" id="about" data-nav-tone="cream" data-nav-bg="#c24a8c">
      <div className="story-section__inner">
        <div className="story-section__copy">
          <h2>
            The product was clear.
            <br />
            The story wasn&apos;t.
          </h2>
          <p>
            Working with founders across AI, Web3, infrastructure,
            <br />
            and emerging technologies, we kept seeing the same pattern. The technology made sense.
            The narrative around it didn&apos;t. Features were understood. The bigger story
            wasn&apos;t.
            <br />
            <br />
            <strong>That&apos;s why we started MBL.</strong>
          </p>
        </div>
        <img className="story-section__art" src={scrollQuill} alt="" width={472} height={369} />
      </div>
    </section>
  );
}

export default TurnOrdinary;
