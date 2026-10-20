interface PresenceEntry {
  sessionId: string;
  participantId?: string;
}

const socketToPresence = new Map<string, PresenceEntry>();
const sessionConnectedParticipants = new Map<string, Set<string>>();

export function addPresence(sessionId: string, socketId: string, participantId?: string): void {
  socketToPresence.set(socketId, { sessionId, participantId });
  if (participantId) {
    if (!sessionConnectedParticipants.has(sessionId)) {
      sessionConnectedParticipants.set(sessionId, new Set());
    }
    sessionConnectedParticipants.get(sessionId)!.add(participantId);
  }
}

export function removePresence(socketId: string): PresenceEntry | undefined {
  const entry = socketToPresence.get(socketId);
  if (!entry) return undefined;
  socketToPresence.delete(socketId);

  if (entry.participantId) {
    const stillConnected = [...socketToPresence.values()].some((e) => e.participantId === entry.participantId);
    if (!stillConnected) {
      sessionConnectedParticipants.get(entry.sessionId)?.delete(entry.participantId);
    }
  }
  return entry;
}

export function getConnectedParticipantIds(sessionId: string): Set<string> {
  return sessionConnectedParticipants.get(sessionId) ?? new Set();
}
