import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { defaultPathForRole } from '../lib/routing';

export function NotFoundPage() {
  const { user } = useAuth();
  const location = useLocation();
  const home = user ? defaultPathForRole(user.role) : '/login';
  const onHome = location.pathname === home;

  return (
    <div className="state state--empty">
      <h2>Not found</h2>
      <p>The page you were looking for does not exist.</p>
      {onHome ? null : (
        <Link className="btn btn--ghost" to={home}>
          Go to home
        </Link>
      )}
    </div>
  );
}
