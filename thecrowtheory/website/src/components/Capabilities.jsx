import { useRef, useState } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'
import './Capabilities.css'

const capabilities = [
  {
    id: 'systems',
    icon: '/svg/TCT_Landing Page_Systems.svg',
    title: 'Systems',
    description: 'Identity, language & strategic frameworks that give brands structure',
    services: [
      {
        title: 'Graphics & Identity',
        description: 'Visual identity systems, logos, brand guidelines & design languages',
      },
      {
        title: 'Strategy & Positioning',
        description: 'Brand strategy, naming, positioning & research-led creative direction',
      },
      {
        title: 'Data visualisation & Typefaces',
        description: 'Custom typefaces, information design & data-driven visual systems',
      },
    ],
  },
  {
    id: 'products',
    icon: '/svg/TCT_Landing Page_Products.svg',
    title: 'Products',
    description: 'Physical, digital & packaged objects designed with intent',
    services: [
      {
        title: 'Products & Packaging',
        description: 'Product form, material, structure & packaging design for shelf & e-commerce',
      },
      {
        title: 'Innovation & Prototyping',
        description: 'Concept development, rapid prototyping & design-led problem solving',
      },
    ],
  },
  {
    id: 'experiences',
    icon: '/svg/TCT_Landing Page_Experiences.svg',
    title: 'Experiences',
    description: 'Digital environments, spatial installations, sound & motion',
    services: [
      {
        title: 'Websites & Digital experiences',
        description: 'Web design, interaction design, digital products & UX-led builds',
      },
      {
        title: 'Sound & Motion',
        description: 'Motion graphics, animation, sound design & audiovisual storytelling',
      },
      {
        title: 'Exhibitions & Installations',
        description: 'Spatial design, environmental graphics & immersive installations',
      },
    ],
  },
  {
    id: 'culture',
    icon: '/svg/TCT_Landing Page_Culture.svg',
    title: 'Culture',
    description: 'Campaigns, stories & communications that shape perception',
    services: [
      {
        title: 'Advertising & Communications',
        description: 'Campaign concepts, copywriting, art direction & integrated media',
      },
    ],
  },
]

const pillars = [
  {
    id: 'product-dev',
    icon: '/svg/TCT_Landing Page_Product Development.svg',
    kicker: 'Product Development',
    subtitle: 'Problem Solving',
    description:
      'New products and design led solutions for existing and emerging problems — physical, digital, licensable or proprietary.',
  },
  {
    id: 'brand-ownership',
    icon: '/svg/TCT_Landing Page_Brand Ownership.svg',
    kicker: 'Brand Ownership',
    subtitle: 'Brand Creation',
    description:
      'Brands built as long term ventures, with equity participation where design, strategy & execution drive value creation.',
  },
]

export default function Capabilities() {
  const sectionRef = useRef(null)
  useScrollReveal(sectionRef)
  const [expandedCol, setExpandedCol] = useState('systems')

  return (
    <section className="capabilities" id="capabilities" ref={sectionRef}>
      <div className="capabilities__canvas">
        {/* Desk PDF grid panels — top-right + bottom-left */}
        <div className="capabilities__grid-panel capabilities__grid-panel--top-right" aria-hidden="true" />
        <div className="capabilities__grid-panel capabilities__grid-panel--bottom-left" aria-hidden="true" />

        <div className="container capabilities__content">
          <div className="capabilities__header reveal">
            <h2 className="capabilities__heading">
              The{' '}
              <img
                src="/svg/TCT_Landing Page_Crows_W.svg"
                alt="crows"
                className="capabilities__crows-img"
              />{' '}
              are capable of
            </h2>
            <p className="capabilities__intro reveal reveal-delay-2">
              Observe, Adapt and Build with purpose. Inspired by that intelligence,{' '}
              <img
                src="/svg/TCT_Landing Page_TCT_H Logo.svg"
                alt="the crow theory"
                className="capabilities__intro-logo"
              />{' '}
              was built on a belief that great design happens the same way by looking deeply, working collectively and making things that last.
            </p>
          </div>

          <div className="capabilities__grid">
          {capabilities.map((col, colIdx) => (
            <div
              key={col.id}
              className={`capabilities__col reveal reveal-delay-${colIdx + 2}`}
            >
              <div 
                className="capabilities__col-header"
                onClick={() => setExpandedCol(expandedCol === col.id ? null : col.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedCol(expandedCol === col.id ? null : col.id)}
                aria-expanded={expandedCol === col.id}
              >
                <span className="capabilities__col-icon">
                  <img src={col.icon} alt="" className="capabilities__col-icon-img" />
                </span>
                <h3 className="capabilities__col-title">{col.title}</h3>
                
                <span className="capabilities__col-toggle mobile-only">
                  {expandedCol === col.id ? '−' : '+'}
                </span>
              </div>
              <p className="capabilities__col-desc">{col.description}</p>
              
              <button
                type="button"
                className="capabilities__toggle-link mobile-only"
                onClick={() => setExpandedCol(expandedCol === col.id ? null : col.id)}
              >
                {expandedCol === col.id ? 'Show less...' : 'Show more...'}
              </button>

              <div className={`capabilities__services ${expandedCol === col.id ? 'capabilities__services--open' : ''}`}>
                {col.services.map((svc, svcIdx) => (
                  <div
                    key={svc.title}
                    className="capabilities__service-card"
                    style={{ '--card-delay': `${svcIdx * 60}ms` }}
                  >
                    <h4 className="capabilities__service-title">{svc.title}</h4>
                    <p className="capabilities__service-desc">{svc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>

          {/* Build Beyond Client Work */}
          <div className="build-beyond-wrapper">
            <div className="build-beyond__header reveal">
              <h2 className="build-beyond__heading">Build Beyond Client Work</h2>
              <p className="build-beyond__intro reveal reveal-delay-2">
                We also develop original products, concepts and ventures of our own.
                Through product development and selective brand partnerships.
              </p>
            </div>

            <div className="build-beyond__grid">
            {pillars.map((pillar, idx) => (
              <div
                key={pillar.id}
                className={`build-beyond__card reveal reveal-delay-${idx + 2}`}
              >
                <div className="build-beyond__card-icon">
                  <img src={pillar.icon} alt="" className="build-beyond__card-icon-img" />
                  <span className="build-beyond__kicker">{pillar.kicker}</span>
                </div>
                <div className="build-beyond__card-content">
                  <h3 className="build-beyond__subtitle">{pillar.subtitle}</h3>
                  <p className="build-beyond__desc">{pillar.description}</p>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
