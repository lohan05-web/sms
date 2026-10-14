export const ACTIVE_LOAN_STATUSES = ['BORROWED', 'OVERDUE'] as const;

export type LoanStatusValue = 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'LOST';

type RawRow = Record<string, unknown>;

export interface BookAvailability {
  id: string;
  title: string;
  author: string;
  availableCopies: number;
  totalCopies: number;
}

export interface LoanRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  borrower: string;
  borrowerId: string;
  borrowedAt: string;
  dueAt: string;
  status: string;
}

export interface LoanSummary {
  active: number;
  overdue: number;
}

export interface IssueIntent {
  books: BookAvailability[];
  bookId: string;
  studentId: string;
  dueAt: string;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function toInt(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : 0;
}

function asRow(value: unknown): RawRow | undefined {
  return value && typeof value === 'object' ? (value as RawRow) : undefined;
}

function fullName(row?: RawRow): string {
  if (!row) return '';
  return `${str(row.firstName)} ${str(row.lastName)}`.trim();
}

/** Today's date as an ISO `yyyy-mm-dd` string (UTC). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add whole days to an ISO `yyyy-mm-dd` date, returning the same format. */
export function addDays(dateIso: string, days: number): string {
  const base = new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return dateIso;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** The default due date for a fresh issue (two weeks out). */
export function defaultDueDate(days = 14): string {
  return addDays(today(), days);
}

/** Map a `/books` list row to the fields the issue form needs. */
export function toBookAvailability(row: RawRow): BookAvailability {
  const availableCopies = toInt(row.availableCopies);
  const totalCopies = toInt(row.totalCopies);
  return {
    id: str(row.id),
    title: str(row.title),
    author: str(row.author),
    availableCopies,
    totalCopies: totalCopies || availableCopies,
  };
}

/** Map a `/book-loans` list row to a display record. */
export function toLoanRecord(row: RawRow): LoanRecord {
  const book = asRow(row.book);
  const student = asRow(row.student);
  const borrowerUser = asRow(row.user);
  const borrower =
    fullName(asRow(student?.user)) ||
    fullName(student) ||
    fullName(borrowerUser) ||
    str(student?.admissionNo) ||
    str(borrowerUser?.email) ||
    '';
  return {
    id: str(row.id),
    bookId: str(row.bookId),
    bookTitle: str(book?.title),
    borrower,
    borrowerId: str(row.studentId) || str(row.userId),
    borrowedAt: str(row.borrowedAt),
    dueAt: str(row.dueAt),
    status: str(row.status),
  };
}

export function isActiveLoan(status: string): boolean {
  return (ACTIVE_LOAN_STATUSES as readonly string[]).includes(status);
}

/** Whether an outstanding loan is past its due date. */
export function isOverdue(dueAt: string, status: string, todayIso: string = today()): boolean {
  if (!isActiveLoan(status)) return false;
  const due = dueAt.slice(0, 10);
  return due !== '' && due < todayIso.slice(0, 10);
}

export function bookLabel(book: BookAvailability, withAvailability = true): string {
  const name = [book.title, book.author].filter(Boolean).join(' — ');
  return withAvailability ? `${name} (${book.availableCopies} available)` : name;
}

/** Order loans by due date (soonest first), then borrower name. */
export function sortLoans(loans: LoanRecord[]): LoanRecord[] {
  return [...loans].sort((a, b) => {
    const da = a.dueAt.slice(0, 10);
    const db = b.dueAt.slice(0, 10);
    if (da !== db) {
      if (da === '') return 1;
      if (db === '') return -1;
      return da.localeCompare(db);
    }
    return a.borrower.localeCompare(b.borrower);
  });
}

export function summarizeLoans(loans: LoanRecord[], todayIso: string = today()): LoanSummary {
  let active = 0;
  let overdue = 0;
  for (const loan of loans) {
    if (!isActiveLoan(loan.status)) continue;
    active += 1;
    if (isOverdue(loan.dueAt, loan.status, todayIso)) overdue += 1;
  }
  return { active, overdue };
}

/**
 * Client-side guard for the issue form. Returns an error message, or `null`
 * when the intent is valid and can be submitted to the API.
 */
export function validateIssue(intent: IssueIntent, todayIso: string = today()): string | null {
  if (!intent.bookId) return 'Select a book to issue';
  const book = intent.books.find((item) => item.id === intent.bookId);
  if (!book) return 'Select a book to issue';
  if (book.availableCopies <= 0) return `No available copies of "${book.title || 'this book'}"`;
  if (!intent.studentId) return 'Select a student to issue to';
  if (!intent.dueAt) return 'Choose a due date';
  if (intent.dueAt.slice(0, 10) < todayIso.slice(0, 10)) return 'Due date cannot be in the past';
  return null;
}
