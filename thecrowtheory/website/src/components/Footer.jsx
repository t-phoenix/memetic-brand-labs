import { useRef } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Footer.css'

export default function Footer() {
  const sectionRef = useRef(null)
  useScrollReveal(sectionRef)

  return (
    <footer className="footer" id="contact" ref={sectionRef}>
      <div className="footer__grid-overlay" aria-hidden="true" />

      <div className="container footer__top">
        <div className="footer__intro reveal">
          <h2 className="footer__intro-heading">Ideas gather here</h2>
          <p className="footer__intro-body">
            Whether you have a brief, a half formed idea or just a question.
            <br className="footer__br" />
            We&apos;d like to hear from you.
          </p>
        </div>
      </div>

      <div className="container footer__logo-wrap reveal reveal-delay-2">
        <div className="footer__logo" aria-label="The Crow Theory">
          <img
            src="/svg/TCT_Landing Page_TCT_H Logo.svg"
            alt="The Crow Theory"
            className="footer__logo-img footer__logo-img--desktop"
          />
          <img
            src="/svg/TCT_Landing Page_TCT_V Logo.svg"
            alt="The Crow Theory"
            className="footer__logo-img footer__logo-img--mobile"
          />
        </div>
      </div>

      <div className="footer__divider" />

      <div className="container footer__bottom reveal reveal-delay-3">
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
            href="https://www.linkedin.com/company/the-crow-theory/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__nav-link"
            id="footer-linkedin"
          >
            LinkedIn
          </a>
        </div>

        <div className="footer__inquiries">
          <span className="footer__label">New Business Inquiries</span>
        </div>

        <div className="footer__contact">
          <a href="mailto:hello@thecrowtheory.com" className="footer__contact-link" id="footer-email">
            <img src="/svg/TCT_Landing Page_E-Mail.svg" alt="" className="footer__contact-icon-img" />
            hello@thecrowtheory.com
          </a>
          <div className="footer__phones">
            <a href="tel:+919844436538" className="footer__contact-link" id="footer-phone-1">
              <img src="/svg/TCT_Landing Page_Mob.svg" alt="" className="footer__contact-icon-img" />
              +91 9844436538
            </a>
            <span className="footer__phone-sep" aria-hidden="true">|</span>
            <a href="tel:+919447678354" className="footer__contact-link footer__contact-link--phone" id="footer-phone-2">
              +91 9447678354
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
