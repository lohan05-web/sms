import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { defaultPathForRole } from '../lib/routing';

export function ForbiddenPage() {
  const { user } = useAuth();
  const location = useLocation();
  const home = user ? defaultPathForRole(user.role) : '/login';
  const onHome = location.pathname === home;

  return (
    <div className="state state--forbidden">
      <h2>Access denied</h2>
      <p>You do not have permission to view this section.</p>
      {onHome ? null : (
        <Link className="btn btn--ghost" to={home}>
          Go to home
        </Link>
      )}
    </div>
  );
}
