import { useNavigation } from '@react-navigation/native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  ParentChip,
  ParentEmpty,
  ParentError,
  ParentHero,
  ParentNotice,
  ParentPage,
  ParentPanel,
  ParentQuickActions,
  ParentRow,
  ParentSelectChip,
  type ParentChipTone,
  type ParentQuickAction,
} from '../../components/parent/parentUi';
import { SkeletonList, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatCurrency, formatDate, formatDateTime, humanize, initials } from '../../lib/format';
import { teacherNameOf, timeRangeOf, type TimetableItem } from '../../lib/timetable';
import { useAsync } from '../../lib/useAsync';
import { parentColors } from '../../theme';
import { ROUTES } from '../../navigation/routes';

type Nav = { navigate: (route: string, params?: object) => void };

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  percentage: number;
  indicator: string;
}

interface ActivitySummary {
  upcomingHomework: number;
  dueToday: number;
  todayClasses: number;
  syllabusCompleted: number;
  syllabusTotal: number;
}

interface ChildTeacher {
  id: string;
  teacherId: string;
  name: string | null;
  subject: string;
}

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  dueDate: string;
  balance: number | string;
  status: string;
}

interface ChildSummary {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  /** The child's saved photo (a small data URL), or null. */
  photoUrl: string | null;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  teachers: ChildTeacher[];
  teacherCount: number;
  attendance: AttendanceSummary;
  activities: ActivitySummary;
  timetable: TimetableItem[];
  invoices: InvoiceRow[];
  outstanding: number;
  overallResult: { percentage: number; grade: string | null };
}

interface ParentOverview {
  children: ChildSummary[];
}

interface HomeworkRow {
  id: string;
  title: string;
  dueDate: string;
  subject?: { name?: string | null } | null;
  submission: { status: string } | null;
}

interface NoticeRow {
  id: string;
  title: string;
  isPinned: boolean;
  publishedAt: string;
}

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

function childName(child: ChildSummary): string {
  return child.name ?? `Admission ${child.admissionNo}`;
}

function childInitials(child: ChildSummary): string {
  if (child.name) {
    const [first, ...rest] = child.name.split(' ');
    return initials(first, rest.join(' ')) || child.admissionNo.slice(0, 2).toUpperCase();
  }
  return child.admissionNo.slice(0, 2).toUpperCase();
}

/** Matches the backend's `updateStudentPhotoSchema` string cap. */
const MAX_PHOTO_LENGTH = 2_000_000;

function klassOf(child: ChildSummary): string {
  return [child.className, child.sectionName].filter(Boolean).join(' · ') || '—';
}

function attendanceTone(indicator: string): 'success' | 'warning' | 'danger' | 'primary' {
  if (indicator === 'GOOD') return 'success';
  if (indicator === 'WARNING') return 'warning';
  if (indicator === 'CRITICAL') return 'danger';
  return 'primary';
}

function statusTone(status: string): ParentChipTone {
  const value = status.toUpperCase();
  if (['PAID', 'PRESENT', 'APPROVED', 'COMPLETED', 'SUBMITTED'].includes(value)) return 'success';
  if (['PENDING', 'LATE', 'PARTIAL'].includes(value)) return 'warning';
  if (['OVERDUE', 'ABSENT', 'REJECTED', 'CANCELLED', 'MISSING'].includes(value)) return 'danger';
  return 'default';
}

/**
 * The parent portal dashboard — the same real data as the web Parent Portal
 * (`/parent`): a greeting hero for the selected child, summary tiles, today's
 * classes, recent homework, pending fees, recent announcements and quick links.
 */
