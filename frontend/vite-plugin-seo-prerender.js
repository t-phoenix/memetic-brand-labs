import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = 'https://memetic.adpr.work';

const ROUTE_SNIPPETS = {
  '/application-form': {
    title: 'Apply — Memetic Brand Workshop | Memetic Brand Labs',
    description:
      'Apply for the Memetic Brand Workshop — a focused session to improve clarity, positioning, and adoption readiness for AI, Web3, and deep tech founders.',
    canonical: `${SITE_URL}/application-form`,
    body: `
      <article>
        <h1>Memetic Brand Workshop Application</h1>
        <p>
          Apply for a focused working session designed to improve clarity, positioning, engagement,
          and adoption readiness for emerging technology companies.
        </p>
        <p>
          Founders leave with a Memetic Brand Direction, Memetic Brand Voice, Narrative &amp;
          Content Playbook, and creative directions with memetic potential.
        </p>
      </article>`,
  },
  '/narrative-engine': {
    title: 'Narrative Engine (Beta) | Memetic Brand Labs',
    description:
      'Try the Narrative Engine beta — an early preview tool that helps emerging technology founders clarify positioning and narrative.',
    canonical: `${SITE_URL}/narrative-engine`,
    body: `
      <article>
        <h1>Narrative Engine (Beta)</h1>
        <p>
          Memetic Brand Labs offers an early preview tool that helps founders clarify positioning
          and narrative for AI, Web3, infrastructure, and deep tech products.
        </p>
        <p>
          <a href="${SITE_URL}/#narrative-engine">Try the Narrative Engine on the landing page</a>
        </p>
      </article>`,
  },
};

function upsertTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', `  ${replacement}\n</head>`);
}

function buildRouteHtml(baseHtml, route, config) {
  let html = baseHtml;
  html = html.replace(/<title>.*?<\/title>/, `<title>${config.title}</title>`);
  html = upsertTag(
    html,
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${config.description}"`,
  );
  html = upsertTag(
    html,
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${config.canonical}"`,
  );
  html = upsertTag(
    html,
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${config.canonical}"`,
  );
  html = upsertTag(
    html,
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${config.title}"`,
  );
  html = upsertTag(
    html,
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${config.description}"`,
  );
  html = upsertTag(
    html,
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${config.title}"`,
  );
  html = upsertTag(
    html,
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${config.description}"`,
  );
  html = html.replace(
    /<div id="seo-prerender">[\s\S]*?<\/div>/,
    `<div id="seo-prerender">${config.body}\n  </div>`,
  );
  return html;
}

export function seoRoutePrerender() {
  return {
    name: 'seo-route-prerender',
    closeBundle() {
      const distDir = join(process.cwd(), 'dist');
      const baseHtml = readFileSync(join(distDir, 'index.html'), 'utf8');

      Object.entries(ROUTE_SNIPPETS).forEach(([route, config]) => {
        const outDir = join(distDir, route.slice(1));
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, 'index.html'), buildRouteHtml(baseHtml, route, config), 'utf8');
      });
    },
  };
}
