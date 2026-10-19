import { useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { FilterChips, SearchField } from '../../components/DataList';
import {
  Chip,
  TeacherEmpty,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels } from '../../components/ui';
import { humanize } from '../../lib/format';
import {
  emptyPage,
  fetchStudentsForSections,
  studentClassLabel,
  studentNameOf,
  useTeacherScope,
  type PageFetch,
  type TeacherStudent,
} from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { colors, radius } from '../../theme';

/** Port of the web `/teacher/students` screen: the students in your sections. */
export function TeacherStudentsScreen() {
  const route = useRoute();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();

  const initialSection =
    (route.params as { section?: string } | undefined)?.section ?? ('all' as string);
  const [sectionFilter, setSectionFilter] = useState<string>(initialSection);
  const [query, setQuery] = useState('');

  const scopeKey = scope ? scope.sectionIds.join(',') : '';

  const students = useAsync<PageFetch<TeacherStudent>>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve(emptyPage())),
    [scopeKey],
  );

  const sectionOptions = useMemo(
    () => [
      { value: 'all', label: 'All my classes' },
      ...(scope?.sections ?? []).map((section) => ({
        value: section.id,
        label: section.classLevelName ? `${section.classLevelName} · ${section.name}` : section.name,
      })),
    ],
    [scope],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (students.data?.items ?? []).filter((student) => {
      if (sectionFilter !== 'all' && student.section?.id !== sectionFilter) return false;
      if (!needle) return true;
      return (
        studentNameOf(student).toLowerCase().includes(needle) ||
        student.admissionNo.toLowerCase().includes(needle) ||
        (student.rollNo ?? '').toLowerCase().includes(needle)
      );
    });
  }, [students.data, query, sectionFilter]);

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || students.loading) return <SkeletonPanels count={3} />;
  if (error ?? students.error) {
    return <ErrorState message={error ?? students.error ?? ''} onRetry={reload} />;
  }

  const total = students.data?.total ?? 0;
  const truncated = students.data?.truncated ?? false;

  return (
    <TeacherPage>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search name, admission or roll no…"
      />

      <TeacherPanel title="My students" subtitle={`${filtered.length} of ${total} shown`} icon="students">
        {sectionOptions.length > 1 ? (
          <FilterChips options={sectionOptions} value={sectionFilter} onChange={setSectionFilter} />
        ) : null}

        {truncated ? (
          <TeacherNotice
            tone="warning"
            icon="alert"
            message={`Showing the first ${students.data?.items.length ?? 0} of ${total} students. Use the section filter to narrow the list down to a page that fits.`}
          />
        ) : null}

        {filtered.length === 0 ? (
          total === 0 ? (
            <TeacherEmpty
              message="No students are enrolled in your sections yet."
              hint="Students appear here once an administrator enrols them into the classes you teach."
              icon="students"
            />
          ) : (
            <TeacherEmpty message="No students match your search." icon="search" />
          )
        ) : (
          <View style={styles.list}>
            {filtered.map((student) => (
              <View key={student.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {studentNameOf(student)}
                  </Text>
                  <Chip
                    label={humanize(student.status) || '—'}
                    tone={student.status === 'ACTIVE' ? 'success' : 'default'}
                  />
                </View>
                <Text style={styles.cardMeta}>{studentClassLabel(student)}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>Adm {student.admissionNo}</Text>
                  <Text style={styles.metaItem}>Roll {student.rollNo ?? '—'}</Text>
                  <Text style={styles.metaItem}>{humanize(student.gender) || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <Text style={styles.footnote}>
        Only students in the sections assigned to you are loaded.
      </Text>
    </TeacherPage>
  );
}

const styles = {
  list: {
    gap: 10,
  },
  card: {
    gap: 4,
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
    fontSize: 13,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginTop: 2,
  },
  metaItem: {
    fontSize: 12,
    color: colors.textFaint,
  },
  footnote: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center' as const,
  },
} as const;
