import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';
import { BRAND, renderBrandFooter, renderBrandHeader } from './brandAssets.js';

/** Matches frontend `resultCardStyles.js` + `index.css` brand tokens. */
const CARD_THEMES = [
  { name: 'coral', background: '#f2ddb6', border: '#d9595e', text: '#d9595e' },
  { name: 'purple', background: '#7979e3', border: '#f2ddb6', text: '#f2ddb6' },
  { name: 'magenta', background: '#c24a8c', border: '#f2ddb6', text: '#f2ddb6' },
  { name: 'blue', background: '#828de0', border: '#f2ddb6', text: '#f2ddb6' },
] as const;

const PAGE = {
  background: '#f2ddb6',
  padding: 48,
  gap: 24,
  cardWidth: 536,
  titleSize: 30,
  titleLine: 38,
  bodySize: 24,
  bodyLine: 34,
  cardPadX: 32,
  cardPadY: 28,
  titleGap: 18,
  border: 2,
  radius: 20,
  minCardHeight: 180,
} as const;

type ResultCard = {
  card_key: string;
  card_label: string;
  content: string;
  card_meta: Record<string, unknown>;
};

export class GraphicRenderer {
  constructor(private readonly env: Env) {}

  async render(cards: ResultCard[], _title: string): Promise<Buffer> {
    const sorted = [...cards].sort(
      (a, b) =>
        Number((a.card_meta as { order?: number }).order ?? 0) -
        Number((b.card_meta as { order?: number }).order ?? 0),
    );

    const slice = sorted.slice(0, 4);
    const layouts = slice.map((card, index) => layoutCard(card, index));
    const rowHeights = [
      Math.max(layouts[0]?.height ?? PAGE.minCardHeight, layouts[1]?.height ?? PAGE.minCardHeight),
      Math.max(layouts[2]?.height ?? PAGE.minCardHeight, layouts[3]?.height ?? PAGE.minCardHeight),
    ];

    const width = PAGE.padding * 2 + PAGE.cardWidth * 2 + PAGE.gap;
    const brandTop = PAGE.padding;
    const cardsTop = brandTop + BRAND.height + BRAND.gapBelow;
    const height =
      cardsTop + rowHeights[0] + PAGE.gap + rowHeights[1] + PAGE.padding + BRAND.footerHeight;

    const cardNodes = layouts
      .map((layout, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = PAGE.padding + col * (PAGE.cardWidth + PAGE.gap);
        const y = cardsTop + (row === 0 ? 0 : rowHeights[0] + PAGE.gap);
        return renderCardSvg(layout, x, y);
      })
      .join('\n');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${PAGE.background}"/>
  ${renderBrandHeader(width, brandTop)}
  ${cardNodes}
  ${renderBrandFooter(width, height)}
</svg>`;

    const sharp = await import('sharp');
    return sharp.default(Buffer.from(svg)).png().toBuffer();
  }

  async upload(path: string, buffer: Buffer) {
    const supabase = getSupabase(this.env);
    const { error } = await supabase.storage.from(this.env.STORAGE_BUCKET).upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });
    if (error) throw error;
  }

  async download(path: string): Promise<Buffer | null> {
    const supabase = getSupabase(this.env);
    const { data, error } = await supabase.storage.from(this.env.STORAGE_BUCKET).download(path);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
}

type CardLayout = {
  theme: (typeof CARD_THEMES)[number];
  label: string;
  titleLines: string[];
  bodyLines: string[];
  height: number;
};

function layoutCard(card: ResultCard, index: number): CardLayout {
  const theme = CARD_THEMES[index % CARD_THEMES.length]!;
  const innerWidth = PAGE.cardWidth - PAGE.cardPadX * 2 - PAGE.border * 2;
  const titleLines = wrapText(card.card_label, innerWidth, PAGE.titleSize);
  const bodyLines = wrapText(card.content, innerWidth, PAGE.bodySize);
  const titleHeight = titleLines.length * PAGE.titleLine;
  const bodyHeight = bodyLines.length * PAGE.bodyLine;
  const height = Math.max(
    PAGE.minCardHeight,
    PAGE.cardPadY * 2 + PAGE.border * 2 + titleHeight + PAGE.titleGap + bodyHeight,
  );
  return { theme, label: card.card_label, titleLines, bodyLines, height };
}

function renderCardSvg(layout: CardLayout, x: number, y: number): string {
  const { theme, titleLines, bodyLines, height } = layout;
  const innerX = x + PAGE.border + PAGE.cardPadX;
  const titleY = y + PAGE.border + PAGE.cardPadY + PAGE.titleSize;

  const titleSpans = titleLines
    .map((line, i) => {
      const dy = i === 0 ? 0 : PAGE.titleLine;
      return `<tspan x="${innerX}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  const bodyStartY = titleY + (titleLines.length - 1) * PAGE.titleLine + PAGE.titleGap + PAGE.bodySize;
  const bodySpans = bodyLines
    .map((line, i) => {
      const dy = i === 0 ? 0 : PAGE.bodyLine;
      return `<tspan x="${innerX}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  return `<g>
  <rect x="${x}" y="${y}" width="${PAGE.cardWidth}" height="${height}" rx="${PAGE.radius}" fill="${theme.background}" stroke="${theme.border}" stroke-width="${PAGE.border}"/>
  <text x="${innerX}" y="${titleY}" fill="${theme.text}" font-family="Arial, Helvetica, sans-serif" font-size="${PAGE.titleSize}" font-weight="600">${titleSpans}</text>
  <text x="${innerX}" y="${bodyStartY}" fill="${theme.text}" font-family="Arial, Helvetica, sans-serif" font-size="${PAGE.bodySize}" font-weight="400">${bodySpans}</text>
</g>`;
}

/** Approximate word wrap for SVG text (matches frontend card column width). */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [''];

  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
  const lines: string[] = [];

  for (const paragraph of normalized.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }

    let current = words[0]!;
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines.length ? lines : [''];
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
