import { ROLE_LABELS } from '@smartschool/shared';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { navForRole } from '../nav';
import { NotificationBell } from './NotificationBell';
import { Toaster } from './Toaster';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  if (!user) return null;
  const items = navForRole(user.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar${navOpen ? ' sidebar--open' : ''}`}>
        <div className="brand">
          <span className="brand__mark">SS</span>
          <span className="brand__text">SmartSchool</span>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="sidebar__backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="topbar__menu"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="topbar__menu-bar" />
            <span className="topbar__menu-bar" />
            <span className="topbar__menu-bar" />
          </button>
          <div className="topbar__spacer" />
          <NotificationBell />
          <div className="topbar__user">
            <span className="avatar">{initials(user.firstName, user.lastName)}</span>
            <div className="topbar__meta">
              <span className="topbar__name">
                {user.firstName} {user.lastName}
              </span>
              <span className="topbar__role">{ROLE_LABELS[user.role]}</span>
            </div>
            <button type="button" className="btn btn--ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
