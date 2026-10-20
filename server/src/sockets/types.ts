import type { DefaultEventsMap, Server as IOServer, Socket as IOSocket } from 'socket.io';
import type { UserRow } from '../repositories/userRepo.js';

export interface SocketData {
  facilitatorUser?: UserRow | null;
  pokerSessionId?: string;
  participantId?: string;
  isFacilitatorOwner?: boolean;
}

export type AppServer = IOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;
export type AppSocket = IOSocket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;
