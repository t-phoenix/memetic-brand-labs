import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from './Hero';
import SiteNav from './SiteNav';
import CommunicationSection from './CommunicationSection';
import TurnOrdinary from './TurnOrdinary';
import WhatThisIsFor from './WhatThisIsFor';
import WhoThisIsFor from './WhoThisIsFor';
import WhatYouAchieve from './WhatYouAchieve';
import HowItWorks from './HowItWorks';
import NarrativeEngineSection from './NarrativeEngineSection';
import ClaritySection from './ClaritySection';
import FinalCTA from './FinalCTA';
import adpr from '../assets/graphics/Adpr Memetic Brand Labs_adpr Logo.svg';
import './LandingFooter.css';

function LandingPage() {
  const location = useLocation();
  const [navTone, setNavTone] = useState('cream');
  const [navBackground, setNavBackground] = useState('#7979e3');

  useEffect(() => {
    const target = location.state?.scrollTo || (location.hash || '').replace(/^#/, '');
    if (!target) return;
    const element = document.getElementById(target);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    }
  }, [location]);

  useEffect(() => {
    const updateTone = () => {
      const sections = document.querySelectorAll('[data-nav-tone]');
      const active = [...sections].find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= 62 && rect.bottom > 62;
      });
      setNavTone(active?.dataset.navTone || 'cream');
      setNavBackground(active?.dataset.navBg || '#7979e3');
    };

    updateTone();
    window.addEventListener('scroll', updateTone, { passive: true });
    return () => window.removeEventListener('scroll', updateTone);
  }, []);

  return (
    <div className="landing">
      <Hero />
      <SiteNav tone={navTone} background={navBackground} className="landing-nav" />
      <CommunicationSection />
      <TurnOrdinary />
      <WhatThisIsFor />
      <WhoThisIsFor />
      <WhatYouAchieve />
      <HowItWorks />
      {/* Form only on landing — loading + results are separate routes */}
      <NarrativeEngineSection />
      <ClaritySection />
      <FinalCTA />
      <footer className="landing-footer" id="adpr">
        <p>
          Creative Intelligence OS (CI OS) is currently in development.
          <br />
          The Narrative Engine (Beta) provides an early preview of selected capabilities.
        </p>
        <a href="https://adpr.work" target="_blank" rel="noopener noreferrer" className="landing-footer__logo">
          <img src={adpr} alt="adpr" />
        </a>
      </footer>
    </div>
  );
}

export default LandingPage;
