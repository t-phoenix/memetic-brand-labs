import './FinalCTA.css';
import applyFor from '../assets/graphics/Adpr Memetic Brand Labs_Apply for.png';
import ctaButton from '../assets/graphics/Adpr Memetic Brand Labs_CTA 1.svg';
import logo2 from '../assets/graphics/Adpr Memetic Brand Labs_Logo 2.svg';

function FinalCTA() {
    return (
        <section className="final-cta">
            <div className="container">
                <div className="cta-split">
                    {/* Left half */}
                    <div className="cta-left">
                        <img src={applyFor} alt="Apply for the" className="apply-for-graphic" />
                        <img src={logo2} alt="adpr Memetics Brand Labs" className="logo-2-graphic" />
                    </div>

                    {/* Right half */}
                    <div className="cta-right">
                        <p className="limited-text">
                            We're onboarding a <br /><span className="highlight">limited number of teams</span><br /> in this phase.
                        </p>
                        <img src={ctaButton} alt="Apply Now" className="cta-button-graphic" />
                    </div>
                </div>


            </div>
        </section>
    );
}

export default FinalCTA;
