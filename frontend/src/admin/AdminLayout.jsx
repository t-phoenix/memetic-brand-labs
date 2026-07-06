import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminKey } from './lib/adminApi';
import './Admin.css';

const NAV = [
  { to: '/admin', end: true, label: 'Status', title: 'Service health' },
  { to: '/admin/overview', label: 'Overview', title: 'How are runs performing?' },
  { to: '/admin/runs', label: 'Runs', title: 'Browse every analysis' },
  { to: '/admin/playground', label: 'Playground', title: 'Test the engine step by step' },
  { to: '/admin/costs', label: 'Costs', title: 'Spending and revenue' },
  { to: '/admin/insights', label: 'Insights', title: 'Patterns and reports' },
  { to: '/admin/config', label: 'Config', title: 'Prompts and tiers' },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    clearAdminKey();
    navigate('/admin');
    window.location.reload();
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-title">Narrative Engine</div>
          <div className="admin-sidebar__brand-eyebrow">Admin</div>
        </div>
        <nav className="admin-sidebar__nav">
          {NAV.map(({ to, end, label, title }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={title}
              className={({ isActive }) =>
                `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="admin-sidebar__logout" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
