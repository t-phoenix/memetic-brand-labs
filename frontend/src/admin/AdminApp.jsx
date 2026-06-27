import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminGate from './AdminGate';
import AdminLayout from './AdminLayout';
import StatusPage from './pages/StatusPage';
import OverviewPage from './pages/OverviewPage';
import RunsPage from './pages/RunsPage';
import RunDetailPage from './pages/RunDetailPage';
import CostsPage from './pages/CostsPage';
import ConfigPage from './pages/ConfigPage';
import { adminFetch, getAdminKey } from './lib/adminApi';
import './Admin.css';

export default function AdminApp() {
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    const key = getAdminKey();
    if (!key) {
      setAuthed(false);
      return;
    }
    adminFetch('/v1/admin/health')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return <div className="admin-gate"><div className="admin-loading">Loading…</div></div>;
  }

  if (!authed) {
    return <AdminGate />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<StatusPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="runs/:id" element={<RunDetailPage />} />
        <Route path="costs" element={<CostsPage />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
