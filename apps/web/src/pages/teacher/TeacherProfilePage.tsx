import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { StatCard } from '../../components/ui';
import { formatDate, humanize, initials } from '../../lib/format';
import { TeacherScaffold, useTeacherScope } from './teacherScope';

export function TeacherProfilePage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const teacher = scope?.teacher;

  return (
    <TeacherScaffold
      title="My Profile"
      subtitle="Your teaching profile and account details"
      icon="user"
      loading={loading}
      error={error}
      forbidden={forbidden}
      reload={reload}
      actions={
        <Link className="btn btn--primary" to="/profile">
          <Icon name="settings" size={16} />
          Account settings
        </Link>
      }
    >
      {teacher ? (
        <>
          <section className="panel">
            <div className="profile-card">
              <span className="avatar avatar--lg">
                {initials(teacher.user?.firstName, teacher.user?.lastName)}
              </span>
              <div className="profile-card__body">
                <h2 className="profile-card__name">
                  {teacher.user?.firstName} {teacher.user?.lastName}
                </h2>
                <p className="profile-card__meta">
                  {humanize(teacher.designation) || 'Teacher'} · {teacher.employeeNo}
                </p>
                <p className="profile-card__meta">
                  {teacher.school?.name ?? '—'}
                  {teacher.user?.email ? ` · ${teacher.user.email}` : ''}
                </p>
                <span
                  className={`badge ${teacher.status === 'ACTIVE' ? 'badge--success' : 'badge--default'}`}
                >
                  {humanize(teacher.status) || 'Active'}
                </span>
              </div>
            </div>
          </section>

          <section className="stat-grid" aria-label="Profile summary">
            <StatCard label="Classes" value={scope?.sections.length ?? 0} hint="Sections" icon="sections" />
            <StatCard label="Subjects" value={scope?.subjects.length ?? 0} hint="Assigned" icon="subject" tone="info" />
            <StatCard
              label="Weekly periods"
              value={scope?.timetableEntries.length ?? 0}
              hint="Timetabled"
              icon="timetable"
              tone="success"
            />
            <StatCard
              label="Assignments"
              value={scope?.assignments.length ?? 0}
              hint="Class–subject pairs"
              icon="roster"
              tone="warning"
            />
          </section>

          <section className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Employment details</h2>
            </div>
            <dl className="details">
              <div className="details__row">
                <dt>Employee no</dt>
                <dd>{teacher.employeeNo}</dd>
              </div>
              <div className="details__row">
                <dt>Designation</dt>
                <dd>{humanize(teacher.designation) || '—'}</dd>
              </div>
              <div className="details__row">
                <dt>Employment type</dt>
                <dd>{humanize(teacher.employmentType) || '—'}</dd>
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
                <dt>Email</dt>
                <dd>{teacher.user?.email ?? '—'}</dd>
              </div>
              <div className="details__row">
                <dt>Phone</dt>
                <dd>{teacher.user?.phone ?? '—'}</dd>
              </div>
              <div className="details__row">
                <dt>Status</dt>
                <dd>{humanize(teacher.status) || '—'}</dd>
              </div>
            </dl>
          </section>
        </>
      ) : null}
    </TeacherScaffold>
  );
}
