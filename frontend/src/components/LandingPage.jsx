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
      const navProbe = Math.max(48, Math.round(window.innerWidth * (62 / 1440)));
      const sections = document.querySelectorAll('[data-nav-tone]');
      const active = [...sections].find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= navProbe && rect.bottom > navProbe;
      });
      setNavTone(active?.dataset.navTone || 'cream');
      setNavBackground(active?.dataset.navBg || '#7979e3');
    };

    updateTone();
    window.addEventListener('scroll', updateTone, { passive: true });
    window.addEventListener('resize', updateTone, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateTone);
      window.removeEventListener('resize', updateTone);
    };
  }, []);

  useEffect(() => {
    const sections = [...document.querySelectorAll('.landing > section')];
    const revealTargets = [
      'h1',
      'h2',
      '.communication-section__illustration',
      '.communication-section__copy',
      '.story-section__art',
      '.strong-section__row',
      '.cards-section__intro',
      '.cards-section__card',
      '.cards-section__footer',
      '.memetic-section__left',
      '.memetic-section__lead',
      '.memetic-carousel',
      '.memetic-carousel__social',
      '.memetic-section__def',
      '.memetic-section__footnote',
      '.workshop-section__left',
      '.workshop-section__right',
      '.ne-section__left',
      '.ne-section__intro',
      '.ne-section__tell',
      '.ne-section__form',
      '.clarity-section__left',
      '.clarity-section__right',
      '.clarity-section__footnote',
      '.final-cta__left',
      '.final-cta__right',
    ].join(',');

    sections.forEach((section) => {
      section.querySelectorAll(revealTargets).forEach((element, index) => {
        element.classList.add('landing-reveal');
        element.style.setProperty('--reveal-order', index);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
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
