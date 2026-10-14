import { Permission, SOCKET_EVENTS } from '@smartschool/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import { api, getAccessToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { can } from '../lib/permissions';
import {
  dismissToast,
  enqueueToast,
  incrementUnread,
  normalizeUnread,
  notificationFromEvent,
  toastFromEvent,
  type ConnectionStatus,
  type NotificationEvent,
  type ToastItem,
} from '../lib/realtime';
import { createRealtimeSocket } from '../lib/socket';

interface RealtimeContextValue {
  status: ConnectionStatus;
  unread: number;
  toasts: ToastItem[];
  lastEvent: NotificationEvent | null;
  /** Increments on every inbound notification so data views can refetch. */
  version: number;
  refreshUnread: () => Promise<void>;
  dismiss: (id: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const TOAST_TIMEOUT_MS = 6000;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [lastEvent, setLastEvent] = useState<NotificationEvent | null>(null);
  const [version, setVersion] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const toastSeq = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const refreshUnread = useCallback(async () => {
    try {
      const result = await api.get<{ count: number }>('/notifications/unread-count');
      setUnread(normalizeUnread(result.count));
    } catch {
      // Never surface connectivity problems from a background poll.
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => dismissToast(current, id));
  }, []);

  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;

  useEffect(() => {
    if (!userId || !userRole || !can(userRole, Permission.NOTIFICATION_READ)) {
      setStatus('idle');
      return;
    }

    let active = true;
    const socket = createRealtimeSocket(getAccessToken);
    socketRef.current = socket;
    setStatus('connecting');
    void refreshUnread();

    const onConnect = () => {
      if (!active) return;
      setStatus('connected');
      void refreshUnread();
    };
    const onDisconnect = (reason: string) => {
      if (!active) return;
      setStatus(reason === 'io client disconnect' ? 'idle' : 'reconnecting');
    };
    const onConnectError = () => {
      if (active) setStatus('offline');
    };
    const onReconnectAttempt = () => {
      if (active) setStatus('reconnecting');
    };
    const onNotification = (payload: unknown) => {
      if (!active) return;
      const event = notificationFromEvent(payload);
      if (!event) return;
      setUnread((current) => incrementUnread(current));
      setLastEvent(event);
      setVersion((current) => current + 1);

      toastSeq.current += 1;
      const toast = toastFromEvent(event, `${event.id}-${toastSeq.current}`);
      setToasts((current) => enqueueToast(current, toast));
      const timer = setTimeout(() => {
        timers.current.delete(toast.id);
        setToasts((current) => dismissToast(current, toast.id));
      }, TOAST_TIMEOUT_MS);
      timers.current.set(toast.id, timer);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on(SOCKET_EVENTS.NOTIFICATION, onNotification);

    const timersMap = timers.current;
    return () => {
      active = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off(SOCKET_EVENTS.NOTIFICATION, onNotification);
      socket.disconnect();
      socketRef.current = null;
      for (const timer of timersMap.values()) clearTimeout(timer);
      timersMap.clear();
    };
  }, [userId, userRole, refreshUnread]);

  const value = useMemo<RealtimeContextValue>(
    () => ({ status, unread, toasts, lastEvent, version, refreshUnread, dismiss }),
    [status, unread, toasts, lastEvent, version, refreshUnread, dismiss],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeProvider');
  return ctx;
}
