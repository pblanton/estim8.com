import { ServerEvents, type TopicScopedPayload } from '@estim8/shared';
import * as pokerSessionRepo from '../../repositories/pokerSessionRepo.js';
import * as topicRepo from '../../repositories/topicRepo.js';
import { completeSession } from '../../services/sessionLifecycleService.js';
import { clearSlideIndex } from '../slideshowState.js';
import { sessionRoom } from '../broadcast.js';
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
