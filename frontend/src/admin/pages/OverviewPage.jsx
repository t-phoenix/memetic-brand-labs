import { useEffect, useState } from 'react';
import { adminFetch } from '../lib/adminApi';
import KpiStat from '../components/KpiStat';
import { formatUsd } from '../lib/formatters';

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/v1/admin/stats?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div className="admin-loading">Loading metrics…</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <>
      <header className="admin-page__header">
        <h1 className="admin-page__title">Overview</h1>
        <div className="admin-toolbar">
          <select
            className="admin-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </header>

      <div className="admin-grid admin-grid--4">
        <KpiStat label="Total runs" value={data?.runs?.total ?? 0} />
        <KpiStat
          label="Completed"
          value={data?.runs?.completed ?? 0}
          meta={`${data?.runs?.failed ?? 0} failed · ${data?.runs?.pending ?? 0} in progress`}
        />
        <KpiStat label="LLM spend" value={formatUsd(data?.costs?.total_llm_usd)} meta={`avg ${formatUsd(data?.costs?.avg_per_run_usd)}/run`} />
        <KpiStat label="Revenue" value={formatUsd(data?.costs?.revenue_usdc)} />
        <KpiStat
          label="Tokens"
          value={(data?.tokens?.prompt ?? 0).toLocaleString()}
          meta={`${(data?.tokens?.completion ?? 0).toLocaleString()} completion`}
        />
      </div>

      <div className="admin-grid admin-grid--2" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card">
          <div className="admin-card__label">By model tier</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Runs</th>
                  <th>Avg COGS</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_tier ?? []).map((t) => (
                  <tr key={t.model_tier}>
                    <td>{t.model_tier}</td>
                    <td>{t.runs}</td>
                    <td>{formatUsd(t.avg_cogs_usd)}</td>
                    <td>{((t.completion_rate ?? 0) * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__label">Daily activity</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Runs</th>
                  <th>COGS</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_day ?? []).map((d) => (
                  <tr key={d.day}>
                    <td>{new Date(d.day).toLocaleDateString()}</td>
                    <td>{d.runs}</td>
                    <td>{formatUsd(d.cogs_usd)}</td>
                    <td>{formatUsd(d.revenue_usdc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
