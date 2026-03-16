import type { DieValue } from '../types/game';
import { dieFacePositions } from '../utils/dice';

interface DiceDisplayProps {
  dice: DieValue[];
  diceCount: number;
  isRolling: boolean;
  showEffects?: boolean;
  inverted?: boolean;
}

function getDieEffectClass(value: DieValue, showEffects: boolean): string {
  if (!showEffects) return '';
  switch (value) {
    case 1: return 'animate-dice-ghost';
    case 6: return 'animate-dice-push-up';
    default: return 'animate-dice-settle';
  }
}

function getDieHighlight(value: DieValue, showEffects: boolean): string {
  if (!showEffects) return 'border-navy-600';
  switch (value) {
    case 1: return 'border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]';
    case 6: return 'border-ghost-orange shadow-[0_0_10px_rgba(249,115,22,0.5)]';
    default: return 'border-navy-600';
  }
}

function DieFace({ value, isRolling, showEffects }: { value: DieValue; isRolling: boolean; showEffects: boolean }) {
  const dots = dieFacePositions[value];
  const effectClass = isRolling ? 'animate-dice-roll' : getDieEffectClass(value, showEffects);
  const borderClass = getDieHighlight(value, showEffects && !isRolling);

  return (
    <div className="relative">
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-cream shadow-lg
          flex items-center justify-center relative
          border-2 ${borderClass}
          ${effectClass}
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
      {/* Ghost emoji popup for 1s */}
      {showEffects && !isRolling && value === 1 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-ghost-pop text-lg pointer-events-none">
          👻
        </div>
      )}
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

export default function DiceDisplay({ dice, diceCount, isRolling, showEffects = false, inverted }: DiceDisplayProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center ${inverted ? 'rotate-180' : ''}`}>
      {dice.length > 0
        ? dice.map((value, i) => (
            <DieFace key={i} value={value} isRolling={isRolling} showEffects={showEffects} />
          ))
        : Array.from({ length: diceCount }, (_, i) => (
            <EmptyDie key={i} />
          ))
      }
    </div>
  );
}
