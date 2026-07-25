import siren from '../assets/graphics/figma-v2/strong-siren.svg';
import './WhatThisIsFor.css';

/** Figma: Group 46 — Strong products deserve to be understood */
function WhatThisIsFor() {
  return (
    <section className="strong-section" id="strong-products" data-nav-tone="cream" data-nav-bg="#8e4ed5">
      <div className="strong-section__inner">
        <h2>Strong products deserve to be understood.</h2>
        <div className="strong-section__row">
          <img
            className="strong-section__art"
            src={siren}
            alt="Siren illustration representing products that deserve to be understood"
            width={445}
            height={339}
          />
          <div className="strong-section__body">
            <p>
              Many AI and Web3 products solve real problems.
              <br />
              But adoption slows when messaging becomes
              <br />
              too technical, positioning becomes unclear, or communication stays inside insider
              circles.
            </p>
            <p className="strong-section__emphasis">
              The product works. The audience just doesn&apos;t get it yet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhatThisIsFor;
