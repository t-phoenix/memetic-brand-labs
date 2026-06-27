import type { LayerKey } from '../types/index.js';
import { getDefaultLayerSchemas, getDefaultPrompts } from '../config/narrativeConfig.js';

/** Re-exported from canonical config/narrative-engine/ JSON files */
export const DEFAULT_PROMPTS = getDefaultPrompts();
export const DEFAULT_LAYER_SCHEMAS = getDefaultLayerSchemas();

export type { LayerKey };
