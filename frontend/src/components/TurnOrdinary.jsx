import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TurnOrdinary.css';
import sun from '../assets/graphics/Adpr Memetic Brand Labs_Sun 2.svg';
import ctaButton from '../assets/graphics/Adpr Memetic Brand Labs_CTA 2.svg';

function TurnOrdinary() {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [loopNum, setLoopNum] = useState(0);
    const [typingSpeed, setTypingSpeed] = useState(150);

    const words = ["logos", "campaigns"];

    useEffect(() => {
        const handleTyping = () => {
            const i = loopNum % words.length;
            const fullText = words[i];

            setText(isDeleting
                ? fullText.substring(0, text.length - 1)
                : fullText.substring(0, text.length + 1)
            );

            setTypingSpeed(isDeleting ? 80 : 150);

            if (!isDeleting && text === fullText) {
                setTimeout(() => setIsDeleting(true), 1500);
            } else if (isDeleting && text === '') {
                setIsDeleting(false);
                setLoopNum(loopNum + 1);
            }
        };

        const timer = setTimeout(handleTyping, typingSpeed);
        return () => clearTimeout(timer);
    }, [text, isDeleting, loopNum]);

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
                                    Not just <span className="cycling-word">{text}</span>
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
