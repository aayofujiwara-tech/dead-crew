import { useEffect, useState } from 'react';

export interface DiceEffect {
  id: number;
  type: 'ghost' | 'push_up' | 'push_down' | 'curse' | 'swap';
  count: number;
}

interface DiceEffectsProps {
  effects: DiceEffect[];
}

let effectKey = 0;
export function nextEffectId() {
  return ++effectKey;
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
    const timer = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  switch (effect.type) {
    case 'ghost':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="animate-ghost-pop text-3xl mx-1"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              👻
            </div>
          ))}
        </div>
      );

    case 'push_up':
      return (
        <div className="absolute bottom-[40%] left-1/2 -translate-x-1/2 flex gap-1">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded bg-cream/80 animate-dice-push-up shadow-lg"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      );

    case 'push_down':
      return (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 flex gap-1">
          {Array.from({ length: effect.count }, (_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded bg-cream/80 animate-dice-push-down shadow-lg"
              style={{ animationDelay: `${i * 40}ms` }}
            />
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
