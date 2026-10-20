import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function DuckConfettiCelebration() {
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({ particleCount: 120, spread: 90, origin: { x: 0.45, y: 0.75 } });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="celebration-layer">
      <div className="duck-sprite">🦆</div>
    </div>
  );
}
