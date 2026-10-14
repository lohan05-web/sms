import { Permission } from '@smartschool/shared';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader, Spinner, StatCard } from '../components/ui';
import { useAuth } from '../lib/auth';
import { formatDate, humanize } from '../lib/format';
import { can } from '../lib/permissions';
import { useAsync } from '../lib/useAsync';
import { api } from '../lib/api';

interface Assignment {
  id: string;
  subject?: { name?: string; code?: string } | null;
  section?: { name?: string; classLevel?: { name?: string } | null } | null;
  academicYear?: { name?: string } | null;
}

interface TeacherMe {
  id: string;
  employeeNo: string;
  qualification?: string | null;
  specialization?: string | null;
  joiningDate?: string | null;
  status?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string | null } | null;
  school?: { name?: string } | null;
  assignments?: Assignment[];
}

export function TeacherPortalPage() {
  const { user } = useAuth();
  const state = useAsync<TeacherMe>(() => api.get<TeacherMe>('/teachers/me'), []);

  if (state.loading) return <Spinner label="Loading your dashboard…" />;
  if (state.error)
    return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;

  const teacher = state.data;
  const assignments = teacher.assignments ?? [];

  return (
    <div className="page">
      <PageHeader
        title={`Welcome, ${user?.firstName ?? 'Teacher'}`}
        subtitle={teacher.school?.name ?? 'Teacher dashboard'}
      />

      <div className="dashboard">
        <section className="panel">
          <h2 className="panel__title">My profile</h2>
          <dl className="details">
            <div className="details__row">
              <dt>Employee no</dt>
              <dd>{teacher.employeeNo}</dd>
            </div>
            <div className="details__row">
              <dt>Email</dt>
              <dd>{teacher.user?.email ?? '—'}</dd>
            </div>
            <div className="details__row">
              <dt>Phone</dt>
              <dd>{teacher.user?.phone ?? '—'}</dd>
            </div>
            <div className="details__row">
              <dt>Qualification</dt>
              <dd>{teacher.qualification ?? '—'}</dd>
            </div>
            <div className="details__row">
              <dt>Specialization</dt>
              <dd>{teacher.specialization ?? '—'}</dd>
            </div>
            <div className="details__row">
              <dt>Joining date</dt>
              <dd>{formatDate(teacher.joiningDate) || '—'}</dd>
            </div>
            <div className="details__row">
              <dt>Status</dt>
              <dd>{humanize(teacher.status) || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h2 className="panel__title">Quick links</h2>
          <div className="toolbar toolbar--inline">
            {can(user!.role, Permission.ATTENDANCE_MARK) ? (
              <Link to="/attendance/mark" className="btn btn--primary">
                Mark attendance
              </Link>
            ) : null}
            {can(user!.role, Permission.RESULT_MANAGE) ? (
              <Link to="/exams/marks" className="btn btn--primary">
                Enter marks
              </Link>
            ) : null}
            {can(user!.role, Permission.STUDENT_READ) ? (
              <Link to="/resource/students" className="btn btn--ghost">
                Students
              </Link>
            ) : null}
            <Link to="/profile" className="btn btn--ghost">
              Profile
            </Link>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel__title">My classes</h2>
        {assignments.length === 0 ? (
          <p className="muted">No teaching assignments yet.</p>
        ) : (
          <div className="dashboard">
            {assignments.map((assignment) => (
              <StatCard
                key={assignment.id}
                label={assignment.section?.classLevel?.name ?? 'Class'}
                value={assignment.subject?.name ?? '—'}
                hint={[
                  assignment.section?.name,
                  assignment.academicYear?.name,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
