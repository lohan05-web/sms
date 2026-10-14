import type { CreateBookInput, ListBooksQuery, UpdateBookInput } from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const booksService = {
  async list(query: ListBooksQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.BookWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { author: { contains: query.search } },
        { isbn: { contains: query.search } },
      ];
    }
    const items = await prisma.book.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.book.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const book = await prisma.book.findUnique({
      where: { id },
      include: { loans: { orderBy: { createdAt: 'desc' } } },
    });
    if (!book) throw ApiError.notFound('Book not found');
    const scope = resolveSchoolScope(actor);
    if (scope && book.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return book;
  },
  async create(input: CreateBookInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    return prisma.book.create({
      data: {
        schoolId,
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        category: input.category,
        publisher: input.publisher,
        publishedYear: input.publishedYear,
        totalCopies: input.totalCopies,
        availableCopies: input.totalCopies,
        shelf: input.shelf,
        coverUrl: input.coverUrl,
      },
    });
  },
  async update(id: string, input: UpdateBookInput, actor: Actor) {
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Book not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const nextTotal = input.totalCopies ?? existing.totalCopies;
    const nextAvailable = input.availableCopies ?? existing.availableCopies;
    if (nextAvailable > nextTotal) {
      throw ApiError.badRequest('Available copies cannot exceed total copies');
    }
    return prisma.book.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.author !== undefined ? { author: input.author } : {}),
        ...(input.isbn !== undefined || input.isbn === null ? { isbn: input.isbn as any } : {}),
        ...(input.category !== undefined || input.category === null
          ? { category: input.category as any }
          : {}),
        ...(input.publisher !== undefined || input.publisher === null
          ? { publisher: input.publisher as any }
          : {}),
        ...(input.publishedYear !== undefined || input.publishedYear === null
          ? { publishedYear: input.publishedYear as any }
          : {}),
        ...(input.totalCopies !== undefined ? { totalCopies: input.totalCopies } : {}),
        ...(input.availableCopies !== undefined ? { availableCopies: input.availableCopies } : {}),
        ...(input.shelf !== undefined || input.shelf === null ? { shelf: input.shelf as any } : {}),
        ...(input.coverUrl !== undefined || input.coverUrl === null
          ? { coverUrl: input.coverUrl as any }
          : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Book not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.book.delete({ where: { id } });
    return { success: true };
  },
};
