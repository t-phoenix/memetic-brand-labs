import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getAnalyticsMessaging, listRuns } from '../lib/adminApi';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import KpiStat from '../components/KpiStat';
import CostLineChart from '../components/CostLineChart.jsx';
import MessagingProblemChart from '../components/MessagingProblemChart.jsx';
import HelpTooltip from '../components/HelpTooltip.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatUsd } from '../lib/humanize.js';
import { formatDate } from '../lib/formatters';

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [messaging, setMessaging] = useState(null);
  const [failures, setFailures] = useState([]);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats(days),
      getAnalyticsMessaging(),
      listRuns({ limit: 20, status: 'failed' }),
    ])
      .then(([stats, msg, failedRuns]) => {
        setData(stats);
        setMessaging(msg);
        setFailures(failedRuns.runs?.slice(0, 5) ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div className="admin-skeleton" style={{ minHeight: 120 }} />;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <>
      <AdminPageHeader
        eyebrow="Analytics"
        title="Overview"
        subtitle="How narrative runs are performing — costs, completion, and common messaging issues."
      >
        <div className="admin-toolbar">
          <select className="admin-select" value={days} onChange={(e) => { setDays(Number(e.target.value)); setLoading(true); }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </AdminPageHeader>

      <div className="admin-grid admin-grid--4">
        <KpiStat label="Total runs" value={data?.runs?.total ?? 0} />
        <KpiStat
          label="Completion rate (7d)"
          value={`${Math.round((data?.rates?.completion_rate_7d ?? 0) * 100)}%`}
          meta={`${Math.round((data?.rates?.failure_rate_7d ?? 0) * 100)}% failed`}
        />
        <KpiStat
          label="LLM spend"
          value={formatUsd(data?.costs?.total_llm_usd)}
          meta={
            <>
              avg {formatUsd(data?.costs?.avg_per_run_usd)}/run
              <HelpTooltip text="From API token usage × pricing table" />
            </>
          }
        />
        <KpiStat label="Revenue" value={formatUsd(data?.costs?.revenue_usdc)} meta="From confirmed USDC payments" />
      </div>

      <div className="admin-grid admin-grid--2" style={{ marginTop: '1.5rem' }}>
        <div>
          <div className="admin-card__label" style={{ marginBottom: '0.5rem' }}>Daily cost trend</div>
          <CostLineChart data={data?.by_day ?? []} showRevenue />
        </div>
        <div>
          <div className="admin-card__label" style={{ marginBottom: '0.5rem' }}>
            Top messaging problems
            <Link to="/admin/insights" style={{ marginLeft: 8, fontSize: '0.8rem' }}>See all →</Link>
          </div>
          <MessagingProblemChart items={messaging?.items ?? []} limit={6} />
        </div>
      </div>

      {failures.length > 0 && (
        <div className="admin-card" style={{ marginTop: '1.5rem' }}>
          <div className="admin-card__label">Recent failures</div>
          <div className="admin-table-wrap" style={{ marginTop: '0.75rem', border: 'none', boxShadow: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Brand</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {failures.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{r.building ?? '—'}</td>
                    <td><StatusBadge status={r.status} currentStage={r.current_stage} /></td>
                    <td><Link to={`/admin/runs/${r.id}`}>View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
