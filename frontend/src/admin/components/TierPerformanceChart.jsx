import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatUsd } from '../lib/humanize.js';

export default function TierPerformanceChart({ items = [] }) {
  const chartData = items.map((t) => ({
    tier: t.model_tier ?? 'unknown',
    completion: Math.round(Number(t.completion_rate ?? 0) * 100),
    avgCost: Number(t.avg_cogs ?? 0),
  }));

  if (!chartData.length) return <p className="admin-empty">No tier performance data.</p>;

  return (
    <div className="admin-chart-card">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,29,22,0.08)" />
          <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v, name) => (name === 'Avg cost' ? formatUsd(v) : `${v}%`)}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="completion" name="Completion %" fill="#8e4ed5" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="avgCost" name="Avg cost" fill="#ff80d2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
