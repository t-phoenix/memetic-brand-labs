import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  AnalyticsEvents,
  isAnalyticsEnabled,
  trackEvent,
  trackPageView,
} from './analytics';

describe('analytics', () => {
  const gtag = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('window', {
      gtag,
      location: { href: 'https://memetic.adpr.work/' },
    });
    vi.stubGlobal('document', { title: 'Memetic Brand Labs' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    gtag.mockReset();
  });

  it('exports stable event names', () => {
    expect(AnalyticsEvents.GENERATE_LEAD).toBe('generate_lead');
    expect(AnalyticsEvents.NE_RUN_START).toBe('narrative_engine_start');
  });

  it('does not track outside production', () => {
    vi.stubEnv('PROD', false);
    trackPageView('/application-form');
    trackEvent('cta_click', { cta_name: 'test' });
    expect(gtag).not.toHaveBeenCalled();
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('tracks page views in production', () => {
    vi.stubEnv('PROD', true);
    trackPageView('/application-form');
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/application-form' }),
    );
  });
});
