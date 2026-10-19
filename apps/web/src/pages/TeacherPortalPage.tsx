import { Permission } from '@smartschool/shared';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { TimetableDayList } from '../components/TimetableViews';
import { EmptyState, ErrorState, SkeletonPanels, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDateTime, humanize } from '../lib/format';
import { can } from '../lib/permissions';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';
import {
  fetchStudentsForSections,
  fetchTeacherHomework,
  useTeacherScope,
  type HomeworkItem,
  type TeacherStudent,
} from './teacher/teacherScope';
import { AttendanceDonut } from './teacher/teacherWidgets';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NoticeItem {
  id: string;
  title: string;
  body?: string | null;
  isPinned?: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
}

interface DashboardData {
  students: TeacherStudent[];
  homework: HomeworkItem[];
  homeworkTotal: number;
  notices: NoticeItem[];
  notifications: NotificationItem[];
  unread: number;
}

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: IconName;
  permission?: Permission;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'My classes',
    description: 'Sections you teach',
    to: '/teacher/classes',
    icon: 'class',
  },
  {
    label: 'My students',
    description: 'Student directory',
    to: '/teacher/students',
    icon: 'students',
    permission: Permission.STUDENT_READ,
  },
  {
    label: 'Attendance',
    description: 'Take & review registers',
    to: '/teacher/attendance',
    icon: 'attendance',
    permission: Permission.ATTENDANCE_READ,
  },
  {
    label: 'Marks & grades',
    description: 'Exam results',
    to: '/teacher/marks',
    icon: 'marks',
    permission: Permission.RESULT_READ,
  },
  {
    label: 'Homework',
    description: 'Assign and review work',
    to: '/teacher/homework',
    icon: 'homework',
    permission: Permission.HOMEWORK_READ,
  },
  {
    label: 'Timetable',
    description: 'Your weekly schedule',
    to: '/teacher/timetable',
    icon: 'timetable',
    permission: Permission.TIMETABLE_READ,
  },
  {
    label: 'Messages',
    description: 'Talk to parents & staff',
    to: '/teacher/messages',
    icon: 'messages',
    permission: Permission.MESSAGE_READ,
  },
  {
    label: 'Notifications',
    description: 'Your alerts',
    to: '/teacher/notifications',
    icon: 'bell',
    permission: Permission.NOTIFICATION_READ,
  },
  {
    label: 'My profile',
    description: 'Account & details',
    to: '/teacher/profile',
    icon: 'user',
  },
];

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const EMPTY_DASHBOARD: DashboardData = {
  students: [],
  homework: [],
  homeworkTotal: 0,
  notices: [],
  notifications: [],
  unread: 0,
};

function attendanceHint(card?: { total: number; indicator: string }): string {
  if (!card) return 'No records yet';
  const indicator = humanize(card.indicator);
  return [`${card.total} marks`, indicator].filter(Boolean).join(' · ');
}

