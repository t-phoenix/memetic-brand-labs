import { describe, expect, it } from 'vitest';
import { getRouteSeo, NOINDEX_ROBOTS } from './seo';

describe('getRouteSeo', () => {
  it('returns home SEO for root path', () => {
    const seo = getRouteSeo('/');
    expect(seo.canonical).toBe('https://memetic.adpr.work/');
    expect(seo.title).toContain('Communication Intelligence');
  });

  it('returns application form SEO', () => {
    const seo = getRouteSeo('/application-form');
    expect(seo.canonical).toBe('https://memetic.adpr.work/application-form');
    expect(seo.title).toContain('Workshop');
  });

  it('noindexes admin routes', () => {
    const seo = getRouteSeo('/admin/overview');
    expect(seo.robots).toBe(NOINDEX_ROBOTS);
  });

  it('noindexes narrative run routes', () => {
    const seo = getRouteSeo('/narrative-engine/run/abc/results');
    expect(seo.robots).toBe(NOINDEX_ROBOTS);
  });
});
