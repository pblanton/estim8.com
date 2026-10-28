import { ClientEvents, ServerEvents, type TopicAddAck, type TopicAddPayload, type TopicScopedPayload } from '@estim8/shared';
import * as pokerSessionRepo from '../../repositories/pokerSessionRepo.js';
import * as topicRepo from '../../repositories/topicRepo.js';
import { completeSession, reopenSession } from '../../services/sessionLifecycleService.js';
import { clearSlideIndex } from '../slideshowState.js';
import { broadcastTopicsUpdate, sessionRoom } from '../broadcast.js';
import type { AppServer, AppSocket } from '../types.js';

async function activateTopic(io: AppServer, pokerSessionId: string, topicId: string) {
  await topicRepo.setStatus(topicId, 'active');
  await pokerSessionRepo.setActiveTopic(pokerSessionId, topicId);
  clearSlideIndex(topicId);
  const topic = await topicRepo.findById(topicId);
  io.to(sessionRoom(pokerSessionId)).emit(ServerEvents.TopicActivated, { topicId, topic, slideIndex: 0 });
}

export function registerTopicHandlers(io: AppServer, socket: AppSocket) {
  socket.on('topic:activate', async (payload: TopicScopedPayload) => {
    const pokerSessionId = socket.data.pokerSessionId;
    if (!socket.data.isFacilitatorOwner || !pokerSessionId) return;
    const topic = await topicRepo.findById(payload.topicId);
    if (!topic || topic.poker_session_id !== pokerSessionId) return;
    await activateTopic(io, pokerSessionId, topic.id);
  });

  socket.on(ClientEvents.TopicAdd, async (payload: TopicAddPayload, ack?: (res: TopicAddAck) => void) => {
    const pokerSessionId = socket.data.pokerSessionId;
    if (!socket.data.isFacilitatorOwner || !pokerSessionId) {
      ack?.({ ok: false, reason: 'forbidden' });
      return;
    }
    const name = typeof payload?.name === 'string' ? payload.name.trim().slice(0, 150) : '';
    if (!name) {
      ack?.({ ok: false, reason: 'invalid_name' });
      return;
    }

    const session = await pokerSessionRepo.findById(pokerSessionId);
    if (!session) return;
    const wasCompleted = session.status === 'completed';
    const currentTopic = session.active_topic_id ? await topicRepo.findById(session.active_topic_id) : null;

    const topic = await topicRepo.createTopic(pokerSessionId, name, null);
    if (wasCompleted) await reopenSession(io, pokerSessionId);
    await broadcastTopicsUpdate(io, pokerSessionId);

    // Queue behind the existing topics, unless the table has nothing live (or the facilitator asked
    // to jump straight to it), in which case the new topic goes on the table now.
    const currentIsLive = currentTopic != null && currentTopic.status !== 'completed';
    if (wasCompleted || !currentIsLive || payload.activateNow) {
      if (currentIsLive) {
        await topicRepo.setStatus(currentTopic.id, 'completed');
        clearSlideIndex(currentTopic.id);
      }
      await activateTopic(io, pokerSessionId, topic.id);
    }
    ack?.({ ok: true });
  });

  socket.on('topic:complete', async (payload: TopicScopedPayload) => {
    const pokerSessionId = socket.data.pokerSessionId;
    if (!socket.data.isFacilitatorOwner || !pokerSessionId) return;

    const topic = await topicRepo.findById(payload.topicId);
    if (!topic || topic.poker_session_id !== pokerSessionId) return;

    await topicRepo.setStatus(topic.id, 'completed');
    clearSlideIndex(topic.id);

    const next = await topicRepo.findNextPending(pokerSessionId, topic.position);
    if (next) {
      await activateTopic(io, pokerSessionId, next.id);
    } else {
      await pokerSessionRepo.setActiveTopic(pokerSessionId, null);
      await completeSession(io, pokerSessionId);
    }
  });
}
