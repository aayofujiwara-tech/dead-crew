import { useEffect, useState } from 'react';
import type { DieValue } from '../types/game';
import { dieFacePositions } from '../utils/dice';

export interface DiceEffect {
  id: number;
  type: 'ghost_p1' | 'ghost_p2' | 'push_up' | 'push_down' | 'curse' | 'swap';
  count: number;
}

interface DiceEffectsProps {
  effects: DiceEffect[];
}

let effectKey = 0;
export function nextEffectId() {
  return ++effectKey;
}

/** Render a small die face overlay */
function DieFace({ value }: { value: DieValue }) {
  const dots = dieFacePositions[value];
  const bgColor = value === 1 ? 'bg-gray-300 border-gray-500' : 'bg-orange-200 border-ghost-orange';
  return (
    <div className={`w-10 h-10 rounded-lg shadow-lg flex items-center justify-center border-2 ${bgColor}`}>
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={10} fill="#0a0e1a" />
        ))}
      </svg>
    </div>
  );
}

export default function DiceEffects({ effects }: DiceEffectsProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {effects.map(effect => (
        <EffectItem key={effect.id} effect={effect} />
      ))}
    </div>
  );
}

function EffectItem({ effect }: { effect: DiceEffect }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration =
      effect.type === 'ghost_p1' || effect.type === 'ghost_p2' ? 300 : 400;
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [effect.type]);

  if (!visible) return null;

  switch (effect.type) {
    case 'ghost_p1':
      return (
        <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="animate-dice-ghost-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <DieFace value={1} />
            </div>
          ))}
        </div>
      );

    case 'ghost_p2':
      return (
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="animate-dice-ghost-down"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <DieFace value={1} />
            </div>
          ))}
        </div>
      );

    case 'push_up':
      return (
        <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="animate-dice-push-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <DieFace value={6} />
            </div>
          ))}
        </div>
      );

    case 'push_down':
      return (
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="animate-dice-push-down"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <DieFace value={6} />
            </div>
          ))}
        </div>
      );

    case 'curse':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="animate-dice-curse text-2xl mx-1"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              💀
            </div>
          ))}
        </div>
      );

    case 'swap':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-dice-swap text-3xl">🔄</div>
        </div>
      );

    default:
      return null;
  }
}
