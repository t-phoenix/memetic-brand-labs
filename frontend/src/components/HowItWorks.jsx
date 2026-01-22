import './HowItWorks.css';
import gears from '../assets/graphics/Adpr Memetic Brand Labs_Gears.svg';
import icon1 from '../assets/graphics/Adpr Memetic Brand Labs_1.svg';
import icon2 from '../assets/graphics/Adpr Memetic Brand Labs_2.svg';
import icon3 from '../assets/graphics/Adpr Memetic Brand Labs_3.svg';
import arrow from '../assets/graphics/Adpr Memetic Brand Labs_Arrow.svg';

function HowItWorks() {
    const steps = [
        {
            icon: icon1,
            title: "Apply for the",
            subtitle: "Memetic Brand Workshop"
        },
        {
            icon: icon2,
            title: "Attend 2 hrs",
            subtitle: "Memetic Brand Workshop"
        },
        {
            icon: icon3,
            title: "Get your Brand",
            subtitle: "MemePlaybook + Meme System"
        }
    ];

    return (
        <section id="how-it-works" className="how-it-works">
            <div className="container">
                <div className="how-it-works-grid">
                    {/* Left Section: How It Works Heading and Gears */}
                    <div className="how-it-works-left">
                        <div className="gears-wrapper">
                            <img src={gears} alt="Gears" className="gears-img" />
                            <h2 className="how-it-works-title">
                                <span>How It</span>
                                <span>Works</span>
                            </h2>
                        </div>
                    </div>

                    {/* Right Section: Steps */}
                    <div className="how-it-works-right">
                        <h3 className="follow-steps-title">Follow the Steps</h3>
                        <div className="steps-list">
                            {steps.map((step, index) => (
                                <div key={index} className="how-step-item">
                                    <div className="step-icon-wrapper">
                                        <img src={step.icon} alt={`Step ${index + 1}`} className="step-number-icon" />
                                    </div>
                                    <div className="step-content">
                                        <p className="step-text-main">{step.title}</p>
                                        <p className="step-text-sub">{step.subtitle}</p>
                                    </div>
                                    <div className="step-arrow-wrapper">
                                        <img src={arrow} alt="Arrow" className="step-arrow-img" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default HowItWorks;
