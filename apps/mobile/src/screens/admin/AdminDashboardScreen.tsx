import type { ReactNode } from 'react';
import { Pressable, Text, View, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Permission, type AttendanceIndicator, type Role } from '@smartschool/shared';

import { Icon, type IconName } from '../../components/Icon';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonPanels,
  SkeletonStats,
  StatCard,
  StatGrid,
  formatStatValue,
  type StatTone,
} from '../../components/ui';
import { api } from '../../lib/api';
import { indicatorLabel, indicatorTone } from '../../lib/attendanceTracker';
import { formatCurrency, formatDateTime, humanize } from '../../lib/format';
import { can } from '../../lib/permissions';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { useSettings } from '../../lib/settings';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, shadow } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

interface AttendanceCard {
  total: number;
  byStatus: Record<string, number>;
  percentage: number;
  indicator: AttendanceIndicator;
}

interface DashboardData {
  counts: Record<string, number>;
  pipeline: {
    openAdmissions: number;
    pendingRequests: number;
  };
  finance: {
    invoices: number;
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    collectedThisMonth: number;
    byStatus: Record<string, number>;
  };
  attendanceToday: AttendanceCard;
  attendanceOverall: AttendanceCard;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

interface FeedRow {
  id: string;
  title: string;
  meta: string;
  icon: IconName;
  unread?: boolean;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function countLabel(key: string): string {
  return titleCase(key.replace(/([A-Z])/g, ' $1')).replace(/\s+/g, ' ').trim();
}

function person(who?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!who) return '';
  return `${who.firstName ?? ''} ${who.lastName ?? ''}`.trim();
}

function attendanceStat(card: AttendanceCard): { value: string; hint: string; tone: StatTone } {
  if (!card.total) {
    return { value: '—', hint: 'No marks yet', tone: 'info' };
  }
  return {
    value: `${card.percentage}%`,
    hint: indicatorLabel(card.indicator),
    tone: indicatorTone(card.indicator),
  };
}

/** Greeting + role badge shown in the purple hero banner. */
function WelcomeBanner({ user }: { user?: { firstName?: string; role: Role } | null }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.firstName ?? '';
  const role = user?.role ? humanize(user.role) : 'School';

  return (
    <LinearGradient
      colors={colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.banner, shadow]}
    >
      <Text style={styles.bannerGreeting}>
        {greet}
        {name ? `, ${name}` : ''}
      </Text>
      <View style={styles.bannerRole}>
        <Icon name="shield" size={12} color={colors.white} />
        <Text style={styles.bannerRoleText}>{role}</Text>
      </View>
    </LinearGradient>
  );
}

