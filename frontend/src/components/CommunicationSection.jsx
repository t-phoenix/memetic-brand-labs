import illustration from '../assets/graphics/figma-v2/communication-art.svg';
import mobileIllustration from '../assets/graphics/figma-v2/mobile-communication-art.svg';
import './CommunicationSection.css';

export default function CommunicationSection() {
  return (
    <section className="communication-section" data-nav-tone="cream" data-nav-bg="#7979e3">
      <div className="communication-section__inner">
        <div className="communication-section__illustration" aria-hidden>
          <picture>
            <source media="(max-width: 900px)" srcSet={mobileIllustration} />
            <img src={illustration} alt="" />
          </picture>
        </div>

        <h1>
          Communication intelligence for
          <br />
          emerging technology companies.
        </h1>

        <div className="communication-section__copy">
          <p>
            We build communication systems with memetic potential, helping emerging technology
            companies become easier to understand, easier to remember and harder to ignore.
          </p>
          <p>
            <strong>The technology may be clear.</strong>
            <br />
            <strong>The story often isn&apos;t.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
