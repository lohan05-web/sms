import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { FilterChips } from '../../components/DataList';
import {
  Chip,
  TeacherButton,
  TeacherEmpty,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { formatDate } from '../../lib/format';
import {
  emptyPage,
  fetchTeacherHomework,
  useTeacherScope,
  type HomeworkItem,
  type PageFetch,
} from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

function dueStatus(item: HomeworkItem): { label: string; tone: 'default' | 'success' | 'warning' | 'danger' } {
  if (!item.dueDate) return { label: 'No due date', tone: 'default' };
  const due = new Date(item.dueDate).getTime();
  const days = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(due)) return { label: 'No due date', tone: 'default' };
  if (days < 0) return { label: 'Overdue', tone: 'danger' };
  if (days <= 2)
    return { label: days === 0 ? 'Due today' : `Due in ${days}d`, tone: 'warning' };
  return { label: `Due in ${days}d`, tone: 'success' };
}

/**
 * Port of the web `/teacher/homework` screen: homework the teacher has
 * assigned, filtered by section and subject, with a shortcut into the shared
 * homework module for creating and reviewing submissions.
 */
export function TeacherHomeworkScreen() {
  const navigation = useNavigation<Nav>();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const teacherId = scope?.teacher.id ?? '';

  const homework = useAsync<PageFetch<HomeworkItem>>(
    () => (scope ? fetchTeacherHomework(scope.teacher.id) : Promise.resolve(emptyPage())),
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

  const sectionOptions = useMemo(
    () => [
      { value: 'all', label: 'All my classes' },
      ...(scope?.sections ?? []).map((section) => ({
        value: section.id,
        label: section.classLevelName
          ? `${section.classLevelName} · ${section.name}`
          : section.name,
      })),
    ],
    [scope],
  );

  const subjectOptions = useMemo(
    () => [
      { value: 'all', label: 'All subjects' },
      ...(scope?.subjects ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
    ],
    [scope],
  );

  const total = homework.data?.total ?? 0;

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || homework.loading) return <SkeletonPanels count={3} />;
  if (error ?? homework.error) {
    return <ErrorState message={error ?? homework.error ?? ''} onRetry={reload} />;
  }

  return (
    <TeacherPage>
      <StatGrid>
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
      </StatGrid>

      <TeacherPanel title="Filters" subtitle={`${filtered.length} shown`} icon="roster">
        <FilterChips options={sectionOptions} value={sectionFilter} onChange={setSectionFilter} />
        <FilterChips options={subjectOptions} value={subjectFilter} onChange={setSubjectFilter} />
      </TeacherPanel>

      <TeacherPanel title="Homework" subtitle="Homework you have assigned to your classes" icon="homework">
        {homework.data?.truncated ? (
          <TeacherNotice
            tone="warning"
            icon="alert"
            message={`Only the first ${homework.data.items.length} of ${homework.data.total} assignments could be loaded in one pass. Use the class and subject filters to reach the rest.`}
          />
        ) : null}
        {filtered.length === 0 ? (
          items.length === 0 ? (
            <TeacherEmpty
              message="You have not assigned any homework yet."
              hint="Create homework for one of your classes — students and guardians see it straight away."
              icon="homework"
            />
          ) : (
            <TeacherEmpty message="No homework matches your filters." icon="homework" />
          )
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => {
              const status = dueStatus(item);
              const submissions = item._count?.submissions ?? 0;
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Chip label={status.label} tone={status.tone} />
                  </View>

                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {[item.subject?.name, item.section?.classLevel?.name, item.section?.name]
                      .filter(Boolean)
                      .join(' · ') || 'No subject'}
                  </Text>

                  <Text style={styles.cardMeta}>
                    Assigned {formatDate(item.assignedDate) || '—'} · Due{' '}
                    {formatDate(item.dueDate) || '—'} · {submissions} submission
                    {submissions === 1 ? '' : 's'}
                  </Text>

                  {item.description ? (
                    <Text style={styles.cardBody} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}

                  <Text
                    onPress={() => navigation.navigate(ROUTES.admin.resource, { key: 'homework' })}
                    accessibilityRole="link"
                    accessibilityLabel="Open in homework"
                    style={styles.link}
                  >
                    Open in homework →
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </TeacherPanel>

      <TeacherButton
        label="New homework"
        icon="plus"
        onPress={() => navigation.navigate(ROUTES.admin.resource, { key: 'homework' })}
      />
    </TeacherPage>
  );
}

const styles = {
  list: {
    gap: 12,
  },
  card: {
    gap: 6,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  cardHead: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 19,
  },
  cardMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  link: {
    alignSelf: 'flex-start',
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.primary,
  },
} as const;
