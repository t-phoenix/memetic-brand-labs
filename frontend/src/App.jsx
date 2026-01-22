import { useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TurnOrdinary from './components/TurnOrdinary';
import WhatThisIsFor from './components/WhatThisIsFor';
import WhoThisIsFor from './components/WhoThisIsFor';
import WhatYouAchieve from './components/WhatYouAchieve';
import HowItWorks from './components/HowItWorks';
import FinalCTA from './components/FinalCTA';
import adpr from './assets/graphics/Adpr Memetic Brand Labs_adpr Logo.svg';

function App() {
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const handleScroll = () => {
      const turnOrdinarySection = document.getElementById('turn-ordinary');
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
      const howItWorksSection = document.getElementById('how-it-works');

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
    <div className="app">
      <Navbar />
      <Hero />
      <TurnOrdinary />
      <WhatThisIsFor />
      <WhoThisIsFor />
      <WhatYouAchieve />
      <HowItWorks />
      <FinalCTA />
      <div className="footer-logo">
        <img src={adpr} alt="adpr" />
      </div>
    </div>
  );
}

export default App;
