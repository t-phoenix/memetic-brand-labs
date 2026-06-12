import { useRef } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Philosophy.css'

export default function Philosophy() {
  const sectionRef = useRef(null)
  useScrollReveal(sectionRef)

  return (
    <section className="philosophy" id="philosophy" ref={sectionRef}>
      {/* Graph paper grid overlay */}
      <div className="philosophy__grid" aria-hidden="true" />

      <div className="container philosophy__inner">
        {/* Center video visual */}
        <div className="philosophy__bracket-row reveal">
          <div className="philosophy__center reveal-scale reveal-delay-2">
            <video
              className="philosophy__video-element"
              src="/videos/crow-philosophy.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="philosophy__tagline-wrap reveal reveal-delay-3">
          <h2 className="philosophy__tagline">
            A balance between discipline and expression.
          </h2>
          <p className="philosophy__body reveal reveal-delay-4">
            Our practice is driven by making, curiosity and experimentation,
            allowing ideas to move fluidly across disciplines and take form in work
            that is thoughtful, purposeful, and culturally relevant.
          </p>
        </div>
      </div>
    </section>
  )
}
