import type { CreateContactMessageInput } from '@smartschool/shared';
import { prisma } from '../../lib/prisma';

export const contactService = {
  async create(input: CreateContactMessageInput) {
    return prisma.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        subject: input.subject ?? null,
        message: input.message,
        source: input.source ?? 'website',
      },
    });
  },
};
