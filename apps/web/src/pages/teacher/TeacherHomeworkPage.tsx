import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, StatCard } from '../../components/ui';
import { LearningArt } from '../../components/illustrations';
import { formatDate } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import {
  TeacherScaffold,
  fetchTeacherHomework,
  useTeacherScope,
  type HomeworkItem,
} from './teacherScope';

function dueStatus(item: HomeworkItem): { label: string; className: string } {
  if (!item.dueDate) return { label: 'No due date', className: 'badge badge--default' };
  const due = new Date(item.dueDate).getTime();
  const now = Date.now();
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Overdue', className: 'badge badge--danger' };
  if (days <= 2) return { label: days === 0 ? 'Due today' : `Due in ${days}d`, className: 'badge badge--warning' };
  return { label: `Due in ${days}d`, className: 'badge badge--success' };
}

export function TeacherHomeworkPage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const teacherId = scope?.teacher.id ?? '';

  const homework = useAsync<{ items: HomeworkItem[]; total: number }>(
    () => (scope ? fetchTeacherHomework(scope.teacher.id) : Promise.resolve({ items: [], total: 0 })),
    [teacherId],
  );

  const [sectionFilter, setSectionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const items = homework.data?.items ?? [];

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (sectionFilter !== 'all' && item.section?.id !== sectionFilter) return false;
        if (subjectFilter !== 'all' && item.subject?.id !== subjectFilter) return false;
        return true;
      }),
    [items, sectionFilter, subjectFilter],
  );

  const total = homework.data?.total ?? 0;

  return (
    <TeacherScaffold
      title="Homework"
      subtitle="Homework you have assigned to your classes"
      icon="homework"
      loading={loading || homework.loading}
      error={error ?? homework.error}
      forbidden={forbidden || homework.forbidden}
      reload={reload}
      actions={
        <Link className="btn btn--primary" to="/resource/homework">
          <Icon name="plus" size={16} />
          New homework
        </Link>
      }
    >
      <section className="stat-grid" aria-label="Homework summary">
        <StatCard label="Total assigned" value={total} hint="By you" icon="homework" />
        <StatCard label="Shown" value={filtered.length} hint="After filters" icon="roster" tone="info" />
        <StatCard
          label="Sections"
          value={scope?.sections.length ?? 0}
          hint="Classes you teach"
          icon="sections"
          tone="success"
        />
        <StatCard
          label="Subjects"
          value={scope?.subjects.length ?? 0}
          hint="Assigned to you"
          icon="subject"
          tone="warning"
        />
      </section>

      <section className="panel">
        <div className="toolbar toolbar--inline">
          <label className="field field--inline">
            <span className="field__label">Section</span>
            <select
              className="field__input field__input--compact"
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
            >
              <option value="all">All my classes</option>
              {(scope?.sections ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.classLevelName ? `${section.classLevelName} · ` : ''}
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span className="field__label">Subject</span>
            <select
              className="field__input field__input--compact"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              <option value="all">All subjects</option>
              {(scope?.subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <span className="toolbar__spacer" />
          <span className="muted">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          items.length === 0 ? (
            <EmptyState
              message="You have not assigned any homework yet."
              hint="Create homework for one of your classes — students and guardians see it straight away."
              icon="homework"
              illustration={<LearningArt />}
            />
          ) : (
            <EmptyState message="No homework matches your filters." icon="homework" />
          )
        ) : (
          <div className="dashboard">
            {filtered.map((item) => {
              const status = dueStatus(item);
              return (
                <article className="panel homework-card" key={item.id}>
                  <div className="panel__header">
                    <h3 className="panel__title">{item.title}</h3>
                    <span className={status.className}>{status.label}</span>
                  </div>
                  <p className="muted">
                    {[item.subject?.name, item.section?.classLevel?.name, item.section?.name]
                      .filter(Boolean)
                      .join(' · ') || 'No subject'}
                  </p>
                  <p className="muted">
                    Assigned {formatDate(item.assignedDate) || '—'} · Due{' '}
                    {formatDate(item.dueDate) || '—'} · {item._count?.submissions ?? 0} submission
                    {(item._count?.submissions ?? 0) === 1 ? '' : 's'}
                  </p>
                  {item.description ? <p>{item.description}</p> : null}
                  <div className="homework-card__actions">
                    <Link
                      className="btn btn--ghost btn--sm"
                      to={`/resource/homework?search=${encodeURIComponent(item.title)}`}
                    >
                      Open in homework
                      <Icon name="arrow-right" size={14} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </TeacherScaffold>
  );
}
