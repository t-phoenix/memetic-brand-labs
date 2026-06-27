import { formatDate } from '../lib/formatters';

export default function EventTimeline({ events }) {
  if (!events?.length) {
    return <p className="admin-card__meta">No events recorded.</p>;
  }

  return (
    <ul className="admin-timeline">
      {events.map((ev) => (
        <li key={ev.id ?? `${ev.created_at}-${ev.event_type}`} className="admin-timeline__item">
          <span className="admin-timeline__time">{formatDate(ev.created_at)}</span>
          <div>
            <span className="admin-timeline__type">{ev.event_type}</span>
            {ev.payload && Object.keys(ev.payload).length > 0 && (
              <pre className="admin-json" style={{ marginTop: '0.5rem', maxHeight: '120px' }}>
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
