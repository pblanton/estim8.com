const slideIndexByTopic = new Map<string, number>();

export function getSlideIndex(topicId: string): number {
  return slideIndexByTopic.get(topicId) ?? 0;
}

export function setSlideIndex(topicId: string, index: number): void {
  slideIndexByTopic.set(topicId, index);
}

export function clearSlideIndex(topicId: string): void {
  slideIndexByTopic.delete(topicId);
}
