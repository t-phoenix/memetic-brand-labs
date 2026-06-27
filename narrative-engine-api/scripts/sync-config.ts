#!/usr/bin/env tsx
/**
 * Push canonical config/narrative-engine/ to Supabase.
 *
 * Run: npm run config:sync
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadNarrativeConfig, resetNarrativeConfigCache } from '../src/config/narrativeConfig.js';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(API_ROOT, '.env') });

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.startsWith('http') || !key) {
    console.error('Set SUPABASE_URL (https://...) and SUPABASE_SERVICE_ROLE_KEY in narrative-engine-api/.env');
    process.exit(1);
  }

  resetNarrativeConfigCache();
  const { meta, enums, prompts, schemas, resolved } = loadNarrativeConfig();
  const db = createClient(url, key);

  console.log(`Syncing narrative config v${meta.version}…`);

  for (const [enumKey, values] of Object.entries(enums)) {
    const payload = values.map((v) => ({ key: v.key, label: v.label, active: true }));
    const { error } = await db.from('enum_definitions').upsert(
      { enum_key: enumKey, values: payload, engine_scope: ['narrative'] },
      { onConflict: 'enum_key' },
    );
    if (error) throw new Error(`enum_definitions.${enumKey}: ${error.message}`);
    console.log('  ✓ enum', enumKey);
  }

  for (const [schemaKey, jsonSchema] of Object.entries(schemas)) {
    const { error } = await db.from('schema_registry').upsert(
      { schema_key: schemaKey, json_schema: jsonSchema, compatible_engines: ['narrative'] },
      { onConflict: 'schema_key' },
    );
    if (error) throw new Error(`schema_registry.${schemaKey}: ${error.message}`);
    console.log('  ✓ schema', schemaKey);
  }

  for (const layerKey of Object.keys(prompts)) {
    const layer = prompts[layerKey as keyof typeof prompts];
    const resolvedPrompt = resolved[layerKey as keyof typeof resolved];

    // Deactivate other versions for this layer
    await db
      .from('prompt_templates')
      .update({ is_active: false })
      .eq('engine_type', meta.engine_type)
      .eq('layer_key', layer.layer_key)
      .neq('version', layer.version);

    const { error } = await db.from('prompt_templates').upsert(
      {
        engine_type: meta.engine_type,
        layer_key: layer.layer_key,
        version: layer.version,
        system_prompt: resolvedPrompt.system_prompt,
        user_prompt_template: resolvedPrompt.user_prompt_template,
        variables: [],
        output_schema_ref: layer.output_schema_ref,
        is_active: true,
      },
      { onConflict: 'engine_type,layer_key,version' },
    );
    if (error) throw new Error(`prompt_templates.${layer.layer_key}: ${error.message}`);
    console.log('  ✓ prompt', layer.layer_key, layer.version);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
