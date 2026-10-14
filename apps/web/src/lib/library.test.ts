import { describe, expect, it } from 'vitest';
import {
  addDays,
  bookLabel,
  defaultDueDate,
  isActiveLoan,
  isOverdue,
  sortLoans,
  summarizeLoans,
  toBookAvailability,
  toLoanRecord,
  validateIssue,
  type BookAvailability,
  type LoanRecord,
} from './library';

const book = (over: Partial<BookAvailability> = {}): BookAvailability => ({
  id: 'b1',
  title: 'The Hobbit',
  author: 'Tolkien',
  availableCopies: 2,
  totalCopies: 3,
  ...over,
});

const loan = (over: Partial<LoanRecord> = {}): LoanRecord => ({
  id: 'l1',
  bookId: 'b1',
  bookTitle: 'The Hobbit',
  borrower: 'Ada Lovelace',
  borrowerId: 's1',
  borrowedAt: '2026-10-01T00:00:00.000Z',
  dueAt: '2026-10-15',
  status: 'BORROWED',
  ...over,
});

describe('toBookAvailability', () => {
  it('maps copy counts and coerces numerics', () => {
    expect(
      toBookAvailability({
        id: 'b1',
        title: 'Dune',
        author: 'Herbert',
        availableCopies: '1',
        totalCopies: '4',
      }),
    ).toEqual({ id: 'b1', title: 'Dune', author: 'Herbert', availableCopies: 1, totalCopies: 4 });
  });

  it('falls back total copies to available when missing', () => {
    expect(toBookAvailability({ id: 'b2', availableCopies: 2 }).totalCopies).toBe(2);
  });
});

describe('toLoanRecord', () => {
  it('reads the borrower name from the nested student user', () => {
    const record = toLoanRecord({
      id: 'l1',
      bookId: 'b1',
      studentId: 's1',
      book: { title: 'Dune' },
      student: { id: 's1', user: { firstName: 'Ada', lastName: 'Lovelace' } },
      dueAt: '2026-10-15',
      status: 'BORROWED',
    });
    expect(record).toMatchObject({
      bookTitle: 'Dune',
      borrower: 'Ada Lovelace',
      borrowerId: 's1',
      status: 'BORROWED',
    });
  });

  it('falls back to a user borrower email and tolerates missing relations', () => {
    expect(toLoanRecord({ id: 'l2', userId: 'u1', user: { email: 'j@x.com' } })).toMatchObject({
      borrower: 'j@x.com',
      borrowerId: 'u1',
      bookTitle: '',
    });
  });
});

describe('date helpers', () => {
  it('adds whole days in ISO form', () => {
    expect(addDays('2026-10-15', 14)).toBe('2026-10-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('derives a default due date two weeks out', () => {
    const due = defaultDueDate();
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(due > new Date().toISOString().slice(0, 10)).toBe(true);
  });
});

describe('isActiveLoan / isOverdue', () => {
  it('treats borrowed and overdue as active', () => {
    expect(isActiveLoan('BORROWED')).toBe(true);
    expect(isActiveLoan('OVERDUE')).toBe(true);
    expect(isActiveLoan('RETURNED')).toBe(false);
    expect(isActiveLoan('LOST')).toBe(false);
  });

  it('flags only outstanding loans past their due date', () => {
    expect(isOverdue('2026-10-01', 'BORROWED', '2026-10-10')).toBe(true);
    expect(isOverdue('2026-10-20', 'BORROWED', '2026-10-10')).toBe(false);
    expect(isOverdue('2026-10-01', 'RETURNED', '2026-10-10')).toBe(false);
  });
});

describe('bookLabel', () => {
  it('includes availability when requested', () => {
    expect(bookLabel(book())).toBe('The Hobbit — Tolkien (2 available)');
    expect(bookLabel(book(), false)).toBe('The Hobbit — Tolkien');
  });
});

describe('sortLoans', () => {
  it('orders by due date then borrower', () => {
    const list = [
      loan({ id: 'c', dueAt: '2026-11-01', borrower: 'Zoe' }),
      loan({ id: 'a', dueAt: '2026-10-01', borrower: 'Zoe' }),
      loan({ id: 'b', dueAt: '2026-10-01', borrower: 'Ada' }),
    ];
    expect(sortLoans(list).map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('summarizeLoans', () => {
  it('counts active and overdue loans', () => {
    const summary = summarizeLoans(
      [
        loan({ id: 'a', dueAt: '2026-10-01', status: 'BORROWED' }),
        loan({ id: 'b', dueAt: '2026-10-20', status: 'BORROWED' }),
        loan({ id: 'c', dueAt: '2026-10-01', status: 'RETURNED' }),
      ],
      '2026-10-10',
    );
    expect(summary).toEqual({ active: 2, overdue: 1 });
  });
});

describe('validateIssue', () => {
  const intent = (over: Partial<Parameters<typeof validateIssue>[0]> = {}) => ({
    books: [book()],
    bookId: 'b1',
    studentId: 's1',
    dueAt: '2026-10-20',
    ...over,
  });

  it('accepts a valid intent', () => {
    expect(validateIssue(intent(), '2026-10-10')).toBe(null);
  });

  it('rejects a missing or unknown book', () => {
    expect(validateIssue(intent({ bookId: '' }), '2026-10-10')).toBe('Select a book to issue');
    expect(validateIssue(intent({ bookId: 'nope' }), '2026-10-10')).toBe('Select a book to issue');
  });

  it('rejects a title with no available copies', () => {
    expect(
      validateIssue(intent({ books: [book({ availableCopies: 0 })] }), '2026-10-10'),
    ).toContain('No available copies');
  });

  it('rejects a missing student or due date', () => {
    expect(validateIssue(intent({ studentId: '' }), '2026-10-10')).toBe(
      'Select a student to issue to',
    );
    expect(validateIssue(intent({ dueAt: '' }), '2026-10-10')).toBe('Choose a due date');
  });

  it('rejects a due date in the past', () => {
    expect(validateIssue(intent({ dueAt: '2026-10-01' }), '2026-10-10')).toBe(
      'Due date cannot be in the past',
    );
  });
});
