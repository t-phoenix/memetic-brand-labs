import { useEffect, useState } from 'react';
import bubble from '../assets/graphics/figma-v2/memetic-bubble.svg';
import quotes from '../assets/graphics/figma-v2/memetic-quotes.svg';
import arrow from '../assets/graphics/figma-v2/carousel-arrow.svg';
import social from '../assets/graphics/figma-v2/carousel-social.svg';
import stories from '../assets/graphics/figma-v2/carousel-stories.svg';
import beliefs from '../assets/graphics/figma-v2/carousel-beliefs.svg';
import identities from '../assets/graphics/figma-v2/carousel-identities.svg';
import jokes from '../assets/graphics/figma-v2/carousel-jokes.svg';
import truths from '../assets/graphics/figma-v2/carousel-truths.svg';
import './WhatYouAchieve.css';

/** Figma card frames 111:587 / 596 / 605 / 614 / 636 — shared title band, per-art insets */
const SLIDES = [
  {
    title: 'Stories',
    image: stories,
    art: { left: '7.83%', right: '8.08%', top: '16.5%', bottom: '32.94%' },
  },
  {
    title: 'Beliefs',
    image: beliefs,
    art: { left: '23.15%', right: '23.4%', top: '16.5%', bottom: '32.94%' },
  },
  {
    title: 'Identities',
    image: identities,
    art: { left: '16.34%', right: '16.25%', top: '16.5%', bottom: '32.94%' },
  },
  {
    title: 'Jokes',
    image: jokes,
    art: { left: '17.79%', right: '17.31%', top: '16.5%', bottom: '32.94%' },
  },
  {
    title: 'Shared Truths',
    image: truths,
    art: { left: '17.7%', right: '17.62%', top: '17.56%', bottom: '31.88%' },
  },
];

function WhatYouAchieve() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const slide = SLIDES[active];
  const move = (delta) => {
    setDirection(delta);
    setActive((value) => (value + delta + SLIDES.length) % SLIDES.length);
  };

  useEffect(() => {
    if (carouselPaused) return undefined;
    const timer = window.setInterval(
      () => {
        setDirection(1);
        setActive((value) => (value + 1) % SLIDES.length);
      },
      2000,
    );
    return () => window.clearInterval(timer);
  }, [carouselPaused]);

  return (
    <section className="memetic-section" id="what-you-achieve" data-nav-tone="cream" data-nav-bg="#d9595e">
      <div className="memetic-section__inner">
        <div className="memetic-section__left">
          <div className={`memetic-section__bubble${dialogOpen ? ' is-open' : ''}`} role="dialog">
            <img src={bubble} alt="" />
            <p>
              We use the word carefully.
              <br />
              We do not engineer memes.
              <br />
              We do not guarantee virality.
            </p>
          </div>
          <h2>
            <span className="memetic-section__title-copy">
              <button
                type="button"
                className="memetic-section__trigger"
                aria-expanded={dialogOpen}
                onClick={() => setDialogOpen((open) => !open)}
                onMouseEnter={() => setDialogOpen(true)}
                onMouseLeave={() => setDialogOpen(false)}
                onFocus={() => setDialogOpen(true)}
                onBlur={() => setDialogOpen(false)}
              >
                <span className="memetic-section__memetic-line">
                  <img className="memetic-section__quotes" src={quotes} alt="" aria-hidden="true" />
                  <span className="memetic-section__memetic">Memetic</span>
                </span>
                <span className="memetic-section__potential">Potential</span>
              </button>
            </span>
          </h2>
        </div>
        <div className="memetic-section__right">
          <p className="memetic-section__lead">
            People rarely repeat information.
            <br />
            <br />
            <strong>They repeat:</strong>
          </p>
          <div
            className="memetic-carousel-block"
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
            onFocusCapture={() => setCarouselPaused(true)}
            onBlurCapture={() => setCarouselPaused(false)}
          >
            <div className="memetic-carousel">
              <img className="memetic-carousel__arrows" src={arrow} alt="" aria-hidden />
              <button type="button" onClick={() => move(-1)} aria-label="Previous card" />
              <article
                key={slide.title}
                className={`memetic-carousel__card memetic-carousel__card--${direction > 0 ? 'next' : 'previous'}`}
              >
                <img
                  className="memetic-carousel__image"
                  src={slide.image}
                  alt=""
                  style={{
                    top: slide.art.top,
                    right: slide.art.right,
                    bottom: slide.art.bottom,
                    left: slide.art.left,
                  }}
                />
                <h3>{slide.title}</h3>
              </article>
              <button type="button" onClick={() => move(1)} aria-label="Next card" />
            </div>
            <img className="memetic-carousel__social" src={social} alt="" />
          </div>
          <p className="memetic-section__def">
            When we say <strong>&quot;memetic,&quot;</strong> we simply mean:
            <br />
            Ideas people choose to remember and repeat.
          </p>
        </div>
      </div>
      <p className="memetic-section__footnote">
        Some things spread. Most don&apos;t. <em>Internet permitting.</em>
      </p>
    </section>
  );
}

export default WhatYouAchieve;
