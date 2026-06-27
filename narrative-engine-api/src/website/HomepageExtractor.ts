import * as cheerio from 'cheerio';
import { isIP } from 'net';

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

export interface WebsiteExtractResult {
  fetch_status: 'success' | 'timeout' | 'blocked' | 'invalid';
  http_status?: number;
  duration_ms: number;
  extracted: Record<string, unknown>;
  mismatch_flags: Record<string, unknown>;
}

export async function extractHomepage(url: string, formAudience?: string): Promise<WebsiteExtractResult> {
  const start = Date.now();
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { fetch_status: 'invalid', duration_ms: Date.now() - start, extracted: {}, mismatch_flags: {} };
    }
    if (BLOCKED_HOSTS.includes(parsed.hostname) || isPrivateHost(parsed.hostname)) {
      return { fetch_status: 'blocked', duration_ms: Date.now() - start, extracted: {}, mismatch_flags: {} };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'MBL-NarrativeEngine/1.0' } });
    clearTimeout(timeout);

    const html = await res.text();
    const $ = cheerio.load(html);
    const h1 = $('h1').first().text().trim();
    const h2 = $('h2')
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 5);
    const extracted = {
      title: $('title').text().trim(),
      meta_description: $('meta[name="description"]').attr('content') ?? '',
      h1,
      h2,
      cta: $('a.button, button').first().text().trim(),
      og_tags: {
        title: $('meta[property="og:title"]').attr('content'),
        description: $('meta[property="og:description"]').attr('content'),
      },
    };

    const mismatch_flags: Record<string, unknown> = {};
    if (formAudience && extracted.meta_description.toLowerCase().includes('everyone')) {
      mismatch_flags.audience_mismatch = { form: formAudience, site: 'everyone' };
    }

    return {
      fetch_status: 'success',
      http_status: res.status,
      duration_ms: Date.now() - start,
      extracted,
      mismatch_flags,
    };
  } catch {
    return { fetch_status: 'timeout', duration_ms: Date.now() - start, extracted: {}, mismatch_flags: {} };
  }
}

function isPrivateHost(host: string): boolean {
  if (isIP(host)) {
    return host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('127.') || host === '::1';
  }
  return false;
}
