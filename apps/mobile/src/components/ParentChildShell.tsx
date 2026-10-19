import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { api } from '../lib/api';
import { initials } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { ParentEmpty, ParentError, ParentHeader, ParentPage, ParentSelectChip } from './parent/parentUi';
import { SkeletonPanels } from './ui';

export interface ParentChild {
  id: string;
  admissionNo: string;
  name: string | null;
  /** The child's saved photo (a small data URL), or null. */
  photoUrl?: string | null;
  className: string | null;
  sectionName: string | null;
}

interface ParentOverview {
  children: ParentChild[];
}

/** Human label for a child row, e.g. "Asha Kumar — Grade 5 · B". */
export function childLabel(child: ParentChild): string {
  const name = child.name ?? `Admission ${child.admissionNo}`;
  const klass = [child.className, child.sectionName].filter(Boolean).join(' · ');
  return klass ? `${name} — ${klass}` : name;
}

/** Two-letter avatar fallback derived from the child's name or admission no. */
function childInitials(child: ParentChild): string {
  if (child.name) {
    const [first, ...rest] = child.name.split(' ');
    return initials(first, rest.join(' ')) || child.admissionNo.slice(0, 2).toUpperCase();
  }
  return child.admissionNo.slice(0, 2).toUpperCase();
}

interface ParentChildShellProps<T> {
  title: string;
  subtitle?: string;
  endpoint: (studentId: string) => string;
  emptyMessage?: string;
  isEmpty?: (data: T) => boolean;
  render: (data: T) => ReactNode;
}

/**
 * Shared shell for the parent-only feature screens. Pulls the signed-in
 * parent's children, lets them pick one, and loads the feature from the
 * scoped `/parents/me/children/:id/...` endpoint. Rendered in the parent
 * palette so every child page reads as part of the same portal.
 */
export function ParentChildShell<T>({
  title,
  subtitle,
  endpoint,
  emptyMessage,
  isEmpty,
  render,
}: ParentChildShellProps<T>) {
  const [selectedChildId, setSelectedChildId] = useState('');

  const childrenState = useAsync<ParentChild[]>(async () => {
    const overview = await api.get<ParentOverview>('/parents/me/children');
    return overview.children;
  }, []);

  const children = childrenState.data ?? [];
  const childId = selectedChildId || children[0]?.id || '';

  const state = useAsync<T | null>(
    () => (childId ? api.get<T>(endpoint(childId)) : Promise.resolve(null)),
    [childId],
  );

  if (childrenState.loading) {
    return (
      <ParentPage>
        <ParentHeader title={title} subtitle={subtitle} />
        <SkeletonPanels count={1} />
      </ParentPage>
    );
  }
  if (childrenState.error) {
    return (
      <ParentPage>
        <ParentHeader title={title} subtitle={subtitle} />
        <ParentError message={childrenState.error} onRetry={childrenState.reload} />
      </ParentPage>
    );
  }
  if (children.length === 0) {
    return (
      <ParentPage>
        <ParentHeader title={title} subtitle={subtitle} />
        <ParentEmpty
          icon="parents"
          message="No children are linked to your account yet."
          hint="Please contact the school office to link your children."
        />
      </ParentPage>
    );
  }

  const data = state.data;
  const showEmpty = data !== null && (isEmpty ? isEmpty(data) : false);

  return (
    <ParentPage>
      <ParentHeader title={title} subtitle={subtitle} />

      {children.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {children.map((child) => (
            <ParentSelectChip
              key={child.id}
              label={childLabel(child)}
              active={child.id === childId}
              onPress={() => setSelectedChildId(child.id)}
              photoUrl={child.photoUrl}
              initials={childInitials(child)}
            />
          ))}
        </View>
      ) : null}

      {state.loading ? (
        <SkeletonPanels count={1} />
      ) : state.forbidden ? (
        <ParentEmpty icon="lock" message="Your account cannot view this page." />
      ) : state.error ? (
        <ParentError message={state.error} onRetry={state.reload} />
      ) : data === null ? null : showEmpty ? (
        <ParentEmpty message={emptyMessage ?? 'Nothing to show yet.'} />
      ) : (
        render(data as T)
      )}
    </ParentPage>
  );
}
