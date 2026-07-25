# Google Analytics 4 — Memetic Brand Labs

This document describes how analytics is wired in the frontend, which events are tracked, and how to extend tracking for new features.

**Measurement ID:** `G-BVW6SV0RDG`  
**Property:** Memetic Brand Labs (GA4)

---

## Architecture

```
index.html                    ← gtag.js loaded once, immediately after <head> (Google requirement)
src/lib/analytics.js          ← event helpers, production-only gating
src/components/GoogleAnalytics.jsx  ← SPA page_view on route changes
src/components/*.jsx          ← CTA / form / NE event calls at interaction sites
```

### Why two layers?

1. **`index.html`** — Google requires the tag snippet immediately after `<head>`, once per page. Vite serves a single `index.html` shell for the entire SPA, which satisfies this for all routes.
2. **`GoogleAnalytics.jsx`** — React Router navigates without full page reloads. We send `page_view` manually on each route change.
3. **`analytics.js`** — All custom events go through helpers so naming stays consistent and tracking is disabled in local dev (`import.meta.env.PROD`).

The inline config uses `send_page_view: false` so the initial HTML load does not double-count with the React route tracker.

---

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `VITE_GA_MEASUREMENT_ID` | No | `G-BVW6SV0RDG` | Must match `index.html` if you change streams |

Set in Vercel **Project Settings → Environment Variables** for Production (and Preview if desired).

**Important:** If you change the measurement ID, update **both** `frontend/index.html` and `VITE_GA_MEASUREMENT_ID`.

---

## Event catalog

Mark key events as **Conversions** in GA4: **Admin → Events → toggle "Mark as conversion"**.

| Event | GA4 type | When fired | Key parameters |
|-------|----------|------------|----------------|
| `page_view` | Automatic (SPA) | Every route change | `page_path`, `page_title`, `page_location` |
| `cta_click` | Custom | Workshop / NE CTA clicks | `cta_name`, `cta_location`, `link_url` |
| `nav_click` | Custom | In-page nav (home, works, about) | `nav_section`, `nav_source` |
| `click` | Recommended | Outbound links (adpr.work) | `event_category: outbound`, `link_url`, `outbound: true` |
| `form_start` | Custom | Application form page load | `form_name: application` |
| `form_step` | Custom | Step 1 → 2 transition | `form_step: 2` |
| `generate_lead` | **Recommended** | Application form submit | `form_name: application` |
| `ne_website_analyze` | Custom | "Analyze" website button (NE) | `feature: narrative_engine` |
| `narrative_engine_start` | Custom | NE run created | `ne_source`, `model_tier` |
| `narrative_engine_complete` | Custom | NE results cards shown | `run_id` |
| `ne_email_unlock` | Custom | Email gate passed | `run_id` |
| `share` | **Recommended** | Social share icon click | `method`, `content_type`, `item_id` |
| `file_download` | **Recommended** | Share graphic download | `file_name`, `file_extension` |

### `cta_location` values

| Value | Component |
|-------|-----------|
| `how_it_works` | Workshop CTA in How It Works |
| `final_cta` | Final CTA section |
| `ne_cta_band` | Narrative Engine CTA band |
| `ne_results` | Results page workshop link |
| `shared_result` | Public share page workshop link |

### `ne_source` values

| Value | Where |
|-------|-------|
| `landing_section` | `#narrative-engine` on homepage |
| `ne_page` | `/narrative-engine` standalone page |

---

## Adding a new tracked event

1. Add the event name to `AnalyticsEvents` in `src/lib/analytics.js`.
2. Add a typed helper (e.g. `trackFooClick`) next to the existing helpers.
3. Call the helper from the component `onClick` / `onSubmit` handler — **do not** change markup classes or layout.
4. Document the event in the table above.
5. In GA4, register any new custom dimensions if you need them in reports (Admin → Custom definitions).

Example:

```javascript
// src/lib/analytics.js
export function trackHeroScroll() {
  trackEvent('hero_scroll', { section: 'hero' });
}

// src/components/Hero.jsx
<button type="button" onClick={() => { trackHeroScroll(); /* existing handler */ }}>
```

Use `trackEvent()` directly only for one-off experiments; prefer named helpers for anything permanent.

---

## UTM campaign links

Use UTM parameters on external links to attribute traffic in GA4 **Acquisition → Traffic acquisition**:

```
https://memetic.adpr.work/?utm_source=instagram&utm_medium=social&utm_campaign=workshop_launch
```

GA4 reads these automatically on landing. No extra code required.

---

## Funnels to build in GA4 (Explorations)

Suggested funnels for product insights:

1. **Lead funnel:** `page_view` (/) → `cta_click` → `form_start` → `generate_lead`
2. **Narrative Engine funnel:** `narrative_engine_start` → `ne_email_unlock` → `narrative_engine_complete` → `share`
3. **NE → Workshop:** `narrative_engine_complete` → `cta_click` (location: `ne_results`) → `generate_lead`

---

## Verifying tracking

### Production

1. Deploy to Vercel.
2. GA4 → **Reports → Realtime** — open the live site in another tab.
3. Click a CTA; confirm `cta_click` appears under **Event count by Event name**.

### Local development

Tracking is **disabled** in dev (`npm run dev`) to avoid polluting production data. To test locally:

```bash
npm run build && npm run preview
```

Open `http://localhost:4173` and use Realtime as above.

### DebugView (optional)

In GA4 **Admin → DebugView**, enable debug mode temporarily:

```javascript
gtag('config', 'G-BVW6SV0RDG', { debug_mode: true });
```

Remove before shipping — only for short debugging sessions.

---

## Privacy & compliance

- GA4 uses first-party cookies and anonymized IP by default.
- If you serve EU/UK visitors, plan for a cookie consent banner and [Consent Mode v2](https://developers.google.com/tag-platform/security/guides/consent) before scaling paid campaigns.
- Filter internal traffic: **Admin → Data streams → Configure tag settings → Define internal traffic**.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No data in Realtime | Production build? Ad blockers? Measurement ID matches `index.html`? |
| Double page views | Ensure `send_page_view: false` in `index.html` config |
| Events missing parameters | Register custom dimensions in GA4 Admin |
| Dev traffic in reports | Expected if testing production URL; use internal traffic filter |

---

## Files reference

| File | Purpose |
|------|---------|
| `frontend/index.html` | gtag.js script (single tag per page) |
| `frontend/src/lib/analytics.js` | Helpers + `AnalyticsEvents` enum |
| `frontend/src/components/GoogleAnalytics.jsx` | SPA route page views |
| `frontend/src/App.jsx` | Mounts `<GoogleAnalytics />` inside `<Router>` |
