import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { trackNavClick, trackOutboundClick } from '../lib/analytics';
import logoCream from '../assets/graphics/figma-v2/logo-nav-cream.svg';
import logoMagenta from '../assets/graphics/figma-v2/logo-mark-magenta.svg';
import logoPurple from '../assets/graphics/figma-v2/logo-nav-purple.svg';
import './SiteNav.css';

/** tone: cream (light logo on dark/colored bg) | magenta (dark logo on cream bg) */
export default function SiteNav({ tone = 'cream', className = '', background }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const logo = tone === 'purple' ? logoPurple : tone === 'magenta' ? logoMagenta : logoCream;

  const goSection = (e, sectionId) => {
    e.preventDefault();
    trackNavClick({ section: sectionId, source: 'site_nav' });
    if (location.pathname === '/' || location.pathname === '') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${sectionId}`);
      }
    } else {
      navigate('/', { state: { scrollTo: sectionId } });
    }
    setMenuOpen(false);
  };

  return (
    <header
      className={`site-nav site-nav--${tone} ${className}`.trim()}
      style={background ? { backgroundColor: background } : undefined}
    >
      <div className="site-nav__inner">
        <Link to="/" className="site-nav__logo" aria-label="adpr Memetic Brand Labs home">
          <img src={logo} alt="" width={79} height={82} />
        </Link>
        <nav className="site-nav__links" aria-label="Primary">
          <a href="#home" onClick={(e) => goSection(e, 'home')}>home</a>
          <a href="#works" onClick={(e) => goSection(e, 'works')}>works</a>
          <a href="#about" onClick={(e) => goSection(e, 'about')}>about us</a>
          <a
            href="https://adpr.work"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutboundClick('https://adpr.work', 'adpr')}
          >
            adpr
          </a>
        </nav>
        <button
          className="site-nav__menu"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        {menuOpen && (
          <nav className="site-nav__mobile-links" aria-label="Mobile primary">
            <a href="#home" onClick={(e) => goSection(e, 'home')}>home</a>
            <a href="#works" onClick={(e) => goSection(e, 'works')}>works</a>
            <a href="#about" onClick={(e) => goSection(e, 'about')}>about us</a>
            <a
              href="https://adpr.work"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackOutboundClick('https://adpr.work', 'adpr')}
            >
              adpr
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