export function AdminDashboardScreen() {
  const { user } = useAuth();
  const { currency } = useSettings();
  const navigation = useNavigation<Nav>();

  const role = user?.role;
  const canAudit = role ? can(role, Permission.AUDIT_READ) : false;
  const canNotifications = role ? can(role, Permission.NOTIFICATION_READ) : false;

  const state = useAsync<DashboardData>(() => api.get<DashboardData>('/reports/dashboard'), []);

  const feed = useAsync<FeedRow[]>(async () => {
    if (!role) return [];
    if (canAudit) {
      const result = await api.list<ActivityItem>('/audit-logs', { limit: 5 });
      return result.items.map((activity) => ({
        id: activity.id,
        title: humanize(activity.action),
        meta: [humanize(activity.entity), person(activity.user), formatDateTime(activity.createdAt)]
          .filter(Boolean)
          .join(' · '),
        icon: 'reports' as IconName,
      }));
    }
    if (canNotifications) {
      const result = await api.list<NotificationItem>('/notifications', { limit: 5 });
      return result.items.map((notification) => ({
        id: notification.id,
        title: notification.title,
        meta: formatDateTime(notification.createdAt),
        icon: 'bell' as IconName,
        unread: !notification.isRead,
      }));
    }
    return [];
  }, [role, canAudit, canNotifications]);

  const go = (route: string, params?: object) => navigation.navigate(route, params);

  if (state.forbidden) {
    return <EmptyState message="You don't have permission to view the dashboard." icon="lock" />;
  }
  if (state.loading) {
    return (
      <>
        <WelcomeBanner user={user} />
        <SkeletonStats count={2} />
        <SkeletonPanels count={3} />
      </>
    );
  }
  if (state.error) {
    return (
      <>
        <WelcomeBanner user={user} />
        <ErrorState message={state.error} onRetry={state.reload} />
      </>
    );
  }
  if (!state.data) return null;

  const data = state.data;
  const attendance = attendanceStat(data.attendanceToday);
  const showFeed = canAudit || canNotifications;

  return (
    <>
      <WelcomeBanner user={user} />

      <StatGrid>
        <StatCard
          label="Total students"
          value={formatStatValue(data.counts.students)}
          hint="Enrolled"
          icon="students"
          onPress={role && can(role, Permission.STUDENT_READ) ? () => go(ROUTES.admin.students) : undefined}
        />
        <StatCard
          label="Total teachers"
          value={formatStatValue(data.counts.teachers)}
          hint="On staff"
          icon="teacher"
          onPress={
            role && can(role, Permission.TEACHER_MANAGE)
              ? () => go(ROUTES.admin.resource, { key: 'teachers' })
              : undefined
          }
        />
      </StatGrid>

      <Panel title="Attendance today">
        <View style={styles.attendanceRow}>
          <View style={styles.attendanceValue}>
            <Icon name="calendar-check" size={20} color={colors.primary} />
            <Text style={styles.attendanceNumber}>{attendance.value}</Text>
            <Text style={styles.attendanceHint}>{attendance.hint}</Text>
          </View>
          {role && can(role, Permission.ATTENDANCE_READ) ? (
            <Pressable
              style={styles.viewDetails}
              onPress={() => go(ROUTES.admin.resource, { key: 'attendances' })}
              accessibilityRole="button"
              accessibilityLabel="View attendance details"
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </Panel>

      <Panel title="Finance overview">
        <View style={styles.kvList}>
          <KeyValue
            label="Collected"
            value={formatCurrency(data.finance.totalCollected, currency)}
            valueStyle={styles.kvSuccess}
            icon="finance"
          />
          <KeyValue
            label="Pending fees"
            value={formatCurrency(data.finance.totalOutstanding, currency)}
            valueStyle={styles.kvDanger}
            icon="receipt"
          />
          <KeyValue label="Billed" value={formatCurrency(data.finance.totalBilled, currency)} icon="receipt" />
          <KeyValue
            label="Collected this month"
            value={formatCurrency(data.finance.collectedThisMonth, currency)}
            icon="trending"
          />
        </View>
      </Panel>

      {showFeed ? (
        <Panel
          title="Recent activity"
          action={
            role ? (
              <Pressable
                style={styles.linkButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View all activity"
                onPress={() =>
                  canAudit
                    ? go(ROUTES.admin.resource, { key: 'audit-logs' })
                    : go(ROUTES.admin.tabs, { screen: ROUTES.admin.notifications })
                }
              >
                <Text style={styles.linkText}>View All</Text>
                <Icon name="chevron-right" size={14} color={colors.primary} />
              </Pressable>
            ) : undefined
          }
        >
          {feed.loading ? (
            <>
              <Skeleton height={38} radius={radius.md} />
              <Skeleton height={38} radius={radius.md} />
              <Skeleton height={38} radius={radius.md} />
            </>
          ) : feed.error ? (
            <View style={styles.inlineError}>
              <Text style={styles.muted}>{feed.error}</Text>
              <Pressable onPress={feed.reload} hitSlop={8} style={styles.linkButton} accessibilityRole="button">
                <Text style={styles.linkText}>Try again</Text>
              </Pressable>
            </View>
          ) : (feed.data ?? []).length === 0 ? (
            <Text style={styles.muted}>
              {canAudit ? 'No recent activity yet.' : 'No notifications yet.'}
            </Text>
          ) : (
            (feed.data ?? []).map((row) => (
              <View key={row.id} style={styles.feedRow}>
                <View style={styles.feedIcon}>
                  <Icon name={row.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.feedText}>
                  <Text style={row.unread ? styles.feedTitleUnread : styles.feedTitle} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Text style={styles.muted}>{row.meta}</Text>
                </View>
              </View>
            ))
          )}
        </Panel>
      ) : null}

      <AttendancePanel title="Attendance overall" card={data.attendanceOverall} />

      <Panel title="Admissions & requests">
        <StatGrid>
          <StatCard
            label="Admissions"
            value={formatStatValue(data.pipeline.openAdmissions)}
            hint="Open pipeline"
            icon="admissions"
            onPress={
              role && can(role, Permission.ADMISSION_READ)
                ? () => go(ROUTES.admin.resource, { key: 'admissions' })
                : undefined
            }
          />
          <StatCard
            label="Requests"
            value={formatStatValue(data.pipeline.pendingRequests)}
            hint="Awaiting action"
            icon="requests"
            tone={data.pipeline.pendingRequests > 0 ? 'warning' : 'primary'}
            onPress={
              role && can(role, Permission.REQUEST_READ)
                ? () => go(ROUTES.admin.resource, { key: 'service-requests' })
                : undefined
            }
          />
        </StatGrid>
      </Panel>

      <QuickActions role={role} onSelect={go} />

      <MoreCounts counts={data.counts} />
    </>
  );
}

const QUICK_ACTIONS: {
  key: string;
  label: string;
  icon: IconName;
  permission: Permission;
  route: string;
  params?: Record<string, unknown>;
}[] = [
  {
    key: 'students',
    label: 'Students',
    icon: 'students',
    permission: Permission.STUDENT_READ,
    route: ROUTES.admin.students,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: 'attendance',
    permission: Permission.ATTENDANCE_READ,
    route: ROUTES.admin.resource,
    params: { key: 'attendances' },
  },
  {
    key: 'fees',
    label: 'Fees',
    icon: 'finance',
    permission: Permission.INVOICE_READ,
    route: ROUTES.admin.resource,
    params: { key: 'invoices' },
  },
  {
    key: 'marks',
    label: 'Marks',
    icon: 'marks',
    permission: Permission.RESULT_READ,
    route: ROUTES.admin.resource,
    params: { key: 'exam-results' },
  },
];

function QuickActions({
  role,
  onSelect,
}: {
  role?: Role;
  onSelect: (route: string, params?: object) => void;
}) {
  if (!role) return null;
  const actions = QUICK_ACTIONS.filter((action) => can(role, action.permission));
  if (actions.length === 0) return null;

  return (
    <Panel title="Quick actions">
      <StatGrid>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.quickButton, pressed ? styles.quickButtonPressed : null]}
            onPress={() => onSelect(action.route, action.params)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={styles.quickIcon}>
              <Icon name={action.icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </StatGrid>
    </Panel>
  );
}

function AttendancePanel({ title, card }: { title: string; card: AttendanceCard }) {
  const statuses = Object.entries(card.byStatus).filter(([, value]) => value > 0);
  return (
    <Panel title={title}>
      {card.total > 0 ? (
        <>
          <StatGrid>
            <StatCard label="Total marks" value={formatStatValue(card.total)} icon="attendance" />
            <StatCard
              label="Attendance rate"
              value={`${card.percentage}%`}
              hint={indicatorLabel(card.indicator)}
              tone={indicatorTone(card.indicator)}
            />
          </StatGrid>
          {statuses.length > 0 ? (
            <View style={styles.chipRow}>
              {statuses.map(([key, value]) => (
                <View key={key} style={styles.chip}>
                  <Text style={styles.chipLabel}>{humanize(key)}</Text>
                  <Text style={styles.chipValue}>{formatStatValue(value)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>No attendance recorded yet.</Text>
      )}
    </Panel>
  );
}

function MoreCounts({ counts }: { counts: Record<string, number> }) {
  const headline = new Set(['students', 'teachers', 'classes']);
  const entries = Object.entries(counts).filter(([key]) => !headline.has(key));
  if (entries.length === 0) return null;
  return (
    <Panel title="More counts">
      <View style={styles.chipRow}>
        {entries.map(([key, value]) => (
          <View key={key} style={styles.chip}>
            <Text style={styles.chipLabel}>{countLabel(key)}</Text>
            <Text style={styles.chipValue}>{formatStatValue(value)}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function KeyValue({
  label,
  value,
  valueStyle,
  icon,
}: {
  label: string;
  value: string;
  valueStyle?: TextStyle;
  icon?: IconName;
}) {
  return (
    <View style={styles.kvRow}>
      <View style={styles.kvLeft}>
        {icon ? <Icon name={icon} size={16} color={colors.textMuted} /> : null}
        <Text style={styles.kvLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.kvValue, valueStyle]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={[styles.panel, shadow]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {action}
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

const styles = {
  banner: {
    borderRadius: radius.xl,
    padding: 18,
    gap: 8,
    minHeight: 104,
    justifyContent: 'center',
  },
  bannerGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  bannerRole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  bannerRoleText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  panel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  panelBody: {
    gap: 8,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attendanceValue: {
    flexShrink: 1,
    gap: 2,
  },
  attendanceNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  attendanceHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  feedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedText: {
    flex: 1,
    gap: 2,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  feedTitleUnread: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kvList: {
    gap: 2,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  kvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  kvLabel: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  kvValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  kvSuccess: {
    color: colors.success,
  },
  kvDanger: {
    color: colors.danger,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickButtonPressed: {
    backgroundColor: colors.primaryLight,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  muted: {
    fontSize: 12,
    color: colors.textFaint,
  },
} as const;
