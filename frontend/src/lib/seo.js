export const SITE_URL = 'https://memetic.adpr.work';

export const DEFAULT_SEO = {
  title: 'Memetic Brand Labs by adpr — Communication Intelligence for Emerging Tech',
  description:
    'We build communication systems with memetic potential for AI, Web3 and deep tech founders—helping products become easier to understand, remember and share.',
  image: `${SITE_URL}/og-image.png`,
  imageAlt: 'Memetic Brand Labs — Communication intelligence for emerging technology companies',
  canonical: `${SITE_URL}/`,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
};

export const ROUTE_SEO = {
  '/': DEFAULT_SEO,
  '/application-form': {
    title: 'Apply — Memetic Brand Workshop | Memetic Brand Labs',
    description:
      'Apply for the Memetic Brand Workshop — a focused session to improve clarity, positioning, and adoption readiness for AI, Web3, and deep tech founders.',
    image: DEFAULT_SEO.image,
    imageAlt: DEFAULT_SEO.imageAlt,
    canonical: `${SITE_URL}/application-form`,
    robots: DEFAULT_SEO.robots,
  },
  '/narrative-engine': {
    title: 'Narrative Engine (Beta) | Memetic Brand Labs',
    description:
      'Try the Narrative Engine beta — an early preview tool that helps emerging technology founders clarify positioning and narrative.',
    image: DEFAULT_SEO.image,
    imageAlt: DEFAULT_SEO.imageAlt,
    canonical: `${SITE_URL}/narrative-engine`,
    robots: DEFAULT_SEO.robots,
  },
};

export const NOINDEX_ROBOTS = 'noindex, nofollow';

export function getRouteSeo(pathname) {
  if (pathname.startsWith('/admin')) {
    return {
      title: 'Admin | Memetic Brand Labs',
      description: DEFAULT_SEO.description,
      image: DEFAULT_SEO.image,
      imageAlt: DEFAULT_SEO.imageAlt,
      canonical: `${SITE_URL}${pathname}`,
      robots: NOINDEX_ROBOTS,
    };
  }

  if (pathname.startsWith('/narrative-engine/run')) {
    return {
      title: 'Narrative Engine Run | Memetic Brand Labs',
      description: DEFAULT_SEO.description,
      image: DEFAULT_SEO.image,
      imageAlt: DEFAULT_SEO.imageAlt,
      canonical: `${SITE_URL}${pathname}`,
      robots: NOINDEX_ROBOTS,
    };
  }

  if (pathname.startsWith('/results/')) {
    return {
      title: 'Narrative Results | Memetic Brand Labs',
      description: DEFAULT_SEO.description,
      image: DEFAULT_SEO.image,
      imageAlt: DEFAULT_SEO.imageAlt,
      canonical: `${SITE_URL}${pathname}`,
      robots: 'index, follow',
    };
  }

  return ROUTE_SEO[pathname] ?? DEFAULT_SEO;
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function applySeo(seo) {
  document.title = seo.title;

  upsertMeta('meta[name="description"]', { name: 'description', content: seo.description });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: seo.robots });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Memetic Brand Labs' });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: seo.canonical });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: seo.image });
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: seo.imageAlt });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.image });
  upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: seo.imageAlt });

  upsertLink('canonical', seo.canonical);
}
