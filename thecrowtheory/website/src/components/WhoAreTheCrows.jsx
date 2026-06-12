import { useRef } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './WhoAreTheCrows.css'

const disciplines = [
  'Artists', 'Designers', 'Writers', 'Thinkers',
  'Engineers', 'Architects', 'Filmmakers', 'Musicians',
  'Graphic Designers', 'Motion Designers', 'Type Designers', 'Industrial Designers',
  'Interaction Designers', 'Product Designers', 'Fashion Designers', 'Sound Designers',
  'Makers', 'Investors', '& more',
]

export default function WhoAreTheCrows() {
  const sectionRef = useRef(null)
  useScrollReveal(sectionRef)

  return (
    <section className="who-crows" id="who-are-the-crows" ref={sectionRef}>
      <div className="container who-crows__inner">
        <p className="who-crows__pre reveal">Who are the</p>
        <h2 className="who-crows__heading reveal reveal-delay-1">
          <img src="/svg/TCT_Landing Page_Crows_B.svg" alt="crows" className="who-crows__crows-img" />
          <span className="who-crows__question">?</span>
        </h2>

        <p className="who-crows__subtitle reveal reveal-delay-2">
          A collective of practicing
        </p>

        <div className="who-crows__pills reveal reveal-delay-3" aria-label="Disciplines">
          {disciplines.map((d, i) => (
            <span
              key={d}
              className="who-crows__pill"
              style={{ '--pill-delay': `${i * 35}ms` }}
            >
              {d}
            </span>
          ))}
        </div>

        <p className="who-crows__tagline reveal reveal-delay-4">
          An evolving network united by curiosity and craft.
        </p>

        <a
          href="mailto:hello@thecrowtheory.com"
          className="who-crows__cta reveal reveal-delay-5"
          id="join-network-cta"
        >
          <span>Join the Network</span>
        </a>
      </div>
    </section>
  )
}
