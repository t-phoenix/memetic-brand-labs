/**
 * Google Analytics 4 helpers.
 *
 * The gtag.js script is loaded once in index.html (per Google setup instructions).
 * This module gates all tracking to production builds and exposes typed event helpers.
 *
 * Full event catalog & developer guide: docs/analytics.md
 */

/** Must match the ID in frontend/index.html */
export const GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-BVW6SV0RDG';

/** GA4 event names used across the app — keep in sync with docs/analytics.md */
export const AnalyticsEvents = {
  PAGE_VIEW: 'page_view',
  CTA_CLICK: 'cta_click',
  NAV_CLICK: 'nav_click',
  OUTBOUND_CLICK: 'click',
  FORM_START: 'form_start',
  FORM_STEP: 'form_step',
  GENERATE_LEAD: 'generate_lead',
  NE_WEBSITE_ANALYZE: 'ne_website_analyze',
  NE_RUN_START: 'narrative_engine_start',
  NE_RUN_COMPLETE: 'narrative_engine_complete',
  NE_EMAIL_UNLOCK: 'ne_email_unlock',
  SHARE: 'share',
  FILE_DOWNLOAD: 'file_download',
};

export const isAnalyticsEnabled = () =>
  Boolean(GA_MEASUREMENT_ID) && import.meta.env.PROD;

function gtag(...args) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

/** SPA route change — call from GoogleAnalytics.jsx */
export function trackPageView(path, title) {
  gtag('event', AnalyticsEvents.PAGE_VIEW, {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/** Low-level escape hatch for new events */
export function trackEvent(name, params = {}) {
  gtag('event', name, params);
}

export function trackCtaClick({ name, location, destination }) {
  trackEvent(AnalyticsEvents.CTA_CLICK, {
    cta_name: name,
    cta_location: location,
    link_url: destination,
  });
}

export function trackNavClick({ section, source = 'navbar' }) {
  trackEvent(AnalyticsEvents.NAV_CLICK, {
    nav_section: section,
    nav_source: source,
  });
}

export function trackOutboundClick(url, linkText = '') {
  trackEvent(AnalyticsEvents.OUTBOUND_CLICK, {
    event_category: 'outbound',
    link_url: url,
    link_text: linkText,
    outbound: true,
  });
}

export function trackFormStart() {
  trackEvent(AnalyticsEvents.FORM_START, { form_name: 'application' });
}

export function trackFormStep(step) {
  trackEvent(AnalyticsEvents.FORM_STEP, { form_name: 'application', form_step: step });
}

export function trackFormSubmit() {
  trackEvent(AnalyticsEvents.GENERATE_LEAD, {
    form_name: 'application',
    currency: 'USD',
    value: 0,
  });
}

export function trackNeWebsiteAnalyze() {
  trackEvent(AnalyticsEvents.NE_WEBSITE_ANALYZE, { feature: 'narrative_engine' });
}

export function trackNeRunStart({ source, modelTier }) {
  trackEvent(AnalyticsEvents.NE_RUN_START, {
    feature: 'narrative_engine',
    ne_source: source,
    model_tier: modelTier,
  });
}

export function trackNeRunComplete({ runId }) {
  trackEvent(AnalyticsEvents.NE_RUN_COMPLETE, {
    feature: 'narrative_engine',
    run_id: runId,
  });
}

export function trackNeEmailUnlock({ runId }) {
  trackEvent(AnalyticsEvents.NE_EMAIL_UNLOCK, {
    feature: 'narrative_engine',
    run_id: runId,
  });
}

export function trackShare({ method, contentType, itemId }) {
  trackEvent(AnalyticsEvents.SHARE, {
    method,
    content_type: contentType,
    item_id: itemId,
  });
}

export function trackFileDownload({ fileName, fileExtension, linkUrl }) {
  trackEvent(AnalyticsEvents.FILE_DOWNLOAD, {
    file_name: fileName,
    file_extension: fileExtension,
    link_url: linkUrl,
  });
}