export function ParentPortalScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();

  const overviewState = useAsync<ParentOverview>(
    () => api.get<ParentOverview>('/parents/me/children'),
    [],
  );

  const [selectedId, setSelectedId] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);

  const children = overviewState.data?.children ?? [];
  const child = children.find((item) => item.id === selectedId) ?? children[0] ?? null;

  /**
   * Pick, crop and resize a photo for the selected child, then save it through
   * the parent-scoped endpoint. The backend re-checks that the child belongs to
   * this parent, and the resize keeps the payload well under the schema cap.
   */
  const pickChildPhoto = async () => {
    if (!child || photoBusy) return;
    setPhotoError(null);
    setPhotoSaved(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Allow photo access to choose a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        setPhotoError('Could not read that image.');
        return;
      }
      const resized = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 320 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true },
      );
      if (!resized.base64) {
        setPhotoError('Could not read that image.');
        return;
      }
      const photoUrl = `data:image/jpeg;base64,${resized.base64}`;
      if (photoUrl.length > MAX_PHOTO_LENGTH) {
        setPhotoError('That photo is too large. Please choose a smaller one.');
        return;
      }
      setPhotoBusy(true);
      await api.patch(`/parents/me/children/${child.id}/photo`, { photoUrl });
      setPhotoSaved(true);
      overviewState.reload();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not save the photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const homeworkState = useAsync<HomeworkRow[]>(
    () =>
      child
        ? api.get<HomeworkRow[]>(`/parents/me/children/${child.id}/homework`)
        : Promise.resolve([]),
    [child?.id],
  );

  const noticesState = useAsync<NoticeRow[]>(
    () => api.list<NoticeRow>('/notices', { page: 1, limit: 4 }).then((page) => page.items),
    [],
  );

  if (overviewState.loading || noticesState.loading) {
    return (
      <ParentPage>
        <SkeletonPanels count={4} />
      </ParentPage>
    );
  }

  if (overviewState.forbidden) {
    return (
      <ParentPage>
        <ParentEmpty icon="lock" message="Only parents can open this dashboard." />
      </ParentPage>
    );
  }

  if (overviewState.error) {
    return (
      <ParentPage>
        <ParentError
          message={overviewState.error}
          onRetry={() => {
            overviewState.reload();
            homeworkState.reload();
            noticesState.reload();
          }}
        />
      </ParentPage>
    );
  }

  if (!child) {
    return (
      <ParentPage>
        <ParentEmpty
          icon="parents"
          message="No children are linked to your account yet."
          hint="Please contact the school office to link your children."
        />
      </ParentPage>
    );
  }

  const attendance = child.attendance;
  const activities = child.activities;
  const pendingInvoices = child.invoices.filter((invoice) => Number(invoice.balance) > 0);
  const homework = (homeworkState.data ?? []).slice(0, 5);
  const notices = noticesState.data ?? [];

  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()] ?? 'MONDAY';
  const todayClasses = child.timetable
    .filter((entry) => entry.dayOfWeek === todayName)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const syllabusPercent =
    activities.syllabusTotal > 0
      ? `${Math.round((activities.syllabusCompleted / activities.syllabusTotal) * 100)}%`
      : '—';

  const actions: ParentQuickAction[] = [
    { key: 'attendance', label: 'Attendance', description: 'Daily & monthly', icon: 'attendance', onPress: () => navigation.navigate(ROUTES.parent.attendance) },
    { key: 'homework', label: 'Homework', description: 'Assignments & notes', icon: 'homework', onPress: () => navigation.navigate(ROUTES.parent.homework) },
    { key: 'timetable', label: 'Timetable', description: 'Weekly schedule', icon: 'timetable', onPress: () => navigation.navigate(ROUTES.parent.timetable) },
    { key: 'results', label: 'Results', description: 'Marks & grades', icon: 'marks', onPress: () => navigation.navigate(ROUTES.parent.results) },
    { key: 'syllabus', label: 'Syllabus', description: 'Units & progress', icon: 'subject', onPress: () => navigation.navigate(ROUTES.parent.syllabus) },
    { key: 'invoices', label: 'Fees', description: 'Invoices & receipts', icon: 'finance', onPress: () => navigation.navigate(ROUTES.parent.invoices) },
    { key: 'teachers', label: 'Teachers', description: 'Contact & message', icon: 'teacher', onPress: () => navigation.navigate(ROUTES.parent.teachers) },
    { key: 'notices', label: 'Announcements', description: 'School notices', icon: 'star', onPress: () => navigation.navigate(ROUTES.parent.notices) },
    { key: 'vehicle', label: 'Transport', description: 'Bus & route', icon: 'bus', onPress: () => navigation.navigate(ROUTES.parent.vehicle) },
    { key: 'notifications', label: 'Notifications', description: 'Your alerts', icon: 'bell', onPress: () => navigation.navigate(ROUTES.admin.notifications) },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ParentPage>
      <ParentHero
        eyebrow={`Welcome back, ${user?.firstName ?? 'Parent'}`}
        title={childName(child)}
        subtitle={`${klassOf(child)} · ${todayLabel}`}
        statLabel="Attendance"
        statValue={`${attendance.percentage}%`}
        statHint={`${attendance.present} of ${attendance.total} days present`}
        avatarUrl={child.photoUrl}
        avatarFallback={childInitials(child)}
        onEditPhoto={pickChildPhoto}
        editingPhoto={photoBusy}
      />

      {photoError ? <ParentNotice tone="danger" message={photoError} /> : null}
      {photoSaved ? (
        <ParentNotice tone="success" icon="check" message="Photo updated." />
      ) : null}

      {children.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {children.map((item) => (
            <ParentSelectChip
              key={item.id}
              label={childName(item)}
              active={item.id === child.id}
              onPress={() => setSelectedId(item.id)}
              photoUrl={item.photoUrl}
              initials={childInitials(item)}
            />
          ))}
        </View>
      ) : null}

      <StatGrid>
        <StatCard
          label="Attendance"
          value={`${attendance.percentage}%`}
          hint={`${attendance.present} present · ${attendance.absent} absent`}
          icon="attendance"
          tone={attendanceTone(attendance.indicator)}
          iconColor={parentColors.accent}
        />
        <StatCard
          label="Homework due"
          value={activities.dueToday}
          hint={`${activities.upcomingHomework} due this week`}
          icon="homework"
          tone={activities.dueToday > 0 ? 'warning' : 'primary'}
          iconColor={parentColors.accent}
        />
        <StatCard
          label="Classes today"
          value={activities.todayClasses}
          hint="Scheduled periods"
          icon="timetable"
          iconColor={parentColors.accent}
        />
        <StatCard
          label="Overall result"
          value={`${child.overallResult.percentage}%`}
          hint={child.overallResult.grade ? `Grade ${child.overallResult.grade}` : 'No results yet'}
          icon="marks"
          iconColor={parentColors.accent}
        />
        <StatCard
          label="Fees outstanding"
          value={formatCurrency(child.outstanding)}
          hint={`${pendingInvoices.length} unpaid invoice${pendingInvoices.length === 1 ? '' : 's'}`}
          icon="finance"
          tone={child.outstanding > 0 ? 'danger' : 'success'}
          iconColor={parentColors.accent}
        />
        <StatCard
          label="Syllabus covered"
          value={syllabusPercent}
          hint={
            activities.syllabusTotal > 0
              ? `${activities.syllabusCompleted}/${activities.syllabusTotal} units`
              : 'No syllabus published'
          }
          icon="subject"
          iconColor={parentColors.accent}
        />
      </StatGrid>

      <ParentPanel
        title="Today's classes"
        subtitle={todayLabel}
        icon="timetable"
      >
        {todayClasses.length === 0 ? (
          <ParentEmpty icon="timetable" message="No classes are scheduled for today." />
        ) : (
          <View style={{ gap: 8 }}>
            {todayClasses.map((entry) => (
              <ParentRow
                key={entry.id}
                title={entry.subject?.name ?? 'Class'}
                meta={[teacherNameOf(entry), entry.room].filter(Boolean).join(' · ') || undefined}
                aside={
                  <Text style={styles.aside}>{timeRangeOf(entry)}</Text>
                }
              />
            ))}
          </View>
        )}
      </ParentPanel>

      <ParentPanel
        title="Recent homework"
        subtitle={`Latest assignments for ${childName(child)}`}
        icon="homework"
        action={<PanelLink label="All" onPress={() => navigation.navigate(ROUTES.parent.homework)} />}
      >
        {homeworkState.loading ? (
          <SkeletonList rows={3} />
        ) : homeworkState.error ? (
          <ParentEmpty icon="homework" message="Could not load homework right now." />
        ) : homework.length === 0 ? (
          <ParentEmpty icon="homework" message="No homework has been set yet." />
        ) : (
          <View style={{ gap: 8 }}>
            {homework.map((item) => (
              <ParentRow
                key={item.id}
                title={item.title}
                meta={`${item.subject?.name ?? 'General'} · due ${formatDate(item.dueDate)}`}
                aside={
                  <ParentChip
                    label={item.submission ? humanize(item.submission.status) : 'Not submitted'}
                    tone={
                      item.submission ? statusTone(item.submission.status) : 'warning'
                    }
                  />
                }
              />
            ))}
          </View>
        )}
      </ParentPanel>

      <ParentPanel
        title="Pending fees"
        subtitle="Invoices with an outstanding balance"
        icon="finance"
        action={<PanelLink label="Invoices" onPress={() => navigation.navigate(ROUTES.parent.invoices)} />}
      >
        {pendingInvoices.length === 0 ? (
          <ParentEmpty
            icon="check"
            message="No pending fees."
            hint="Every issued invoice is fully paid."
          />
        ) : (
          <View style={{ gap: 8 }}>
            {pendingInvoices.map((invoice) => (
              <ParentRow
                key={invoice.id}
                title={invoice.invoiceNo}
                meta={`Due ${formatDate(invoice.dueDate)}`}
                aside={
                  <View style={styles.asideStack}>
                    <Text style={styles.asideStrong}>{formatCurrency(invoice.balance)}</Text>
                    <ParentChip label={humanize(invoice.status)} tone={statusTone(invoice.status)} />
                  </View>
                }
              />
            ))}
          </View>
        )}
      </ParentPanel>

      <ParentPanel
        title="Recent announcements"
        subtitle="Notices from the school"
        icon="bell"
        action={<PanelLink label="All" onPress={() => navigation.navigate(ROUTES.parent.notices)} />}
      >
        {notices.length === 0 ? (
          <ParentEmpty icon="bell" message="No announcements have been published." />
        ) : (
          <View style={{ gap: 8 }}>
            {notices.map((notice) => (
              <ParentRow
                key={notice.id}
                title={`${notice.isPinned ? '📌 ' : ''}${notice.title}`}
                meta={formatDateTime(notice.publishedAt)}
              />
            ))}
          </View>
        )}
      </ParentPanel>

      <ParentPanel title="Quick links" subtitle="Jump straight to a section" icon="sparkles">
        <ParentQuickActions items={actions} />
      </ParentPanel>
    </ParentPage>
  );
}

function PanelLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.panelLink, pressed ? styles.panelLinkPressed : null]}
    >
      <Text style={styles.panelLinkLabel}>{label}</Text>
      <Icon name="arrow-right" size={14} color={parentColors.accent} />
    </Pressable>
  );
}

const styles = {
  aside: {
    fontSize: 12.5,
    color: '#475569',
  },
  asideStack: {
    alignItems: 'flex-end' as const,
    gap: 4,
  },
  asideStrong: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  panelLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  panelLinkPressed: {
    opacity: 0.6,
  },
  panelLinkLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: parentColors.accent,
  },
} as const;
