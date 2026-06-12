import { useRef } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Footer.css'

export default function Footer() {
  const sectionRef = useRef(null)
  useScrollReveal(sectionRef)

  return (
    <footer className="footer" id="contact" ref={sectionRef}>
      {/* Grid overlay */}
      <div className="footer__grid-overlay" aria-hidden="true" />

      {/* Top: Ideas gather here */}
      <div className="container footer__top">
        <div className="footer__intro reveal">
          <h2 className="footer__intro-heading">Ideas gather here.</h2>
          <p className="footer__intro-body">
            Whether you have a brief, a half formed idea or just a question.
            <br className="footer__br" />
            We&apos;d like to hear from you.
          </p>
        </div>
      </div>

      {/* Center: Large logo */}
      <div className="container footer__logo-wrap reveal reveal-delay-2">
        <div className="footer__logo" aria-label="The Crow Theory">
          <img src="/svg/TCT_Landing Page_TCT_H Logo.svg" alt="The Crow Theory" className="footer__logo-img footer__logo-img--desktop" />
          <img src="/svg/TCT_Landing Page_TCT_V Logo.svg" alt="The Crow Theory" className="footer__logo-img footer__logo-img--mobile" />
        </div>
      </div>

      {/* Divider */}
      <div className="footer__divider" />

      {/* Bottom links */}
      <div className="container footer__bottom reveal reveal-delay-3">
        {/* Left: Nav links */}
        <div className="footer__nav">
          <a href="mailto:hello@thecrowtheory.com" className="footer__nav-link" id="footer-get-in-touch">
            Get in touch
          </a>
          <a
            href="https://instagram.com/thecrowtheory"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__nav-link"
            id="footer-instagram"
          >
            Instagram
          </a>
          <a
            href="https://linkedin.com/company/thecrowtheory"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__nav-link"
            id="footer-linkedin"
          >
            LinkedIn
          </a>
        </div>

        {/* Center: Business Inquiries label */}
        <div className="footer__inquiries">
          <span className="footer__label">New Business Inquiries</span>
        </div>

        {/* Right: Contact details */}
        <div className="footer__contact">
          <a href="mailto:hello@thecrowtheory.com" className="footer__contact-link" id="footer-email">
            <img src="/svg/TCT_Landing Page_E-Mail.svg" alt="" className="footer__contact-icon-img" />
            hello@thecrowtheory.com
          </a>
          <a href="tel:+919844436538" className="footer__contact-link" id="footer-phone-1">
            <img src="/svg/TCT_Landing Page_Mob.svg" alt="" className="footer__contact-icon-img" />
            +91 98444 36538
          </a>
          <a href="tel:+919447678354" className="footer__contact-link" id="footer-phone-2">
            <img src="/svg/TCT_Landing Page_Mob.svg" alt="" className="footer__contact-icon-img" />
            +91 94476 78354
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="container footer__copy">
        <span>© {new Date().getFullYear()} The Crow Theory. All rights reserved.</span>
      </div>
    </footer>
  )
}
