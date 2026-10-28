import type { AppServer, AppSocket } from '../types.js';
import {
  MAX_PLAYERS_PER_SESSION,
  ServerEvents,
  type SessionJoinAck,
  type SessionJoinPayload,
  type SessionStatePayload,
} from '@estim8/shared';
import * as pokerSessionRepo from '../../repositories/pokerSessionRepo.js';
import * as topicRepo from '../../repositories/topicRepo.js';
import * as participantRepo from '../../repositories/participantRepo.js';
import * as cardDeckRepo from '../../repositories/cardDeckRepo.js';
import { generateRawToken, sha256Hex } from '../../utils/tokens.js';
import { addPresence } from '../presence.js';
import { broadcastParticipantsUpdate, sessionRoom } from '../broadcast.js';

export function registerJoinHandler(io: AppServer, socket: AppSocket) {
  socket.on('session:join', async (payload: SessionJoinPayload, ack: (res: SessionJoinAck) => void) => {
    try {
      const session = await pokerSessionRepo.findByJoinCode(payload.joinCode?.toUpperCase?.() ?? '');
      if (!session) {
        ack({ ok: false, reason: 'session_not_found' });
        return;
      }
      const isOwner = Boolean(socket.data.facilitatorUser && socket.data.facilitatorUser.id === session.facilitator_id);
      // Only the facilitator may enter a finished session, so they can still add a forgotten topic.
      if (session.status === 'completed' && !isOwner) {
        ack({ ok: false, reason: 'session_completed' });
        return;
      }

      let participant = null as Awaited<ReturnType<typeof participantRepo.findById>>;
      let issuedToken: string | undefined;

      if (payload.participantToken) {
        const existing = await participantRepo.findByTokenHash(sha256Hex(payload.participantToken));
        if (existing && existing.poker_session_id === session.id) {
          participant = existing;
        }
      }

      if (!participant && (isOwner ? payload.joinAsPlayer : true)) {
        if (!isOwner) {
          const playerCount = await participantRepo.countPlayers(session.id);
          if (playerCount >= MAX_PLAYERS_PER_SESSION) {
            ack({ ok: false, reason: 'session_full' });
            return;
          }
        }

        const displayName = (payload.displayName || socket.data.facilitatorUser?.display_name || 'Guest')
          .trim()
          .slice(0, 100);
        issuedToken = generateRawToken();
        participant = await participantRepo.createParticipant(
          session.id,
          displayName,
          sha256Hex(issuedToken),
          isOwner ? 'facilitator' : 'player',
        );
      }

      socket.data.pokerSessionId = session.id;
      socket.data.isFacilitatorOwner = isOwner;
      socket.data.participantId = participant?.id;

      socket.join(sessionRoom(session.id));
      addPresence(session.id, socket.id, participant?.id);

      if (participant) await participantRepo.touchLastSeen(participant.id);
      await pokerSessionRepo.touchActivity(session.id);

      ack({
        ok: true,
        participantId: participant?.id,
        participantToken: issuedToken,
        isFacilitatorOwner: isOwner,
      });

      const deck = await cardDeckRepo.findDeckById(session.deck_id);
      const topics = await topicRepo.listBySession(session.id);
      const participants = await participantRepo.listBySession(session.id);

      const statePayload: SessionStatePayload = {
        session: {
          id: session.id,
          name: session.name,
          joinCode: session.join_code,
          status: session.status,
          deckId: session.deck_id,
          deckLabels: deck?.labels ?? [],
          activeTopicId: session.active_topic_id,
          isQuickHand: Boolean(session.is_quick_hand),
          purgeAt: session.purge_at ? session.purge_at.toISOString() : null,
        },
        topics: topics.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          position: t.position,
          status: t.status,
        })),
        participants: participants.map((p) => ({
          id: p.id,
          displayName: p.display_name,
          role: p.role,
          hasPicked: false,
          connected: true,
        })),
      };
      socket.emit(ServerEvents.SessionState, statePayload);

      await broadcastParticipantsUpdate(io, session.id, session.active_topic_id);
    } catch (err) {
      console.error('session:join failed', err);
      ack({ ok: false });
    }
  });
}
