import { formatDate, formatRelative } from '../lib/formatters';
import { humanizeEventType } from '../lib/humanize';
import { FieldCardGrid } from './FieldCard.jsx';

function payloadFields(payload) {
  if (!payload || typeof payload !== 'object') return [];
  return Object.entries(payload).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' '),
    value: typeof value === 'string' ? value : JSON.stringify(value),
    color: 'muted',
    compact: true,
  }));
}

export default function EventTimeline({ events }) {
  if (!events?.length) {
    return <p className="admin-card__meta">No events recorded for this run yet.</p>;
  }

  return (
    <ul className="admin-timeline">
      {events.map((ev) => {
        const fields = payloadFields(ev.payload);
        return (
          <li key={ev.id ?? `${ev.created_at}-${ev.event_type}`} className="admin-timeline__item">
            <span className="admin-timeline__time" title={formatDate(ev.created_at)}>
              {formatRelative(ev.created_at)}
            </span>
            <div>
              <span className="admin-timeline__type">{humanizeEventType(ev.event_type, ev.payload)}</span>
              {fields.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <FieldCardGrid fields={fields} columns={2} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
