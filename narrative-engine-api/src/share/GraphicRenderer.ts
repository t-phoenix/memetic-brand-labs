import type { Env } from '../config/env.js';
import { getSupabase } from '../db/client.js';

export class GraphicRenderer {
  constructor(private readonly env: Env) {}

  async render(
    cards: Array<{ card_key: string; card_label: string; content: string; card_meta: Record<string, unknown> }>,
    title: string,
  ): Promise<Buffer> {
    const sorted = [...cards].sort(
      (a, b) => Number((a.card_meta as { order?: number }).order ?? 0) - Number((b.card_meta as { order?: number }).order ?? 0),
    );

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#231d16"/>
  <text x="40" y="50" fill="#efc960" font-family="Arial, sans-serif" font-size="28" font-weight="bold">Memetic Brand Labs — Narrative Engine</text>
  <text x="40" y="85" fill="#ffffff" font-family="Arial, sans-serif" font-size="18">${escapeXml(title.slice(0, 80))}</text>
  ${sorted
    .map((c, i) => {
      const y = 130 + i * 115;
      const color = cardColor(String((c.card_meta as { color?: string }).color ?? ''));
      return `<rect x="40" y="${y}" width="1120" height="100" rx="8" fill="${color}" opacity="0.15"/>
  <text x="56" y="${y + 28}" fill="${color}" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${escapeXml(c.card_label)}</text>
  <text x="56" y="${y + 58}" fill="#ffffff" font-family="Arial, sans-serif" font-size="16">${escapeXml(c.content.slice(0, 120))}</text>`;
    })
    .join('\n')}
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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cardColor(name: string): string {
  const map: Record<string, string> = {
    green: '#4ade80',
    yellow: '#efc960',
    brown: '#c4a574',
    red: '#d8474d',
  };
  return map[name] ?? '#8e4ed5';
}
