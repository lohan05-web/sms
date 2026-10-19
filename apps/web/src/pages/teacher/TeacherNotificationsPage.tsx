import { NotificationsPage } from '../NotificationsPage';

/**
 * Teacher-scoped entry point for notifications. Notifications are already
 * scoped to the signed-in user by the backend, so this page reuses the shared
 * implementation rather than duplicating it.
 */
export function TeacherNotificationsPage() {
  return <NotificationsPage />;
}
