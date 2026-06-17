import { useRef } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Philosophy.css'

export default function Philosophy() {
  const sectionRef = useRef(null)
  useScrollReveal(sectionRef)

  return (
    <section className="philosophy" id="philosophy" ref={sectionRef}>
      <div className="philosophy__grid" aria-hidden="true" />

      <div className="container philosophy__inner">
        <div className="philosophy__visual reveal">
          <picture>
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet="/images/philosophy/crow-philosophy-static.png"
            />
            <img
              className="philosophy__animation"
              src="/gifs/Crow_Web-Animation_Philosophy.gif"
              alt="The Crow Theory — design and creativity"
            />
          </picture>
        </div>

        <div className="philosophy__tagline-wrap reveal reveal-delay-2">
          <h2 className="philosophy__tagline">
            A balance between discipline and expression.
          </h2>
          <p className="philosophy__body reveal reveal-delay-3">
            Our practice is driven by making, curiosity and experimentation,
            allowing ideas to move fluidly across disciplines and take form in work
            that is thoughtful, purposeful and culturally relevant.
          </p>
        </div>
      </div>
    </section>
  )
}
