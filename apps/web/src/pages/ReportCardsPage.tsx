import type { OverallResult, ReportCard } from '@smartschool/shared';
import { useState, type FormEvent } from 'react';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { api, buildQuery } from '../lib/api';
import { useLookups } from '../lib/options';
import { useAsync } from '../lib/useAsync';

interface StudentSummary {
  id: string;
  name: string | null;
  admissionNo: string;
  rollNo: string | null;
}

interface CardBundle {
  student: StudentSummary;
  reportCards: ReportCard[];
  overall: OverallResult;
}

interface SectionResult {
  section: { id: string; name: string; classLevel: string };
  students: CardBundle[];
}

type Result = SectionResult | CardBundle;

interface Query {
  kind: 'student' | 'section';
  id: string;
}

function isSection(data: Result): data is SectionResult {
  return 'students' in data;
}

function ReportCardBlock({ label, card, overall }: { label?: string; card: ReportCard; overall: OverallResult }) {
  return (
    <div className="panel report-card">
      <div className="report-card__head">
        <h3 className="panel__title">
          {label ? `${label} — ` : ''}
          {card.exam}
        </h3>
        <span className="badge badge--default">{card.grade}</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks</th>
              <th>Total</th>
              <th>%</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {card.subjects.map((subject) => (
              <tr key={subject.subjectId}>
                <td>{subject.subject}</td>
                <td>{subject.marksObtained}</td>
                <td>{subject.totalMarks}</td>
                <td>{subject.percentage}</td>
                <td>{subject.grade}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{card.marksObtained}</strong>
              </td>
              <td>
                <strong>{card.totalMarks}</strong>
              </td>
              <td>
                <strong>{card.percentage}</strong>
              </td>
              <td>
                <strong>{card.grade}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="report-card__overall">
        Overall: {overall.marksObtained}/{overall.totalMarks} · {overall.percentage}% · Grade{' '}
        {overall.grade}
      </p>
    </div>
  );
}

function StudentReportCards({ bundle }: { bundle: CardBundle }) {
  return (
    <section className="report-cards__student">
      <h2 className="report-cards__name">
        {bundle.student.name ?? bundle.student.admissionNo}
        {bundle.student.rollNo ? ` · Roll ${bundle.student.rollNo}` : ''}
      </h2>
      {bundle.reportCards.length === 0 ? (
        <div className="state state--empty">No results recorded.</div>
      ) : (
        bundle.reportCards.map((card) => (
          <ReportCardBlock key={card.examId} card={card} overall={bundle.overall} />
        ))
      )}
    </section>
  );
}

export function ReportCardsPage() {
  const { options } = useLookups(['students', 'sections']);
  const [kind, setKind] = useState<'student' | 'section'>('student');
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState<Query | null>(null);
  const [error, setError] = useState<string | null>(null);

  const state = useAsync<Result | null>(async () => {
    if (!query) return null;
    const param = query.kind === 'student' ? { studentId: query.id } : { sectionId: query.id };
    return api.get<Result>(`/reports/report-cards${buildQuery(param)}`);
  }, [query?.kind, query?.id]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      setError('Choose a student or section first.');
      return;
    }
    setError(null);
    setQuery({ kind, id: selected });
  };

  const listOptions = kind === 'student' ? options.students : options.sections;

  return (
    <div className="page">
      <PageHeader
        title="Report Cards"
        subtitle="Subject-wise result cards built from recorded marks"
        actions={
          <button
            type="button"
            className="btn btn--ghost no-print"
            onClick={() => window.print()}
            disabled={!state.data}
          >
            Print
          </button>
        }
      />

      <section className="panel no-print">
        {error ? <div className="alert alert--error">{error}</div> : null}
        <form className="form form--inline" onSubmit={submit}>
          <label className="field">
            <span className="field__label">View by</span>
            <select
              className="field__input"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as 'student' | 'section');
                setSelected('');
              }}
            >
              <option value="student">Student</option>
              <option value="section">Section</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">{kind === 'student' ? 'Student' : 'Section'}</span>
            <select
              className="field__input"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Select…</option>
              {(listOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn--primary">
            Load
          </button>
        </form>
      </section>

      {state.loading ? (
        <Spinner label="Building report cards…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        isSection(state.data) ? (
          state.data.students.length === 0 ? (
            <div className="state state--empty">No students in this section.</div>
          ) : (
            <div className="report-cards">
              {state.data.students.map((bundle) => (
                <StudentReportCards key={bundle.student.id} bundle={bundle} />
              ))}
            </div>
          )
        ) : (
          <StudentReportCards bundle={state.data} />
        )
      ) : (
        <div className="state state--empty">Choose a student or section to view report cards.</div>
      )}
    </div>
  );
}
