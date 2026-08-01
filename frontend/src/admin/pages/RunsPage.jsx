import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRuns } from '../lib/adminApi';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatUsd, humanizeTier, formatRelativeTime } from '../lib/humanize.js';

const PAGE_SIZE = 25;

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('');
  const [runSource, setRunSource] = useState('user');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRuns({
      limit: PAGE_SIZE,
      offset,
      status: status || undefined,
      q: search || undefined,
      run_source: runSource,
    })
      .then((res) => {
        setRuns(res.runs ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [offset, status, search, runSource]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    setSearch(q);
    setLoading(true);
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Runs"
        subtitle={`${total} analyses — browse, inspect pipeline steps, and open in Playground.`}
      />

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <input
          className="admin-input"
          placeholder="Search brand, audience, or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); setLoading(true); }}>
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
        </select>
        <select className="admin-select" value={runSource} onChange={(e) => { setRunSource(e.target.value); setOffset(0); setLoading(true); }}>
          <option value="user">User runs only</option>
          <option value="admin_test">Test runs</option>
          <option value="all">All sources</option>
        </select>
        <button type="submit" className="admin-btn admin-btn--primary">Search</button>
      </form>

      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <div className="admin-skeleton" style={{ minHeight: 200 }} />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Brand</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Unlock</th>
                  <th>Tier</th>
                  <th>Pipeline</th>
                  <th>Cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td title={run.created_at}>{formatRelativeTime(run.created_at)}</td>
                    <td>{run.building ?? '—'}</td>
                    <td>{run.contact_email ?? '—'}</td>
                    <td><StatusBadge status={run.status} currentStage={run.current_stage} /></td>
                    <td>{run.unlock_method ?? '—'}</td>
                    <td>{humanizeTier(run.model_tier)}</td>
                    <td>{run.layers_complete ?? 0}/{run.layers_total ?? 6}</td>
                    <td>{run.total_llm_cost_usd != null ? formatUsd(run.total_llm_cost_usd) : '—'}</td>
                    <td>
                      <Link to={`/admin/runs/${run.id}`}>View pipeline →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button type="button" className="admin-btn" disabled={offset === 0} onClick={() => { setLoading(true); setOffset(Math.max(0, offset - PAGE_SIZE)); }}>
              Previous
            </button>
            <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
            <button type="button" className="admin-btn" disabled={offset + PAGE_SIZE >= total} onClick={() => { setLoading(true); setOffset(offset + PAGE_SIZE); }}>
              Next
            </button>
          </div>
        </>
      )}
    </>
  );
}
