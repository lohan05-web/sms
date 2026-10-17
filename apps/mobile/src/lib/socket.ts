import { io, type Socket } from 'socket.io-client';

/**
 * Create and connect a Socket.IO client for the realtime notification layer.
 *
 * The access token can rotate (the REST layer refreshes it silently), so the
 * `auth` option is a callback that always reads the *current* token on every
 * connect/reconnect attempt rather than capturing a stale value.
 *
 * `EXPO_PUBLIC_SOCKET_URL` may point at a different origin; when unset the
 * client uses the device origin.
 */
export function createRealtimeSocket(getToken: () => string | null): Socket {
  const url = process.env.EXPO_PUBLIC_SOCKET_URL || undefined;

  return io(url, {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
    autoConnect: true,
    auth: (cb: (data: Record<string, unknown>) => void) => {
      cb({ token: getToken() ?? '' });
    },
  });
}
