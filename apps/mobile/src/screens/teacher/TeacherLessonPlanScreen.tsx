import { Alert, ScrollView, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { Permission } from '@smartschool/shared';

import { FilterChips } from '../../components/DataList';
import { ChoiceField, FormField } from '../../components/teacher/teacherForm';
import {
  Chip,
  TeacherButton,
  TeacherEmpty,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { can } from '../../lib/permissions';
import {
  emptyPage,
  fetchByClassLevel,
  useTeacherScope,
  type PageFetch,
} from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { colors, radius } from '../../theme';

/**
 * Lesson Plan management for the signed-in teacher.
 *
 * The backend `/lesson-plans` module is school-scoped only (it has no teacher
 * assertion), so this screen is deliberately conservative: the create form only
 * offers the teacher's own subjects / classes / sections, every plan the teacher
 * creates is stamped with their own teacher id, and the list is filtered to
 * plans the teacher authored plus those for the subjects and classes they teach.
 * Edit and delete stay limited to plans the teacher authored.
 */

const LESSON_STATUSES = ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
type LessonStatus = (typeof LESSON_STATUSES)[number];

const STATUS_TONE: Record<LessonStatus, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default',
  PLANNED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

interface LessonPlan {
  id: string;
  title: string;
  status: LessonStatus;
  plannedDate?: string | null;
  durationMinutes?: number | null;
  objectives?: string | null;
  activities?: string | null;
  resources?: string | null;
  assessment?: string | null;
  notes?: string | null;
  subject?: { id: string; name: string } | null;
  classLevel?: { id: string; name: string } | null;
  section?: { id: string; name: string } | null;
  teacher?: { id: string; user?: { firstName?: string; lastName?: string } | null } | null;
}

interface LessonForm {
  title: string;
  subjectId: string;
  classLevelId: string;
  sectionId: string;
  status: LessonStatus;
  plannedDate: string;
  durationMinutes: string;
  objectives: string;
  activities: string;
  resources: string;
  assessment: string;
  notes: string;
}

function isoToday(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm(): LessonForm {
  return {
    title: '',
    subjectId: '',
    classLevelId: '',
    sectionId: '',
    status: 'PLANNED',
    plannedDate: isoToday(),
    durationMinutes: '',
    objectives: '',
    activities: '',
    resources: '',
    assessment: '',
    notes: '',
  };
}

function formFromPlan(plan: LessonPlan): LessonForm {
  return {
    title: plan.title,
    subjectId: plan.subject?.id ?? '',
    classLevelId: plan.classLevel?.id ?? '',
    sectionId: plan.section?.id ?? '',
    status: plan.status,
    plannedDate: plan.plannedDate ? plan.plannedDate.slice(0, 10) : '',
    durationMinutes: plan.durationMinutes != null ? String(plan.durationMinutes) : '',
    objectives: plan.objectives ?? '',
    activities: plan.activities ?? '',
    resources: plan.resources ?? '',
    assessment: plan.assessment ?? '',
    notes: plan.notes ?? '',
  };
}

function isUpcoming(plan: LessonPlan): boolean {
  if (!plan.plannedDate) return false;
  if (plan.status === 'COMPLETED' || plan.status === 'CANCELLED') return false;
  const date = new Date(plan.plannedDate);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

export function TeacherLessonPlanScreen() {
  const { user } = useAuth();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const canManage = user ? can(user.role, Permission.LESSON_MANAGE) : false;

  const plans = useAsync<PageFetch<LessonPlan>>(
    () =>
      scope
        ? fetchByClassLevel<LessonPlan>('/lesson-plans', scope.classLevelIds)
        : Promise.resolve(emptyPage()),
    [scope?.classLevelIds.join(',')],
  );

  const [scopeFilter, setScopeFilter] = useState<'mine' | 'classes'>('mine');
  const [statusFilter, setStatusFilter] = useState<LessonStatus | 'all'>('all');
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const subjectIds = useMemo(() => new Set(scope?.subjects.map((s) => s.id) ?? []), [scope]);
  const classLevelIds = useMemo(() => new Set(scope?.classLevels.map((c) => c.id) ?? []), [scope]);

  const visible = useMemo(() => {
    const items = plans.data?.items ?? [];
    return items.filter((plan) => {
      const isMine = Boolean(scope) && plan.teacher?.id === scope?.teacher.id;
      const teachesIt =
        Boolean(plan.subject?.id && subjectIds.has(plan.subject.id)) &&
        Boolean(plan.classLevel?.id && classLevelIds.has(plan.classLevel.id));
      if (scopeFilter === 'mine' ? !isMine : !(isMine || teachesIt)) return false;
      if (statusFilter !== 'all' && plan.status !== statusFilter) return false;
      return true;
    });
  }, [plans.data, scope, scopeFilter, statusFilter, subjectIds, classLevelIds]);

  const upcoming = useMemo(
    () =>
      visible
        .filter(isUpcoming)
        .sort(
          (a, b) => new Date(a.plannedDate ?? 0).getTime() - new Date(b.plannedDate ?? 0).getTime(),
        )
        .slice(0, 5),
    [visible],
  );

  const sectionOptions = useMemo(() => {
    if (!scope) return [];
    const forClass = form.classLevelId
      ? scope.sections.filter((section) => section.classLevelId === form.classLevelId)
      : scope.sections;
    return forClass.map((section) => ({ value: section.id, label: section.name }));
  }, [scope, form.classLevelId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      subjectId: scope?.subjects[0]?.id ?? '',
      classLevelId: scope?.classLevels[0]?.id ?? '',
      sectionId: '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (plan: LessonPlan) => {
    setEditingId(plan.id);
    setForm(formFromPlan(plan));
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const patch = (updates: Partial<LessonForm>) => setForm((prev) => ({ ...prev, ...updates }));

  /** Client-side validation mirroring the zod schema, so users get a clear message. */
  const validate = (values: LessonForm): string | null => {
    if (!values.title.trim()) return 'A title is required.';
    if (values.title.trim().length > 160) return 'Keep the title to 160 characters or fewer.';
    if (!values.subjectId) return 'Choose a subject.';
    if (!values.classLevelId) return 'Choose a class.';
    if (values.plannedDate.trim() && Number.isNaN(new Date(values.plannedDate.trim()).getTime())) {
      return 'The planned date is not a valid date (use YYYY-MM-DD).';
    }
    const duration = values.durationMinutes.trim();
    if (duration) {
      const minutes = Number(duration);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) {
        return 'Duration must be a whole number between 5 and 600 minutes.';
      }
    }
    return null;
  };

  const submit = async () => {
    if (!scope || !canManage) return;
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError(null);

    const text = (value: string) => value.trim();
    const orNull = (value: string) => (value.trim() ? value.trim() : null);
    const duration = form.durationMinutes.trim() ? Number(form.durationMinutes) : null;

    try {
      if (editingId) {
        await api.patch(`/lesson-plans/${editingId}`, {
          title: text(form.title),
          subjectId: form.subjectId,
          classLevelId: form.classLevelId,
          sectionId: form.sectionId || null,
          status: form.status,
          plannedDate: orNull(form.plannedDate),
          durationMinutes: duration,
          objectives: orNull(form.objectives),
          activities: orNull(form.activities),
          resources: orNull(form.resources),
          assessment: orNull(form.assessment),
          notes: orNull(form.notes),
        });
      } else {
        const payload: Record<string, unknown> = {
          title: text(form.title),
          subjectId: form.subjectId,
          classLevelId: form.classLevelId,
          teacherId: scope.teacher.id,
          status: form.status,
        };
        if (form.sectionId) payload.sectionId = form.sectionId;
        if (form.plannedDate.trim()) payload.plannedDate = form.plannedDate.trim();
        if (duration != null) payload.durationMinutes = duration;
        for (const key of ['objectives', 'activities', 'resources', 'assessment', 'notes'] as const) {
          const value = text(form[key]);
          if (value) payload[key] = value;
        }
        await api.post('/lesson-plans', payload);
      }
      closeForm();
      plans.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the lesson plan.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (plan: LessonPlan) => {
    Alert.alert('Delete lesson plan', `Delete “${plan.title}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await api.delete(`/lesson-plans/${plan.id}`);
              plans.reload();
            } catch (err) {
              setFormError(err instanceof Error ? err.message : 'Could not delete the lesson plan.');
            }
          })();
        },
      },
    ]);
  };

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || plans.loading) return <SkeletonPanels count={3} />;
  if (error || plans.error) {
    return (
      <ErrorState
        message={error ?? plans.error ?? ''}
        onRetry={() => {
          reload();
          plans.reload();
        }}
      />
    );
  }
  if (!scope) return <TeacherEmpty message="No teaching profile found for this account." icon="lock" />;

  const mine = (plans.data?.items ?? []).filter((plan) => plan.teacher?.id === scope.teacher.id);

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard label="My plans" value={mine.length} hint="Authored by you" icon="lesson-plan" />
        <StatCard
          label="Upcoming"
          value={visible.filter(isUpcoming).length}
          hint="Still to teach"
          icon="calendar-check"
          tone="info"
        />
        <StatCard
          label="In progress"
          value={visible.filter((plan) => plan.status === 'IN_PROGRESS').length}
          hint="Active lessons"
          icon="trending"
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={visible.filter((plan) => plan.status === 'COMPLETED').length}
          hint="Taught"
          icon="check"
          tone="success"
        />
      </StatGrid>

      {formOpen ? (
        <TeacherPanel
          title={editingId ? 'Edit lesson plan' : 'New lesson plan'}
          subtitle="Only your subjects, classes and sections are offered"
          icon="lesson-plan"
          accent="violet"
        >
          {formError ? <TeacherNotice tone="danger" icon="alert" message={formError} /> : null}
          <View style={styles.form}>
            <FormField
              label="Topic / title"
              required
              value={form.title}
              onChangeText={(value) => patch({ title: value })}
              placeholder="e.g. Photosynthesis — light reactions"
              maxLength={160}
            />
            <ChoiceField
              label="Subject"
              required
              value={form.subjectId}
              onChange={(value) => patch({ subjectId: value })}
              options={scope.subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            />
            <ChoiceField
              label="Class"
              required
              value={form.classLevelId}
              onChange={(value) => patch({ classLevelId: value, sectionId: '' })}
              options={scope.classLevels.map((level) => ({ value: level.id, label: level.name }))}
            />
            <ChoiceField
              label="Section"
              value={form.sectionId}
              onChange={(value) => patch({ sectionId: value })}
              options={sectionOptions}
              hint={form.sectionId ? undefined : 'Optional — leave unset to cover the whole class.'}
            />
            <ChoiceField
              label="Status"
              value={form.status}
              onChange={(value) => patch({ status: value })}
              options={LESSON_STATUSES.map((status) => ({ value: status, label: status }))}
            />
            <FormField
              label="Planned date"
              value={form.plannedDate}
              onChangeText={(value) => patch({ plannedDate: value })}
              placeholder="YYYY-MM-DD"
              hint="Used for the upcoming-lessons list."
            />
            <FormField
              label="Duration (minutes)"
              value={form.durationMinutes}
              onChangeText={(value) => patch({ durationMinutes: value.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
              placeholder="5–600"
            />
            <FormField
              label="Objectives"
              value={form.objectives}
              onChangeText={(value) => patch({ objectives: value })}
              multiline
              placeholder="What should students be able to do by the end?"
            />
            <FormField
              label="Activities"
              value={form.activities}
              onChangeText={(value) => patch({ activities: value })}
              multiline
              placeholder="Lesson flow — include any homework or follow-up tasks."
            />
            <FormField
              label="Resources"
              value={form.resources}
              onChangeText={(value) => patch({ resources: value })}
              multiline
            />
            <FormField
              label="Assessment"
              value={form.assessment}
              onChangeText={(value) => patch({ assessment: value })}
              multiline
            />
            <FormField
              label="Notes"
              value={form.notes}
              onChangeText={(value) => patch({ notes: value })}
              multiline
            />
            <View style={styles.formActions}>
              <TeacherButton label="Cancel" variant="ghost" onPress={closeForm} disabled={saving} />
              <TeacherButton
                label={saving ? 'Saving…' : editingId ? 'Save changes' : 'Create plan'}
                onPress={() => void submit()}
                disabled={saving}
              />
            </View>
          </View>
        </TeacherPanel>
      ) : null}

      {upcoming.length > 0 ? (
        <TeacherPanel
          title="Upcoming lessons"
          subtitle="Next five by planned date"
          icon="calendar-check"
          accent="navy"
        >
          <View style={styles.list}>
            {upcoming.map((plan) => (
              <View key={plan.id} style={styles.upcomingRow}>
                <View style={styles.upcomingDate}>
                  <Text style={styles.upcomingDateText}>{formatDate(plan.plannedDate)}</Text>
                </View>
                <View style={styles.upcomingBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {plan.title}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {[plan.subject?.name, plan.classLevel?.name, plan.section?.name]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </Text>
                </View>
                <Chip label={plan.status} tone={STATUS_TONE[plan.status]} />
              </View>
            ))}
          </View>
        </TeacherPanel>
      ) : null}

      <TeacherPanel
        title="Lesson plans"
        subtitle={`${visible.length} of ${plans.data?.total ?? 0} in scope`}
        icon="lesson-plan"
        action={
          canManage && !formOpen ? (
            <TeacherButton label="New plan" icon="plus" variant="ghost" onPress={openCreate} />
          ) : undefined
        }
      >
        {plans.data?.truncated ? (
          <TeacherNotice
            tone="warning"
            icon="alert"
            message={`Only the first ${plans.data.items.length} of ${plans.data.total} lesson plans could be loaded in one pass. Narrow the status filter to focus the list.`}
          />
        ) : null}

        {!canManage ? (
          <TeacherNotice
            tone="info"
            icon="lock"
            message="Your account can view lesson plans but not create or change them."
          />
        ) : null}

        <FilterChips
          options={[
            { value: 'mine', label: 'My plans' },
            { value: 'classes', label: 'My classes' },
          ]}
          value={scopeFilter}
          onChange={setScopeFilter}
        />
        <FilterChips
          options={[
            { value: 'all', label: 'All statuses' },
            ...LESSON_STATUSES.map((status) => ({ value: status, label: status })),
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        {visible.length === 0 ? (
          <TeacherEmpty
            message={
              scopeFilter === 'mine'
                ? 'You have not created any lesson plans yet.'
                : 'No lesson plans for your classes yet.'
            }
            hint={
              canManage
                ? 'Use New plan to write your first lesson — it will appear here.'
                : 'Plans created for your classes will appear here.'
            }
            icon="lesson-plan"
          />
        ) : (
          <ScrollView style={styles.scroll} nestedScrollEnabled>
            <View style={styles.list}>
              {visible.map((plan) => {
                const isMine = plan.teacher?.id === scope.teacher.id;
                return (
                  <View key={plan.id} style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {plan.title}
                      </Text>
                      <Chip label={plan.status} tone={STATUS_TONE[plan.status]} />
                    </View>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {[plan.subject?.name, plan.classLevel?.name, plan.section?.name]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {[
                        plan.plannedDate ? `Planned ${formatDate(plan.plannedDate)}` : 'No date',
                        plan.durationMinutes ? `${plan.durationMinutes} min` : null,
                        isMine ? 'Yours' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {plan.objectives ? (
                      <Text style={styles.cardBody} numberOfLines={3}>
                        {plan.objectives}
                      </Text>
                    ) : null}
                    {isMine && canManage ? (
                      <View style={styles.cardActions}>
                        <TeacherButton
                          label="Edit"
                          icon="mark"
                          variant="ghost"
                          onPress={() => openEdit(plan)}
                        />
                        <TeacherButton
                          label="Delete"
                          variant="ghost"
                          onPress={() => confirmDelete(plan)}
                        />
                      </View>
                    ) : (
                      <Text style={styles.readOnly}>Read-only — created by another teacher.</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

const styles = {
  scroll: {
    maxHeight: 520,
  },
  list: {
    gap: 10,
  },
  card: {
    gap: 5,
    padding: 12,
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
  },
  cardMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 6,
  },
  readOnly: {
    fontSize: 11.5,
    fontStyle: 'italic' as const,
    color: colors.textFaint,
    marginTop: 4,
  },
  upcomingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  upcomingDate: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 78,
    alignItems: 'center' as const,
  },
  upcomingDateText: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: colors.primaryDark,
  },
  upcomingBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  form: {
    gap: 12,
  },
  formActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 10,
    marginTop: 2,
  },
} as const;
