/**
 * Pure, dependency-free helpers for the realtime notification layer. Keeping
 * the payload parsing and queue logic here means it can be unit tested without
 * a live Socket.IO server or a device.
 */

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  receivedAt: string;
}

export interface ToastItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
}

export const MAX_TOASTS = 4;
export const DEFAULT_NOTIFICATION_TYPE = 'GENERAL';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Validate an inbound `notification` socket payload. Returns `null` when the
 * payload is malformed so a bad frame can never crash a socket handler.
 */
export function notificationFromEvent(
  payload: unknown,
  now: string = new Date().toISOString(),
): NotificationEvent | null {
  const row = asRecord(payload);
  if (!row) return null;
  const title = str(row.title).trim();
  if (!title) return null;
  const data = asRecord(row.data) ?? null;
  return {
    id: str(row.id) || `${now}-${title}`,
    type: str(row.type).trim() || DEFAULT_NOTIFICATION_TYPE,
    title,
    body: row.body === null || row.body === undefined ? null : str(row.body) || null,
    data,
    receivedAt: now,
  };
}

/** Build a toast entry for an event, using the supplied unique id. */
export function toastFromEvent(event: NotificationEvent, id: string): ToastItem {
  return { id, type: event.type, title: event.title, body: event.body };
}

/** Add a toast to the queue, keeping the most recent `max` entries. */
export function enqueueToast(
  toasts: ToastItem[],
  toast: ToastItem,
  max: number = MAX_TOASTS,
): ToastItem[] {
  const next = [toast, ...toasts.filter((item) => item.id !== toast.id)];
  return next.slice(0, Math.max(0, max));
}

export function dismissToast(toasts: ToastItem[], id: string): ToastItem[] {
  return toasts.filter((item) => item.id !== id);
}

/** Increment the unread counter, never dropping below zero. */
export function incrementUnread(current: number): number {
  return Number.isFinite(current) && current > 0 ? current + 1 : 1;
}

export function normalizeUnread(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : 0;
}

export function connectionLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Live updates on';
    case 'connecting':
      return 'Connecting…';
    case 'reconnecting':
      return 'Reconnecting…';
    case 'offline':
      return 'Live updates unavailable';
    default:
      return 'Live updates idle';
  }
}
