// Event name constants shared between client and server to prevent string-literal drift.

export const ClientEvents = {
  SessionJoin: 'session:join',
  CardPick: 'card:pick',
  CardClear: 'card:clear',
  RevealRequest: 'reveal:request',
  SlideshowNavigate: 'slideshow:navigate',
  TopicActivate: 'topic:activate',
  TopicComplete: 'topic:complete',
} as const;

export const ServerEvents = {
  SessionState: 'session:state',
  ParticipantsUpdate: 'participants:update',
  CardPicked: 'card:picked',
  CardCleared: 'card:cleared',
  CardsRevealed: 'cards:revealed',
  TopicActivated: 'topic:activated',
  SlideshowState: 'slideshow:state',
  ResultsSaved: 'results:saved',
  SessionCompleted: 'session:completed',
} as const;

export type ParticipantRole = 'player' | 'facilitator';

export interface ParticipantSummary {
  id: string;
  displayName: string;
  role: ParticipantRole;
  hasPicked: boolean;
  connected: boolean;
}

export interface VoteSummary {
  participantId: string;
  displayName: string;
  value: string;
}

export interface ConsensusSummary {
  allEqual: boolean;
  agreementPct: number;
  uniqueValues: string[];
}

export type SlideshowAction = 'start' | 'next' | 'back' | 'end';

export interface SessionJoinPayload {
  joinCode: string;
  displayName?: string;
  participantToken?: string;
  /** Facilitators are spectator/controllers by default; set this to also take a seat at the table. */
  joinAsPlayer?: boolean;
}

export interface SessionJoinAck {
  ok: boolean;
  reason?: 'session_full' | 'session_not_found' | 'session_completed';
  participantId?: string;
  participantToken?: string;
  isFacilitatorOwner?: boolean;
}

export interface SessionStatePayload {
  session: {
    id: string;
    name: string;
    joinCode: string;
    status: 'draft' | 'active' | 'completed';
    deckId: string;
    deckLabels: string[];
    activeTopicId: string | null;
  };
  topics: Array<{ id: string; name: string; description: string | null; position: number; status: string }>;
  participants: ParticipantSummary[];
}

export interface CardPickPayload {
  topicId: string;
  value: string;
}

export interface TopicScopedPayload {
  topicId: string;
}

export interface RevealRequestAck {
  ok: boolean;
  reason?: 'not_all_picked';
  missing?: string[];
}

export interface SlideshowNavigatePayload {
  topicId: string;
  action: SlideshowAction;
}

export interface CardsRevealedPayload {
  topicId: string;
  votes: VoteSummary[];
  consensus: ConsensusSummary;
}

export interface SlideshowStatePayload {
  topicId: string;
  slideIndex: number;
  totalSlides: number;
}

export interface SessionCompletedPayload {
  purgeAt: string;
}
