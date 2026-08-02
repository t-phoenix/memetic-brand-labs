#!/usr/bin/env tsx
/**
 * Re-render stored share graphics using the current GraphicRenderer (4-card grid).
 *
 * Run:
 *   npm run regenerate:share-graphics -- --dry-run
 *   npm run regenerate:share-graphics
 */
import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../src/config/env.js';
import { GraphicRenderer } from '../src/share/GraphicRenderer.js';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(API_ROOT, '.env') });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = loadEnv();
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const renderer = new GraphicRenderer(env);

  const { data: shares, error } = await db
    .from('share_assets')
    .select('share_id, run_id, og_image_path, og_title')
    .not('og_image_path', 'is', null);

  if (error) {
    console.error('Failed to load share assets:', error.message);
    process.exit(1);
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Found ${shares?.length ?? 0} share graphic(s) to regenerate.`);

  for (const share of shares ?? []) {
    const { data: cards } = await db
      .from('run_outputs')
      .select('card_key, card_label, content, card_meta')
      .eq('run_id', share.run_id);

    if (!cards?.length) {
      console.warn(`  skip ${share.share_id} — no run_outputs`);
      continue;
    }

    const title = share.og_title ?? 'Narrative Engine results';
    console.log(`  ${dryRun ? 'would regenerate' : 'regenerating'} ${share.share_id} (${cards.length} cards)`);

    if (dryRun) continue;

    const png = await renderer.render(cards, title);
    await renderer.upload(share.og_image_path as string, png);
    await db
      .from('share_assets')
      .update({ graphic_generated_at: new Date().toISOString() })
      .eq('share_id', share.share_id);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
