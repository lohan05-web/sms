import { SOCKET_EVENTS, SOCKET_ROOMS, type Role } from '@smartschool/shared';
import { tryGetSocketServer } from './socket';

type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
type Payload = Record<string, unknown>;

/**
 * Realtime emissions are best-effort: when the Socket.IO server has not been
 * attached (e.g. during unit tests) the call is silently ignored so REST
 * handlers never fail because of a missing socket layer.
 */
function emit(room: string, event: SocketEvent, payload: Payload): void {
  const io = tryGetSocketServer();
  if (!io) return;
  try {
    io.to(room).emit(event, payload);
  } catch {
    // Never let a socket failure break an API response.
  }
}

export function emitToSchool(schoolId: string, event: SocketEvent, payload: Payload): void {
  emit(SOCKET_ROOMS.school(schoolId), event, payload);
}

export function emitToRole(role: Role, event: SocketEvent, payload: Payload): void {
  emit(SOCKET_ROOMS.role(role), event, payload);
}

export function emitToUser(userId: string, event: SocketEvent, payload: Payload): void {
  emit(SOCKET_ROOMS.user(userId), event, payload);
}
