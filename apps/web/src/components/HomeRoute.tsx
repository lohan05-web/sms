import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { defaultPathForRole } from '../lib/routing';
import { UniversityDashboardPage } from '../pages/UniversityDashboardPage';

export function HomeRoute() {
  const { user } = useAuth();
  if (!user) return null;

  const path = defaultPathForRole(user.role);
  if (path !== '/') return <Navigate to={path} replace />;
  return <UniversityDashboardPage />;
}
