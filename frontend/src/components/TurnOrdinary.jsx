import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TurnOrdinary.css';
import sun from '../assets/graphics/Adpr Memetic Brand Labs_Sun 2.svg';
import ctaButton from '../assets/graphics/Adpr Memetic Brand Labs_CTA 2.svg';

function TurnOrdinary() {
    const navigate = useNavigate();
    const [index, setIndex] = useState(0);
    const words = ["Logos", "Campaigns"];

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prevIndex) => (prevIndex + 1) % words.length);
        }, 2000); // Change every 2 seconds

        return () => clearInterval(interval);
    }, []);

    const text = words[index];

    return (
        <section className="turn-ordinary" id="about">
            <div className="turn-ordinary-container">
                <div className="turn-ordinary-content">
                    {/* Main Heading */}
                    <h1 className="main-heading">
                        Turn complex tech into<br />
                        culture that spreads
                    </h1>

                    <div className="content-grid">
                        {/* Left side - Sun graphic */}
                        <div className="left-side">
                            <img src={sun} alt="" className="sun-graphic" />
                        </div>

                        {/* Right side - Content */}
                        <div className="right-side">
                            <p className="intro-text">
                                We build <strong className="highlight">culture-first branding systems</strong><br />
                                for Web3 and AI companies...
                            </p>

                            <p className="description-text">
                                So your ideas don't just reach people,<br />
                                they resonate, repeat, and stick.
                            </p>

                            <div className="emphasis-block">
                                <p className="crossed-text">
                                    Not just <span className="cycling-word" key={text}>{text}</span>
                                </p>
                                <p className="brand-systems">
                                    It is <strong className="highlight">Memetic brand systems</strong>
                                </p>
                            </div>


                        </div>
                    </div>
                </div>

            </div>
            {/* CTA Button */}
            <div className="cta-wrapper">
                <img
                    src={ctaButton}
                    alt="Apply Now"
                    className="cta-graphic"
                    onClick={() => navigate('/application-form')}
                    style={{ cursor: 'pointer' }}
                />
            </div>
        </section>
    );
}

export default TurnOrdinary;
