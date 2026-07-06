import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatUsd } from '../lib/humanize.js';

export default function CostLineChart({ data = [], showRevenue = false }) {
  const chartData = data.map((d) => ({
    day: d.day ? new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
    cost: Number(d.cogs_usd ?? 0),
    revenue: Number(d.revenue_usdc ?? 0),
    runs: d.runs ?? 0,
  }));

  if (!chartData.length) return <p className="admin-empty">No trend data for this period.</p>;

  return (
    <div className="admin-chart-card">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,29,22,0.08)" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          {showRevenue && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />}
          <Tooltip
            formatter={(value, name) => (name === 'cost' || name === 'revenue' ? formatUsd(value) : value)}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="cost" name="LLM cost" stroke="#8e4ed5" strokeWidth={2} dot={false} />
          {showRevenue && (
            <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#828de0" strokeWidth={2} dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
