import { io, type Socket } from 'socket.io-client';

/**
 * Create and connect a Socket.IO client for the realtime notification layer.
 *
 * The access token can rotate (the REST layer refreshes it silently), so the
 * `auth` option is a callback that always reads the *current* token on every
 * connect/reconnect attempt rather than capturing a stale value.
 *
 * `VITE_SOCKET_URL` may point at a different origin; when unset the client
 * uses the page origin, which Vite proxies to the API (see vite.config.ts).
 */
export function createRealtimeSocket(getToken: () => string | null): Socket {
  const url = (import.meta.env.VITE_SOCKET_URL as string | undefined) || undefined;

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
