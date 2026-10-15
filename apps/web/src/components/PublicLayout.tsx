import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { PUBLIC_NAV } from '../lib/publicContent';
import { Icon } from './Icon';

const PORTAL_LINKS = [
  { label: 'Admin', to: '/login' },
  { label: 'Teacher', to: '/login/teacher' },
  { label: 'Parent', to: '/login/parent' },
];

export function PublicLayout() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="site">
      <header className={`site-nav${navOpen ? ' site-nav--open' : ''}`}>
        <div className="site-container site-nav__inner">
          <Link to="/site" className="site-brand" aria-label="SmartSchool home">
            <span className="site-brand__mark">SS</span>
            <span className="site-brand__text">
              SmartSchool
              <small>School Management System</small>
            </span>
          </Link>

          <nav className="site-nav__links" aria-label="Primary">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/site'}
                className={({ isActive }) =>
                  `site-nav__link${isActive ? ' site-nav__link--active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-nav__actions">
            <Link to="/login" className="btn btn--primary site-nav__cta">
              Sign in
              <Icon name="arrow-right" size={16} />
            </Link>
            <button
              type="button"
              className="site-nav__toggle"
              aria-label="Toggle menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
            >
              <Icon name={navOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        <div className="site-nav__mobile">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/site'}
              className={({ isActive }) =>
                `site-nav__mobile-link${isActive ? ' site-nav__mobile-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/login" className="btn btn--primary btn--block">
            Sign in
          </Link>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-container site-footer__grid">
          <div className="site-footer__brand">
            <Link to="/site" className="site-brand">
              <span className="site-brand__mark">SS</span>
              <span className="site-brand__text">SmartSchool</span>
            </Link>
            <p>
              The all-in-one platform that helps schools run admissions, academics, finance and
              communication from a single place.
            </p>
          </div>

          <div className="site-footer__col">
            <h3>Explore</h3>
            {PUBLIC_NAV.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="site-footer__col">
            <h3>Portals</h3>
            {PORTAL_LINKS.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label} sign in
              </Link>
            ))}
            <Link to="/site/contact">Book a demo</Link>
          </div>

          <div className="site-footer__col">
            <h3>Get in touch</h3>
            <a href="mailto:hello@smartschool.app">hello@smartschool.app</a>
            <a href="tel:+15550102020">+1 (555) 010-2020</a>
            <span>Level 4, Learning Square</span>
          </div>
        </div>

        <div className="site-container site-footer__bottom">
          <span>© {new Date().getFullYear()} SmartSchool. All rights reserved.</span>
          <span>Built for schools that never stop moving.</span>
        </div>
      </footer>
    </div>
  );
}
