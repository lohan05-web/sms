import { EmptyState } from '../../components/ui';
import { formatDate, humanize } from '../../lib/format';
import { ParentChildPage } from './ParentChildPage';

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

export function ParentResultsPage() {
  return (
    <ParentChildPage<ExamResultRow[]>
      title="Academic Results"
      subtitle="Published exam marks for your child"
      endpoint={(studentId) => `/parents/me/children/${studentId}/results`}
      emptyMessage="No results have been published yet."
      isEmpty={(data) => data.length === 0}
      render={(data) =>
        data.length === 0 ? (
          <EmptyState message="No results have been published yet." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Marks obtained</th>
                  <th>Total</th>
                  <th>%</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.exam?.name ?? '—'}</td>
                    <td>{row.exam?.type ? humanize(row.exam.type) : '—'}</td>
                    <td>{formatDate(row.exam?.startDate)}</td>
                    <td>{row.subject?.name ?? '—'}</td>
                    <td>{String(row.marksObtained)}</td>
                    <td>{String(row.maxMarks)}</td>
                    <td>{percentage(row)}</td>
                    <td>{row.grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    />
  );
}
