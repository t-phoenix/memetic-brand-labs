import './WhatYouAchieve.css';
import bags from '../assets/graphics/Adpr Memetic Brand Labs_Bags.svg';
import icon from '../assets/graphics/Adpr Memetic Brand Labs_Icon 5.svg';

function WhatYouAchieve() {
    const achievements = [
        "A clear memetic brand voice",
        "A meme brand strategy aligned to your product and audience",
        "A meme brand playbook your team can reuse (for retainer engagement)",
        "Ready-to-use meme templates tied to GTM moments"
    ];

    return (
        <section id="what-you-achieve" className="what-you-achieve">
            <div className="container achievements-container">
                <div className="achievements-left">
                    <h2 className="achievements-title">What You<br />Achieve</h2>
                    <div className="achievements-bags">
                        <img src={bags} alt="Bags graphic" />
                    </div>
                </div>

                <div className="achievements-right">
                    <p className="achievements-intro">By the end of the engagement, you will have</p>
                    <ul className="achievements-list">
                        {achievements.map((item, index) => (
                            <li key={index}>
                                <div className="achievement-icon">
                                    <img src={icon} alt="" />
                                </div>
                                <p className="achievement-text">{item}</p>
                            </li>
                        ))}
                    </ul>
                    <p className="achievements-footer">
                        <span className="italic-bold">The result:</span> Your brand stops explaining itself, and starts being understood instinctively.
                    </p>
                </div>
            </div>
        </section>
    );
}

export default WhatYouAchieve;
