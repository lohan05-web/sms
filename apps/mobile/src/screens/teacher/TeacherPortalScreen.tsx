import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { Permission, type Role } from '@smartschool/shared';

import { Icon, type IconName } from '../../components/Icon';
import { TeacherDayCards } from '../../components/teacher/TeacherTimetableViews';
import {
  QuickActionGrid,
  TeacherEmpty,
  TeacherHero,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
  type QuickAction,
} from '../../components/teacher/teacherUi';
import { EmptyState, ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime, humanize } from '../../lib/format';
import { can } from '../../lib/permissions';
import {
  attendanceHint,
  emptyPage,
  fetchStudentsForSections,
  fetchTeacherHomework,
  useTeacherScope,
  type HomeworkItem,
  type NoticeItem,
  type TeacherStudent,
} from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { ROUTES } from '../../navigation/routes';

type Nav = { navigate: (route: string, params?: object) => void };

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface DashboardData {
  students: TeacherStudent[];
  studentsTotal: number;
  studentsTruncated: boolean;
  homework: HomeworkItem[];
  homeworkTotal: number;
  notices: NoticeItem[];
  notifications: NotificationItem[];
  unread: number;
}

const EMPTY_DASHBOARD: DashboardData = {
  students: [],
  studentsTotal: 0,
  studentsTruncated: false,
  homework: [],
  homeworkTotal: 0,
  notices: [],
  notifications: [],
  unread: 0,
};

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/** Mirrors the web dashboard's Quick access grid, gated the same way. */
function quickActionsFor(role: Role | undefined, go: (route: string) => void): QuickAction[] {
  const allowed = (permission: Permission) => (role ? can(role, permission) : false);
  const actions: (QuickAction & { permission?: Permission })[] = [
    { key: 'classes', label: 'My classes', description: 'Sections you teach', icon: 'class', onPress: () => go(ROUTES.teacher.classes) },
    { key: 'students', label: 'My students', description: 'Student directory', icon: 'students', permission: Permission.STUDENT_READ, onPress: () => go(ROUTES.teacher.students) },
    { key: 'attendance', label: 'Attendance', description: 'Take & review registers', icon: 'attendance', permission: Permission.ATTENDANCE_READ, onPress: () => go(ROUTES.teacher.attendance) },
    { key: 'marks', label: 'Marks & grades', description: 'Exam results', icon: 'marks', permission: Permission.RESULT_READ, onPress: () => go(ROUTES.teacher.marks) },
    { key: 'homework', label: 'Homework', description: 'Assign & review work', icon: 'homework', permission: Permission.HOMEWORK_READ, onPress: () => go(ROUTES.teacher.homework) },
    { key: 'timetable', label: 'Timetable', description: 'Your weekly schedule', icon: 'timetable', permission: Permission.TIMETABLE_READ, onPress: () => go(ROUTES.teacher.timetable) },
    { key: 'assignments', label: 'Assignments', description: 'Class–subject pairs', icon: 'subject', onPress: () => go(ROUTES.teacher.assignments) },
    { key: 'messages', label: 'Messages', description: 'Talk to parents & staff', icon: 'messages', permission: Permission.MESSAGE_READ, onPress: () => go(ROUTES.admin.messages) },
    { key: 'profile', label: 'My profile', description: 'Account & details', icon: 'user', onPress: () => go(ROUTES.teacher.profile) },
  ];
  return actions.filter((action) => !action.permission || allowed(action.permission));
}

/**
 * The teacher's mobile dashboard — the same real data as the web Teacher
 * Portal (`/teacher`): greeting hero, teaching statistics, attendance
 * overview, announcements, quick access, today's classes, recent homework,
 * notifications and assigned classes.
 */
