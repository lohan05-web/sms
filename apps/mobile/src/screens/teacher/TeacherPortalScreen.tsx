import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { TimetableDayList } from '../../components/TimetableViews';
import { EmptyState, ErrorState, SkeletonPanels, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, humanize } from '../../lib/format';
import type { TimetableItem } from '../../lib/timetable';
import { useAsync } from '../../lib/useAsync';

interface Assignment {
  id: string;
  subject?: { name?: string; code?: string } | null;
  section?: { name?: string; classLevel?: { name?: string } | null } | null;
  academicYear?: { name?: string } | null;
}

interface AttendanceCard {
  total: number;
  byStatus: Record<string, number>;
  percentage: number;
  indicator: string;
}

interface TeacherMe {
  id: string;
  employeeNo: string;
  qualification?: string | null;
  specialization?: string | null;
  joiningDate?: string | null;
  status?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string | null } | null;
  school?: { name?: string } | null;
  assignments?: Assignment[];
  timetableEntries?: TimetableItem[];
  attendance?: { today: AttendanceCard; overall: AttendanceCard };
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The teacher's personal dashboard: profile, classes, attendance, timetable. */
export function TeacherPortalScreen() {
  const { user } = useAuth();
  const state = useAsync<TeacherMe>(() => api.get<TeacherMe>('/teachers/me'), []);

  if (state.forbidden) return <EmptyState message="Only teachers can open this page." icon="lock" />;
  if (state.loading) return <SkeletonPanels count={3} />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;

  const teacher = state.data;
  const assignments = teacher.assignments ?? [];

  return (
    <>
      <Header
        title={`Welcome, ${user?.firstName ?? 'Teacher'}`}
        subtitle={teacher.school?.name ?? 'Teacher dashboard'}
      />

      <Panel title="My profile">
        <DetailRow label="Employee no" value={teacher.employeeNo} />
        <DetailRow label="Email" value={teacher.user?.email ?? '—'} />
        <DetailRow label="Phone" value={teacher.user?.phone ?? '—'} />
        <DetailRow label="Qualification" value={teacher.qualification ?? '—'} />
        <DetailRow label="Specialization" value={teacher.specialization ?? '—'} />
        <DetailRow label="Joining date" value={formatDate(teacher.joiningDate) || '—'} />
        <DetailRow label="Status" value={humanize(teacher.status) || '—'} />
      </Panel>

      <Panel title="My classes">
        {assignments.length === 0 ? (
          <EmptyState message="No teaching assignments yet." />
        ) : (
          <View style={styles.grid}>
            {assignments.map((assignment) => (
              <StatCard
                key={assignment.id}
                label={assignment.section?.classLevel?.name ?? 'Class'}
                value={assignment.subject?.name ?? '—'}
                hint={[assignment.section?.name, assignment.academicYear?.name]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </View>
        )}
      </Panel>

      {teacher.attendance ? (
        <Panel title="Attendance">
          <View style={styles.grid}>
            <StatCard
              label="Today"
              value={`${teacher.attendance.today.percentage}%`}
              hint={`${teacher.attendance.today.total} marks · ${titleCase(
                teacher.attendance.today.indicator,
              )}`}
            />
            <StatCard
              label="Overall"
              value={`${teacher.attendance.overall.percentage}%`}
              hint={`${teacher.attendance.overall.total} marks · ${titleCase(
                teacher.attendance.overall.indicator,
              )}`}
            />
          </View>
        </Panel>
      ) : null}

      <Panel title="My timetable">
        <TimetableDayList
          entries={teacher.timetableEntries ?? []}
          showSection
          emptyMessage="No classes have been scheduled for you yet."
        />
      </Panel>
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = {
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 8,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  panelBody: {
    gap: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 13,
    color: '#0f172a',
    flexShrink: 1,
    textAlign: 'right',
  },
} as const;
