import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader, Spinner, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate, humanize } from '../lib/format';
import { useAsync } from '../lib/useAsync';

interface AttendanceSummary {
  total: number;
  byStatus: Record<string, number>;
}

interface ChildResult {
  id: string;
  marksObtained?: number | null;
  grade?: string | null;
  exam?: { name?: string } | null;
  subject?: { name?: string } | null;
}

interface ChildInvoice {
  id: string;
  invoiceNo?: string | null;
  balance?: number | string | null;
  status?: string | null;
}

interface ChildTeacher {
  id: string;
  name?: string | null;
  photoUrl?: string | null;
  subject?: string | null;
  contact?: string | null;
}

interface Child {
  id: string;
  admissionNo: string;
  rollNo?: string | null;
  status?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  className?: string | null;
  sectionName?: string | null;
  section?: { name?: string; classLevel?: string | null } | null;
  relation?: string | null;
  teachers: ChildTeacher[];
  attendance: AttendanceSummary;
  results: ChildResult[];
  invoices: ChildInvoice[];
  outstanding: number;
}

interface ParentOverview {
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  children: Child[];
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`;
  return letters.toUpperCase() || '?';
}

function Photo({ url, name }: { url?: string | null; name?: string | null }) {
  if (url) {
    return <img className="photo" src={url} alt={name ? `${name} photo` : 'Photo'} />;
  }
  return <span className="photo photo--empty">{initials(name)}</span>;
}

export function ParentPortalPage() {
  const { user } = useAuth();
  const state = useAsync<ParentOverview>(() => api.get<ParentOverview>('/parents/me/children'), []);

  if (state.loading) return <Spinner label="Loading your children…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;

  const { children } = state.data;

  return (
    <div className="page">
      <PageHeader
        title={`Welcome, ${user?.firstName ?? 'Parent'}`}
        subtitle="Your children's progress at a glance"
        actions={
          <div className="toolbar toolbar--inline">
            <Link to="/notifications" className="btn btn--ghost">
              Notifications
            </Link>
          </div>
        }
      />

      {children.length === 0 ? (
        <EmptyState message="No children are linked to your account yet. Please contact the school office." />
      ) : (
        children.map((child) => {
          const attendanceRate =
            child.attendance.total > 0
              ? Math.round(
                  ((child.attendance.byStatus.PRESENT ?? 0) / child.attendance.total) * 100,
                )
              : 0;

          return (
            <section className="panel" key={child.id}>
              <div className="child-header">
                <Photo url={child.photoUrl} name={child.name} />
                <div className="child-header__info">
                  <h2 className="panel__title">{child.name ?? child.admissionNo}</h2>
                  <p className="muted">
                    {[
                      child.className ? `Class ${child.className}` : null,
                      child.sectionName ? `Section ${child.sectionName}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Not assigned to a class yet'}
                  </p>
                </div>
              </div>

              <h3 className="panel__subtitle">Teachers</h3>
              {child.teachers.length === 0 ? (
                <p className="muted">No teachers are assigned to this section yet.</p>
              ) : (
                <ul className="teacher-list">
                  {child.teachers.map((teacher) => (
                    <li className="teacher-card" key={teacher.id}>
                      <Photo url={teacher.photoUrl} name={teacher.name} />
                      <div className="teacher-card__info">
                        <strong>{teacher.name ?? 'Teacher'}</strong>
                        <span className="muted">{teacher.subject ?? '—'}</span>
                        <span className="muted">{teacher.contact ?? '—'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="dashboard">
                <StatCard label="Admission no" value={child.admissionNo} />
                <StatCard label="Roll no" value={child.rollNo ?? '—'} />
                <StatCard label="Class" value={child.className ?? '—'} />
                <StatCard label="Section" value={child.sectionName ?? '—'} />
                <StatCard label="Attendance" value={`${attendanceRate}%`} hint={`${child.attendance.total} records`} />
                <StatCard label="Outstanding" value={formatCurrency(child.outstanding)} />
              </div>

              <h3 className="panel__subtitle">Recent results</h3>
              {child.results.length === 0 ? (
                <p className="muted">No results published yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Subject</th>
                        <th>Marks</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {child.results.map((result) => (
                        <tr key={result.id}>
                          <td>{result.exam?.name ?? '—'}</td>
                          <td>{result.subject?.name ?? '—'}</td>
                          <td>{result.marksObtained ?? '—'}</td>
                          <td>{result.grade ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="panel__subtitle">Recent invoices</h3>
              {child.invoices.length === 0 ? (
                <p className="muted">No invoices issued.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {child.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>{invoice.invoiceNo ?? '—'}</td>
                          <td>{formatCurrency(invoice.balance ?? 0)}</td>
                          <td>{humanize(invoice.status)}</td>
                          <td>{formatDate((invoice as { issueDate?: string }).issueDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
