import { Text, View } from 'react-native';

import { ParentChildShell } from '../../components/ParentChildShell';
import { formatDate, humanize } from '../../lib/format';

interface ExamResultRow {
  id: string;
  marksObtained: number | string;
  maxMarks: number | string;
  grade: string | null;
  remarks: string | null;
  exam?: { name?: string | null; type?: string | null; startDate?: string | null } | null;
  subject?: { name?: string | null } | null;
}

function percentage(row: ExamResultRow): string {
  const obtained = Number(row.marksObtained);
  const total = Number(row.maxMarks);
  if (!total || Number.isNaN(obtained) || Number.isNaN(total)) return '—';
  return `${Math.round((obtained / total) * 100)}%`;
}

export function ParentResultsScreen() {
  return (
    <ParentChildShell<ExamResultRow[]>
      title="Academic Results"
      subtitle="Published exam marks for your child"
      endpoint={(studentId) => `/parents/me/children/${studentId}/results`}
      emptyMessage="No results have been published yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => <ResultList rows={data} />}
    />
  );
}

function ResultList({ rows }: { rows: ExamResultRow[] }) {
  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <ResultRow key={row.id ?? index} row={row} />
      ))}
    </View>
  );
}

function ResultRow({ row }: { row: ExamResultRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{row.subject?.name ?? 'Result'}</Text>
        {row.grade ? <Text style={styles.grade}>{row.grade}</Text> : null}
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.muted}>
          {[
            row.exam?.name ?? '—',
            row.exam?.type ? humanize(row.exam.type) : null,
            formatDate(row.exam?.startDate) || null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.value}>
          {String(row.marksObtained)} / {String(row.maxMarks)} ({percentage(row)})
        </Text>
      </View>
      {row.remarks ? (
        <View style={styles.cardRow}>
          <Text style={styles.muted}>{row.remarks}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  grade: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  cardRow: {},
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  muted: {
    fontSize: 13,
    color: '#64748b',
  },
} as const;
