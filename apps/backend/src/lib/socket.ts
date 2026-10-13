import type { Server as HttpServer } from 'node:http';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '@smartschool/shared';
import { Server as SocketServer } from 'socket.io';
import { corsOrigins } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../utils/jwt';

interface SocketUser {
  id: string;
  role: string;
  schoolId: string | null;
}

let io: SocketServer | null = null;

export function attachSocketServer(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token as string | undefined;
    const headerToken = socket.handshake.headers.authorization?.replace('Bearer ', '');
    const token = authToken ?? headerToken;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = {
        id: payload.sub,
        role: payload.role,
        schoolId: payload.schoolId,
      } satisfies SocketUser;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(SOCKET_ROOMS.user(user.id));
    if (user.schoolId) {
      socket.join(SOCKET_ROOMS.school(user.schoolId));
    }
    socket.join(SOCKET_ROOMS.role(user.role));

    logger.debug({ socketId: socket.id, userId: user.id }, 'socket connected');
    socket.emit(SOCKET_EVENTS.CONNECTED, { socketId: socket.id });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'socket disconnected');
    });
  });

  return io;
}

export function getSocketServer(): SocketServer {
  if (!io) {
    throw new Error('Socket server has not been initialised');
  }
  return io;
}
