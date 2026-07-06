import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAnalyticsMessaging,
  getAnalyticsModels,
  getAnalyticsFailures,
} from '../lib/adminApi';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import MessagingProblemChart from '../components/MessagingProblemChart.jsx';
import TierPerformanceChart from '../components/TierPerformanceChart.jsx';
import ReportExportPanel from '../components/ReportExportPanel.jsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../lib/formatters';
import { humanizeLayerKey } from '../lib/humanize.js';

export default function InsightsPage() {
  const [messaging, setMessaging] = useState([]);
  const [models, setModels] = useState([]);
  const [failures, setFailures] = useState({ recent: [], by_stage: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getAnalyticsMessaging(), getAnalyticsModels(), getAnalyticsFailures(30)])
      .then(([m, mod, f]) => {
        setMessaging(m.items ?? []);
        setModels(mod.items ?? []);
        setFailures(f);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="admin-error">{error}</div>;

  const failureChart = (failures.by_stage ?? []).map((s) => ({
    stage: humanizeLayerKey(s.stage),
    count: s.count,
  }));

  const totalMsg = messaging.reduce((s, i) => s + Number(i.count ?? 0), 0) || 1;

  return (
    <>
      <AdminPageHeader
        eyebrow="Reports"
        title="Insights"
        subtitle="Messaging patterns, model performance, and failure analysis."
      />

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="admin-page__title" style={{ fontSize: '1.25rem' }}>Messaging problems</h2>
        <MessagingProblemChart items={messaging} />
        <div className="admin-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Runs</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {messaging.map((i) => (
                <tr key={i.messaging_problem}>
                  <td>{i.messaging_problem ?? 'Unknown'}</td>
                  <td>{i.count}</td>
                  <td>{((Number(i.count) / totalMsg) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="admin-page__title" style={{ fontSize: '1.25rem' }}>Model tier performance</h2>
        <TierPerformanceChart items={models} />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="admin-page__title" style={{ fontSize: '1.25rem' }}>Failures by stage</h2>
        {failureChart.length > 0 ? (
          <div className="admin-chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={failureChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,29,22,0.08)" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#d8474d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="admin-empty">No failures in the last 30 days.</p>
        )}
        {(failures.recent ?? []).length > 0 && (
          <div className="admin-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Stage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {failures.recent.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{humanizeLayerKey(r.current_stage ?? r.failure_code)}</td>
                    <td><Link to={`/admin/runs/${r.id}`}>Inspect →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ReportExportPanel />
    </>
  );
}
