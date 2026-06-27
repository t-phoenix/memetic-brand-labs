import { readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { LayerKey } from '../types/index.js';

const CONFIG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../config/narrative-engine');

export interface NarrativeMeta {
  version: string;
  engine_type: string;
  master_role: string;
  quality_bar: string;
  principles: string[];
}

export interface PromptLayerConfig {
  layer_key: LayerKey;
  version: string;
  output_schema_ref: string;
  system_addon: string;
  user_prompt_template: string;
  enum_fields?: string[];
}

export interface ResolvedPrompt {
  layer_key: LayerKey;
  version: string;
  system_prompt: string;
  user_prompt_template: string;
  output_schema_ref: string;
}

type EnumMap = Record<string, Array<{ key: string; label: string }>>;

let cached: {
  meta: NarrativeMeta;
  enums: EnumMap;
  prompts: Record<LayerKey, PromptLayerConfig>;
  schemas: Record<string, object>;
  resolved: Record<LayerKey, ResolvedPrompt>;
} | null = null;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function formatEnumConstraints(enums: EnumMap, fields: string[]): string {
  const lines = fields.map((field) => {
    const values = enums[field]?.map((e) => e.key).join(' | ') ?? '';
    return `- ${field}: ${values}`;
  });
  return `\nAllowed enum keys:\n${lines.join('\n')}`;
}

function composeSystemPrompt(meta: NarrativeMeta, layer: PromptLayerConfig, enums: EnumMap): string {
  const principles = meta.principles.map((p) => `- ${p}`).join('\n');
  let prompt = `${meta.master_role}

Quality bar: ${meta.quality_bar}

Principles:
${principles}

${layer.system_addon}

Output JSON only. No markdown.`;

  if (layer.enum_fields?.length) {
    prompt += formatEnumConstraints(enums, layer.enum_fields);
  }

  return prompt;
}

export function loadNarrativeConfig() {
  if (cached) return cached;

  const meta = readJson<NarrativeMeta>(join(CONFIG_ROOT, 'meta.json'));
  const enums = readJson<EnumMap>(join(CONFIG_ROOT, 'enums.json'));
  const prompts = readJson<Record<LayerKey, PromptLayerConfig>>(join(CONFIG_ROOT, 'prompts.json'));

  const schemasDir = join(CONFIG_ROOT, 'schemas');
  const schemas: Record<string, object> = {};
  for (const file of readdirSync(schemasDir).filter((f) => f.endsWith('.json'))) {
    const schema = readJson<object>(join(schemasDir, file));
    schemas[file.replace('.json', '')] = schema;
  }

  const resolved = {} as Record<LayerKey, ResolvedPrompt>;
  for (const layerKey of Object.keys(prompts) as LayerKey[]) {
    const layer = prompts[layerKey];
    resolved[layerKey] = {
      layer_key: layerKey,
      version: layer.version,
      system_prompt: composeSystemPrompt(meta, layer, enums),
      user_prompt_template: layer.user_prompt_template,
      output_schema_ref: layer.output_schema_ref,
    };
  }

  cached = { meta, enums, prompts, schemas, resolved };
  return cached;
}

/** Clear cache (for tests). */
export function resetNarrativeConfigCache() {
  cached = null;
}

export function getPromptForLayer(layerKey: LayerKey): ResolvedPrompt {
  return loadNarrativeConfig().resolved[layerKey];
}

export function getSchema(schemaKey: string): object | undefined {
  return loadNarrativeConfig().schemas[schemaKey];
}

export function getSchemaForLayer(layerKey: LayerKey): object {
  const ref = loadNarrativeConfig().prompts[layerKey].output_schema_ref;
  return loadNarrativeConfig().schemas[ref] ?? {};
}

export function getConfigRoot(): string {
  return CONFIG_ROOT;
}

export function configFilesExist(): boolean {
  return (
    existsSync(join(CONFIG_ROOT, 'meta.json')) &&
    existsSync(join(CONFIG_ROOT, 'prompts.json')) &&
    existsSync(join(CONFIG_ROOT, 'enums.json'))
  );
}

/** JSON Schema subset for LLM prompts — omits meta keys that models sometimes echo back. */
export function schemaForPrompt(schema: object): object {
  const s = { ...(schema as Record<string, unknown>) };
  delete s.$schema;
  return {
    type: s.type,
    required: s.required,
    properties: s.properties,
  };
}

export function formatSchemaInstruction(schema: object): string {
  return `Return a JSON object with your analysis values only — NOT the JSON Schema definition.

Required shape:
${JSON.stringify(schemaForPrompt(schema), null, 2)}`;
}
export function getDefaultPrompts(): Record<
  LayerKey,
  { system_prompt: string; user_prompt_template: string; output_schema_ref: string }
> {
  const { resolved } = loadNarrativeConfig();
  return Object.fromEntries(
    Object.entries(resolved).map(([k, v]) => [
      k,
      {
        system_prompt: v.system_prompt,
        user_prompt_template: v.user_prompt_template,
        output_schema_ref: v.output_schema_ref,
      },
    ]),
  ) as Record<LayerKey, { system_prompt: string; user_prompt_template: string; output_schema_ref: string }>;
}

/** @deprecated Use getSchemaForLayer */
export function getDefaultLayerSchemas(): Record<LayerKey, object> {
  const { prompts, schemas } = loadNarrativeConfig();
  return Object.fromEntries(
    Object.entries(prompts).map(([k, p]) => [k, schemas[p.output_schema_ref] ?? {}]),
  ) as Record<LayerKey, object>;
}
