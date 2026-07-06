import { LAYER_KEYS, STAGE_PROGRESS, type LayerKey } from '../types/index.js';
import { layerLabel, summarizeLayerOutput } from './layerSummary.js';

export interface PipelineLayerDto {
  layer_key: LayerKey;
  label: string;
  status: string;
  duration_ms: number | null;
  model: string | null;
  attempt_number: number | null;
  summary_plain: string;
  structured: Record<string, unknown> | null;
  raw: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
}

export function buildPipelineLayers(params: {
  executions: Array<{
    layer_key: string;
    status: string;
    duration_ms: number | null;
    model: string | null;
    attempt_number: number;
    started_at: string;
    completed_at: string | null;
  }>;
  outputs: Array<{ layer_key: string; output: Record<string, unknown> }>;
}): PipelineLayerDto[] {
  const execByLayer = new Map<string, (typeof params.executions)[0]>();
  for (const e of params.executions) {
    const prev = execByLayer.get(e.layer_key);
    if (!prev || e.attempt_number > prev.attempt_number) execByLayer.set(e.layer_key, e);
  }

  const outputByLayer = new Map<string, Record<string, unknown>>();
  for (const o of params.outputs) {
    outputByLayer.set(o.layer_key, o.output);
  }

  return LAYER_KEYS.map((key) => {
    const exec = execByLayer.get(key);
    const raw = outputByLayer.get(key) ?? null;
    let status = 'pending';
    if (exec) {
      status = exec.status === 'completed' ? 'completed' : exec.status;
    }
    return {
      layer_key: key,
      label: layerLabel(key),
      status,
      duration_ms: exec?.duration_ms ?? null,
      model: exec?.model ?? null,
      attempt_number: exec?.attempt_number ?? null,
      summary_plain: summarizeLayerOutput(key, raw),
      structured: raw,
      raw,
      started_at: exec?.started_at ?? null,
      completed_at: exec?.completed_at ?? null,
    };
  });
}

export function buildStages(
  stages: Array<{
    stage_key: string;
    status: string;
    progress_pct: number | null;
    duration_ms: number | null;
    entered_at: string;
    exited_at: string | null;
  }>,
) {
  return LAYER_KEYS.map((key) => {
    const rows = stages.filter((s) => s.stage_key === key);
    const latest = rows[rows.length - 1];
    const meta = STAGE_PROGRESS[key];
    return {
      stage_key: key,
      label: meta?.label ?? layerLabel(key),
      progress_pct: meta?.pct ?? null,
      status: latest?.status ?? 'pending',
      duration_ms: latest?.duration_ms ?? null,
      entered_at: latest?.entered_at ?? null,
      exited_at: latest?.exited_at ?? null,
    };
  });
}
