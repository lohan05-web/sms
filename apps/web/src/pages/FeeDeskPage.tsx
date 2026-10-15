import { Permission } from '@smartschool/shared';
import { useState } from 'react';
import { EmptyState, ErrorState, PageHeader, Spinner, StatCard } from '../components/ui';
import { ApiError, api, buildQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLookups } from '../lib/options';
import { can } from '../lib/permissions';
import { useAsync } from '../lib/useAsync';

interface Totals {
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
}

interface ClassLevelRow {
  id: string;
  name: string;
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
}

interface DefaulterRow {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string | null;
  admissionNo: string;
  classLevel: string | null;
  section: string | null;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
}

interface FeeDeskData {
  totals: Totals;
  byStatus: Record<string, number>;
  byClassLevel: ClassLevelRow[];
  defaulters: DefaulterRow[];
}

interface SectionRow {
  id: string;
  name: string;
}

const money = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const defaultDue = () => isoDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

export function FeeDeskPage() {
  const { user } = useAuth();
  const { options } = useLookups(['classes']);
  const [classLevelId, setClassLevelId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDue());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const canManage = user ? can(user.role, Permission.INVOICE_MANAGE) : false;

  const sections = useAsync<SectionRow[]>(async () => {
    if (!classLevelId) return [];
    const { items } = await api.list<SectionRow>('/sections', {
      classLevelId,
      limit: 100,
    });
    return items;
  }, [classLevelId]);

  const state = useAsync<FeeDeskData>(
    () =>
      api.get<FeeDeskData>(
        `/invoices/fee-desk${buildQuery({
          classLevelId: classLevelId || undefined,
          sectionId: sectionId || undefined,
        })}`,
      ),
    [classLevelId, sectionId],
  );

  const generate = async () => {
    if (!classLevelId) {
      setGenError('Choose a class first.');
      return;
    }
    setBusy(true);
    setGenError(null);
    setResult(null);
    try {
      const res = await api.post<{ created: number; skipped: number; feeItems: number }>(
        '/invoices/generate',
        {
          classLevelId,
          sectionId: sectionId || undefined,
          dueDate,
        },
      );
      setResult(
        `Created ${res.created} invoice(s) with ${res.feeItems} fee item(s); skipped ${res.skipped} already-invoiced student(s).`,
      );
      state.reload();
    } catch (error) {
      setGenError(error instanceof ApiError ? error.message : 'Failed to generate invoices.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Fee Desk"
        subtitle="Track fee collection, outstanding balances and defaulters"
        icon="finance"
        actions={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={state.reload}
            disabled={state.loading}
          >
            Refresh
          </button>
        }
      />

      <section className="panel no-print">
        <div className="toolbar toolbar--wrap">
          <label className="field toolbar__field">
            <span className="field__label">Class</span>
            <select
              className="field__input"
              value={classLevelId}
              onChange={(event) => {
                setClassLevelId(event.target.value);
                setSectionId('');
              }}
            >
              <option value="">All classes</option>
              {(options.classes ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field toolbar__field">
            <span className="field__label">Section</span>
            <select
              className="field__input"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              disabled={!classLevelId || sections.loading}
            >
              <option value="">All sections</option>
              {(sections.data ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar__spacer" />
        </div>
      </section>

      {state.loading ? (
        <Spinner label="Loading fee desk…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Billed"
              value={money(state.data?.totals.billed ?? 0)}
              hint={`${state.data?.totals.invoices ?? 0} invoice(s)`}
              icon="reports"
            />
            <StatCard
              label="Collected"
              value={money(state.data?.totals.collected ?? 0)}
              tone="success"
              icon="check"
            />
            <StatCard
              label="Outstanding"
              value={money(state.data?.totals.outstanding ?? 0)}
              tone="danger"
              icon="alert"
            />
            <StatCard
              label="Collection rate"
              value={`${collectionRate(state.data?.totals)}%`}
              tone="info"
              icon="trending"
            />
          </div>

          <div className="dashboard">
            <section className="panel">
              <h2 className="panel__title">By class</h2>
              {state.data && state.data.byClassLevel.length > 0 ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Invoices</th>
                        <th>Billed</th>
                        <th>Collected</th>
                        <th>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.byClassLevel.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.invoices}</td>
                          <td>{money(row.billed)}</td>
                          <td>{money(row.collected)}</td>
                          <td>{money(row.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No fee activity for this scope yet." icon="inbox" />
              )}
            </section>

            <section className="panel">
              <h2 className="panel__title">Status breakdown</h2>
              {state.data && Object.keys(state.data.byStatus).length > 0 ? (
                <div className="stat-grid">
                  {Object.entries(state.data.byStatus).map(([status, count]) => (
                    <StatCard key={status} label={humanize(status)} value={count} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No invoices recorded." icon="inbox" />
              )}
            </section>
          </div>

          {canManage ? (
            <section className="panel no-print">
              <h2 className="panel__title">Generate invoices</h2>
              <p className="panel__meta">
                Issue one invoice per active student from the fee structure of the selected class.
                Students already invoiced for these fee items are skipped.
              </p>
              {genError ? <div className="alert alert--error">{genError}</div> : null}
              {result ? <div className="alert alert--success">{result}</div> : null}
              <div className="toolbar toolbar--wrap">
                <label className="field toolbar__field">
                  <span className="field__label">Due date</span>
                  <input
                    className="field__input"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
                <div className="toolbar__spacer" />
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={generate}
                  disabled={busy || !classLevelId}
                >
                  {busy ? 'Generating…' : 'Generate invoices'}
                </button>
              </div>
            </section>
          ) : null}

          <section className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Defaulters</h2>
              <button
                type="button"
                className="btn btn--ghost no-print"
                onClick={() => window.print()}
                disabled={!state.data || state.data.defaulters.length === 0}
              >
                Print
              </button>
            </div>
            {state.data && state.data.defaulters.length > 0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Section</th>
                      <th>Due</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.defaulters.map((row) => (
                      <tr key={row.id}>
                        <td>{row.invoiceNo}</td>
                        <td>{row.studentName ?? row.admissionNo}</td>
                        <td>{row.classLevel ?? '—'}</td>
                        <td>{row.section ?? '—'}</td>
                        <td>{formatDate(row.dueDate)}</td>
                        <td>{money(row.total)}</td>
                        <td>{money(row.amountPaid)}</td>
                        <td>
                          <strong>{money(row.balance)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No outstanding invoices. Every fee is settled." icon="check" />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function collectionRate(totals?: Totals): string {
  if (!totals || totals.billed <= 0) return '0';
  return ((totals.collected / totals.billed) * 100).toFixed(1);
}

function humanize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}
