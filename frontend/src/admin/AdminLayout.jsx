import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminKey } from './lib/adminApi';
import './Admin.css';

const NAV = [
  { to: '/admin', end: true, label: 'Status' },
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/runs', label: 'Runs' },
  { to: '/admin/costs', label: 'Costs' },
  { to: '/admin/config', label: 'Config' },
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
        <div className="admin-sidebar__brand">NE Admin</div>
        <nav className="admin-sidebar__nav">
          {NAV.map(({ to, end, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
