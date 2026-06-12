import { useEffect, useRef } from 'react'

/**
 * useScrollReveal — attaches IntersectionObserver to add .visible class
 * to all elements with .reveal or .reveal-scale inside the container ref.
 */
export function useScrollReveal(containerRef, deps = []) {
  useEffect(() => {
    const container = containerRef?.current ?? document
    const elements = container.querySelectorAll('.reveal, .reveal-scale')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
