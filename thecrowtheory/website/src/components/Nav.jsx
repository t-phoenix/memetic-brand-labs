import { useState } from 'react'
import './Nav.css'

const links = [
  { href: '#philosophy', label: 'Philosophy' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#who-are-the-crows', label: 'Crows' },
  { href: '#contact', label: 'Contact' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <header className={`site-nav ${open ? 'site-nav--open' : ''}`}>
      <div className="container site-nav__inner">
        <a href="#hero" className="site-nav__logo" aria-label="The Crow Theory" onClick={close}>
          <img
            src="/svg/TCT_Landing Page_TCT_H Logo.svg"
            alt=""
            className="site-nav__logo-img"
          />
        </a>

        <button
          type="button"
          className="site-nav__menu-btn"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="site-nav__menu-icon" aria-hidden="true" />
        </button>

        <nav className="site-nav__links site-nav__links--desktop" aria-label="Primary">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="site-nav__link">
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div
        className="site-nav__mobile-panel"
        aria-hidden={!open}
      >
        <nav className="site-nav__links site-nav__links--mobile" aria-label="Primary mobile">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="site-nav__link" onClick={close}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
