import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { FilterChips } from '../../components/DataList';
import { BarChart, LineChart } from '../../components/Charts';
import { ChoiceField } from '../../components/teacher/teacherForm';
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
import {
  emptyPage,
  fetchExamsForClassLevels,
  fetchResultsForClassLevels,
  fetchStudentsForSections,
  studentNameOf,
  useTeacherScope,
  type ExamItem,
  type ExamResultItem,
  type PageFetch,
  type TeacherStudent,
} from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { colors, radius } from '../../theme';

/**
 * Marks & Grades for the signed-in teacher.
 *
 * Recording and reading results both go through `/exam-results`, which the
 * backend already narrows to the teacher's own students, subjects and class
 * levels (`resolveTeacherScope`), and which rejects a mark above the exam's
 * `maxMarks`. This screen adds the entry form, per-student validation and the
 * performance views on top of that — it never widens the server's authorisation.
 */

function percentOf(result: ExamResultItem): number | null {
  const max = result.exam?.maxMarks ?? 0;
  if (!max) return null;
  const obtained = Number(result.marksObtained);
  if (Number.isNaN(obtained)) return null;
  return Math.round((obtained / max) * 1000) / 10;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

interface Average {
  id: string;
  label: string;
  value: number;
  count: number;
}

/** Groups results by a key and averages their percentages. */
function averagesBy(
  results: readonly ExamResultItem[],
  keyOf: (result: ExamResultItem) => string | null | undefined,
  labelOf: (result: ExamResultItem) => string,
): Average[] {
  const groups = new Map<string, { label: string; sum: number; count: number }>();
  for (const result of results) {
    const key = keyOf(result);
    const pct = percentOf(result);
    if (!key || pct === null) continue;
    const entry = groups.get(key) ?? { label: labelOf(result), sum: 0, count: 0 };
    entry.sum += pct;
    entry.count += 1;
    groups.set(key, entry);
  }
  return [...groups.entries()].map(([id, entry]) => ({
    id,
    label: entry.label,
    value: round1(entry.sum / entry.count),
    count: entry.count,
  }));
}

export function TeacherMarksScreen() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const scopeKey = scope ? scope.sectionIds.join(',') : '';
  const classLevelKey = scope ? scope.classLevelIds.join(',') : '';

  const results = useAsync<PageFetch<ExamResultItem>>(
    () => (scope ? fetchResultsForClassLevels(scope.classLevelIds) : Promise.resolve(emptyPage())),
    [classLevelKey],
  );
  const students = useAsync<PageFetch<TeacherStudent>>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve(emptyPage())),
    [scopeKey],
  );
  const exams = useAsync<PageFetch<ExamItem>>(
    () => (scope ? fetchExamsForClassLevels(scope.classLevelIds) : Promise.resolve(emptyPage())),
    [classLevelKey],
  );

  const [classLevelFilter, setClassLevelFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');

  // Marks-entry state.
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryExamId, setEntryExamId] = useState('');
  const [entrySubjectId, setEntrySubjectId] = useState('');
  const [entrySectionId, setEntrySectionId] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySummary, setEntrySummary] = useState<string | null>(null);
  const [entryFailures, setEntryFailures] = useState<string[]>([]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students.data?.items ?? []) map.set(student.id, studentNameOf(student));
    return map;
  }, [students.data]);

  /** Exams limited to the classes and subjects the teacher actually teaches. */
  const myExams = useMemo(() => {
    if (!scope) return [];
    const subjectIds = new Set(scope.subjects.map((subject) => subject.id));
    const classLevelIds = new Set(scope.classLevelIds);
    return (exams.data?.items ?? [])
      .filter(
        (exam) =>
          exam.classLevelId &&
          classLevelIds.has(exam.classLevelId) &&
          (!exam.subjectId || subjectIds.has(exam.subjectId)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exams.data, scope]);

  const examById = useMemo(() => {
    const map = new Map<string, ExamItem>();
    for (const exam of exams.data?.items ?? []) map.set(exam.id, exam);
    return map;
  }, [exams.data]);

  const examOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const result of results.data?.items ?? []) {
      if (result.exam?.id) map.set(result.exam.id, result.exam.name ?? 'Exam');
    }
    return [...map.entries()].map(([id, name]) => ({ value: id, label: name }));
  }, [results.data]);

  const filtered = useMemo(
    () =>
      (results.data?.items ?? []).filter((result) => {
        if (classLevelFilter !== 'all' && result.exam?.classLevelId !== classLevelFilter) return false;
        if (examFilter !== 'all' && result.exam?.id !== examFilter) return false;
        return true;
      }),
    [results.data, classLevelFilter, examFilter],
  );

  const average = useMemo(() => {
    const scored = filtered.filter((result) => percentOf(result) !== null);
    if (scored.length === 0) return 0;
    return round1(scored.reduce((sum, r) => sum + (percentOf(r) ?? 0), 0) / scored.length);
  }, [filtered]);

  const classAverages = useMemo(
    () =>
      averagesBy(
        filtered,
        (result) => result.exam?.classLevelId,
        (result) => scope?.classLevels.find((c) => c.id === result.exam?.classLevelId)?.name ?? 'Class',
      ),
    [filtered, scope],
  );

  const subjectPerf = useMemo(
    () =>
      averagesBy(
        filtered,
        (result) => result.subject?.id,
        (result) => result.subject?.name ?? 'Subject',
      ),
    [filtered],
  );

  const timeSeries = useMemo(() => {
    const series = averagesBy(
      filtered,
      (result) => result.exam?.id,
      (result) => result.exam?.name ?? 'Exam',
    );
    return series
      .map((point) => ({ ...point, date: examById.get(point.id)?.startDate ?? '' }))
      .sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date);
        return a.label.localeCompare(b.label);
      });
  }, [filtered, examById]);

  /* --------------------------------------------------------- entry helpers */

  const selectedExam = useMemo(
    () => myExams.find((exam) => exam.id === entryExamId) ?? null,
    [myExams, entryExamId],
  );
  const maxMarks = selectedExam?.maxMarks ?? 100;

  const sectionOptions = useMemo(() => {
    if (!scope || !selectedExam?.classLevelId) return [];
    return scope.sections
      .filter((section) => section.classLevelId === selectedExam.classLevelId)
      .map((section) => ({
        value: section.id,
        label: [section.classLevelName, section.name].filter(Boolean).join(' · ') || section.name,
      }));
  }, [scope, selectedExam]);

  const roster = useMemo(() => {
    if (!entrySectionId) return [];
    return (students.data?.items ?? [])
      .filter((student) => student.section?.id === entrySectionId)
      .sort((a, b) =>
        `${a.rollNo ?? ''}`.localeCompare(`${b.rollNo ?? ''}`, undefined, { numeric: true }),
      );
  }, [students.data, entrySectionId]);

  /** Existing marks for the current exam/subject/roster, keyed by student id. */
  const existingMarks = useMemo(() => {
    const map = new Map<string, number>();
    if (!entryExamId || !entrySubjectId) return map;
    for (const result of results.data?.items ?? []) {
      if (result.exam?.id !== entryExamId) continue;
      if (result.subject?.id !== entrySubjectId) continue;
      if (result.student?.id) map.set(result.student.id, Number(result.marksObtained));
    }
    return map;
  }, [results.data, entryExamId, entrySubjectId]);

  // Re-seed the draft whenever the chosen exam/subject/section (or the loaded
  // data behind them) changes, so editors always start from what the server has.
  // Deliberately does not touch the notices: a post-save reload also re-runs this
  // and must not wipe the "Saved marks for N students" confirmation.
  useEffect(() => {
    if (!entryOpen) return;
    const next: Record<string, string> = {};
    for (const student of roster) {
      const existing = existingMarks.get(student.id);
      if (existing !== undefined) next[student.id] = String(existing);
    }
    setDraft(next);
  }, [entryOpen, roster, existingMarks]);

  const openEntry = () => {
    const firstExam = myExams[0] ?? null;
    const firstSubject =
      (firstExam?.subjectId && scope?.subjects.find((s) => s.id === firstExam.subjectId)?.id) ||
      scope?.subjects[0]?.id ||
      '';
    const firstSection =
      firstExam?.classLevelId
        ? scope?.sections.find((s) => s.classLevelId === firstExam.classLevelId)?.id ?? ''
        : scope?.sections[0]?.id ?? '';
    setEntryExamId(firstExam?.id ?? '');
    setEntrySubjectId(firstSubject);
    setEntrySectionId(firstSection);
    setDraft({});
    setEntryError(null);
    setEntrySummary(null);
    setEntryFailures([]);
    setEntryOpen(true);
  };

  const closeEntry = () => {
    setEntryOpen(false);
    setDraft({});
    setEntryError(null);
    setEntrySummary(null);
    setEntryFailures([]);
  };

  const submitEntry = async () => {
    setEntryError(null);
    setEntrySummary(null);
    setEntryFailures([]);

    if (!selectedExam) {
      setEntryError('Choose an exam first.');
      return;
    }
    if (!entrySubjectId) {
      setEntryError('Choose a subject.');
      return;
    }
    if (!entrySectionId) {
      setEntryError('Choose a section.');
      return;
    }

    // Validate every entered mark before sending anything.
    const planned: { student: TeacherStudent; marks: number }[] = [];
    for (const student of roster) {
      const raw = (draft[student.id] ?? '').trim();
      if (!raw) continue;
      const marks = Number(raw);
      if (!Number.isInteger(marks)) {
        setEntryError(`Enter a whole number for ${studentNameOf(student)}.`);
        return;
      }
      if (marks < 0 || marks > maxMarks) {
        setEntryError(
          `${studentNameOf(student)}: marks must be between 0 and ${maxMarks}.`,
        );
        return;
      }
      planned.push({ student, marks });
    }
    if (planned.length === 0) {
      setEntryError('Enter at least one mark before saving.');
      return;
    }

    setSaving(true);
    const failures: string[] = [];
    let saved = 0;
    for (const { student, marks } of planned) {
      try {
        // POST is an upsert on (exam, student, subject) and recomputes the grade,
        // so it handles both first entry and later corrections.
        await api.post('/exam-results', {
          examId: selectedExam.id,
          studentId: student.id,
          subjectId: entrySubjectId,
          marksObtained: marks,
        });
        saved += 1;
      } catch (err) {
        failures.push(
          `${studentNameOf(student)}: ${err instanceof Error ? err.message : 'failed to save'}`,
        );
      }
    }
    setSaving(false);
    setEntryFailures(failures);
    setEntrySummary(
      `Saved marks for ${saved} of ${planned.length} student${planned.length === 1 ? '' : 's'}${
        failures.length ? ` — ${failures.length} failed.` : '.'
      }`,
    );
    if (saved > 0) results.reload();
  };

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || results.loading || students.loading || exams.loading)
    return <SkeletonPanels count={3} />;
  if (error ?? results.error ?? students.error ?? exams.error) {
    return (
      <ErrorState
        message={error ?? results.error ?? students.error ?? exams.error ?? ''}
        onRetry={() => {
          reload();
          results.reload();
          students.reload();
          exams.reload();
        }}
      />
    );
  }
  if (!scope) return <TeacherEmpty message="No teaching profile found for this account." icon="lock" />;

  const classOptions = [
    { value: 'all', label: 'All my classes' },
    ...scope.classLevels.map((level) => ({ value: level.id, label: level.name })),
  ];

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard label="Results" value={filtered.length} hint="Recorded marks" icon="marks" />
        <StatCard
          label="Average"
          value={`${average}%`}
          hint="Across shown results"
          icon="trending"
          tone="success"
        />
        <StatCard label="Exams" value={myExams.length} hint="In your classes" icon="roster" tone="info" />
        <StatCard
          label="Class levels"
          value={scope.classLevelIds.length}
          hint="You teach"
          icon="class"
          tone="warning"
        />
      </StatGrid>

      <TeacherPanel
        title="Performance"
        subtitle="Class and subject averages from your recorded marks"
        icon="trending"
        accent="violet"
      >
        {filtered.length === 0 ? (
          <TeacherEmpty
            message="No marks to chart yet."
            hint="Record some results with Enter marks and the graphs will fill in."
            icon="marks"
          />
        ) : (
          <View style={styles.stack}>
            {classAverages.length > 0 ? (
              <View style={styles.averageGrid}>
                {classAverages.map((entry) => (
                  <View key={entry.id} style={styles.averageCard}>
                    <Text style={styles.averageLabel} numberOfLines={1}>
                      {entry.label}
                    </Text>
                    <Text style={styles.averageValue}>{entry.value}%</Text>
                    <Text style={styles.averageHint}>
                      {entry.count} result{entry.count === 1 ? '' : 's'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {subjectPerf.length > 0 ? (
              <View style={styles.chartBlock}>
                <Text style={styles.chartTitle}>Subject-wise average</Text>
                <BarChart
                  data={subjectPerf.map((entry) => ({ x: entry.label, y: entry.value }))}
                  maxValue={100}
                  suffix="%"
                  color={colors.primary}
                />
              </View>
            ) : null}

            {timeSeries.length > 0 ? (
              <View style={styles.chartBlock}>
                <Text style={styles.chartTitle}>Average by exam over time</Text>
                <LineChart
                  data={timeSeries.map((entry) => ({ x: entry.label, y: entry.value }))}
                  maxValue={100}
                  suffix="%"
                  color={colors.success}
                />
              </View>
            ) : null}
          </View>
        )}
      </TeacherPanel>

      <TeacherPanel
        title={entryOpen ? 'Enter marks' : 'Marks & grades'}
        subtitle={entryOpen ? `Maximum ${maxMarks} marks` : 'Exam results for the classes you teach'}
        icon="mark"
        accent={entryOpen ? 'navy' : undefined}
        action={
          entryOpen ? (
            <TeacherButton label="Close" variant="ghost" onPress={closeEntry} disabled={saving} />
          ) : myExams.length > 0 ? (
            <TeacherButton label="Enter marks" icon="mark" variant="ghost" onPress={openEntry} />
          ) : undefined
        }
      >
        {!entryOpen ? (
          <>
            <FilterChips options={classOptions} value={classLevelFilter} onChange={setClassLevelFilter} />
            {examOptions.length > 1 ? (
              <FilterChips
                options={[{ value: 'all', label: 'All exams' }, ...examOptions]}
                value={examFilter}
                onChange={setExamFilter}
              />
            ) : null}
            {myExams.length === 0 ? (
              <TeacherNotice
                tone="warning"
                icon="alert"
                message="No exams have been set up for your classes yet, so marks cannot be entered until an administrator creates one."
              />
            ) : null}

            {filtered.length === 0 ? (
              <TeacherEmpty
                message="No exam results have been recorded for your classes yet."
                hint="Use Enter marks to record scores for your students — they appear here immediately."
                icon="marks"
              />
            ) : (
              <View style={styles.list}>
                {filtered.map((result) => {
                  const pct = percentOf(result);
                  return (
                    <View key={result.id} style={styles.card}>
                      <View style={styles.cardHead}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {nameById.get(result.student?.id ?? '') ??
                            studentNameOf(result.student, result.student?.admissionNo ?? '—')}
                        </Text>
                        {result.grade ? <Chip label={result.grade} tone="info" /> : null}
                      </View>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {[result.exam?.name, result.subject?.name].filter(Boolean).join(' · ') || '—'}
                      </Text>
                      <View style={styles.scoreRow}>
                        <Text style={styles.score}>
                          {result.marksObtained}
                          {result.exam?.maxMarks ? (
                            <Text style={styles.scoreMax}> / {result.exam.maxMarks}</Text>
                          ) : null}
                        </Text>
                        {pct !== null ? (
                          <Chip label={`${pct}%`} tone={pct >= 50 ? 'success' : 'danger'} />
                        ) : null}
                        <Text style={styles.studentMeta}>{result.student?.admissionNo ?? ''}</Text>
                      </View>
                      {result.remarks ? (
                        <Text style={styles.remarks} numberOfLines={2}>
                          {result.remarks}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View style={styles.stack}>
            {entryError ? <TeacherNotice tone="danger" icon="alert" message={entryError} /> : null}
            {entrySummary ? (
              <TeacherNotice
                tone={entryFailures.length ? 'warning' : 'success'}
                icon={entryFailures.length ? 'alert' : 'check'}
                message={entrySummary}
              />
            ) : null}
            {entryFailures.length > 0 ? (
              <View style={styles.failureList}>
                {entryFailures.map((failure) => (
                  <Text key={failure} style={styles.failureText}>
                    • {failure}
                  </Text>
                ))}
              </View>
            ) : null}

            <ChoiceField
              label="Exam"
              required
              value={entryExamId}
              onChange={(value) => {
                const exam = myExams.find((item) => item.id === value) ?? null;
                const subjectOk =
                  exam?.subjectId && scope.subjects.some((s) => s.id === exam.subjectId);
                setEntryExamId(value);
                if (subjectOk && exam?.subjectId) setEntrySubjectId(exam.subjectId);
                const section = exam?.classLevelId
                  ? scope.sections.find((s) => s.classLevelId === exam.classLevelId)
                  : undefined;
                setEntrySectionId(section?.id ?? '');
                setEntryError(null);
              }}
              options={myExams.map((exam) => ({
                value: exam.id,
                label: `${exam.classLevel?.name ? `${exam.classLevel.name} · ` : ''}${exam.name}`,
              }))}
            />
            <ChoiceField
              label="Subject"
              required
              value={entrySubjectId}
              onChange={(value) => {
                setEntrySubjectId(value);
                setEntryError(null);
              }}
              options={scope.subjects.map((subject) => ({
                value: subject.id,
                label: subject.name,
              }))}
            />
            <ChoiceField
              label="Section"
              required
              value={entrySectionId}
              onChange={(value) => {
                setEntrySectionId(value);
                setEntryError(null);
              }}
              options={sectionOptions}
              hint={sectionOptions.length === 0 ? 'No section of yours belongs to this exam’s class.' : undefined}
            />

            {roster.length > 0 ? (
              <View style={styles.roster}>
                <View style={styles.rosterHead}>
                  <Text style={styles.rosterHeadText}>Student</Text>
                  <Text style={styles.rosterHeadText}>Marks / {maxMarks}</Text>
                </View>
                <ScrollView style={styles.rosterScroll} nestedScrollEnabled>
                  <View style={styles.list}>
                    {roster.map((student) => {
                      const raw = draft[student.id] ?? '';
                      const numeric = Number(raw);
                      const invalid =
                        raw.trim().length > 0 &&
                        (!Number.isInteger(numeric) || numeric < 0 || numeric > maxMarks);
                      const existing = existingMarks.get(student.id);
                      return (
                        <View key={student.id} style={styles.rosterRow}>
                          <View style={styles.rosterInfo}>
                            <Text style={styles.rosterName} numberOfLines={1}>
                              {studentNameOf(student)}
                            </Text>
                            <Text style={styles.rosterMeta} numberOfLines={1}>
                              {[student.rollNo ? `Roll ${student.rollNo}` : null, student.admissionNo]
                                .filter(Boolean)
                                .join(' · ')}
                              {existing !== undefined ? ` · currently ${existing}` : ''}
                            </Text>
                          </View>
                          <TextInput
                            style={[styles.markInput, invalid ? styles.markInputInvalid : null]}
                            value={raw}
                            onChangeText={(value) =>
                              setDraft((prev) => ({
                                ...prev,
                                [student.id]: value.replace(/[^0-9]/g, ''),
                              }))
                            }
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={colors.textFaint}
                            maxLength={4}
                            accessibilityLabel={`Marks for ${studentNameOf(student)}`}
                          />
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                <Text style={styles.muted}>
                  Leave a field blank to skip that student. Existing marks are shown so you can correct
                  them.
                </Text>
                <TeacherButton
                  label={saving ? 'Saving…' : 'Save marks'}
                  icon="check"
                  onPress={() => void submitEntry()}
                  disabled={saving}
                />
              </View>
            ) : (
              <TeacherEmpty
                message="No students in this section yet."
                hint="Pick another exam or section."
                icon="roster"
              />
            )}
          </View>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

const styles = {
  stack: {
    gap: 12,
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
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  cardName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  score: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: colors.text,
  },
  scoreMax: {
    fontSize: 12.5,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  studentMeta: {
    fontSize: 12,
    color: colors.textFaint,
  },
  remarks: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
    fontStyle: 'italic' as const,
  },
  averageGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  averageCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    gap: 2,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  averageLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  averageValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.primaryDark,
  },
  averageHint: {
    fontSize: 11,
    color: colors.textFaint,
  },
  chartBlock: {
    gap: 6,
  },
  chartTitle: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  roster: {
    gap: 10,
  },
  rosterHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  rosterHeadText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    color: colors.textFaint,
  },
  rosterScroll: {
    maxHeight: 320,
  },
  rosterRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rosterInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rosterName: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  rosterMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  markInput: {
    width: 74,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  markInputInvalid: {
    borderColor: colors.danger,
    color: colors.danger,
  },
  failureList: {
    gap: 2,
  },
  failureText: {
    fontSize: 12,
    color: colors.danger,
  },
  muted: {
    fontSize: 12,
    color: colors.textMuted,
  },
} as const;
