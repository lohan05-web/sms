import { Role } from '@smartschool/shared';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { defaultPathForRole } from '../lib/routing';
import { Spinner } from './ui';

/**
 * Client-side route guard. Renders the nested route only when the signed-in
 * user holds one of the allowed roles; everyone else is redirected to the
 * dashboard appropriate for their own role. This is a UX safeguard only —
 * the server independently re-checks the role on every API call.
 */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="boot">
        <Spinner label="Loading SmartSchool…" />
      </div>
    );
  }

  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={defaultPathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
