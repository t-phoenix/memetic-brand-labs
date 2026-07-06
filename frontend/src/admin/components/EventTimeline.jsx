import { formatDate, formatRelative } from '../lib/formatters';
import { humanizeEventType } from '../lib/humanize';
import JsonToggle from './JsonToggle.jsx';

export default function EventTimeline({ events }) {
  if (!events?.length) {
    return <p className="admin-card__meta">No events recorded for this run yet.</p>;
  }

  return (
    <ul className="admin-timeline">
      {events.map((ev) => (
        <li key={ev.id ?? `${ev.created_at}-${ev.event_type}`} className="admin-timeline__item">
          <span className="admin-timeline__time" title={formatDate(ev.created_at)}>
            {formatRelative(ev.created_at)}
          </span>
          <div>
            <span className="admin-timeline__type">{humanizeEventType(ev.event_type, ev.payload)}</span>
            <JsonToggle data={ev.payload} label="Show event details" />
          </div>
        </li>
      ))}
    </ul>
  );
}
