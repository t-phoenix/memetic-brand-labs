import { useEffect, useState } from 'react';
import { getStats, getAnalyticsCogs } from '../lib/adminApi';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import CostLineChart from '../components/CostLineChart.jsx';
import TierPerformanceChart from '../components/TierPerformanceChart.jsx';
import ReportExportPanel from '../components/ReportExportPanel.jsx';
import HelpTooltip from '../components/HelpTooltip.jsx';
import { formatUsd } from '../lib/humanize.js';

export default function CostsPage() {
  const [data, setData] = useState(null);
  const [cogs, setCogs] = useState([]);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getStats(days), getAnalyticsCogs(days)])
      .then(([stats, cogsRes]) => {
        setData(stats);
        setCogs(cogsRes.items ?? []);
      })
      .catch((e) => setError(e.message));
  }, [days]);

  if (error) return <div className="admin-error">{error}</div>;
  if (!data) return <div className="admin-skeleton" style={{ minHeight: 120 }} />;

  const margin = (data.costs?.revenue_usdc ?? 0) - (data.costs?.total_llm_usd ?? 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Finance"
        title="Costs & revenue"
        subtitle="LLM spend from API token usage, compared to USDC payments received."
      >
        <div className="admin-toolbar">
          <select className="admin-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </AdminPageHeader>

      <div className="admin-grid admin-grid--4">
        <div className="admin-card admin-card--accent-purple">
          <div className="admin-card__label">
            Total LLM spend
            <HelpTooltip text="Sum of token usage × pricing table across user runs" />
          </div>
          <div className="admin-card__value">{formatUsd(data.costs?.total_llm_usd)}</div>
          <div className="admin-cost-note">From API token usage</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Avg per completed run</div>
          <div className="admin-card__value">{formatUsd(data.costs?.avg_per_run_usd)}</div>
        </div>
        <div className="admin-card admin-card--accent-success">
          <div className="admin-card__label">Revenue (USDC)</div>
          <div className="admin-card__value">{formatUsd(data.costs?.revenue_usdc)}</div>
        </div>
        <div className="admin-card">
          <div className="admin-card__label">Margin (approx)</div>
          <div className="admin-card__value">{formatUsd(margin)}</div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <CostLineChart data={cogs.length ? cogs : data.by_day ?? []} showRevenue />
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <TierPerformanceChart items={data.by_tier ?? []} />
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <ReportExportPanel />
      </div>
    </>
  );
}
