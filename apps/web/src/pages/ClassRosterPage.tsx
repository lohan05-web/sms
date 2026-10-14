import { Permission } from '@smartschool/shared';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { humanize } from '../lib/format';
import { can } from '../lib/permissions';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

interface RosterStudent {
  id: string;
  admissionNo: string;
  name: string;
  gender: string;
  status: string;
}

interface RosterClass {
  id: string;
  name: string;
  numericLevel: number;
  sections: string[];
  teacher: string | null;
  studentCount: number;
  students: RosterStudent[];
}

export function ClassRosterPage() {
  const { user } = useAuth();
  if (!user || !can(user.role, Permission.CLASS_READ)) return <ForbiddenPage />;
  return <ClassRosterView />;
}

function ClassRosterView() {
  const state = useAsync<RosterClass[]>(() => api.get<RosterClass[]>('/classes/roster'), []);
  const [search, setSearch] = useState('');

  const classes = state.data ?? [];
  const query = search.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return classes;
    return classes.filter(
      (cls) =>
        cls.name.toLowerCase().includes(query) ||
        cls.students.some(
          (student) =>
            student.name.toLowerCase().includes(query) ||
            student.admissionNo.toLowerCase().includes(query),
        ),
    );
  }, [classes, query]);

  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);

  return (
    <div className="page">
      <PageHeader
        title="Class Roster"
        subtitle="Students assigned to each class"
        actions={
          <div className="toolbar toolbar--inline">
            <span className="panel__meta">
              {classes.length} classes · {totalStudents} students
            </span>
            <button type="button" className="btn btn--ghost" onClick={state.reload}>
              Refresh
            </button>
          </div>
        }
      />

      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <input
          className="field__input"
          type="search"
          placeholder="Search classes or students…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </form>

      {state.loading ? (
        <Spinner label="Loading class roster…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : classes.length === 0 ? (
        <EmptyState message="No classes found." />
      ) : visible.length === 0 ? (
        <EmptyState message="No classes match your search." />
      ) : (
        visible.map((cls) => (
          <section className="panel" key={cls.id}>
            <div className="toolbar toolbar--inline toolbar--wrap roster-toolbar">
              <h2 className="panel__title">{cls.name}</h2>
              <span className="toolbar__spacer" />
              <span className="panel__meta">
                {cls.studentCount} students
                {cls.sections.length ? ` · Section ${cls.sections.join(', ')}` : ''}
                {cls.teacher ? ` · Teacher: ${cls.teacher}` : ' · No teacher assigned'}
              </span>
            </div>
            {cls.students.length === 0 ? (
              <EmptyState message="No students assigned to this class." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Admission No</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.students.map((student, index) => (
                      <tr key={student.id}>
                        <td>{index + 1}</td>
                        <td>{student.admissionNo}</td>
                        <td>{student.name || '—'}</td>
                        <td>{humanize(student.gender)}</td>
                        <td>{humanize(student.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
