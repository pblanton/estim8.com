import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  ClientEvents,
  ServerEvents,
  type CardsRevealedPayload,
  type ConsensusSummary,
  type ParticipantSummary,
  type RevealRequestAck,
  type SessionJoinAck,
  type SessionStatePayload,
  type SlideshowAction,
  type SlideshowStatePayload,
  type VoteSummary,
} from '@estim8/shared';
import { DISPLAY_NAME_KEY_PREFIX } from '../pages/join/JoinLanding';
import { useAuth } from './AuthContext';

export const PARTICIPANT_TOKEN_KEY_PREFIX = 'estim8_participant_token_';

interface TopicSummary {
  id: string;
  name: string;
  description: string | null;
  position: number;
  status: string;
}

interface RoomState {
  connectionStatus: 'connecting' | 'joined' | 'error';
  joinError?: 'session_full' | 'session_not_found' | 'session_completed' | 'unknown';
  session?: SessionStatePayload['session'];
  topics: TopicSummary[];
  participants: ParticipantSummary[];
  myParticipantId?: string;
  isFacilitatorOwner: boolean;
  slideIndex: number;
  totalSlides: number;
  revealedVotes?: VoteSummary[];
  consensus?: ConsensusSummary;
  revealedTopicId?: string;
  sessionCompleted?: { purgeAt: string };
}

type Action =
  | { type: 'JOIN_ERROR'; reason: RoomState['joinError'] }
  | { type: 'SESSION_STATE'; payload: SessionStatePayload; myParticipantId?: string; isFacilitatorOwner: boolean }
  | { type: 'PARTICIPANTS_UPDATE'; participants: ParticipantSummary[] }
  | { type: 'TOPIC_ACTIVATED'; topicId: string; topic: TopicSummary; slideIndex: number }
  | { type: 'SLIDESHOW_STATE'; payload: SlideshowStatePayload }
  | { type: 'CARDS_REVEALED'; payload: CardsRevealedPayload }
  | { type: 'SESSION_COMPLETED'; purgeAt: string };

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'JOIN_ERROR':
      return { ...state, connectionStatus: 'error', joinError: action.reason };
    case 'SESSION_STATE':
      return {
        ...state,
        connectionStatus: 'joined',
        session: action.payload.session,
        topics: action.payload.topics,
        participants: action.payload.participants,
        myParticipantId: action.myParticipantId,
        isFacilitatorOwner: action.isFacilitatorOwner,
      };
    case 'PARTICIPANTS_UPDATE':
      return { ...state, participants: action.participants };
    case 'TOPIC_ACTIVATED':
      return {
        ...state,
        topics: state.topics.map((t) => (t.id === action.topicId ? action.topic : t)),
        session: state.session ? { ...state.session, activeTopicId: action.topicId } : state.session,
        slideIndex: action.slideIndex,
        revealedVotes: undefined,
        consensus: undefined,
        revealedTopicId: undefined,
      };
    case 'SLIDESHOW_STATE':
      return { ...state, slideIndex: action.payload.slideIndex, totalSlides: action.payload.totalSlides };
    case 'CARDS_REVEALED':
      return {
        ...state,
        revealedVotes: action.payload.votes,
        consensus: action.payload.consensus,
        revealedTopicId: action.payload.topicId,
      };
    case 'SESSION_COMPLETED':
      return { ...state, sessionCompleted: { purgeAt: action.purgeAt } };
    default:
      return state;
  }
}

const initialState: RoomState = {
  connectionStatus: 'connecting',
  topics: [],
  participants: [],
  isFacilitatorOwner: false,
  slideIndex: 0,
  totalSlides: 0,
};

interface SessionRoomContextValue {
  state: RoomState;
  pickCard: (topicId: string, value: string) => void;
  clearCard: (topicId: string) => void;
  requestReveal: (topicId: string) => Promise<RevealRequestAck>;
  navigateSlideshow: (topicId: string, action: SlideshowAction) => void;
  activateTopic: (topicId: string) => void;
  completeTopic: (topicId: string) => void;
  joinAsPlayer: () => void;
}

const SessionRoomContext = createContext<SessionRoomContextValue | undefined>(undefined);

