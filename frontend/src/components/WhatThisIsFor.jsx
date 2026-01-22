import './WhatThisIsFor.css';
import whatIs from '../assets/graphics/Adpr Memetic Brand Labs_What is.svg';
import questionMark from '../assets/graphics/Adpr Memetic Brand Labs_-.svg';
import brandLogo from '../assets/graphics/Adpr Memetic Brand Labs_Logo 4vv.svg';
import icon1 from '../assets/graphics/Adpr Memetic Brand Labs_Icon 1.svg';
import icon2 from '../assets/graphics/Adpr Memetic Brand Labs_Icon 2.svg';
import icon3 from '../assets/graphics/Adpr Memetic Brand Labs_Icon 3.svg';

function WhatThisIsFor() {
    return (
        <section className="what-this-is-for">
            <div className="container">
                <div className="what-is-wrapper">
                    <div className="what-is-left">
                        <div className="hero-graphic-group">
                            <img src={whatIs} alt="What is" className="what-is-blob" />
                            <img src={brandLogo} alt="adpr Memetics Brand Labs" className="brand-logo-graphic" />
                            <img src={questionMark} alt="?" className="question-mark-blob" />
                        </div>
                    </div>

                    <div className="what-is-right">
                        <div className="description-content">
                            <p className="what-description-text top">
                                Adpr Meme Brand Project is a memetic branding lab where we help founders transform deep, technical ideas into:
                            </p>

                            <div className="features-icon-row">
                                <div className="feature-item">
                                    <img src={icon1} alt="Shared language" />
                                    <p className="feature-label">
                                        Shared <br />
                                        <span className="decorative-text">language</span>
                                    </p>
                                </div>
                                <div className="feature-item">
                                    <img src={icon2} alt="Recognizable narratives" />
                                    <p className="feature-label">
                                        <span className="decorative-text">Recognizable</span> <br />
                                        narratives
                                    </p>
                                </div>
                                <div className="feature-item">
                                    <img src={icon3} alt="Repeatable cultural signals" />
                                    <p className="feature-label">
                                        Repeatable <br />
                                        <span className="decorative-text">cultural signals</span>
                                    </p>
                                </div>
                            </div>

                            <p className="what-description-text bottom">
                                Think of it as creative intelligence for the attention economy where branding meets behavior, community, and code.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default WhatThisIsFor;

