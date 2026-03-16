import type { DieValue, DieHighlight } from '../types/game';
import { dieFacePositions } from '../utils/dice';

interface DiceDisplayProps {
  dice: DieValue[];
  diceCount: number;
  isRolling: boolean;
  highlights?: DieHighlight[];
  inverted?: boolean;
}

const HIGHLIGHT_STYLES: Record<DieHighlight, { bg: string; border: string; animation: string; hidden: boolean }> = {
  'normal': {
    bg: 'bg-cream',
    border: 'border-navy-600',
    animation: '',
    hidden: false,
  },
  'ghost': {
    bg: 'bg-gray-400',
    border: 'border-gray-500',
    animation: '',
    hidden: true,
  },
  'push': {
    bg: 'bg-orange-200',
    border: 'border-ghost-orange',
    animation: '',
    hidden: true,
  },
  'triple': {
    bg: 'bg-teal-200',
    border: 'border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]',
    animation: 'animate-dice-settle',
    hidden: false,
  },
  'instant-win': {
    bg: 'bg-yellow-200',
    border: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.7)]',
    animation: 'animate-dice-gold-pulse',
    hidden: false,
  },
};

function DieFace({ value, isRolling, highlight }: { value: DieValue; isRolling: boolean; highlight: DieHighlight }) {
  const dots = dieFacePositions[value];
  const style = HIGHLIGHT_STYLES[highlight];
  const animClass = isRolling ? 'animate-dice-roll' : style.animation;
  // Hide source die immediately when it's being moved/removed (overlay handles the visual)
  const hiddenClass = !isRolling && style.hidden ? 'opacity-0' : '';

  return (
    <div className={`relative ${hiddenClass}`}>
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-lg
          flex items-center justify-center relative
          border-2
          ${isRolling ? 'bg-cream border-navy-600' : `${style.bg} ${style.border}`}
          ${animClass}
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

export default function DiceDisplay({ dice, diceCount, isRolling, highlights, inverted }: DiceDisplayProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${inverted ? 'rotate-180' : ''}`}>
      {dice.length > 0
        ? dice.map((value, i) => (
            <DieFace
              key={i}
              value={value}
              isRolling={isRolling}
              highlight={highlights?.[i] ?? 'normal'}
            />
          ))
        : Array.from({ length: diceCount }, (_, i) => (
            <EmptyDie key={i} />
          ))
      }
    </div>
  );
}
