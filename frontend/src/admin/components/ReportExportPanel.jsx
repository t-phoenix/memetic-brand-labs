import { useState } from 'react';
import { exportRunsCsv, exportCostsCsv } from '../lib/adminApi.js';

export default function ReportExportPanel() {
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState('');

  const download = async (kind) => {
    setLoading(kind);
    try {
      const csv = kind === 'runs'
        ? await exportRunsCsv(status ? { status } : {})
        : await exportCostsCsv(days);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'runs' ? 'ne-runs.csv' : `ne-costs-${days}d.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__label">Export reports</div>
      <div className="admin-toolbar" style={{ marginTop: '0.75rem' }}>
        <select className="admin-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All run statuses</option>
          <option value="completed">Completed only</option>
          <option value="failed">Failed only</option>
        </select>
        <button type="button" className="admin-btn admin-btn--primary" disabled={!!loading} onClick={() => download('runs')}>
          {loading === 'runs' ? 'Exporting…' : 'Download runs CSV'}
        </button>
        <button type="button" className="admin-btn" disabled={!!loading} onClick={() => download('costs')}>
          {loading === 'costs' ? 'Exporting…' : 'Download costs CSV'}
        </button>
      </div>
    </div>
  );
}
