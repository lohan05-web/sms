import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { FilterChips } from '../../components/DataList';
import {
  Chip,
  TeacherEmpty,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { useTeacherScope, type TeacherAssignment } from '../../lib/teacherScope';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

interface AssignmentRow extends TeacherAssignment {
  periods: number;
}

/** Port of the web `/teacher/assignments` screen: class–subject allocations. */
export function TeacherAssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const [subjectFilter, setSubjectFilter] = useState('all');

  const rows = useMemo<AssignmentRow[]>(() => {
    if (!scope) return [];
    return scope.assignments
      .map((assignment) => ({
        ...assignment,
        periods: scope.timetableEntries.filter(
          (entry) =>
            entry.subject?.id === assignment.subject?.id &&
            entry.section?.id === assignment.section?.id,
        ).length,
      }))
      .sort((a, b) => {
        const left = `${a.section?.classLevel?.name ?? ''}${a.section?.name ?? ''}${a.subject?.name ?? ''}`;
        const right = `${b.section?.classLevel?.name ?? ''}${b.section?.name ?? ''}${b.subject?.name ?? ''}`;
        return left.localeCompare(right, undefined, { numeric: true });
      });
  }, [scope]);

  const filtered = useMemo(
    () => (subjectFilter === 'all' ? rows : rows.filter((row) => row.subject?.id === subjectFilter)),
    [rows, subjectFilter],
  );

  const subjectOptions = useMemo(
    () => [
      { value: 'all', label: 'All subjects' },
      ...(scope?.subjects ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
    ],
    [scope],
  );

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading) return <SkeletonPanels count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard label="Assignments" value={rows.length} hint="Class–subject pairs" icon="subject" />
        <StatCard
          label="Classes"
          value={scope?.sections.length ?? 0}
          hint="Sections you teach"
          icon="sections"
          tone="info"
        />
        <StatCard
          label="Subjects"
          value={scope?.subjects.length ?? 0}
          hint="Distinct subjects"
          icon="class"
          tone="success"
        />
        <StatCard
          label="Weekly periods"
          value={scope?.timetableEntries.length ?? 0}
          hint="Across all sections"
          icon="timetable"
          tone="warning"
        />
      </StatGrid>

      <TeacherPanel
        title="Teaching assignments"
        subtitle={`${filtered.length} shown`}
        icon="roster"
        action={
          <NavPill label="Timetable" onPress={() => navigation.navigate(ROUTES.teacher.timetable)} />
        }
      >
        {subjectOptions.length > 1 ? (
          <FilterChips options={subjectOptions} value={subjectFilter} onChange={setSubjectFilter} />
        ) : null}

        {filtered.length === 0 ? (
          <TeacherEmpty
            message="You have no teaching assignments yet."
            hint="The class and subject pairs an administrator allocates to you will be listed here."
            icon="subject"
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((row) => (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {[row.section?.classLevel?.name, row.section?.name]
                      .filter(Boolean)
                      .join(' · ') || 'Class'}
                  </Text>
                  <Chip label={`${row.periods} / wk`} tone="navy" />
                </View>
                <View style={styles.chipRow}>
                  <Chip label={row.subject?.name ?? '—'} tone="info" />
                  {row.subject?.code ? <Chip label={row.subject.code} /> : null}
                  {row.academicYear?.name ? <Chip label={row.academicYear.name} /> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

function NavPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.pill}
    >
      {label}
    </Text>
  );
}

const styles = {
  list: {
    gap: 10,
  },
  card: {
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  cardHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  pill: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
} as const;
