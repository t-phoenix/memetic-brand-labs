import { useState } from 'react';
import bubble from '../assets/graphics/figma-v2/memetic-bubble.svg';
import arrow from '../assets/graphics/figma-v2/carousel-arrow.svg';
import social from '../assets/graphics/figma-v2/carousel-social.svg';
import stories from '../assets/graphics/figma-v2/carousel-stories.svg';
import beliefs from '../assets/graphics/figma-v2/carousel-beliefs.svg';
import identities from '../assets/graphics/figma-v2/carousel-identities.svg';
import jokes from '../assets/graphics/figma-v2/carousel-jokes.svg';
import truths from '../assets/graphics/figma-v2/carousel-truths.svg';
import './WhatYouAchieve.css';

function WhatYouAchieve() {
  const [active, setActive] = useState(0);
  const slides = [
    { title: 'Stories', image: stories },
    { title: 'Beliefs', image: beliefs },
    { title: 'Identities', image: identities },
    { title: 'Jokes', image: jokes },
    { title: 'Shared Truths', image: truths },
  ];
  const slide = slides[active];
  const move = (delta) => setActive((value) => (value + delta + slides.length) % slides.length);

  return (
    <section className="memetic-section" id="what-you-achieve" data-nav-tone="cream" data-nav-bg="#d9595e">
      <div className="memetic-section__inner">
        <div className="memetic-section__left">
          <div className="memetic-section__bubble">
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
            <span aria-hidden>“</span>Memetic<span aria-hidden>”</span>
            <br />
            Potential
          </h2>
        </div>
        <div className="memetic-section__right">
          <p className="memetic-section__lead">
            People rarely repeat information.
            <br />
            <br />
            <strong>They repeat:</strong>
          </p>
          <div className="memetic-carousel">
            <img className="memetic-carousel__arrows" src={arrow} alt="" aria-hidden />
            <button type="button" onClick={() => move(-1)} aria-label="Previous card" />
            <article className="memetic-carousel__card">
              <img className="memetic-carousel__image" src={slide.image} alt="" />
              <h3>{slide.title}</h3>
            </article>
            <button type="button" onClick={() => move(1)} aria-label="Next card" />
          </div>
          <img className="memetic-carousel__social" src={social} alt="" />
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
