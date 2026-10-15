import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('../src/lib/prisma', () => ({
  prisma: { contactMessage: { create } },
}));

import { createContactMessageSchema } from '@smartschool/shared';
import { contactService } from '../src/modules/contact/contact.service';

describe('contactService', () => {
  beforeEach(() => create.mockReset());

  it('stores a submitted message with the website source by default', async () => {
    create.mockResolvedValue({ id: 'c1', createdAt: new Date('2026-01-01T00:00:00.000Z') });

    await contactService.create({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'I would like a product demo for our school.',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: null,
        subject: null,
        message: 'I would like a product demo for our school.',
        source: 'website',
      },
    });
  });

  it('keeps the optional phone and subject when provided', async () => {
    create.mockResolvedValue({ id: 'c2', createdAt: new Date() });

    await contactService.create({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      phone: '+1 555 0100',
      subject: 'Pricing',
      message: 'Please share your pricing for a school with 900 students.',
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: '+1 555 0100', subject: 'Pricing' }),
    });
  });
});

describe('createContactMessageSchema', () => {
  it('rejects a message that is too short', () => {
    const result = createContactMessageSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'hi',
    });
    expect(result.success).toBe(false);
  });

  it('lowercases the email and treats blank optional fields as missing', () => {
    const result = createContactMessageSchema.safeParse({
      name: 'Ada',
      email: 'ADA@Example.COM',
      phone: '   ',
      subject: '',
      message: 'A sufficiently long message for validation.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ada@example.com');
      expect(result.data.phone).toBeUndefined();
      expect(result.data.subject).toBeUndefined();
    }
  });
});
