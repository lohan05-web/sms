import { useState, type ReactNode } from 'react';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonPanels,
  SkeletonTable,
} from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';
import { ForbiddenPage } from '../ForbiddenPage';

export interface ParentChild {
  id: string;
  admissionNo: string;
  name: string | null;
  className: string | null;
  sectionName: string | null;
}

interface ParentOverview {
  children: ParentChild[];
}

export function childLabel(child: ParentChild): string {
  const name = child.name ?? `Admission ${child.admissionNo}`;
  const klass = [child.className, child.sectionName].filter(Boolean).join(' · ');
  return klass ? `${name} — ${klass}` : name;
}

interface ParentChildPageProps<T> {
  title: string;
  subtitle?: string;
  endpoint: (studentId: string) => string;
  emptyMessage?: string;
  isEmpty?: (data: T) => boolean;
  render: (data: T) => ReactNode;
}

/**
 * Shared shell for the parent-only feature pages. Pulls the signed-in parent's
 * children, lets them pick one, and loads the feature from the scoped
 * `/parents/me/children/:id/...` endpoint. A daily defence-in-depth role check
 * mirrors the server-side gate.
 */
export function ParentChildPage<T>({
  title,
  subtitle,
  endpoint,
  emptyMessage,
  isEmpty,
  render,
}: ParentChildPageProps<T>) {
  const { user } = useAuth();
  const [selected, setSelected] = useState('');

  const childrenState = useAsync<ParentChild[]>(async () => {
    const overview = await api.get<ParentOverview>('/parents/me/children');
    return overview.children;
  }, []);

  const children = childrenState.data ?? [];
  const childId = selected || children[0]?.id || '';

  const state = useAsync<T | null>(
    () => (childId ? api.get<T>(endpoint(childId)) : Promise.resolve(null)),
    [childId],
  );

  if (!user) return null;
  if (user.role !== 'PARENT') return <ForbiddenPage />;

  const header = <PageHeader title={title} subtitle={subtitle} />;

  if (childrenState.loading) {
    return (
      <div className="page">
        {header}
        <SkeletonPanels count={1} />
      </div>
    );
  }
  if (childrenState.forbidden) {
    return (
      <div className="page">
        {header}
        <ForbiddenPage />
      </div>
    );
  }
  if (childrenState.error) {
    return (
      <div className="page">
        {header}
        <ErrorState message={childrenState.error} onRetry={childrenState.reload} />
      </div>
    );
  }
  if (children.length === 0) {
    return (
      <div className="page">
        {header}
        <EmptyState message="No children are linked to your account yet. Please contact the school office." />
      </div>
    );
  }

  const data = state.data;
  const showEmpty = data !== null && (isEmpty ? isEmpty(data) : false);

  return (
    <div className="page">
      {header}

      <section className="panel">
        <label className="field">
          <span className="field__label">Child</span>
          <select
            className="field__input"
            value={childId}
            onChange={(event) => setSelected(event.target.value)}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {childLabel(child)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        {state.loading ? (
          <SkeletonTable />
        ) : state.forbidden ? (
          <ForbiddenPage />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : data === null ? null : showEmpty ? (
          <EmptyState message={emptyMessage ?? 'Nothing to show yet.'} />
        ) : (
          render(data)
        )}
      </section>
    </div>
  );
}
