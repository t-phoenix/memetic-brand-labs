import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch } from '../lib/adminApi';
import RunStatusBadge from '../components/RunStatusBadge';
import { formatDate, formatDuration, formatUsd, truncateId } from '../lib/formatters';

const PAGE_SIZE = 25;

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (status) params.set('status', status);
    if (search) params.set('q', search);

    adminFetch(`/v1/admin/runs?${params}`)
      .then((res) => {
        setRuns(res.runs ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [offset, status, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    setSearch(q);
  };

  return (
    <>
      <header className="admin-page__header">
        <h1 className="admin-page__title">Runs</h1>
        <p className="admin-page__subtitle">{total} total runs</p>
      </header>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <input
          className="admin-input"
          placeholder="Search building or audience…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>
        <button type="submit" className="admin-btn admin-btn--primary">Search</button>
      </form>

      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <div className="admin-loading">Loading runs…</div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Tier</th>
                  <th>Building</th>
                  <th>Created</th>
                  <th>Duration</th>
                  <th>COGS</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link to={`/admin/runs/${run.id}`}>{truncateId(run.id)}</Link>
                    </td>
                    <td><RunStatusBadge status={run.status} /></td>
                    <td>{run.model_tier}</td>
                    <td>{run.building ?? '—'}</td>
                    <td>{formatDate(run.created_at)}</td>
                    <td>{formatDuration(run.duration_ms)}</td>
                    <td>{run.total_llm_cost_usd != null ? formatUsd(run.total_llm_cost_usd) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </button>
            <span>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <button
              type="button"
              className="admin-btn"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
