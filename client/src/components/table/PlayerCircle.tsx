function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface PlayerCircleProps {
  displayName: string;
  isFacilitator: boolean;
  connected: boolean;
}

export function PlayerCircle({ displayName, isFacilitator, connected }: PlayerCircleProps) {
  return (
    <div
      className={`player-circle ${connected ? '' : 'disconnected'} ${isFacilitator ? 'is-facilitator' : ''}`}
      title={displayName}
    >
      {initials(displayName)}
    </div>
  );
}
