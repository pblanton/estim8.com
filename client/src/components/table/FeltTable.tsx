import type { ParticipantSummary } from '@estim8/shared';
import { PlayerCircle } from './PlayerCircle';
import { CardOnTable } from './CardOnTable';

interface FeltTableProps {
  participants: ParticipantSummary[];
  revealedValues?: Record<string, string>;
  children?: React.ReactNode;
}

function seatPosition(index: number, total: number, radiusPct: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = 50 + radiusPct * Math.cos(angle);
  const y = 50 + radiusPct * Math.sin(angle);
  return { left: `${x}%`, top: `${y}%` };
}

export function FeltTable({ participants, revealedValues, children }: FeltTableProps) {
  const total = Math.max(participants.length, 1);

  return (
    <div className="felt-table-wrap">
      <div className="felt-table">
        <div className="table-center">
          {participants.length === 0 && <p>Waiting for players to join…</p>}
        </div>

        {participants.map((p, i) => {
          const seatPos = seatPosition(i, total, 42);
          const cardPos = seatPosition(i, total, 24);
          return (
            <div key={p.id}>
              <div className="player-seat" style={seatPos}>
                <PlayerCircle displayName={p.displayName} isFacilitator={p.role === 'facilitator'} connected={p.connected} />
                <span className="player-name">{p.displayName}</span>
              </div>
              <div className="player-seat" style={cardPos}>
                <CardOnTable hasPicked={p.hasPicked} revealedValue={revealedValues?.[p.id]} />
              </div>
            </div>
          );
        })}

        {children}
      </div>
    </div>
  );
}
