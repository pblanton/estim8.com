import { api } from './client';

export interface PokerSession {
  id: string;
  facilitator_id: string;
  name: string;
  join_code: string;
  deck_id: string;
  status: 'draft' | 'active' | 'completed';
  is_quick_hand: number | boolean;
  active_topic_id: string | null;
  completed_at: string | null;
  purge_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  poker_session_id: string;
  name: string;
  description: string | null;
  position: number;
  status: 'pending' | 'active' | 'revealed' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface InviteResult {
  email: string;
  sent: boolean;
}

export const sessionApi = {
  list: () => api.get<{ sessions: PokerSession[] }>('/poker-sessions'),
  get: (id: string) => api.get<{ session: PokerSession; topics: Topic[] }>(`/poker-sessions/${id}`),
  byJoinCode: (joinCode: string) =>
    api.get<{ session: { id: string; name: string; joinCode: string; status: string } }>(
      `/poker-sessions/by-join-code/${joinCode}`,
    ),
  create: (name: string, deckId: string, joinCode?: string) =>
    api.post<{ session: PokerSession }>('/poker-sessions', { name, deckId, joinCode: joinCode || undefined }),
  createQuickHand: (name: string, opts: { deckId?: string; joinCode?: string } = {}) =>
    api.post<{ session: PokerSession }>('/poker-sessions/quick-hand', {
      name,
      deckId: opts.deckId || undefined,
      joinCode: opts.joinCode || undefined,
    }),
  update: (id: string, fields: { name?: string; deckId?: string }) =>
    api.patch<{ ok: true }>(`/poker-sessions/${id}`, fields),
  invite: (id: string, emails: string[]) =>
    api.post<{ results: InviteResult[] }>(`/poker-sessions/${id}/invites`, { emails }),
  complete: (id: string) => api.post<{ session: PokerSession }>(`/poker-sessions/${id}/complete`),
  exportUrl: (id: string) => `/api/poker-sessions/${id}/export`,
  purge: (id: string) => api.delete<{ ok: true }>(`/poker-sessions/${id}`),
};

export const topicApi = {
  list: (sessionId: string) => api.get<{ topics: Topic[] }>(`/poker-sessions/${sessionId}/topics`),
  create: (sessionId: string, name: string, description: string | null) =>
    api.post<{ topic: Topic }>(`/poker-sessions/${sessionId}/topics`, { name, description }),
  update: (topicId: string, fields: { name?: string; description?: string | null }) =>
    api.patch<{ ok: true }>(`/topics/${topicId}`, fields),
  remove: (topicId: string) => api.delete<{ ok: true }>(`/topics/${topicId}`),
  getResults: (topicId: string) => api.get<{ results: TopicResult | null }>(`/topics/${topicId}/results`),
  saveResults: (topicId: string, consensusValue: string | null, notes: string) =>
    api.put<{ result: TopicResult }>(`/topics/${topicId}/results`, { consensusValue, notes }),
};

export interface TopicResult {
  id: string;
  topic_id: string;
  consensus_value: string | null;
  notes: string | null;
  votes_snapshot: Array<{ participantId: string; displayName: string; value: string }>;
  agreement_pct: string | number | null;
  saved_by: string;
  saved_at: string;
}
