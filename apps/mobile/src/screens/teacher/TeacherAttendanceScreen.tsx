import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FilterChips } from '../../components/DataList';
import { Icon } from '../../components/Icon';
import {
  Chip,
  TeacherButton,
  TeacherEmpty,
  TeacherPage,
  TeacherPanel,
  type ChipTone,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { attendanceIndicatorLabel } from '@smartschool/shared';
import { useAsync } from '../../lib/useAsync';
import {
  EMPTY_ATTENDANCE_SUMMARY,
  fetchAttendanceSummary,
  mergeAttendanceSummaries,
  useTeacherScope,
  type AttendanceSummary,
  type AttendanceSummaryStudent,
} from '../../lib/teacherScope';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  share: number;
  tone: ChipTone;
}

/**
 * Port of the web `/teacher/attendance` screen: the attendance percentage per
 * student across the sections the teacher owns, plus the status breakdown.
 * Saving registers lives on the dedicated mark-attendance screen.
 */
export function TeacherAttendanceScreen() {
  const route = useRoute();
  const navigation = useNavigation<Nav>();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();

  const scopeKey = scope ? scope.sectionIds.join(',') : '';
  const params = route.params as { section?: string } | undefined;

  const summaries = useAsync<AttendanceSummary[]>(() => {
    if (!scope || scope.sectionIds.length === 0) return Promise.resolve([]);
    return Promise.all(scope.sectionIds.map((id) => fetchAttendanceSummary(id)));
  }, [scopeKey]);

  const [sectionFilter, setSectionFilter] = useState<string>(
    params?.section ? (params.section as string) : 'all',
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

  const selected = useMemo(() => {
    const all = summaries.data ?? [];
    if (sectionFilter === 'all') return mergeAttendanceSummaries(all);
    const index = scope?.sectionIds.indexOf(sectionFilter) ?? -1;
    return index >= 0 && all[index] ? all[index]! : EMPTY_ATTENDANCE_SUMMARY;
  }, [summaries.data, sectionFilter, scope]);

  const breakdown = useMemo<BreakdownRow[]>(() => {
    const overall = selected.overall;
    const total = overall.total || 1;
    const rows: [string, string, number, ChipTone][] = [
      ['present', 'Present', overall.present, 'success'],
      ['absent', 'Absent', overall.absent, 'danger'],
      ['late', 'Late', overall.late, 'warning'],
      ['excused', 'Excused', overall.excused, 'info'],
      ['halfDay', 'Half day', overall.halfDay, 'navy'],
    ];
    return rows.map(([key, label, count, tone]) => ({
      key,
      label,
      count,
      share: Math.round((count / total) * 100),
      tone,
    }));
  }, [selected]);

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || summaries.loading) return <SkeletonPanels count={3} />;
  if (error ?? summaries.error) {
    return <ErrorState message={error ?? summaries.error ?? ''} onRetry={reload} />;
  }

  const overall = selected.overall;
  const hasSections = (scope?.sections.length ?? 0) > 0;

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard
          label="Overall"
          value={`${overall.percentage}%`}
          hint={attendanceIndicatorLabel(overall.indicator)}
          icon="trending"
          tone={overall.indicator === 'good' ? 'success' : overall.indicator === 'warning' ? 'warning' : 'danger'}
        />
        <StatCard label="Present" value={overall.present} hint="Marks recorded" icon="check" tone="success" />
        <StatCard label="Absent" value={overall.absent} hint="Marks recorded" icon="close" tone="danger" />
        <StatCard label="Late" value={overall.late} hint="Marks recorded" icon="timetable" tone="warning" />
        <StatCard
          label="Registers"
          value={overall.total}
          hint={sectionFilter === 'all' ? 'Across all sections' : 'This section'}
          icon="attendance"
          tone="info"
        />
        <StatCard
          label="Students"
          value={selected.students.length}
          hint="With records"
          icon="students"
          tone="primary"
        />
      </StatGrid>

      <TeacherPanel
        title="Status breakdown"
        subtitle={overall.total > 0 ? `${overall.total} marks recorded` : 'No marks yet'}
        icon="attendance"
        action={
          hasSections ? (
            <NavPill
              label="Mark attendance"
              icon="plus"
              onPress={() =>
                navigation.navigate(ROUTES.teacher.attendanceMark, {
                  section: sectionFilter === 'all' ? undefined : sectionFilter,
                })
              }
            />
          ) : undefined
        }
      >
        {!hasSections ? (
          <TeacherEmpty
            message="No sections are assigned to you yet."
            hint="Attendance registers open up as soon as an administrator assigns classes to your account."
            icon="attendance"
          />
        ) : overall.total === 0 ? (
          <TeacherEmpty
            message="No attendance has been recorded for your classes yet."
            hint="Tap Mark attendance to open a register and record today's statuses."
            icon="attendance"
          />
        ) : (
          <View style={styles.bars}>
            {breakdown.map((row) => (
              <View key={row.key} style={styles.barRow}>
                <View style={styles.barHead}>
                  <Text style={styles.barLabel}>{row.label}</Text>
                  <Text style={styles.barValue}>
                    {row.count} · {row.share}%
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(row.share, 100)}%` },
                      barColorFor(row.tone),
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherPanel title="Attendance" subtitle="Tap a class to narrow the summary" icon="roster">
        <FilterChips options={sectionOptions} value={sectionFilter} onChange={setSectionFilter} />
      </TeacherPanel>

      <TeacherPanel
        title="Per student"
        subtitle={`${selected.students.length} student${selected.students.length === 1 ? '' : 's'} shown`}
        icon="students"
      >
        {selected.students.length === 0 ? (
          <TeacherEmpty
            message="No students have attendance records yet."
            hint="Records appear here once a register has been taken for your class."
            icon="students"
          />
        ) : (
          <View style={styles.list}>
            {selected.students.map((student) => (
              <StudentRow key={student.studentId} student={student} />
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherButton
        label="Mark attendance"
        icon="attendance"
        onPress={() =>
          navigation.navigate(ROUTES.teacher.attendanceMark, {
            section: sectionFilter === 'all' ? undefined : sectionFilter,
          })
        }
      />
    </TeacherPage>
  );
}

function barColorFor(tone: ChipTone) {
  switch (tone) {
    case 'success':
      return { backgroundColor: colors.success };
    case 'danger':
      return { backgroundColor: colors.danger };
    case 'warning':
      return { backgroundColor: colors.warning };
    case 'info':
      return { backgroundColor: colors.info };
    default:
      return { backgroundColor: colors.navySurface };
  }
}

function StudentRow({ student }: { student: AttendanceSummaryStudent }) {
  const indicator =
    student.indicator === 'good' ? 'success' : student.indicator === 'warning' ? 'warning' : 'danger';
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentHead}>
        <View style={styles.studentHeadText}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.name}
          </Text>
          <Text style={styles.studentMeta} numberOfLines={1}>
            {[student.className, student.sectionName].filter(Boolean).join(' · ') || student.admissionNo}
          </Text>
        </View>
        <Chip label={`${student.percentage}%`} tone={indicator} />
      </View>
      <View style={styles.studentCounts}>
        <Count label="Present" value={student.present} tone="success" />
        <Count label="Absent" value={student.absent} tone="danger" />
        <Count label="Late" value={student.late} tone="warning" />
        <Count label="Total" value={student.total} tone="default" />
      </View>
    </View>
  );
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning' | 'default';
}) {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'warning'
          ? colors.warning
          : colors.textMuted;
  return (
    <View style={styles.count}>
      <Text style={[styles.countValue, { color }]}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function NavPill({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'plus' | 'attendance';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, pressed ? { opacity: 0.6 } : null]}
    >
      <Icon name={icon} size={14} color={colors.primary} />
      <Text style={styles.pillLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = {
  bars: {
    gap: 12,
  },
  barRow: {
    gap: 6,
  },
  barHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  barValue: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%' as const,
    borderRadius: radius.pill,
  },
  list: {
    gap: 10,
  },
  studentCard: {
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  studentHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  studentHeadText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  studentName: {
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  studentMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  studentCounts: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  count: {
    flexGrow: 1,
    flexBasis: '20%',
    minWidth: 60,
    alignItems: 'center' as const,
    gap: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countValue: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  countLabel: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySoft,
  },
  pillLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.primary,
  },
} as const;
