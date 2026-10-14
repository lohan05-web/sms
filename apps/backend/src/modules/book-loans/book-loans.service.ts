import type {
  CreateBookLoanInput,
  ListBookLoansQuery,
  UpdateBookLoanInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const loanInclude = {
  book: true,
  student: true,
  user: true,
  issuedBy: true,
} satisfies Prisma.BookLoanInclude;

export const bookLoansService = {
  async list(query: ListBookLoansQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.BookLoanWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.book = { schoolId };
    if (query.bookId) where.bookId = query.bookId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    const items = await prisma.bookLoan.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: loanInclude,
    });
    const total = await prisma.bookLoan.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const loan = await prisma.bookLoan.findUnique({ where: { id }, include: loanInclude });
    if (!loan) throw ApiError.notFound('Book loan not found');
    const scope = resolveSchoolScope(actor);
    if (scope && loan.book.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return loan;
  },
  async create(input: CreateBookLoanInput, actor: Actor) {
    const book = await prisma.book.findUnique({ where: { id: input.bookId } });
    if (!book) throw ApiError.badRequest('Invalid book');
    const scope = resolveSchoolScope(actor);
    if (scope && book.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!input.studentId && !input.userId)
      throw ApiError.badRequest('A student or user borrower is required');
    if (book.availableCopies <= 0) throw ApiError.badRequest('No copies available');
    if (input.studentId) {
      const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
      if (!student || student.schoolId !== book.schoolId)
        throw ApiError.badRequest('Invalid student');
    }
    if (input.userId) {
      const borrower = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!borrower || borrower.schoolId !== book.schoolId)
        throw ApiError.badRequest('Invalid user');
    }
    const borrowerFilters: Prisma.BookLoanWhereInput[] = [];
    if (input.studentId) borrowerFilters.push({ studentId: input.studentId });
    if (input.userId) borrowerFilters.push({ userId: input.userId });
    const activeLoan = await prisma.bookLoan.findFirst({
      where: {
        bookId: input.bookId,
        status: { in: ['BORROWED', 'OVERDUE'] },
        OR: borrowerFilters,
      },
    });
    if (activeLoan) throw ApiError.badRequest('Borrower already has an active loan for this book');
    const borrowerKey = input.studentId ?? input.userId;
    const loan = await prisma.$transaction(async (tx) => {
      const decremented = await tx.book.updateMany({
        where: { id: book.id, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });
      if (decremented.count === 0) throw ApiError.badRequest('No copies available');
      return tx.bookLoan.create({
        data: {
          bookId: input.bookId,
          studentId: input.studentId,
          userId: input.userId,
          dueAt: input.dueAt,
          status: 'BORROWED',
          issuedById: input.issuedById || actor.id,
          activeKey: borrowerKey ? `${input.bookId}:${borrowerKey}` : null,
        },
        include: loanInclude,
      });
    });
    return loan;
  },
  async update(id: string, input: UpdateBookLoanInput, actor: Actor) {
    const existing = await prisma.bookLoan.findUnique({
      where: { id },
      include: { book: true },
    });
    if (!existing) throw ApiError.notFound('Book loan not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.book.schoolId !== scope) throw ApiError.forbidden('Access denied');

    const closed = existing.status === 'RETURNED' || existing.status === 'LOST';
    if (closed && (input.status !== undefined || input.returnedAt !== undefined)) {
      throw ApiError.badRequest('This loan is already closed and cannot be returned again');
    }

    const wasReturned = existing.status === 'RETURNED';
    const nextStatus = input.status ?? (input.returnedAt !== undefined ? 'RETURNED' : undefined);
    const willBeReturned = nextStatus === 'RETURNED';
    const delta = wasReturned === willBeReturned ? 0 : willBeReturned ? 1 : -1;

    const loan = await prisma.$transaction(async (tx) => {
      if (delta !== 0) {
        await tx.book.update({
          where: { id: existing.bookId },
          data: { availableCopies: { increment: delta } },
        });
      }
      const data: any = {
        ...(input.returnedAt !== undefined ? { returnedAt: input.returnedAt } : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      };
      if (nextStatus === 'RETURNED' || nextStatus === 'LOST') {
        data.activeKey = null;
      }
      return tx.bookLoan.update({ where: { id }, data, include: loanInclude });
    });
    return loan;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.bookLoan.findUnique({
      where: { id },
      include: { book: true },
    });
    if (!existing) throw ApiError.notFound('Book loan not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.book.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.$transaction(async (tx) => {
      if (existing.status === 'BORROWED' || existing.status === 'OVERDUE') {
        await tx.book.update({
          where: { id: existing.bookId },
          data: { availableCopies: { increment: 1 } },
        });
      }
      await tx.bookLoan.delete({ where: { id } });
    });
    return { success: true };
  },
};
