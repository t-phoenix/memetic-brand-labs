import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function MessagingProblemChart({ items = [], limit = 10 }) {
  const chartData = [...items]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, limit)
    .map((i) => ({
      name: (i.messaging_problem ?? 'Unknown').slice(0, 28),
      count: Number(i.count ?? 0),
    }));

  if (!chartData.length) return <p className="admin-empty">No messaging problem data yet.</p>;

  return (
    <div className="admin-chart-card">
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,29,22,0.08)" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
          <Bar dataKey="count" name="Runs" fill="#8e4ed5" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
