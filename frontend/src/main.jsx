import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const SPLASH_MIN_MS = 1300
const splashStart = performance.now()

function dismissSplash() {
  const splash = document.getElementById('app-splash')
  if (!splash || splash.classList.contains('is-hidden')) return

  const elapsed = performance.now() - splashStart
  const remaining = Math.max(0, SPLASH_MIN_MS - elapsed)

  window.setTimeout(() => {
    splash.classList.add('is-hidden')
    const remove = () => splash.remove()
    splash.addEventListener('transitionend', remove, { once: true })
    window.setTimeout(remove, 700)
  }, remaining)
}

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

requestAnimationFrame(() => {
  requestAnimationFrame(dismissSplash)
})
