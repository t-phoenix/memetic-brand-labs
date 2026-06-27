import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminApi';
import { formatUsd } from '../lib/formatters';

export default function CostsPage() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch(`/v1/admin/stats?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [days]);

  if (error) return <div className="admin-error">{error}</div>;
  if (!data) return <div className="admin-loading">Loading costs…</div>;

  const exportCsv = () => {
    const rows = [['day', 'runs', 'cogs_usd', 'revenue_usdc']];
    for (const d of data.by_day ?? []) {
      rows.push([d.day, d.runs, d.cogs_usd, d.revenue_usdc]);
    }
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ne-costs-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <header className="admin-page__header">
        <h1 className="admin-page__title">Costs & revenue</h1>
        <div className="admin-toolbar">
          <select className="admin-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button type="button" className="admin-btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </header>

      <div className="admin-grid admin-grid--4">
        <div className="admin-card">
          <div className="admin-card__label">Total LLM spend</div>
          <div className="admin-card__value">{formatUsd(data.costs?.total_llm_usd)}</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Avg per completed run</div>
          <div className="admin-card__value">{formatUsd(data.costs?.avg_per_run_usd)}</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Revenue (USDC)</div>
          <div className="admin-card__value">{formatUsd(data.costs?.revenue_usdc)}</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Margin (approx)</div>
          <div className="admin-card__value">
            {formatUsd((data.costs?.revenue_usdc ?? 0) - (data.costs?.total_llm_usd ?? 0))}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card__label">Model tier breakdown</div>
        <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Runs</th>
                <th>Avg duration</th>
                <th>Avg COGS</th>
                <th>Completion rate</th>
              </tr>
            </thead>
            <tbody>
              {(data.by_tier ?? []).map((t) => (
                <tr key={t.model_tier}>
                  <td>{t.model_tier}</td>
                  <td>{t.runs}</td>
                  <td>{t.avg_duration_ms ? `${Math.round(t.avg_duration_ms / 1000)}s` : '—'}</td>
                  <td>{formatUsd(t.avg_cogs_usd)}</td>
                  <td>{((t.completion_rate ?? 0) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card__label">Daily COGS vs revenue</div>
        <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Runs</th>
                <th>COGS</th>
                <th>Revenue</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {(data.by_day ?? []).map((d) => (
                <tr key={d.day}>
                  <td>{new Date(d.day).toLocaleDateString()}</td>
                  <td>{d.runs}</td>
                  <td>{formatUsd(d.cogs_usd)}</td>
                  <td>{formatUsd(d.revenue_usdc)}</td>
                  <td>{formatUsd(d.revenue_usdc - d.cogs_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