export function SessionRoomProvider({ joinCode, children }: { joinCode: string; children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<Socket | null>(null);

  const doJoin = useCallback(
    (socket: Socket, opts: { joinAsPlayer?: boolean } = {}) => {
      const tokenKey = `${PARTICIPANT_TOKEN_KEY_PREFIX}${joinCode}`;
      const storedToken = sessionStorage.getItem(tokenKey) ?? undefined;
      const storedDisplayName = sessionStorage.getItem(`${DISPLAY_NAME_KEY_PREFIX}${joinCode}`) ?? undefined;

      socket.emit(
        ClientEvents.SessionJoin,
        {
          joinCode,
          displayName: storedDisplayName ?? user?.displayName,
          participantToken: storedToken,
          joinAsPlayer: opts.joinAsPlayer,
        },
        (ack: SessionJoinAck) => {
          if (!ack.ok) {
            dispatch({ type: 'JOIN_ERROR', reason: ack.reason ?? 'unknown' });
            return;
          }
          if (ack.participantToken) {
            sessionStorage.setItem(tokenKey, ack.participantToken);
          }
          socket.once(ServerEvents.SessionState, (payload: SessionStatePayload) => {
            dispatch({
              type: 'SESSION_STATE',
              payload,
              myParticipantId: ack.participantId,
              isFacilitatorOwner: Boolean(ack.isFacilitatorOwner),
            });
          });
        },
      );
    },
    [joinCode, user],
  );

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => doJoin(socket));

    socket.on(ServerEvents.ParticipantsUpdate, (payload: { participants: ParticipantSummary[] }) =>
      dispatch({ type: 'PARTICIPANTS_UPDATE', participants: payload.participants }),
    );
    socket.on(ServerEvents.TopicActivated, (payload: { topicId: string; topic: TopicSummary; slideIndex: number }) =>
      dispatch({ type: 'TOPIC_ACTIVATED', topicId: payload.topicId, topic: payload.topic, slideIndex: payload.slideIndex }),
    );
    socket.on(ServerEvents.SlideshowState, (payload: SlideshowStatePayload) =>
      dispatch({ type: 'SLIDESHOW_STATE', payload }),
    );
    socket.on(ServerEvents.CardsRevealed, (payload: CardsRevealedPayload) =>
      dispatch({ type: 'CARDS_REVEALED', payload }),
    );
    socket.on(ServerEvents.SessionCompleted, (payload: { purgeAt: string }) =>
      dispatch({ type: 'SESSION_COMPLETED', purgeAt: payload.purgeAt }),
    );

    return () => {
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  const pickCard = useCallback((topicId: string, value: string) => {
    socketRef.current?.emit(ClientEvents.CardPick, { topicId, value });
  }, []);

  const clearCard = useCallback((topicId: string) => {
    socketRef.current?.emit(ClientEvents.CardClear, { topicId });
  }, []);

  const requestReveal = useCallback((topicId: string) => {
    return new Promise<RevealRequestAck>((resolve) => {
      socketRef.current?.emit(ClientEvents.RevealRequest, { topicId }, resolve);
    });
  }, []);

  const navigateSlideshow = useCallback((topicId: string, action: SlideshowAction) => {
    socketRef.current?.emit(ClientEvents.SlideshowNavigate, { topicId, action });
  }, []);

  const activateTopic = useCallback((topicId: string) => {
    socketRef.current?.emit(ClientEvents.TopicActivate, { topicId });
  }, []);

  const completeTopic = useCallback((topicId: string) => {
    socketRef.current?.emit(ClientEvents.TopicComplete, { topicId });
  }, []);

  const joinAsPlayer = useCallback(() => {
    if (socketRef.current) doJoin(socketRef.current, { joinAsPlayer: true });
  }, [doJoin]);

  return (
    <SessionRoomContext.Provider
      value={{ state, pickCard, clearCard, requestReveal, navigateSlideshow, activateTopic, completeTopic, joinAsPlayer }}
    >
      {children}
    </SessionRoomContext.Provider>
  );
}

export function useSessionRoom(): SessionRoomContextValue {
  const ctx = useContext(SessionRoomContext);
  if (!ctx) throw new Error('useSessionRoom must be used within SessionRoomProvider');
  return ctx;
}
