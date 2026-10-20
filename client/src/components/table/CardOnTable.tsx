interface CardOnTableProps {
  hasPicked: boolean;
  revealedValue?: string;
}

export function CardOnTable({ hasPicked, revealedValue }: CardOnTableProps) {
  if (revealedValue !== undefined) {
    return <div className="table-card revealed">{revealedValue}</div>;
  }
  return <div className={`table-card ${hasPicked ? 'picked' : 'empty'}`} />;
}
