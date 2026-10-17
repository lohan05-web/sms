import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { EmptyState, ErrorState, PageHeader, SkeletonPanels } from './ui';

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

/** Human label for a child row, e.g. "Asha Kumar — Grade 5 · B". */
export function childLabel(child: ParentChild): string {
  const name = child.name ?? `Admission ${child.admissionNo}`;
  const klass = [child.className, child.sectionName].filter(Boolean).join(' · ');
  return klass ? `${name} — ${klass}` : name;
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
 * scoped `/parents/me/children/:id/...` endpoint.
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
      <>
        <PageHeader title={title} subtitle={subtitle} />
        <SkeletonPanels count={1} />
      </>
    );
  }
  if (childrenState.error) {
    return (
      <ErrorState message={childrenState.error} onRetry={childrenState.reload} />
    );
  }
  if (children.length === 0) {
    return (
      <EmptyState message="No children are linked to your account yet. Please contact the school office." />
    );
  }

  const data = state.data;
  const showEmpty = data !== null && (isEmpty ? isEmpty(data) : false);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      {children.length > 1 ? (
        <View style={styles.chips}>
          {children.map((child) => (
            <Chip
              key={child.id}
              label={childLabel(child)}
              active={child.id === childId}
              onPress={() => setSelectedChildId(child.id)}
            />
          ))}
        </View>
      ) : null}

      {state.loading ? (
        <SkeletonPanels count={1} />
      ) : state.forbidden ? (
        <EmptyState message="Your account cannot view this page." icon="lock" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : data === null ? null : showEmpty ? (
        <EmptyState message={emptyMessage ?? 'Nothing to show yet.'} />
      ) : (
        render(data as T)
      )}
    </>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = {
  chips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600' as const,
  },
} as const;