export function TeacherPortalScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const go = (route: string) => navigation.navigate(route);

  const scopeState = useTeacherScope();
  const scope = scopeState.scope;
  const role = user?.role;

  const dash = useAsync<DashboardData>(async () => {
    if (!scope) return EMPTY_DASHBOARD;
    const [students, homework, notices, notifications, unread] = await Promise.all([
      scope.sectionIds.length > 0
        ? fetchStudentsForSections(scope.sectionIds)
        : Promise.resolve(emptyPage<TeacherStudent>()),
      role && can(role, Permission.HOMEWORK_READ)
        ? fetchTeacherHomework(scope.teacher.id, { preview: 5 })
        : Promise.resolve(emptyPage<HomeworkItem>()),
      role && can(role, Permission.NOTICE_READ)
        ? api.list<NoticeItem>('/notices', { page: 1, limit: 4 }).then((page) => page.items)
        : Promise.resolve<NoticeItem[]>([]),
      role && can(role, Permission.NOTIFICATION_READ)
        ? api.list<NotificationItem>('/notifications', { page: 1, limit: 5 }).then((page) => page.items)
        : Promise.resolve<NotificationItem[]>([]),
      role && can(role, Permission.NOTIFICATION_READ)
        ? api.get<{ count: number }>('/notifications/unread-count')
        : Promise.resolve({ count: 0 }),
    ]);
    return {
      students: students.items,
      studentsTotal: students.total,
      studentsTruncated: students.truncated,
      homework: homework.items,
      homeworkTotal: homework.total,
      notices,
      notifications,
      unread: unread.count,
    };
  }, [scope?.teacher.id, role]);

  if (scopeState.forbidden) {
    return <EmptyState message="Only teachers can open this dashboard." icon="lock" />;
  }
  if (scopeState.loading || dash.loading) return <SkeletonPanels count={4} />;
  if (scopeState.error) return <ErrorState message={scopeState.error} onRetry={scopeState.reload} />;
  if (!scope) return null;

  const {
    students,
    studentsTotal,
    studentsTruncated,
    homework,
    homeworkTotal,
    notices,
    notifications,
    unread,
  } = dash.data ?? EMPTY_DASHBOARD;
  const teacher = scope.teacher;
  const entries = scope.timetableEntries;

  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()] ?? 'MONDAY';
  const todayEntries = entries.filter((entry) => entry.dayOfWeek === todayName);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const overall = teacher.attendance?.overall;
  const today = teacher.attendance?.today;
  const actions = quickActionsFor(role, go);
  const reloadAll = () => {
    scopeState.reload();
    dash.reload();
  };

  return (
    <TeacherPage>
      <TeacherHero
        eyebrow={teacher.school?.name ?? 'Teacher dashboard'}
        title={`Welcome back, ${teacher.user?.firstName ?? user?.firstName ?? 'Teacher'}`}
        subtitle={`${todayLabel} · ${todayEntries.length} class${
          todayEntries.length === 1 ? '' : 'es'
        } today`}
        actions={
          <>
            <HeroButton label="Attendance" icon="attendance" onPress={() => go(ROUTES.teacher.attendance)} />
            <HeroButton label="Refresh" icon="refresh" onPress={reloadAll} />
          </>
        }
        statLabel="Attendance today"
        statValue={`${today?.percentage ?? 0}%`}
        statHint={attendanceHint(today)}
      />

      <StatGrid>
        <StatCard label="My classes" value={scope.sections.length} hint={`${entries.length} weekly periods`} icon="sections" />
        <StatCard label="My students" value={studentsTotal} hint="In your sections" icon="students" tone="info" />
        <StatCard label="Subjects" value={scope.subjects.length} hint="Assigned to you" icon="subject" tone="info" />
        <StatCard
          label="Today's classes"
          value={todayEntries.length}
          hint={todayLabel}
          icon="timetable"
          tone="info"
        />
        <StatCard
          label="Overall attendance"
          value={`${overall?.percentage ?? 0}%`}
          hint={attendanceHint(overall)}
          icon="trending"
          tone="warning"
        />
        <StatCard label="Homework" value={homeworkTotal} hint="Assigned by you" icon="homework" tone="primary" />
        <StatCard
          label="Unread alerts"
          value={unread}
          hint="Notifications"
          icon="bell"
          tone={unread > 0 ? 'danger' : 'primary'}
        />
        <StatCard
          label="Subjects taught"
          value={scope.assignments.length}
          hint="Assignments"
          icon="roster"
          tone="success"
        />
      </StatGrid>

      {studentsTruncated ? (
        <TeacherNotice
          tone="warning"
          icon="alert"
          message={`${studentsTotal} students are enrolled in your sections, but only the first ${students.length} could be loaded in one pass. Open My students and filter by class to reach the rest.`}
        />
      ) : null}

      <TeacherPanel
        title="Quick access"
        subtitle="Jump straight to your teaching tools"
        icon="sparkles"
      >
        <QuickActionGrid items={actions} />
      </TeacherPanel>

      <TeacherPanel
        title="Today's classes"
        subtitle={todayLabel}
        icon="timetable"
        action={
          <Pressable
            onPress={() => go(ROUTES.teacher.timetable)}
            accessibilityRole="button"
            accessibilityLabel="Open full timetable"
            style={({ pressed }) => [styles.panelAction, pressed ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.panelActionLabel}>Full timetable</Text>
            <Icon name="arrow-right" size={14} color="#6d28d9" />
          </Pressable>
        }
      >
        {todayEntries.length === 0 ? (
          <TeacherEmpty
            message="You have no classes scheduled for today."
            hint="Open the Timetable to see the full teaching week."
            icon="timetable"
          />
        ) : (
          <TeacherDayCards entries={todayEntries} showSection />
        )}
      </TeacherPanel>

      <TeacherPanel
        title="Attendance overview"
        subtitle={overall ? `${overall.total} marks recorded` : 'No marks yet'}
        icon="attendance"
      >
        <StatGrid gap={10}>
          <StatCard label="Today" value={`${today?.percentage ?? 0}%`} hint={attendanceHint(today)} icon="calendar-check" tone="success" />
          <StatCard label="Overall" value={`${overall?.percentage ?? 0}%`} hint={attendanceHint(overall)} icon="trending" tone="warning" />
        </StatGrid>
      </TeacherPanel>

      <TeacherPanel title="Announcements" subtitle="School notices" icon="bell">
        {notices.length === 0 ? (
          <EmptyState message="No announcements right now." icon="sparkles" />
        ) : (
          <View style={styles.list}>
            {notices.map((notice) => (
              <View key={notice.id} style={styles.listItem}>
                <View style={styles.listItemHead}>
                  <Text style={styles.listItemTitle} numberOfLines={2}>
                    {notice.title}
                  </Text>
                  {notice.isPinned ? <Text style={styles.pinned}>Pinned</Text> : null}
                </View>
                {notice.body ? (
                  <Text style={styles.listItemBody} numberOfLines={3}>
                    {notice.body}
                  </Text>
                ) : null}
                <Text style={styles.listItemMeta}>{formatDate(notice.publishedAt ?? notice.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherPanel
        title="Recent homework"
        subtitle={homeworkTotal > 0 ? `${homeworkTotal} assigned` : undefined}
        icon="homework"
      >
        {homework.length === 0 ? (
          <TeacherEmpty
            message="No homework has been assigned yet."
            hint="Homework you create for your classes appears here."
            icon="homework"
          />
        ) : (
          <View style={styles.list}>
            {homework.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listItemHead}>
                  <Text style={styles.listItemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.badge}>{item._count?.submissions ?? 0} subs</Text>
                </View>
                <Text style={styles.listItemMeta}>
                  {[
                    item.subject?.name,
                    item.section?.classLevel?.name,
                    item.section?.name,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No subject'}
                </Text>
                <Text style={styles.listItemMeta}>Due {formatDate(item.dueDate) || '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherPanel title="Notifications" subtitle={unread > 0 ? `${unread} unread` : 'All caught up'} icon="bell">
        {notifications.length === 0 ? (
          <EmptyState message="You have no notifications." icon="bell" />
        ) : (
          <View style={styles.list}>
            {notifications.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listItemHead}>
                  <Text style={styles.badge}>{humanize(item.type)}</Text>
                  <Text style={styles.listItemMeta}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.listItemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.body ? (
                  <Text style={styles.listItemBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherPanel title="My classes" subtitle="Sections and subjects you teach" icon="class">
        {scope.assignments.length === 0 ? (
          <TeacherEmpty
            message="No teaching assignments yet."
            hint="An administrator allocates class and subject periods to your account."
            icon="class"
          />
        ) : (
          <View style={styles.list}>
            {scope.assignments.map((assignment) => (
              <View key={assignment.id} style={styles.listItem}>
                <Text style={styles.listItemTitle} numberOfLines={1}>
                  {[
                    assignment.section?.classLevel?.name,
                    assignment.section?.name,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Class'}
                </Text>
                <Text style={styles.listItemMeta}>
                  {[assignment.subject?.name, assignment.academicYear?.name]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

function HeroButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.heroButton, pressed ? { opacity: 0.7 } : null]}
    >
      <Icon name={icon} size={14} color="#ffffff" />
      <Text style={styles.heroButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = {
  heroButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  panelAction: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  panelActionLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: '#6d28d9',
  },
  list: {
    gap: 10,
  },
  listItem: {
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ece9f6',
    backgroundColor: '#f6f4fd',
  },
  listItemHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  listItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  listItemBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
  },
  listItemMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  badge: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: '#6d28d9',
  },
  pinned: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: '#b45309',
  },
} as const;
