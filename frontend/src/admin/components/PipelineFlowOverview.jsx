import { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { FieldCardGrid } from './FieldCard.jsx';
import { buildPipelineFlow } from '../lib/runDataPresenters.js';
import { humanizeLayerKey } from '../lib/humanize.js';

const LAYER_ORDER = [
  'interpretation',
  'diagnostics',
  'translation',
  'positioning',
  'memetic_analysis',
  'output_generation',
];

function FlowStepper({ layers = [], currentStage }) {
  const byKey = Object.fromEntries((layers ?? []).map((l) => [l.layer_key, l]));

  return (
    <div className="admin-flow-stepper">
      {LAYER_ORDER.map((key, index) => {
        const layer = byKey[key];
        let state = 'pending';
        if (layer?.status === 'completed') state = 'done';
        else if (layer?.status === 'failed') state = 'failed';
        else if (currentStage === key || layer?.status === 'running') state = 'active';

        return (
          <div key={key} className={`admin-flow-stepper__step admin-flow-stepper__step--${state}`}>
            <span className="admin-flow-stepper__num">{index + 1}</span>
            <span className="admin-flow-stepper__label">{humanizeLayerKey(key)}</span>
          </div>
        );
      })}
    </div>
  );
}

function PhaseConnector() {
  return (
    <div className="admin-flow-connector" aria-hidden="true">
      <div className="admin-flow-connector__line" />
      <div className="admin-flow-connector__arrow">↓</div>
    </div>
  );
}

function OutputCardsRow({ cards = [] }) {
  if (!cards.length) return <p className="admin-data-empty">No output cards yet.</p>;

  return (
    <div className="admin-flow-output-cards">
      {cards.map((card) => (
        <article key={card.key} className={`admin-field-card admin-field-card--${card.color} admin-field-card--output`}>
          <div className="admin-field-card__label">{card.label}</div>
          <div className="admin-field-card__value">{card.value}</div>
        </article>
      ))}
    </div>
  );
}

function PipelinePhase({ phase, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody =
    (phase.fields?.length ?? 0) > 0 ||
    (phase.outputCards?.length ?? 0) > 0 ||
    (phase.validationErrors?.length ?? 0) > 0 ||
    Boolean(phase.summary && phase.type === 'layer');

  return (
    <div className={`admin-flow-phase admin-flow-phase--${phase.status} admin-flow-phase--tone-${phase.color}`}>
      <button
        type="button"
        className="admin-flow-phase__head"
        onClick={() => hasBody && setOpen(!open)}
        disabled={!hasBody}
      >
        <div className="admin-flow-phase__step-badge">
          {phase.stepIndex != null ? `L${phase.stepIndex}` : phase.type === 'input' ? 'IN' : phase.type === 'output' ? 'OUT' : '·'}
        </div>
        <div className="admin-flow-phase__main">
          <div className="admin-flow-phase__title-row">
            <span className="admin-flow-phase__title">{phase.label}</span>
            <StatusBadge status={phase.status === 'active' ? 'running' : phase.status} />
          </div>
          {phase.description && <div className="admin-flow-phase__desc">{phase.description}</div>}
          {phase.summary && phase.type === 'layer' && !open && (
            <div className="admin-flow-phase__summary">{phase.summary}</div>
          )}
          {phase.metaBadges?.length > 0 && (
            <div className="admin-flow-phase__badges">
              {phase.metaBadges.map((b) => (
                <span key={b.label} className="admin-data-badge">{b.label}: {b.value}</span>
              ))}
            </div>
          )}
        </div>
        {hasBody && <span className="admin-flow-phase__chevron">{open ? '▾' : '▸'}</span>}
      </button>

      {open && hasBody && (
        <div className="admin-flow-phase__body">
          {phase.summary && phase.type === 'layer' && (
            <div className="admin-flow-phase__summary admin-flow-phase__summary--open">{phase.summary}</div>
          )}

          {phase.outputCards?.length > 0 && <OutputCardsRow cards={phase.outputCards} />}

          {phase.fields?.length > 0 && phase.layout === 'compare' && (
            <div className="admin-compare-row">
              {phase.fields.map((field) => (
                <article key={field.key} className={`admin-field-card admin-field-card--${field.color ?? phase.color} admin-field-card--compare`}>
                  <div className="admin-field-card__label">{field.label}</div>
                  <div className="admin-field-card__value">{field.value}</div>
                </article>
              ))}
            </div>
          )}

          {phase.fields?.length > 0 && phase.layout !== 'compare' && (
            <FieldCardGrid fields={phase.fields} phaseColor={phase.color} columns={phase.type === 'metadata' ? 3 : 2} />
          )}

          {phase.validationErrors?.length > 0 && (
            <div className="admin-legacy-layer__errors">
              {phase.validationErrors.map((err, i) => (
                <div key={i} className="admin-legacy-layer__error">
                  {typeof err === 'string' ? err : String(err.message ?? err)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PipelineFlowOverview({ run, inputs, pipeline, costSummary, runDetail, enrichedLayers = [] }) {
  const flow = buildPipelineFlow({ run, inputs, pipeline, costSummary, runDetail });

  return (
    <div className="admin-flow-overview">
      <div className="admin-flow-overview__header">
        <h3 className="admin-flow-overview__title">Pipeline</h3>
        <p className="admin-flow-overview__subtitle">
          Inputs → preprocessing → 6 LLM layers → final cards → metadata
        </p>
      </div>

      <FlowStepper layers={enrichedLayers} currentStage={run?.current_stage} />

      <div className="admin-flow-track">
        {flow.phases.map((phase, index) => (
          <div key={phase.id} className="admin-flow-track__segment">
            <PipelinePhase
              phase={phase}
              defaultOpen={
                phase.type === 'input' ||
                phase.id === 'website' ||
                (phase.type === 'layer' && phase.status === 'completed')
              }
            />
            {index < flow.phases.length - 1 && <PhaseConnector />}
          </div>
        ))}
      </div>
    </div>
  );
}