export function TeacherPortalPage() {
  const { user } = useAuth();
  const role = user?.role;
  const scopeState = useTeacherScope();
  const scope = scopeState.scope;

  const dash = useAsync<DashboardData>(async () => {
    if (!scope) return EMPTY_DASHBOARD;
    const [students, homework, notices, notifications, unread] = await Promise.all([
      scope.sectionIds.length > 0
        ? fetchStudentsForSections(scope.sectionIds)
        : Promise.resolve<TeacherStudent[]>([]),
      role && can(role, Permission.HOMEWORK_READ)
        ? fetchTeacherHomework(scope.teacher.id, 5)
        : Promise.resolve({ items: [] as HomeworkItem[], total: 0 }),
      role && can(role, Permission.NOTICE_READ)
        ? api.list<NoticeItem>('/notices', { page: 1, limit: 4 })
        : Promise.resolve({ items: [] as NoticeItem[], meta: { total: 0, page: 1, limit: 4, totalPages: 1 } }),
      role && can(role, Permission.NOTIFICATION_READ)
        ? api.list<NotificationItem>('/notifications', { page: 1, limit: 5 })
        : Promise.resolve({
            items: [] as NotificationItem[],
            meta: { total: 0, page: 1, limit: 5, totalPages: 1 },
          }),
      role && can(role, Permission.NOTIFICATION_READ)
        ? api.get<{ count: number }>('/notifications/unread-count')
        : Promise.resolve({ count: 0 }),
    ]);
    return {
      students,
      homework: homework.items,
      homeworkTotal: homework.total,
      notices: notices.items,
      notifications: notifications.items,
      unread: unread.count,
    };
  }, [scope?.teacher.id, role]);

  if (scopeState.forbidden) return <ForbiddenPage />;
  if (scopeState.loading || dash.loading)
    return (
      <div className="page">
        <SkeletonPanels count={3} />
      </div>
    );
  if (scopeState.error) return <ErrorState message={scopeState.error} onRetry={scopeState.reload} />;
  if (!scope) return null;

  const { students, homework, homeworkTotal, notices, notifications, unread } =
    dash.data ?? EMPTY_DASHBOARD;
  const teacher = scope.teacher;
  const entries = scope.timetableEntries;

  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()];
  const todayEntries = entries.filter((entry) => entry.dayOfWeek === todayName);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const actions = QUICK_ACTIONS.filter(
    (action) => !action.permission || (role ? can(role, action.permission) : false),
  );

  const reloadAll = () => {
    scopeState.reload();
    dash.reload();
  };

  const overall = teacher.attendance?.overall;
  const today = teacher.attendance?.today;

  return (
    <div className="page">
      <div className="dashboard">
        <section className="teacher-hero">
        <div className="teacher-hero__text">
          <span className="teacher-hero__eyebrow">
            <Icon name="sparkles" size={14} />
            {teacher.school?.name ?? 'Teacher dashboard'}
          </span>
          <h1 className="teacher-hero__title">
            Welcome back, {teacher.user?.firstName ?? user?.firstName ?? 'Teacher'}
          </h1>
          <p className="teacher-hero__subtitle">
            {todayLabel} · {todayEntries.length} class{todayEntries.length === 1 ? '' : 'es'} today
          </p>
          <div className="teacher-hero__actions">
            <Link className="btn btn--primary" to="/teacher/attendance">
              <Icon name="attendance" size={16} />
              Attendance
            </Link>
            <Link className="btn btn--ghost" to="/teacher/marks">
              <Icon name="mark" size={16} />
              Enter marks
            </Link>
            <button type="button" className="btn btn--ghost" onClick={reloadAll}>
              <Icon name="refresh" size={16} />
              Refresh
            </button>
          </div>
        </div>
        <div className="teacher-hero__panel">
          <span className="teacher-hero__panel-label">Attendance today</span>
          <span className="teacher-hero__panel-value">{today?.percentage ?? 0}%</span>
          <span className="teacher-hero__panel-hint">{attendanceHint(today)}</span>
        </div>
      </section>

      <section className="stat-grid" aria-label="Teaching overview">
        <StatCard label="My classes" value={scope.sections.length} hint={`${entries.length} weekly periods`} icon="sections" />
        <StatCard label="My students" value={students.length} hint="In your sections" icon="students" tone="info" />
        <StatCard label="Subjects" value={scope.subjects.length} hint="Assigned to you" icon="subject" tone="info" />
        <StatCard
          label="Today's classes"
          value={todayEntries.length}
          hint={todayLabel}
          icon="timetable"
          tone={todayEntries.length > 0 ? 'info' : 'primary'}
        />
        <StatCard
          label="Attendance today"
          value={`${today?.percentage ?? 0}%`}
          hint={attendanceHint(today)}
          icon="attendance"
          tone="success"
        />
        <StatCard
          label="Overall attendance"
          value={`${overall?.percentage ?? 0}%`}
          hint={attendanceHint(overall)}
          icon="trending"
          tone="warning"
        />
        <StatCard label="Homework" value={homeworkTotal} hint="Assigned by you" icon="homework" tone="primary" />
        <StatCard
          label="Unread alerts"
          value={unread}
          hint="Notifications"
          icon="bell"
          tone={unread > 0 ? 'danger' : 'primary'}
        />
      </section>

      <div className="teacher-columns">
        <section className="panel">
          <div className="panel__header">
            <h2 className="panel__title">Attendance overview</h2>
            <Link className="btn btn--ghost btn--sm" to="/teacher/attendance">
              Details
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          <AttendanceDonut counts={overall?.byStatus} />
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2 className="panel__title">Announcements</h2>
          </div>
          {notices.length === 0 ? (
            <EmptyState message="No announcements right now." icon="sparkles" />
          ) : (
            <ul className="announcements">
              {notices.map((notice) => (
                <li className="announcement" key={notice.id}>
                  <div className="announcement__head">
                    <h3 className="announcement__title">{notice.title}</h3>
                    {notice.isPinned ? <span className="badge badge--warning">Pinned</span> : null}
                  </div>
                  {notice.body ? <p className="announcement__body">{notice.body}</p> : null}
                  <span className="announcement__time">
                    {formatDate(notice.publishedAt ?? notice.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Quick access</h2>
        </div>
        <div className="quick-actions">
          {actions.map((action) => (
            <Link key={action.to} className="action-card" to={action.to}>
              <span className="action-card__icon">
                <Icon name={action.icon} size={18} />
              </span>
              <span className="action-card__body">
                <span className="action-card__label">{action.label}</span>
                <span className="action-card__desc">{action.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Today&apos;s classes</h2>
          <Link className="btn btn--ghost btn--sm" to="/teacher/timetable">
            Full timetable
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        <TimetableDayList
          entries={todayEntries}
          showSection
          emptyMessage="You have no classes scheduled for today."
        />
      </section>

      <div className="teacher-columns">
        <section className="panel">
          <div className="panel__header">
            <h2 className="panel__title">Recent homework</h2>
            <Link className="btn btn--ghost btn--sm" to="/teacher/homework">
              View all
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          {homework.length === 0 ? (
            <EmptyState message="No homework has been assigned yet." icon="homework" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Class</th>
                    <th>Due</th>
                    <th>Subs</th>
                  </tr>
                </thead>
                <tbody>
                  {homework.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.title}</strong>
                        {item.subject?.name ? <div className="muted">{item.subject.name}</div> : null}
                      </td>
                      <td>
                        {[item.section?.classLevel?.name, item.section?.name]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td>{formatDate(item.dueDate) || '—'}</td>
                      <td>{item._count?.submissions ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2 className="panel__title">Notifications</h2>
            <Link className="btn btn--ghost btn--sm" to="/teacher/notifications">
              View all
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <EmptyState message="You have no notifications." icon="bell" />
          ) : (
            <ul className="notifications">
              {notifications.map((item) => (
                <li key={item.id} className={`notification${item.isRead ? '' : ' notification--unread'}`}>
                  <div className="notification__main">
                    <div className="notification__head">
                      <span className="badge badge--default">{humanize(item.type)}</span>
                      <span className="notification__time">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <h3 className="notification__title">{item.title}</h3>
                    {item.body ? <p className="notification__body">{item.body}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">My classes</h2>
          <Link className="btn btn--ghost btn--sm" to="/teacher/classes">
            View all
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        {scope.assignments.length === 0 ? (
          <EmptyState message="No teaching assignments yet." icon="class" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Academic year</th>
                </tr>
              </thead>
              <tbody>
                {scope.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.section?.classLevel?.name ?? '—'}</td>
                    <td>{assignment.section?.name ?? '—'}</td>
                    <td>{assignment.subject?.name ?? '—'}</td>
                    <td>{assignment.academicYear?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
