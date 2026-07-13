/**
 * Heuristic form ↔ homepage mismatch detection.
 * Pure function — safe to unit test without network I/O.
 */
export function computeMismatchFlags(
  extracted: {
    title?: string;
    meta_description?: string;
    h1?: string;
    h2?: string[];
    cta?: string;
  },
  form?: {
    audience?: string;
    building?: string;
  },
): Record<string, unknown> {
  const flags: Record<string, unknown> = {};
  const audience = form?.audience?.trim() ?? '';
  const building = form?.building?.trim() ?? '';
  const title = (extracted.title ?? '').trim();
  const meta = (extracted.meta_description ?? '').trim();
  const h1 = (extracted.h1 ?? '').trim();
  const h2 = extracted.h2 ?? [];
  const pageText = [title, meta, h1, ...h2].join(' ').toLowerCase();

  if (audience && meta.toLowerCase().includes('everyone')) {
    flags.audience_mismatch = { form: audience, site: 'everyone', signal: 'meta_description' };
  }

  if (audience && pageText) {
    const audienceTokens = meaningfulTokens(audience);
    const hits = audienceTokens.filter((t) => pageText.includes(t));
    if (audienceTokens.length >= 2 && hits.length === 0) {
      flags.audience_not_reflected = {
        form: audience,
        checked_against: 'title/meta/h1/h2',
        unmatched_tokens: audienceTokens.slice(0, 8),
      };
    }
  }

  if (building && title) {
    const buildingTokens = meaningfulTokens(building);
    const titleLower = title.toLowerCase();
    const hits = buildingTokens.filter((t) => titleLower.includes(t));
    if (buildingTokens.length >= 2 && hits.length === 0) {
      flags.building_title_mismatch = {
        form: building,
        site_title: title,
        unmatched_tokens: buildingTokens.slice(0, 8),
      };
    }
  }

  const jargonRatio = estimateJargonDensity(pageText);
  const formJargon = estimateJargonDensity([audience, building].filter(Boolean).join(' ').toLowerCase());
  if (jargonRatio >= 0.12 && jargonRatio > formJargon + 0.05) {
    flags.jargon_density = {
      site_ratio: Number(jargonRatio.toFixed(3)),
      form_ratio: Number(formJargon.toFixed(3)),
      note: 'Homepage copy appears denser in technical jargon than the form answers',
    };
  }

  return flags;
}

function meaningfulTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function estimateJargonDensity(text: string): number {
  if (!text.trim()) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const jargonHits = words.filter((w) => JARGON_TERMS.has(w.replace(/[^a-z0-9]/g, ''))).length;
  return jargonHits / words.length;
}

const STOPWORDS = new Set([
  'that',
  'this',
  'with',
  'from',
  'your',
  'their',
  'have',
  'will',
  'been',
  'were',
  'they',
  'them',
  'about',
  'into',
  'over',
  'under',
  'after',
  'before',
  'which',
  'while',
  'where',
  'when',
  'what',
  'who',
  'whom',
  'whose',
  'and',
  'the',
  'for',
  'are',
  'our',
  'you',
  'can',
  'able',
  'help',
  'make',
  'using',
  'used',
  'uses',
  'users',
  'people',
  'team',
  'teams',
  'product',
  'platform',
  'solution',
  'solutions',
  'company',
  'business',
]);

const JARGON_TERMS = new Set([
  'api',
  'apis',
  'sdk',
  'sdks',
  'blockchain',
  'protocol',
  'protocols',
  'infrastructure',
  'orchestration',
  'middleware',
  'kubernetes',
  'microservice',
  'microservices',
  'latency',
  'throughput',
  'scalability',
  'decentralized',
  'cryptographic',
  'zero-knowledge',
  'zk',
  'llm',
  'llms',
  'embeddings',
  'inference',
  'tokenization',
  'saas',
  'b2b',
  'b2c',
  'devops',
  'cicd',
  'graphql',
  'protobuf',
  'websocket',
  'websockets',
]);
