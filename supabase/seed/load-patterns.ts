#!/usr/bin/env tsx
/**
 * Load patterns from patterns.json into Supabase.
 *
 * Preferred: cd narrative-engine-api && npm run seed:patterns
 * (loads narrative-engine-api/.env automatically)
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    join(process.cwd(), '.env'),
    join(scriptDir, '../../narrative-engine-api/.env'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      return;
    }
  }
}

loadEnv();

const patterns = JSON.parse(readFileSync(join(scriptDir, 'patterns/patterns.json'), 'utf-8'));

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing env vars. Either:');
    console.error('  1. cd narrative-engine-api && npm run seed:patterns  (uses .env)');
    console.error('  2. export SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ...');
    console.error('SUPABASE_URL must be the API URL (https://...), not postgresql://');
    process.exit(1);
  }

  if (!url.startsWith('http')) {
    console.error('SUPABASE_URL must be https://your-project.supabase.co (not postgresql://)');
    process.exit(1);
  }

  const db = createClient(url, key);

  for (const p of patterns) {
    const { error } = await db.from('pattern_entries').upsert(
      {
        pattern_type: p.pattern_type,
        slug: p.slug,
        title: p.title,
        body: p.body,
        markets: p.markets,
        categories: p.categories ?? [],
        tags: p.tags,
        is_active: true,
      },
      { onConflict: 'slug' },
    );
    if (error) console.error(p.slug, error.message);
    else console.log('Loaded', p.slug);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
