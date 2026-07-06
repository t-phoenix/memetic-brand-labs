import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { humanizeScore } from '../lib/humanize.js';

export default function DiagnosticRadarChart({ scores = [] }) {
  const chartData = scores.map((s) => ({
    dimension: String(s.dimension).replace(/_/g, ' '),
    score: s.score,
    fullMark: 100,
  }));

  if (!chartData.length) return <p className="admin-empty">No diagnostic scores for this run.</p>;

  return (
    <div className="admin-chart-card">
      <div className="admin-card__label">Brand health dimensions</div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="rgba(33,29,22,0.12)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar name="Score" dataKey="score" stroke="#8e4ed5" fill="#8e4ed5" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
      <ul style={{ fontSize: '0.85rem', marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
        {scores.map((s) => (
          <li key={s.dimension}>{humanizeScore(s.dimension, s.score)}</li>
        ))}
      </ul>
    </div>
  );
}
