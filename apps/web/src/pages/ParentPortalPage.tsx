import type { OverallResult, ReportCard } from '@smartschool/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { PhotoDialog } from '../components/PhotoDialog';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonPanels,
  StatCard,
  type StatTone,
} from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate, formatDateTime, humanize, initials } from '../lib/format';
import { timeRangeOf, type TimetableItem } from '../lib/timetable';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

/* --------------------------------------------------------------------------
   API shapes — the parent portal reads a single scoped overview that the
   backend already assembles per child (see modules/parents/parents.service.ts).
   -------------------------------------------------------------------------- */

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  percentage: number;
  indicator: string;
  today: { date: string; status: string } | null;
}

interface ActivitySummary {
  upcomingHomework: number;
  dueToday: number;
  todayClasses: number;
  syllabusCompleted: number;
  syllabusTotal: number;
}

interface ChildTeacher {
  id: string;
  teacherId: string;
  name: string | null;
  photoUrl: string | null;
  subject: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
}

interface ChildResult {
  id: string;
  marksObtained: number | string;
  grade: string | null;
  exam: { name: string | null };
  subject: { name: string | null };
}

interface InvoiceItem {
  id: string;
  description: string;
  amount: number | string;
}

interface ChildInvoice {
  id: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number | string;
  amountPaid: number | string;
  balance: number | string;
  items: InvoiceItem[];
}

interface ChildSummary {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  photoUrl: string | null;
  status: string;
  gender: string | null;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  section: { name: string; classLevel: string | null } | null;
  teacherCount: number;
  teachers: ChildTeacher[];
  relation: string;
  isPrimary: boolean;
  attendance: AttendanceSummary;
  activities: ActivitySummary;
  timetable: TimetableItem[];
  results: ChildResult[];
  reportCards: ReportCard[];
  overallResult: OverallResult;
  invoices: ChildInvoice[];
  outstanding: number;
}

interface ParentOverview {
  parent: ParentProfile;
  children: ChildSummary[];
}

interface HomeworkRow {
  id: string;
  title: string;
  dueDate: string;
  subject?: { name?: string | null } | null;
  submission: { status: string; submittedAt: string | null; remarks: string | null } | null;
}

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string;
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

function childDisplayName(child: ChildSummary): string {
  return child.name ?? `Admission ${child.admissionNo}`;
}

function klassOf(child: ChildSummary): string {
  return [child.className, child.sectionName].filter(Boolean).join(' · ') || '—';
}

function childInitials(child: ChildSummary): string {
  if (child.name) {
    const [first, ...rest] = child.name.split(' ');
    return initials(first, rest.join(' ')) || child.admissionNo.slice(0, 2).toUpperCase();
  }
  return child.admissionNo.slice(0, 2).toUpperCase();
}

/** Maps an attendance indicator onto a stat-card tone. */
function attendanceToneFor(indicator: string): StatTone {
  if (indicator === 'GOOD') return 'success';
  if (indicator === 'WARNING') return 'warning';
  if (indicator === 'CRITICAL') return 'danger';
  return 'primary';
}

/** A status pill class for the badges used across the dashboard. */
function badgeClassForStatus(status: string): string {
  const value = status.toUpperCase();
  if (['PAID', 'PRESENT', 'APPROVED', 'COMPLETED', 'SUBMITTED'].includes(value)) {
    return 'badge badge--success';
  }
  if (['PENDING', 'LATE', 'PARTIAL'].includes(value)) return 'badge badge--warning';
  if (['OVERDUE', 'ABSENT', 'REJECTED', 'CANCELLED', 'MISSING'].includes(value)) {
    return 'badge badge--danger';
  }
  return 'badge';
}

const QUICK_LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/parent/attendance', label: 'Attendance', icon: 'attendance' },
  { to: '/parent/homework', label: 'Homework', icon: 'homework' },
  { to: '/parent/timetable', label: 'Timetable', icon: 'timetable' },
  { to: '/parent/results', label: 'Results', icon: 'marks' },
  { to: '/parent/syllabus', label: 'Syllabus', icon: 'subject' },
  { to: '/parent/invoices', label: 'Fees & Invoices', icon: 'finance' },
  { to: '/parent/teachers', label: 'Teachers', icon: 'teacher' },
  { to: '/parent/announcements', label: 'Announcements', icon: 'bell' },
  { to: '/parent/vehicle', label: 'Transport', icon: 'bus' },
  { to: '/requests', label: 'Leave Requests', icon: 'requests' },
];

