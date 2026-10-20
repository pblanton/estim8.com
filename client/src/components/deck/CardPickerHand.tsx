import { useEffect, useState } from 'react';

interface CardPickerHandProps {
  topicId: string;
  deckLabels: string[];
  disabled: boolean;
  onPick: (topicId: string, value: string) => void;
  onClear: (topicId: string) => void;
}

export function CardPickerHand({ topicId, deckLabels, disabled, onPick, onClear }: CardPickerHandProps) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [topicId]);

  function onCardClick(value: string) {
    if (disabled) return;
    if (selected === value) {
      setSelected(null);
      onClear(topicId);
      return;
    }
    setSelected(value);
    onPick(topicId, value);
  }

  return (
    <div className="card-hand">
      {deckLabels.map((value) => (
        <button
          key={value}
          type="button"
          className={`hand-card ${selected === value ? 'selected' : ''}`}
          onClick={() => onCardClick(value)}
          disabled={disabled}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
