import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function MemeticBarChart({ scores = [] }) {
  const chartData = scores.map((s) => ({
    dimension: String(s.dimension).replace(/_/g, ' '),
    score: s.score,
  }));

  if (!chartData.length) return <p className="admin-empty">No memetic scores for this run.</p>;

  return (
    <div className="admin-chart-card">
      <div className="admin-card__label">Memetic dimensions</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,29,22,0.08)" />
          <XAxis dataKey="dimension" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
          <Bar dataKey="score" name="Score" fill="#828de0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
