import { useRef, useEffect } from 'react'
import './Hero.css'

export default function Hero() {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  return (
    <section className="hero" id="hero">

      {/* Full-bleed background video */}
      <div className="hero__video-wrap" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero__video"
          src="/videos/crow-cover.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="hero__overlay" />
      </div>

      {/* Two-column layout: Logo left | Tagline right */}
      <div className="container hero__content">

        {/* LEFT COLUMN — Wordmark */}
        <div className="hero__logo" aria-label="The Crow Theory">
          <img src="/svg/TCT_Landing Page_TCT_V Logo.svg" alt="The Crow Theory" className="hero__logo-img" />
        </div>

        {/* RIGHT COLUMN — Tagline & description */}
        <div className="hero__right">
          <h1 className="hero__tagline">
            A Creative Ecosystem for Art, Design &amp; Innovation
          </h1>
          <p className="hero__description">
            A multidisciplinary studio working across applied art, design systems
            and product thinking to create meaningful products, experiences and
            visual cultures.
          </p>
        </div>

      </div>
    </section>
  )
}
