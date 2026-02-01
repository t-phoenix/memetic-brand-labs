import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Hero from './Hero';
import TurnOrdinary from './TurnOrdinary';
import WhatThisIsFor from './WhatThisIsFor';
import WhoThisIsFor from './WhoThisIsFor';
import WhatYouAchieve from './WhatYouAchieve';
import HowItWorks from './HowItWorks';
import FinalCTA from './FinalCTA';
import adpr from '../assets/graphics/Adpr Memetic Brand Labs_adpr Logo.svg';

function LandingPage() {
    const location = useLocation();

    useEffect(() => {
        if (location.state?.scrollTo) {
            const element = document.getElementById(location.state.scrollTo);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, [location]);

    useEffect(() => {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const handleScroll = () => {
            const turnOrdinarySection = document.getElementById('about');
            const whoThisIsForSection = document.getElementById('who-this-is-for');

            if (turnOrdinarySection) {
                const rect = turnOrdinarySection.getBoundingClientRect();
                // Show navbar when TurnOrdinary section is in view or has been scrolled past
                if (rect.top <= 0) {
                    navbar.classList.add('visible');
                } else {
                    navbar.classList.remove('visible');
                }
            }

            const whatYouAchieveSection = document.getElementById('what-you-achieve');
            const howItWorksSection = document.getElementById('works');

            let isLightSection = false;
            let isHowItWorksSection = false;

            if (whoThisIsForSection) {
                const rect = whoThisIsForSection.getBoundingClientRect();
                if (rect.top <= 50 && rect.bottom >= 50) {
                    isLightSection = true;
                }
            }

            if (whatYouAchieveSection) {
                const rect = whatYouAchieveSection.getBoundingClientRect();
                if (rect.top <= 50 && rect.bottom >= 50) {
                    isLightSection = true;
                }
            }

            if (howItWorksSection) {
                const rect = howItWorksSection.getBoundingClientRect();
                if (rect.top <= 50 && rect.bottom >= 50) {
                    isHowItWorksSection = true;
                }
            }

            if (isLightSection) {
                navbar.classList.add('who-section-active');
            } else {
                navbar.classList.remove('who-section-active');
            }

            if (isHowItWorksSection) {
                navbar.classList.add('how-it-works-active');
            } else {
                navbar.classList.remove('how-it-works-active');
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial state

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <Navbar />
            <Hero />
            <TurnOrdinary />
            <WhatThisIsFor />
            <WhoThisIsFor />
            <WhatYouAchieve />
            <HowItWorks />
            <FinalCTA />
            <div className="footer-logo" id="adpr">
                <img src={adpr} alt="adpr" />
            </div>
        </>
    );
}

export default LandingPage;
