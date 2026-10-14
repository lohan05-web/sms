import { Permission, type Role } from '@smartschool/shared';
import { useMemo, useState } from 'react';
import type { Row } from '../resources';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/format';
import {
  bookLabel,
  defaultDueDate,
  isOverdue,
  sortLoans,
  summarizeLoans,
  toBookAvailability,
  toLoanRecord,
  today,
  validateIssue,
  type BookAvailability,
  type LoanRecord,
} from '../lib/library';
import { can, canAny } from '../lib/permissions';
import { useLookups } from '../lib/options';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

const LIST_LIMIT = 100;

export function LibraryLoansPage() {
  const { user } = useAuth();
  if (!user || !canAny(user.role, [Permission.LOAN_READ, Permission.LOAN_MANAGE])) {
    return <ForbiddenPage />;
  }
  return <LibraryLoansView role={user.role} />;
}

function LibraryLoansView({ role }: { role: Role }) {
  const canManage = can(role, Permission.LOAN_MANAGE);
  const { options: studentOptions } = useLookups(['students']);
  const [refresh, setRefresh] = useState(0);
  const [bookId, setBookId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueDate());
  const [issuing, setIssuing] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const books = useAsync<BookAvailability[]>(async () => {
    const { items } = await api.list<Row>('/books', { limit: LIST_LIMIT });
    return items.map(toBookAvailability);
  }, [refresh]);

  const loans = useAsync<LoanRecord[]>(async () => {
    const [borrowed, overdue] = await Promise.all([
      api.list<Row>('/book-loans', { status: 'BORROWED', limit: LIST_LIMIT }),
      api.list<Row>('/book-loans', { status: 'OVERDUE', limit: LIST_LIMIT }),
    ]);
    const seen = new Map<string, LoanRecord>();
    for (const row of [...borrowed.items, ...overdue.items]) {
      const record = toLoanRecord(row);
      if (record.id) seen.set(record.id, record);
    }
    return sortLoans([...seen.values()]);
  }, [refresh]);

  const bookList = books.data ?? [];
  const loanList = loans.data ?? [];
  const summary = useMemo(() => summarizeLoans(loanList), [loanList]);

  const reload = () => setRefresh((value) => value + 1);

  const handleIssue = async () => {
    setError(null);
    setMessage(null);
    const problem = validateIssue({ books: bookList, bookId, studentId, dueAt });
    if (problem) {
      setError(problem);
      return;
    }
    const book = bookList.find((item) => item.id === bookId);
    setIssuing(true);
    try {
      await api.post('/book-loans', { bookId, studentId, dueAt });
      setMessage(`Issued "${book?.title ?? 'book'}" · due ${formatDate(dueAt)}`);
      setBookId('');
      setStudentId('');
      setDueAt(defaultDueDate());
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue book');
    } finally {
      setIssuing(false);
    }
  };

  const handleReturn = async (loan: LoanRecord) => {
    setError(null);
    setMessage(null);
    setReturningId(loan.id);
    try {
      await api.patch(`/book-loans/${loan.id}`, {
        status: 'RETURNED',
        returnedAt: new Date().toISOString(),
      });
      setMessage(`Returned "${loan.bookTitle || 'book'}"`);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return book');
    } finally {
      setReturningId(null);
    }
  };

  const selectedBook = bookList.find((item) => item.id === bookId);
  const readyToIssue =
    canManage &&
    Boolean(bookId) &&
    Boolean(studentId) &&
    Boolean(dueAt) &&
    (selectedBook?.availableCopies ?? 0) > 0;

  return (
    <div className="page">
      <PageHeader
        title="Issue &amp; Return"
        subtitle="Lend books to students and record returns, tracking available copies"
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {message ? (
        <div className="alert alert--success" role="status">
          {message}
        </div>
      ) : null}

      <section className="panel">
        <h2 className="panel__title">Issue a book</h2>
        {!canManage ? (
          <div className="alert alert--error">
            You can view circulation but do not have permission to issue or return books.
          </div>
        ) : null}
        <form
          className="toolbar toolbar--wrap"
          onSubmit={(event) => {
            event.preventDefault();
            void handleIssue();
          }}
        >
          <select
            className="field__input"
            aria-label="Book"
            value={bookId}
            onChange={(event) => setBookId(event.target.value)}
            disabled={books.loading || !canManage}
          >
            <option value="">{books.loading ? 'Loading books…' : '— Select book —'}</option>
            {bookList.map((book) => (
              <option key={book.id} value={book.id} disabled={book.availableCopies <= 0}>
                {bookLabel(book)}
              </option>
            ))}
          </select>

          <select
            className="field__input"
            aria-label="Student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            disabled={!canManage}
          >
            <option value="">— Select student —</option>
            {(studentOptions.students ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            className="field__input"
            type="date"
            aria-label="Due date"
            min={today()}
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={!canManage}
          />

          <button type="submit" className="btn btn--primary" disabled={!readyToIssue || issuing}>
            {issuing ? 'Issuing…' : 'Issue book'}
          </button>
        </form>
        {selectedBook && selectedBook.availableCopies <= 0 ? (
          <p className="panel__meta">No available copies of this title.</p>
        ) : null}
      </section>

      <section className="panel">
        <div className="toolbar toolbar--inline toolbar--wrap roster-toolbar">
          <h2 className="panel__title">Active loans</h2>
          <span className="toolbar__spacer" />
          <span className="panel__meta">
            {summary.active} active · {summary.overdue} overdue
          </span>
        </div>

        {loans.loading ? (
          <Spinner label="Loading active loans…" />
        ) : loans.error ? (
          <ErrorState message={loans.error} onRetry={loans.reload} />
        ) : loanList.length === 0 ? (
          <EmptyState message="No books are currently on loan." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Borrower</th>
                  <th>Borrowed</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loanList.map((loan) => {
                  const overdue = isOverdue(loan.dueAt, loan.status);
                  return (
                    <tr key={loan.id}>
                      <td>{loan.bookTitle || '—'}</td>
                      <td>{loan.borrower || loan.borrowerId || '—'}</td>
                      <td>{formatDate(loan.borrowedAt)}</td>
                      <td>{formatDate(loan.dueAt)}</td>
                      <td>
                        <span className={overdue ? 'badge badge--danger' : 'badge badge--warning'}>
                          {overdue ? 'Overdue' : loan.status}
                        </span>
                      </td>
                      <td className="table__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void handleReturn(loan)}
                          disabled={!canManage || returningId !== null}
                        >
                          {returningId === loan.id ? 'Returning…' : 'Return'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
