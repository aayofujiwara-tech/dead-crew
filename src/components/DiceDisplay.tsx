import { useRef, useEffect, useState } from 'react';
import type { DieValue, DieHighlight } from '../types/game';
import { dieFacePositions } from '../utils/dice';

interface DiceDisplayProps {
  dice: DieValue[];
  diceCount: number;
  /** Per-die rolling state: true = still spinning, false = stopped */
  rollingMask?: boolean[];
  highlights?: DieHighlight[];
  inverted?: boolean;
  diceIdPrefix?: string;
  /** Show "?" placeholders (opponent hasn't rolled yet) */
  unrevealed?: boolean;
  /** Number of incoming dice (transferred from opponent via 6s) */
  incomingCount?: number;
  /** Animation class for incoming dice */
  incomingAnimClass?: string;
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

function randomDieValue(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

function DieFace({ value, isRolling, highlight, diceId, extraClass }: {
  value: DieValue;
  isRolling: boolean;
  highlight: DieHighlight;
  diceId?: string;
  extraClass?: string;
}) {
  const style = HIGHLIGHT_STYLES[highlight];

  // While rolling: cycle through random die values at ~60fps
  const [displayValue, setDisplayValue] = useState<DieValue>(value);

  useEffect(() => {
    if (!isRolling) {
      setDisplayValue(value);
      return;
    }
    // Start cycling random values
    const interval = setInterval(() => {
      setDisplayValue(randomDieValue());
    }, 50);
    return () => clearInterval(interval);
  }, [isRolling, value]);

  // Detect rolling→stopped transition for bounce
  const wasRolling = useRef(isRolling);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (wasRolling.current && !isRolling) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 150);
      return () => clearTimeout(t);
    }
    wasRolling.current = isRolling;
  }, [isRolling]);

  const dots = dieFacePositions[displayValue];
  const animClass = isRolling ? '' : style.animation;

  return (
    <div className={`relative ${extraClass ?? ''}`} data-dice-id={diceId}>
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-lg
          flex items-center justify-center relative
          border-2
          ${isRolling ? 'bg-cream border-navy-600' : `${style.bg} ${style.border}`}
          ${animClass}
        `}
        style={{
          transform: bouncing ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 150ms ease-out',
        }}
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

function UnrevealedDie() {
  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-navy-500 bg-navy-700 flex items-center justify-center shadow-lg">
      <span className="text-teal-600/50 text-lg font-bold">?</span>
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

export default function DiceDisplay({
  dice, diceCount, rollingMask, highlights, inverted, diceIdPrefix,
  unrevealed, incomingCount = 0, incomingAnimClass,
}: DiceDisplayProps) {
  // Always cap displayed dice to diceCount to prevent stale currentRoll
  // from showing more dice than the player actually has
  const visibleDice = dice.slice(0, diceCount);

  return (
    <div className={`flex flex-wrap gap-2 justify-center relative ${inverted ? 'rotate-180' : ''}`}>
      {unrevealed
        ? Array.from({ length: diceCount }, (_, i) => (
            <UnrevealedDie key={i} />
          ))
        : visibleDice.length > 0
          ? visibleDice.map((value, i) => (
              <DieFace
                key={i}
                value={value}
                isRolling={rollingMask?.[i] ?? false}
                highlight={highlights?.[i] ?? 'normal'}
                diceId={diceIdPrefix ? `${diceIdPrefix}-${i}` : undefined}
              />
            ))
          : Array.from({ length: diceCount }, (_, i) => (
              <EmptyDie key={i} />
            ))
      }
      {/* Incoming dice from opponent (6s transferred) —
         hide when unrevealed because diceCount already includes transferred dice */}
      {!unrevealed && incomingCount > 0 && incomingAnimClass && (
        Array.from({ length: incomingCount }, (_, i) => (
          <DieFace
            key={`incoming-${i}`}
            value={6}
            isRolling={false}
            highlight="push"
            extraClass={incomingAnimClass}
          />
        ))
      )}
    </div>
  );
}
