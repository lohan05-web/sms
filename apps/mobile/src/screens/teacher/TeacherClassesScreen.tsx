import { useNavigation } from '@react-navigation/native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  Chip,
  TeacherEmpty,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import {
  emptyPage,
  fetchStudentsForSections,
  useTeacherScope,
  type PageFetch,
  type TeacherStudent,
} from '../../lib/teacherScope';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

interface ClassCard {
  sectionId: string;
  className: string;
  sectionName: string;
  subjects: string[];
  studentCount: number;
  periods: number;
}

/** Port of the web `/teacher/classes` screen: the sections a teacher teaches. */
export function TeacherClassesScreen() {
  const navigation = useNavigation<Nav>();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const scopeKey = scope ? scope.sectionIds.join(',') : '';

  const students = useAsync<PageFetch<TeacherStudent>>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve(emptyPage())),
    [scopeKey],
  );

  const countBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const student of students.data?.items ?? []) {
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
      card.periods = scope.timetableEntries.filter((entry) => entry.section?.id === card.sectionId)
        .length;
    }
    return [...byId.values()].sort((a, b) =>
      `${a.className} ${a.sectionName}`.localeCompare(`${b.className} ${b.sectionName}`, undefined, {
        numeric: true,
      }),
    );
  }, [scope, countBySection]);

  const totalStudents = students.data?.total ?? 0;
  const studentsTruncated = students.data?.truncated ?? false;

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || students.loading) return <SkeletonPanels count={3} />;
  if (error ?? students.error) {
    return <ErrorState message={error ?? students.error ?? ''} onRetry={reload} />;
  }

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard label="Classes" value={cards.length} hint="Sections you teach" icon="sections" />
        <StatCard
          label="Students"
          value={totalStudents}
          hint="Across your sections"
          icon="students"
          tone="info"
        />
        <StatCard
          label="Subjects"
          value={scope?.subjects.length ?? 0}
          hint="Assigned to you"
          icon="subject"
          tone="success"
        />
        <StatCard
          label="Weekly periods"
          value={scope?.timetableEntries.length ?? 0}
          hint="Timetabled"
          icon="timetable"
          tone="warning"
        />
      </StatGrid>

      <TeacherPanel title="My classes" subtitle="Class, section and subjects" icon="class">
        {studentsTruncated ? (
          <TeacherNotice
            tone="warning"
            icon="alert"
            message={`${totalStudents} students are enrolled across your sections, but only the first ${students.data?.items.length ?? 0} could be loaded in one pass. Per-class counts below cover that loaded subset.`}
          />
        ) : null}
        {cards.length === 0 ? (
          <TeacherEmpty
            message="You have no teaching assignments yet."
            hint="An administrator allocates class and subject periods to your account — your classes appear here as soon as that is done."
            icon="class"
          />
        ) : (
          <View style={styles.grid}>
            {cards.map((card) => (
              <View key={card.sectionId} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}>
                    <Icon name="class" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.cardHeadText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {card.className}
                      {card.sectionName ? ` · ${card.sectionName}` : ''}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {card.studentCount} student{card.studentCount === 1 ? '' : 's'} · {card.periods}{' '}
                      period{card.periods === 1 ? '' : 's'}/week
                    </Text>
                  </View>
                </View>

                <View style={styles.chipRow}>
                  {card.subjects.length === 0 ? (
                    <Text style={styles.muted}>No subjects assigned</Text>
                  ) : (
                    card.subjects.map((subject) => <Chip key={subject} label={subject} tone="info" />)
                  )}
                </View>

                <View style={styles.cardActions}>
                  <ActionButton
                    label="Students"
                    icon="students"
                    onPress={() =>
                      navigation.navigate(ROUTES.teacher.students, { section: card.sectionId })
                    }
                  />
                  <ActionButton
                    label="Attendance"
                    icon="attendance"
                    onPress={() =>
                      navigation.navigate(ROUTES.teacher.attendance, { section: card.sectionId })
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'students' | 'attendance';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, pressed ? { opacity: 0.6 } : null]}
    >
      <Icon name={icon} size={14} color={colors.primary} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  cardHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  cardActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  action: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  actionLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
  },
} as const;
