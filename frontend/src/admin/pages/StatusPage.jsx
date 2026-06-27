import { useEffect, useState } from 'react';
import { adminFetch, getAdminKey } from '../lib/adminApi';
import ServiceCard from '../components/ServiceCard';
import { formatDate } from '../lib/formatters';

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/v1/admin/health');
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) return <div className="admin-loading">Checking services…</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <>
      <header className="admin-page__header">
        <h1 className="admin-page__title">Service status</h1>
        <p className="admin-page__subtitle">
          Last checked {formatDate(data?.checked_at)}
          {' · '}
          <button type="button" className="admin-btn" onClick={load}>Refresh</button>
        </p>
      </header>

      <div className="admin-grid admin-grid--4">
        <ServiceCard name="API" status={data?.api?.status}>
          v{data?.api?.version}
        </ServiceCard>
        <ServiceCard name="Supabase" status={data?.supabase?.status}>
          {data?.supabase?.latency_ms != null && `${data.supabase.latency_ms}ms`}
          {data?.supabase?.error && ` — ${data.supabase.error}`}
        </ServiceCard>
        <ServiceCard name="Redis" status={data?.redis?.status}>
          mode: {data?.redis?.mode}
          {data?.redis?.latency_ms != null && ` · ${data.redis.latency_ms}ms`}
        </ServiceCard>
        <ServiceCard name="Storage" status={data?.storage?.status}>
          bucket: {data?.storage?.bucket}
        </ServiceCard>
        <ServiceCard name="Worker" status={data?.worker?.status}>
          {data?.worker?.mode} · {data?.worker?.recent_completions_10m} completions (10m)
          {data?.worker?.stuck_runs > 0 && ` · ${data.worker.stuck_runs} stuck`}
        </ServiceCard>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 className="admin-page__title" style={{ fontSize: '1.1rem' }}>Recent pipeline events</h2>
        <div className="admin-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_events ?? []).map((ev) => (
                <tr key={`${ev.run_id}-${ev.created_at}-${ev.event_type}`}>
                  <td>{formatDate(ev.created_at)}</td>
                  <td>{ev.event_type}</td>
                  <td>
                    <a href={`/admin/runs/${ev.run_id}`}>{ev.run_id?.slice(0, 8)}…</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
