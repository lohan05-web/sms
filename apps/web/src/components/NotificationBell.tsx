import { Permission } from '@smartschool/shared';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { can } from '../lib/permissions';
import { connectionLabel } from '../lib/realtime';
import { useRealtime } from './RealtimeProvider';

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const { unread, status } = useRealtime();

  if (!user || !can(user.role, Permission.NOTIFICATION_READ)) return null;

  const label = connectionLabel(status);
  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <Link
      to="/notifications"
      className="bell"
      title={label}
      aria-label={`Notifications, ${unread} unread. ${label}`}
    >
      <BellIcon />
      {unread > 0 ? (
        <span className="bell__badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
      <span className={`bell__dot bell__dot--${status}`} aria-hidden="true" />
    </Link>
  );
}
