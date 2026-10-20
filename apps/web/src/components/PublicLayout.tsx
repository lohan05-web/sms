import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { PUBLIC_NAV } from '../lib/publicContent';
import { Icon } from './Icon';
import './PublicSite.css';

const FOOTER_PRODUCT = [
  { label: 'Features', to: '/site/features' },
  { label: 'Modules', to: '/site/modules' },
  { label: 'Plans', to: '/site/plans' },
];

const FOOTER_COMPANY = [
  { label: 'About', to: '/site/about' },
  { label: 'FAQ', to: '/site/faq' },
  { label: 'Contact', to: '/site/contact' },
];

export function PublicLayout() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="pub">
      <header className={`pub-nav${navOpen ? ' pub-nav--open' : ''}`}>
        <div className="pub-container pub-nav__inner">
          <Link to="/site" className="pub-brand" aria-label="SmartSchool home">
            <span className="pub-brand__mark">SS</span>
            <span className="pub-brand__text">
              SmartSchool
              <small>School management system</small>
            </span>
          </Link>

          <nav className="pub-nav__links" aria-label="Primary">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/site'}
                className={({ isActive }) =>
                  `pub-nav__link${isActive ? ' is-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="pub-nav__actions">
            <Link to="/login" className="pub-nav__signin">
              Sign in
            </Link>
            <Link to="/site/contact" className="pub-btn pub-btn--primary">
              Book a demo
            </Link>
            <button
              type="button"
              className="pub-nav__toggle"
              aria-label="Toggle menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
            >
              <Icon name={navOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        <div className="pub-nav__mobile">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/site'}
              className={({ isActive }) =>
                `pub-nav__mobile-link${isActive ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/login" className="pub-nav__mobile-link">
            Sign in
          </Link>
          <Link to="/site/contact" className="pub-btn pub-btn--primary">
            Book a demo
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </header>

      <main className="pub-main">
        <Outlet />
      </main>

      <footer className="pub-footer">
        <div className="pub-container pub-footer__grid">
          <div className="pub-footer__brand">
            <Link to="/site" className="pub-brand">
              <span className="pub-brand__mark">SS</span>
              <span className="pub-brand__text">SmartSchool</span>
            </Link>
            <p>
              Software for the school day: admissions, attendance, fees, exams and parent updates in
              one connected place.
            </p>
          </div>

          <div className="pub-footer__col">
            <h3>Product</h3>
            <ul>
              {FOOTER_PRODUCT.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="pub-footer__col">
            <h3>Company</h3>
            <ul>
              {FOOTER_COMPANY.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="pub-footer__col">
            <h3>Get started</h3>
            <ul>
              <li>
                <Link to="/site/contact">Book a demo</Link>
              </li>
              <li>
                <Link to="/site/plans">See plans</Link>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pub-container pub-footer__bottom">
          <span>© {new Date().getFullYear()} SmartSchool</span>
          <span>Made for schools that never stop moving.</span>
        </div>
      </footer>
    </div>
  );
}
