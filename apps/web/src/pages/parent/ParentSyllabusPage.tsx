import { EmptyState } from '../../components/ui';
import { formatDate, humanize } from '../../lib/format';
import { ParentChildPage } from './ParentChildPage';

interface SyllabusUnit {
  id: string;
  title: string;
  description: string | null;
  upcomingTopic: string | null;
  orderIndex: number;
  status: string;
  completedAt: string | null;
  subject?: { id?: string; name?: string | null; code?: string | null } | null;
}

function statusBadge(status: string): string {
  if (status === 'COMPLETED') return 'badge badge--success';
  if (status === 'IN_PROGRESS') return 'badge badge--warning';
  return 'badge';
}

interface SubjectGroup {
  key: string;
  name: string;
  units: SyllabusUnit[];
}

function groupBySubject(units: SyllabusUnit[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();
  for (const unit of units) {
    const key = unit.subject?.id ?? unit.subject?.name ?? 'other';
    const group = groups.get(key) ?? {
      key,
      name: unit.subject?.name ?? 'General',
      units: [],
    };
    group.units.push(unit);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function ParentSyllabusPage() {
  return (
    <ParentChildPage<SyllabusUnit[]>
      title="Syllabus & Notes"
      subtitle="What the class is covering, subject by subject"
      endpoint={(studentId) => `/parents/me/children/${studentId}/syllabus`}
      emptyMessage="No syllabus has been published for this class yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => {
        const groups = groupBySubject(data);
        return (
          <div className="dashboard">
            {groups.map((group) => {
              const completed = group.units.filter((unit) => unit.status === 'COMPLETED').length;
              const percent = group.units.length
                ? Math.round((completed / group.units.length) * 100)
                : 0;
              return (
                <section className="panel" key={group.key}>
                  <div className="panel__heading">
                    <span className="panel__icon">
                      <span aria-hidden="true">📘</span>
                    </span>
                    <div>
                      <h2 className="panel__title">{group.name}</h2>
                      <p className="panel__desc">
                        {completed} of {group.units.length} units completed · {percent}%
                      </p>
                    </div>
                  </div>

                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Unit</th>
                          <th>Status</th>
                          <th>Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.units.map((unit, index) => (
                          <tr key={unit.id}>
                            <td>{index + 1}</td>
                            <td>
                              <strong>{unit.title}</strong>
                              {unit.description ? (
                                <div className="parent-row__meta">{unit.description}</div>
                              ) : null}
                              {unit.status !== 'COMPLETED' && unit.upcomingTopic ? (
                                <div className="parent-row__meta">
                                  Next up: {unit.upcomingTopic}
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <span className={statusBadge(unit.status)}>
                                {humanize(unit.status)}
                              </span>
                            </td>
                            <td>{unit.completedAt ? formatDate(unit.completedAt) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
            {groups.length === 0 ? (
              <EmptyState message="No syllabus has been published for this class yet." />
            ) : null}
          </div>
        );
      }}
    />
  );
}
