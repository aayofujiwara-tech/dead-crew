import type { DieValue } from '../types/game';
import { dieFacePositions } from '../utils/dice';

interface DiceDisplayProps {
  dice: DieValue[];
  diceCount: number;
  isRolling: boolean;
  inverted?: boolean;
}

function DieFace({ value, isRolling }: { value: DieValue; isRolling: boolean }) {
  const dots = dieFacePositions[value];
  return (
    <div
      className={`
        w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-cream shadow-lg
        flex items-center justify-center relative
        border-2 border-navy-600
        ${isRolling ? 'animate-dice-roll' : ''}
      `}
    >
      <svg viewBox="0 0 100 100" className="w-10 h-10 sm:w-11 sm:h-11">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={10}
            fill="#0a0e1a"
          />
        ))}
      </svg>
    </div>
  );
}

function EmptyDie() {
  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-dashed border-teal-600/30 flex items-center justify-center">
      <span className="text-teal-600/30 text-lg">?</span>
    </div>
  );
}

export default function DiceDisplay({ dice, diceCount, isRolling, inverted }: DiceDisplayProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${inverted ? 'rotate-180' : ''}`}>
      {dice.length > 0
        ? dice.map((value, i) => (
            <DieFace key={i} value={value} isRolling={isRolling} />
          ))
        : Array.from({ length: diceCount }, (_, i) => (
            <EmptyDie key={i} />
          ))
      }
    </div>
  );
}
