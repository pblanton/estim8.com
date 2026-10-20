import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SessionRoomProvider, useSessionRoom, PARTICIPANT_TOKEN_KEY_PREFIX } from '../../context/SessionRoomContext';
import { FeltTable } from '../../components/table/FeltTable';
import { CardPickerHand } from '../../components/deck/CardPickerHand';
import { SlideshowViewer } from '../../components/slideshow/SlideshowViewer';
import { ResultsPanel } from '../../components/results/ResultsPanel';
import { DuckConfettiCelebration } from '../../components/celebration/DuckConfettiCelebration';
import { fileApi } from '../../api/files';
import { sessionApi } from '../../api/sessions';

function JoinErrorScreen({ reason }: { reason: string }) {
  const messages: Record<string, string> = {
    session_full: 'This session already has 10 players. Ask your facilitator to check in with you directly.',
    session_not_found: 'We could not find a session with that link.',
    session_completed: 'This session has ended.',
    unknown: 'Something went wrong connecting to this session.',
  };
  return (
    <div className="join-full-page">
      <div className="auth-card">
        <h1>Can't join this session</h1>
        <p>{messages[reason] ?? messages.unknown}</p>
      </div>
    </div>
  );
}

function SessionRoomInner({ joinCode }: { joinCode: string }) {
  const { state, pickCard, clearCard, requestReveal, navigateSlideshow, activateTopic, completeTopic, joinAsPlayer } =
    useSessionRoom();
  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [revealMessage, setRevealMessage] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  const participantToken = sessionStorage.getItem(`${PARTICIPANT_TOKEN_KEY_PREFIX}${joinCode}`) ?? undefined;

  const activeTopic = state.topics.find((t) => t.id === state.session?.activeTopicId);

  const { data: filesData } = useQuery({
    queryKey: ['topic-files', activeTopic?.id, participantToken],
    queryFn: () => fileApi.list(activeTopic!.id, participantToken),
    enabled: Boolean(activeTopic),
  });

  if (state.connectionStatus === 'error') {
    return <JoinErrorScreen reason={state.joinError ?? 'unknown'} />;
  }

  if (state.connectionStatus === 'connecting' || !state.session) {
    return (
      <div className="join-full-page">
        <div className="auth-card">
          <h1>Connecting…</h1>
        </div>
      </div>
    );
  }

  const revealedForActiveTopic = activeTopic != null && state.revealedTopicId === activeTopic.id;
  const revealedValues = revealedForActiveTopic
    ? Object.fromEntries(state.revealedVotes!.map((v) => [v.participantId, v.value]))
    : undefined;
  const celebrate = revealedForActiveTopic && state.consensus?.agreementPct === 100 && state.revealedVotes!.length >= 2;

  async function onReveal() {
    if (!activeTopic) return;
    const ack = await requestReveal(activeTopic.id);
    if (!ack.ok) {
      setRevealMessage(
        ack.reason === 'not_all_picked' ? `Still waiting on: ${ack.missing?.join(', ')}` : "Couldn't reveal cards.",
      );
      setTimeout(() => setRevealMessage(null), 4000);
    } else {
      setShowResults(true);
    }
  }

  function onNextTopic() {
    if (!activeTopic) return;
    setShowResults(false);
    completeTopic(activeTopic.id);
  }

  async function onPurgeNow() {
    if (!state.session) return;
    if (
      !window.confirm(
        'This permanently deletes this session, every topic, every uploaded file, and all votes/results right now. This cannot be undone. Continue?',
      )
    ) {
      return;
    }
    setPurging(true);
    try {
      await sessionApi.purge(state.session.id);
      navigate('/dashboard');
    } catch {
      setPurging(false);
    }
  }

  if (state.sessionCompleted) {
    return (
      <div className="session-complete-overlay" style={{ position: 'fixed' }}>
        <h1>Session complete</h1>
        <p>
          Thanks everyone! This session's files will be automatically deleted on{' '}
          {new Date(state.sessionCompleted.purgeAt).toLocaleDateString()}.
        </p>
        {state.isFacilitatorOwner && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a className="btn btn-primary" href={sessionApi.exportUrl(state.session.id)}>
              Download ZIP of everything
            </a>
            <button className="btn btn-danger" onClick={onPurgeNow} disabled={purging}>
              {purging ? 'Purging…' : 'Purge session now'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="play-layout">
      <div className="play-left">
        <div className="play-topbar">
          <span className="topic-name">{activeTopic ? activeTopic.name : 'No topic selected'}</span>
        </div>

        {state.isFacilitatorOwner && (
          <div style={{ padding: '0.75rem 1rem', background: '#222', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {state.topics.map((t) => (
              <button
                key={t.id}
                className="btn btn-secondary btn-small"
                onClick={() => activateTopic(t.id)}
                disabled={t.id === activeTopic?.id}
              >
                {t.name} ({t.status})
              </button>
            ))}
          </div>
        )}

        {activeTopic?.description && (
          <div style={{ padding: '0.75rem 1rem', color: '#ccc', fontSize: '0.9rem' }}>{activeTopic.description}</div>
        )}

        {activeTopic && (
          <SlideshowViewer
            topicId={activeTopic.id}
            files={filesData?.files ?? []}
            slideIndex={state.slideIndex}
            participantToken={participantToken}
          />
        )}

        {activeTopic && state.isFacilitatorOwner && (
          <div className="slideshow-controls">
            <button className="btn btn-secondary btn-small" onClick={() => navigateSlideshow(activeTopic.id, 'start')}>
              ⏮ Start
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => navigateSlideshow(activeTopic.id, 'back')}>
              ◀ Back
            </button>
            <span className="slideshow-counter">
              {state.totalSlides > 0 ? `${state.slideIndex + 1} / ${state.totalSlides}` : '—'}
            </span>
            <button className="btn btn-secondary btn-small" onClick={() => navigateSlideshow(activeTopic.id, 'next')}>
              Next ▶
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => navigateSlideshow(activeTopic.id, 'end')}>
              End ⏭
            </button>
          </div>
        )}
      </div>

      <div className="play-right">
        {activeTopic && (
          <div className="consensus-banner">
            {revealedForActiveTopic
              ? `Agreement: ${state.consensus?.agreementPct}% ${state.consensus?.allEqual ? '(unanimous!)' : ''}`
              : `${state.participants.filter((p) => p.hasPicked).length} / ${state.participants.length} picked`}
          </div>
        )}

        <div className="facilitator-bar">
          {revealMessage && <span className="consensus-banner">{revealMessage}</span>}
          {state.isFacilitatorOwner && !state.myParticipantId && (
            <button className="btn btn-secondary btn-small" onClick={joinAsPlayer}>
              Join table as player
            </button>
          )}
          {state.isFacilitatorOwner && activeTopic && !revealedForActiveTopic && (
            <button className="btn btn-primary btn-small" onClick={onReveal}>
              Reveal cards
            </button>
          )}
          {state.isFacilitatorOwner && activeTopic && revealedForActiveTopic && (
            <>
              <button className="btn btn-secondary btn-small" onClick={() => setShowResults(true)}>
                Results
              </button>
              <button className="btn btn-primary btn-small" onClick={onNextTopic}>
                Next topic →
              </button>
            </>
          )}
        </div>

        <FeltTable participants={state.participants} revealedValues={revealedValues} />

        {activeTopic && state.myParticipantId && !revealedForActiveTopic && activeTopic.status === 'active' && (
          <CardPickerHand
            topicId={activeTopic.id}
            deckLabels={state.session.deckLabels}
            disabled={false}
            onPick={pickCard}
            onClear={clearCard}
          />
        )}

        {celebrate && <DuckConfettiCelebration key={state.revealedTopicId} />}

        {showResults && activeTopic && state.revealedVotes && (
          <ResultsPanel
            topicId={activeTopic.id}
            topicName={activeTopic.name}
            votes={state.revealedVotes}
            deckLabels={state.session.deckLabels}
            onSaved={() => setShowResults(false)}
            onDismiss={() => setShowResults(false)}
          />
        )}
      </div>
    </div>
  );
}

export function SessionRoomPage() {
  const { joinCode } = useParams<{ joinCode: string }>();
  if (!joinCode) return null;
  return (
    <SessionRoomProvider joinCode={joinCode}>
      <SessionRoomInner joinCode={joinCode} />
    </SessionRoomProvider>
  );
}
