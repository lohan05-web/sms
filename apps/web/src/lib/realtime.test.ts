import { describe, expect, it } from 'vitest';
import {
  connectionLabel,
  dismissToast,
  enqueueToast,
  incrementUnread,
  normalizeUnread,
  notificationFromEvent,
  toastFromEvent,
  type ToastItem,
} from './realtime';

const NOW = '2026-10-14T00:00:00.000Z';

describe('notificationFromEvent', () => {
  it('parses a full payload', () => {
    const event = notificationFromEvent(
      { id: 'n1', type: 'NOTICE', title: 'Sports day', body: 'Friday', data: { noticeId: 'x' } },
      NOW,
    );
    expect(event).toEqual({
      id: 'n1',
      type: 'NOTICE',
      title: 'Sports day',
      body: 'Friday',
      data: { noticeId: 'x' },
      receivedAt: NOW,
    });
  });

  it('defaults the type and nulls optional fields', () => {
    const event = notificationFromEvent({ title: 'Hello' }, NOW);
    expect(event).toMatchObject({ type: 'GENERAL', body: null, data: null, title: 'Hello' });
    expect(event?.id).toBe(`${NOW}-Hello`);
  });

  it('rejects malformed payloads', () => {
    expect(notificationFromEvent(null, NOW)).toBeNull();
    expect(notificationFromEvent('nope', NOW)).toBeNull();
    expect(notificationFromEvent({}, NOW)).toBeNull();
    expect(notificationFromEvent({ title: '   ' }, NOW)).toBeNull();
  });

  it('ignores a non-object data field', () => {
    const event = notificationFromEvent({ title: 'x', data: 'nope' }, NOW);
    expect(event?.data).toBeNull();
  });
});

describe('toastFromEvent / queue', () => {
  const toast = (id: string, title = id): ToastItem => ({ id, type: 'GENERAL', title, body: null });

  it('derives a toast from an event', () => {
    const event = notificationFromEvent({ title: 'Alert', body: 'Body' }, NOW)!;
    expect(toastFromEvent(event, 't1')).toEqual({
      id: 't1',
      type: 'GENERAL',
      title: 'Alert',
      body: 'Body',
    });
  });

  it('prepends new toasts and caps the queue', () => {
    let queue: ToastItem[] = [];
    for (let i = 0; i < 6; i += 1) queue = enqueueToast(queue, toast(`t${i}`));
    expect(queue).toHaveLength(4);
    expect(queue.map((item) => item.id)).toEqual(['t5', 't4', 't3', 't2']);
  });

  it('deduplicates by id and honours the max argument', () => {
    const queue = enqueueToast([toast('a'), toast('b')], toast('a'), 2);
    expect(queue.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('dismisses toasts by id', () => {
    const queue = [toast('a'), toast('b')];
    expect(dismissToast(queue, 'a').map((item) => item.id)).toEqual(['b']);
  });
});

describe('unread counters', () => {
  it('increments from zero to one', () => {
    expect(incrementUnread(0)).toBe(1);
  });

  it('increments an existing count', () => {
    expect(incrementUnread(4)).toBe(5);
  });

  it('never goes below zero when normalising', () => {
    expect(normalizeUnread(-3)).toBe(0);
    expect(normalizeUnread('7')).toBe(7);
    expect(normalizeUnread(undefined)).toBe(0);
    expect(normalizeUnread(2.9)).toBe(2);
  });
});

describe('connectionLabel', () => {
  it('describes each connection state', () => {
    expect(connectionLabel('connected')).toBe('Live updates on');
    expect(connectionLabel('offline')).toBe('Live updates unavailable');
    expect(connectionLabel('idle')).toBe('Live updates idle');
  });
});
