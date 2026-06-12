import { useEffect } from 'react'
import Hero from './components/Hero'
import Philosophy from './components/Philosophy'
import Capabilities from './components/Capabilities'
import WhoAreTheCrows from './components/WhoAreTheCrows'
import Footer from './components/Footer'
import './App.css'

function App() {
  // Global scroll reveal — observes all .reveal elements across the page
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal, .reveal-scale')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <Hero />
      <Philosophy />
      <Capabilities />
      <WhoAreTheCrows />
      <Footer />
    </main>
  )
}

export default App

