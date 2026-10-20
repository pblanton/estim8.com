import type { Server as HttpServer } from 'node:http';
import { parse as parseCookie } from 'cookie';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { AUTH_COOKIE_NAME, resolveUserFromCookie } from '../services/authService.js';
import { registerJoinHandler } from './handlers/join.js';
import { registerCardHandlers } from './handlers/cards.js';
import { registerSlideshowHandler } from './handlers/slideshow.js';
import { registerTopicHandlers } from './handlers/topic.js';
import { removePresence } from './presence.js';
import { broadcastParticipantsUpdate } from './broadcast.js';
import type { AppServer, AppSocket } from './types.js';

let io: AppServer | undefined;

export function initSockets(httpServer: HttpServer): AppServer {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = cookieHeader ? parseCookie(cookieHeader) : {};
    const token = cookies[AUTH_COOKIE_NAME];
    socket.data.facilitatorUser = token ? await resolveUserFromCookie(token) : null;
    next();
  });

  io.on('connection', (socket: AppSocket) => {
    registerJoinHandler(io!, socket);
    registerCardHandlers(io!, socket);
    registerSlideshowHandler(io!, socket);
    registerTopicHandlers(io!, socket);

    socket.on('disconnect', async () => {
      const entry = removePresence(socket.id);
      if (entry) {
        await broadcastParticipantsUpdate(io!, entry.sessionId, null);
      }
    });
  });

  return io;
}

export function getIo(): AppServer {
  if (!io) throw new Error('Socket.IO server not initialized');
  return io;
}

export { sessionRoom } from './broadcast.js';
