/**
 * Narrative Engine discovery on the marketing site (navbar link, landing CTA).
 * Routes stay at /narrative-engine — only promotional entry points are gated.
 *
 * - Local dev (vite): shown by default
 * - Production build: hidden unless VITE_NE_DISCOVERY=true
 */
export const neDiscoveryEnabled =
  import.meta.env.DEV || import.meta.env.VITE_NE_DISCOVERY === 'true';
