import type { DieValue, DieHighlight } from '../types/game';
import { dieFacePositions } from '../utils/dice';

export type DieAnimState = 'none' | 'fade-out' | 'move-up' | 'move-down' | 'hidden';

interface DiceDisplayProps {
  dice: DieValue[];
  diceCount: number;
  isRolling: boolean;
  highlights?: DieHighlight[];
  dieAnims?: DieAnimState[];
  inverted?: boolean;
}

const HIGHLIGHT_STYLES: Record<DieHighlight, { bg: string; border: string; animation: string }> = {
  'normal': {
    bg: 'bg-cream',
    border: 'border-navy-600',
    animation: '',
  },
  'ghost': {
    bg: 'bg-gray-400',
    border: 'border-gray-500',
    animation: '',
  },
  'push': {
    bg: 'bg-orange-200',
    border: 'border-ghost-orange',
    animation: '',
  },
  'triple': {
    bg: 'bg-teal-200',
    border: 'border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]',
    animation: 'animate-dice-settle',
  },
  'instant-win': {
    bg: 'bg-yellow-200',
    border: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.7)]',
    animation: 'animate-dice-gold-pulse',
  },
};

function getAnimStyle(anim: DieAnimState): React.CSSProperties {
  switch (anim) {
    case 'fade-out':
      return { opacity: 0, transition: 'opacity 300ms ease-out' };
    case 'move-up':
      return { transform: 'translateY(-40vh)', opacity: 0, transition: 'transform 400ms ease-in, opacity 400ms ease-in' };
    case 'move-down':
      return { transform: 'translateY(40vh)', opacity: 0, transition: 'transform 400ms ease-in, opacity 400ms ease-in' };
    case 'hidden':
      return { opacity: 0 };
    default:
      return {};
  }
}

function DieFace({ value, isRolling, highlight, anim }: { value: DieValue; isRolling: boolean; highlight: DieHighlight; anim: DieAnimState }) {
  const dots = dieFacePositions[value];
  const style = HIGHLIGHT_STYLES[highlight];
  const animClass = isRolling ? 'animate-dice-roll' : style.animation;
  const animStyle = getAnimStyle(anim);

  return (
    <div className="relative" style={animStyle}>
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

export default function DiceDisplay({ dice, diceCount, isRolling, highlights, dieAnims, inverted }: DiceDisplayProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${inverted ? 'rotate-180' : ''}`}>
      {dice.length > 0
        ? dice.map((value, i) => (
            <DieFace
              key={i}
              value={value}
              isRolling={isRolling}
              highlight={highlights?.[i] ?? 'normal'}
              anim={dieAnims?.[i] ?? 'none'}
            />
          ))
        : Array.from({ length: diceCount }, (_, i) => (
            <EmptyDie key={i} />
          ))
      }
    </div>
  );
}