/* --------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */

export function ParentPortalPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [photoTarget, setPhotoTarget] = useState<ChildSummary | null>(null);

  const overviewState = useAsync<ParentOverview>(() => api.get('/parents/me/children'), []);

  const children = overviewState.data?.children ?? [];
  const child = children.find((item) => item.id === selectedId) ?? children[0] ?? null;

  const homeworkState = useAsync<HomeworkRow[]>(
    () =>
      child
        ? api.get<HomeworkRow[]>(`/parents/me/children/${child.id}/homework`)
        : Promise.resolve([]),
    [child?.id],
  );

  const noticesState = useAsync<NoticeRow[]>(
    () => api.list<NoticeRow>('/notices', { limit: 4 }).then((page) => page.items),
    [],
  );

  const handleSavePhoto = async (photoUrl: string | null) => {
    if (!photoTarget) return;
    await api.patch(`/parents/me/children/${photoTarget.id}/photo`, { photoUrl });
    setPhotoTarget(null);
    overviewState.reload();
  };

  if (!user) return null;
  if (user.role !== 'PARENT') return <ForbiddenPage />;

  if (overviewState.loading) {
    return (
      <div className="page">
        <PageHeader title="Parent Dashboard" subtitle="Your children at a glance" />
        <SkeletonPanels count={3} />
      </div>
    );
  }

  if (overviewState.forbidden) return <ForbiddenPage />;

  if (overviewState.error) {
    return (
      <div className="page">
        <PageHeader title="Parent Dashboard" />
        <ErrorState message={overviewState.error} onRetry={overviewState.reload} />
      </div>
    );
  }

  if (!overviewState.data || children.length === 0 || !child) {
    return (
      <div className="page">
        <PageHeader title="Parent Dashboard" />
        <EmptyState
          icon="parents"
          message="No children are linked to your account yet."
          hint="Please contact the school office to link your children."
        />
      </div>
    );
  }

  const { parent } = overviewState.data;
  const attendance = child.attendance;
  const activities = child.activities;
  const pendingInvoices = child.invoices.filter((invoice) => Number(invoice.balance) > 0);

  const todayDay = WEEKDAY_BY_INDEX[new Date().getDay()];
  const todayClasses = child.timetable
    .filter((entry) => entry.dayOfWeek === todayDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recentHomework = (homeworkState.data ?? []).slice(0, 5);
  const notices = noticesState.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title={`Welcome, ${parent.firstName}`}
        subtitle="Everything about your children in one place."
        icon="dashboard"
      />

      <div className="page__body">
      {/* Hero ------------------------------------------------------------- */}
      <section className="parent-hero">
        <div className="parent-hero__text">
          <div className="parent-hero__identity">
            <div className="parent-hero__avatar-wrap">
              <span className="parent-hero__avatar">
                {child.photoUrl ? <img src={child.photoUrl} alt="" /> : childInitials(child)}
              </span>
              <button
                type="button"
                className="parent-hero__avatar-edit"
                onClick={() => setPhotoTarget(child)}
                title="Upload photo"
                aria-label={`Upload photo for ${childDisplayName(child)}`}
              >
                <Icon name="camera" size={14} />
              </button>
            </div>
            <div className="parent-hero__identity-body">
              <span className="parent-hero__eyebrow">
                <Icon name="parents" size={14} />
                Parent portal
              </span>
              <h2 className="parent-hero__title">{childDisplayName(child)}</h2>
              <p className="parent-hero__subtitle">
                {klassOf(child)}
                {child.rollNo ? ` · Roll ${child.rollNo}` : ''} · Admission {child.admissionNo}
              </p>
            </div>
          </div>
          <div className="parent-hero__actions">
            <Link className="btn btn--primary" to="/parent/attendance">
              <Icon name="attendance" size={16} />
              Attendance
            </Link>
            <Link className="btn btn--ghost" to="/parent/homework">
              <Icon name="homework" size={16} />
              Homework
            </Link>
            <Link className="btn btn--ghost" to="/parent/invoices">
              <Icon name="finance" size={16} />
              Fees
            </Link>
          </div>
        </div>
        <div className="parent-hero__panel">
          <span className="parent-hero__panel-label">Attendance</span>
          <span className="parent-hero__panel-value">{attendance.percentage}%</span>
          <span className="parent-hero__panel-hint">
            {attendance.present} / {attendance.total} days present
          </span>
        </div>
      </section>

      {/* Child switcher --------------------------------------------------- */}
      {children.length > 1 ? (
        <section className="panel">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="parents" size={18} />
            </span>
            <div>
              <h2 className="panel__title">My Children</h2>
              <p className="panel__desc">Switch between your children</p>
            </div>
          </div>
          <div className="parent-children" style={{ marginTop: 14 }}>
            {children.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`parent-child${item.id === child.id ? ' parent-child--active' : ''}`}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={item.id === child.id}
              >
                <span className="parent-child__avatar">
                  {item.photoUrl ? <img src={item.photoUrl} alt="" /> : childInitials(item)}
                </span>
                <span>
                  <span className="parent-child__name">{childDisplayName(item)}</span>
                  <br />
                  <span className="parent-child__meta">{klassOf(item)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Summary cards ---------------------------------------------------- */}
      <section className="parent-grid">
        <StatCard
          label="Attendance"
          value={`${attendance.percentage}%`}
          hint={`${attendance.present} present · ${attendance.absent} absent`}
          icon="attendance"
          tone={attendanceToneFor(attendance.indicator)}
        />
        <StatCard
          label="Homework due today"
          value={activities.dueToday}
          hint={`${activities.upcomingHomework} due this week`}
          icon="homework"
          tone={activities.dueToday > 0 ? 'warning' : 'primary'}
        />
        <StatCard
          label="Classes today"
          value={activities.todayClasses}
          hint="Scheduled periods"
          icon="timetable"
        />
        <StatCard
          label="Overall result"
          value={`${child.overallResult.percentage}%`}
          hint={child.overallResult.grade ? `Grade ${child.overallResult.grade}` : 'No results yet'}
          icon="marks"
          tone="info"
        />
        <StatCard
          label="Fees outstanding"
          value={formatCurrency(child.outstanding)}
          hint={`${pendingInvoices.length} unpaid invoice${pendingInvoices.length === 1 ? '' : 's'}`}
          icon="finance"
          tone={child.outstanding > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Syllabus covered"
          value={
            activities.syllabusTotal > 0
              ? `${Math.round((activities.syllabusCompleted / activities.syllabusTotal) * 100)}%`
              : '—'
          }
          hint={
            activities.syllabusTotal > 0
              ? `${activities.syllabusCompleted}/${activities.syllabusTotal} units`
              : 'No syllabus published'
          }
          icon="subject"
        />
      </section>

      {/* Today's timetable + recent homework ------------------------------ */}
      <div className="teacher-columns">
        <section className="panel">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="timetable" size={18} />
            </span>
            <div>
              <h2 className="panel__title">Today&apos;s timetable</h2>
              <p className="panel__desc">{humanize(todayDay)} periods</p>
            </div>
          </div>
          {todayClasses.length === 0 ? (
            <EmptyState icon="timetable" message="No classes scheduled for today." />
          ) : (
            <div className="parent-list" style={{ marginTop: 14 }}>
              {todayClasses.map((entry) => (
                <div className="parent-row" key={entry.id}>
                  <div className="parent-row__main">
                    <div className="parent-row__title">
                      {entry.subject?.name ?? 'Class'}
                      {entry.room ? ` · ${entry.room}` : ''}
                    </div>
                    <div className="parent-row__meta">{entry.teacher?.name ?? '—'}</div>
                  </div>
                  <div className="parent-row__aside">{timeRangeOf(entry)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="homework" size={18} />
            </span>
            <div>
              <h2 className="panel__title">Recent homework</h2>
              <p className="panel__desc">Latest assignments for {childDisplayName(child)}</p>
            </div>
          </div>
          {homeworkState.loading ? (
            <SkeletonPanels count={1} />
          ) : recentHomework.length === 0 ? (
            <EmptyState icon="homework" message="No homework has been set yet." />
          ) : (
            <div className="parent-list" style={{ marginTop: 14 }}>
              {recentHomework.map((item) => (
                <div className="parent-row" key={item.id}>
                  <div className="parent-row__main">
                    <div className="parent-row__title">{item.title}</div>
                    <div className="parent-row__meta">
                      {item.subject?.name ?? 'General'} · due {formatDate(item.dueDate)}
                    </div>
                  </div>
                  <div className="parent-row__aside">
                    <span className={badgeClassForStatus(item.submission?.status ?? 'PENDING')}>
                      {item.submission ? humanize(item.submission.status) : 'Not submitted'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Pending fees + announcements ------------------------------------- */}
      <div className="teacher-columns">
        <section className="panel">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="finance" size={18} />
            </span>
            <div>
              <h2 className="panel__title">Pending fees</h2>
              <p className="panel__desc">Invoices with an outstanding balance</p>
            </div>
          </div>
          {pendingInvoices.length === 0 ? (
            <EmptyState
              icon="check"
              message="No pending fees."
              hint="Every issued invoice is fully paid."
            />
          ) : (
            <>
              <div className="parent-list" style={{ marginTop: 14 }}>
                {pendingInvoices.map((invoice) => (
                  <div className="parent-row" key={invoice.id}>
                    <div className="parent-row__main">
                      <div className="parent-row__title">{invoice.invoiceNo}</div>
                      <div className="parent-row__meta">Due {formatDate(invoice.dueDate)}</div>
                    </div>
                    <div className="parent-row__aside">
                      <strong>{formatCurrency(invoice.balance)}</strong>
                      <br />
                      <span className={badgeClassForStatus(invoice.status)}>
                        {humanize(invoice.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="parent-hero__actions" style={{ marginTop: 16 }}>
                <Link className="btn btn--ghost" to="/parent/invoices">
                  View all invoices &amp; receipts
                  <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="bell" size={18} />
            </span>
            <div>
              <h2 className="panel__title">Recent announcements</h2>
              <p className="panel__desc">Notices from the school</p>
            </div>
          </div>
          {noticesState.loading ? (
            <SkeletonPanels count={1} />
          ) : notices.length === 0 ? (
            <EmptyState icon="bell" message="No announcements have been published." />
          ) : (
            <>
              <div className="parent-list" style={{ marginTop: 14 }}>
                {notices.map((item) => (
                  <div className="parent-row" key={item.id}>
                    <div className="parent-row__main">
                      <div className="parent-row__title">
                        {item.isPinned ? '📌 ' : ''}
                        {item.title}
                      </div>
                      <div className="parent-row__meta">{formatDateTime(item.publishedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="parent-hero__actions" style={{ marginTop: 16 }}>
                <Link className="btn btn--ghost" to="/parent/announcements">
                  All announcements
                  <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Quick links ------------------------------------------------------ */}
      <section className="panel">
        <div className="panel__heading">
          <span className="panel__icon">
            <Icon name="sparkles" size={18} />
          </span>
          <div>
            <h2 className="panel__title">Quick links</h2>
            <p className="panel__desc">Jump straight to a section</p>
          </div>
        </div>
        <div className="quick-actions" style={{ marginTop: 16 }}>
          {QUICK_LINKS.map((link) => (
            <Link className="action-card" key={link.to} to={link.to}>
              <span className="action-card__icon">
                <Icon name={link.icon} size={18} />
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </section>
      </div>

      {photoTarget ? (
        <PhotoDialog
          title={`${childDisplayName(photoTarget)} photo`}
          currentUrl={photoTarget.photoUrl}
          onClose={() => setPhotoTarget(null)}
          onSave={handleSavePhoto}
        />
      ) : null}
    </div>
  );
}
