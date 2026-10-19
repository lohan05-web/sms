import { StatCard, type StatTone } from '../../components/ui';
import { formatDate, humanize } from '../../lib/format';
import { ParentChildPage } from './ParentChildPage';

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  section?: { name?: string | null; classLevel?: { name?: string | null } | null } | null;
}

/** A status pill class used for the daily history badges. */
function badgeClass(status: string): string {
  if (status === 'PRESENT') return 'badge badge--success';
  if (status === 'ABSENT') return 'badge badge--danger';
  if (status === 'LATE' || status === 'HALF_DAY') return 'badge badge--warning';
  if (status === 'EXCUSED') return 'badge badge--info';
  return 'badge';
}

function percentageOf(present: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((present / total) * 100)}%`;
}

function monthKey(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

interface MonthSummary {
  key: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export function ParentAttendancePage() {
  return (
    <ParentChildPage<AttendanceRow[]>
      title="Attendance"
      subtitle="Daily and monthly attendance history for your child"
      endpoint={(studentId) => `/parents/me/children/${studentId}/attendance`}
      emptyMessage="No attendance has been recorded yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => {
        const counts: Record<string, number> = {};
        for (const row of data) counts[row.status] = (counts[row.status] ?? 0) + 1;
        const total = data.length;
        const present = counts.PRESENT ?? 0;
        const absent = counts.ABSENT ?? 0;
        const late = counts.LATE ?? 0;
        const excused = counts.EXCUSED ?? 0;
        const halfDay = counts.HALF_DAY ?? 0;

        const tone: StatTone =
          present / total >= 0.85 ? 'success' : present / total >= 0.7 ? 'warning' : 'danger';

        const months: MonthSummary[] = [];
        const byMonth = new Map<string, MonthSummary>();
        for (const row of data) {
          const key = monthKey(row.date);
          const summary =
            byMonth.get(key) ??
            ({ key, present: 0, absent: 0, late: 0, total: 0 } satisfies MonthSummary);
          summary.total += 1;
          if (row.status === 'PRESENT') summary.present += 1;
          if (row.status === 'ABSENT') summary.absent += 1;
          if (row.status === 'LATE') summary.late += 1;
          byMonth.set(key, summary);
        }
        months.push(...byMonth.values());
        months.sort((a, b) => b.key.localeCompare(a.key));

        return (
          <>
            <section className="parent-grid">
              <StatCard
                label="Attendance"
                value={percentageOf(present, total)}
                hint={`${present} of ${total} recorded days`}
                icon="attendance"
                tone={tone}
              />
              <StatCard label="Present" value={present} icon="check" tone="success" />
              <StatCard label="Absent" value={absent} icon="alert" tone="danger" />
              <StatCard label="Late" value={late} icon="timetable" tone="warning" />
              <StatCard label="Excused" value={excused} icon="shield" tone="info" />
              <StatCard label="Half day" value={halfDay} icon="timetable" tone="warning" />
            </section>

            <h2 className="panel__title" style={{ marginTop: 24 }}>
              Monthly summary
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Recorded</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month) => (
                    <tr key={month.key}>
                      <td>{monthLabel(month.key)}</td>
                      <td>{month.present}</td>
                      <td>{month.absent}</td>
                      <td>{month.late}</td>
                      <td>{month.total}</td>
                      <td>{percentageOf(month.present, month.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="panel__title" style={{ marginTop: 24 }}>
              Daily history
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <span className={badgeClass(row.status)}>{humanize(row.status)}</span>
                      </td>
                      <td>{row.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      }}
    />
  );
}
