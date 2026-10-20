import { ServerEvents, type SlideshowNavigatePayload, type SlideshowStatePayload } from '@estim8/shared';
import * as topicRepo from '../../repositories/topicRepo.js';
import * as topicFileRepo from '../../repositories/topicFileRepo.js';
import { getSlideIndex, setSlideIndex } from '../slideshowState.js';
import { sessionRoom } from '../broadcast.js';
import type { AppServer, AppSocket } from '../types.js';

export function registerSlideshowHandler(io: AppServer, socket: AppSocket) {
  socket.on('slideshow:navigate', async (payload: SlideshowNavigatePayload) => {
    const pokerSessionId = socket.data.pokerSessionId;
    if (!socket.data.isFacilitatorOwner || !pokerSessionId) return;

    const topic = await topicRepo.findById(payload.topicId);
    if (!topic || topic.poker_session_id !== pokerSessionId) return;

    const files = (await topicFileRepo.listByTopic(topic.id)).filter((f) => !f.is_generated);
    const total = files.length;
    if (total === 0) return;

    const current = getSlideIndex(topic.id);
    let next = current;
    switch (payload.action) {
      case 'start':
        next = 0;
        break;
      case 'end':
        next = total - 1;
        break;
      case 'next':
        next = Math.min(current + 1, total - 1);
        break;
      case 'back':
        next = Math.max(current - 1, 0);
        break;
    }
    setSlideIndex(topic.id, next);

    const statePayload: SlideshowStatePayload = { topicId: topic.id, slideIndex: next, totalSlides: total };
    io.to(sessionRoom(pokerSessionId)).emit(ServerEvents.SlideshowState, statePayload);
  });
}
