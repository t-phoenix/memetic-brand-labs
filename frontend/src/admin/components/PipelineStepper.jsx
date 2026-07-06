import { humanizeLayerKey } from '../lib/humanize.js';

const ORDER = [
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
];

export default function PipelineStepper({ layers = [], currentStage }) {
  const byKey = Object.fromEntries((layers ?? []).map((l) => [l.layer_key, l]));

  return (
    <div className="admin-pipeline-stepper">
      {ORDER.map((key) => {
        const layer = byKey[key];
        let state = 'pending';
        if (layer?.status === 'completed') state = 'done';
        else if (layer?.status === 'failed') state = 'failed';
        else if (currentStage === key || layer?.status === 'running') state = 'active';
        return (
          <div key={key} className={`admin-pipeline-step admin-pipeline-step--${state}`}>
            <div>{humanizeLayerKey(key)}</div>
            {layer?.duration_ms != null && (
              <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 4 }}>
                {(layer.duration_ms / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
