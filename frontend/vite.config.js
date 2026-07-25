import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { seoRoutePrerender } from './vite-plugin-seo-prerender.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), seoRoutePrerender()],
  test: {
    environment: 'node',
  },
})
