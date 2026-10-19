import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui';
import { ClassroomArt } from '../../components/illustrations';
import {
  TeacherScaffold,
  fetchStudentsForSections,
  useTeacherScope,
  type TeacherStudent,
} from './teacherScope';
import { useAsync } from '../../lib/useAsync';

interface ClassCard {
  sectionId: string;
  className: string;
  sectionName: string;
  subjects: string[];
  studentCount: number;
  periods: number;
}

export function TeacherClassesPage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const scopeKey = scope ? scope.sectionIds.join(',') : '';

  const students = useAsync<TeacherStudent[]>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve([])),
    [scopeKey],
  );

  const countBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const student of students.data ?? []) {
      const id = student.section?.id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [students.data]);

  const cards = useMemo<ClassCard[]>(() => {
    if (!scope) return [];
    const byId = new Map<string, ClassCard>();
    for (const assignment of scope.assignments) {
      const sectionId = assignment.section?.id ?? '';
      if (!sectionId) continue;
      let card = byId.get(sectionId);
      if (!card) {
        card = {
          sectionId,
          className: assignment.section?.classLevel?.name ?? 'Class',
          sectionName: assignment.section?.name ?? '',
          subjects: [],
          studentCount: 0,
          periods: 0,
        };
        byId.set(sectionId, card);
      }
      const subjectName = assignment.subject?.name;
      if (subjectName && !card.subjects.includes(subjectName)) card.subjects.push(subjectName);
    }
    for (const section of scope.sections) {
      if (!byId.has(section.id)) {
        byId.set(section.id, {
          sectionId: section.id,
          className: section.classLevelName || 'Class',
          sectionName: section.name,
          subjects: [],
          studentCount: 0,
          periods: 0,
        });
      }
    }
    for (const card of byId.values()) {
      card.studentCount = countBySection.get(card.sectionId) ?? 0;
      card.periods = scope.timetableEntries.filter(
        (entry) => entry.section?.id === card.sectionId,
      ).length;
    }
    return [...byId.values()].sort((a, b) =>
      `${a.className} ${a.sectionName}`.localeCompare(`${b.className} ${b.sectionName}`, undefined, {
        numeric: true,
      }),
    );
  }, [scope, countBySection]);

  const totalStudents = (students.data ?? []).length;

  return (
    <TeacherScaffold
      title="My Classes"
      subtitle={
        scope
          ? `${cards.length} class${cards.length === 1 ? '' : 'es'} · ${totalStudents} student${totalStudents === 1 ? '' : 's'}`
          : 'The classes and sections you teach'
      }
      icon="class"
      loading={loading || students.loading}
      error={error ?? students.error}
      forbidden={forbidden || students.forbidden}
      reload={reload}
    >
      {cards.length === 0 ? (
        <EmptyState
          message="You have no teaching assignments yet."
          hint="An administrator allocates class and subject periods to your account — your classes appear here as soon as that is done."
          icon="class"
          illustration={<ClassroomArt />}
        />
      ) : (
        <div className="class-grid">
          {cards.map((card) => (
            <article className="panel class-card" key={card.sectionId}>
              <div className="class-card__head">
                <span className="class-card__badge">
                  <Icon name="class" size={16} />
                </span>
                <div>
                  <h3 className="class-card__title">
                    {card.className}
                    {card.sectionName ? ` · ${card.sectionName}` : ''}
                  </h3>
                  <p className="class-card__meta">
                    {card.studentCount} student{card.studentCount === 1 ? '' : 's'} · {card.periods}{' '}
                    period{card.periods === 1 ? '' : 's'}/week
                  </p>
                </div>
              </div>
              <div className="class-card__subjects">
                {card.subjects.length === 0 ? (
                  <span className="muted">No subjects assigned</span>
                ) : (
                  card.subjects.map((subject) => (
                    <span className="badge badge--info" key={subject}>
                      {subject}
                    </span>
                  ))
                )}
              </div>
              <div className="class-card__actions">
                <Link
                  className="btn btn--ghost btn--sm"
                  to={`/teacher/students?section=${card.sectionId}`}
                >
                  <Icon name="students" size={14} />
                  Students
                </Link>
                <Link
                  className="btn btn--ghost btn--sm"
                  to={`/teacher/attendance?section=${card.sectionId}`}
                >
                  <Icon name="attendance" size={14} />
                  Attendance
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </TeacherScaffold>
  );
}
