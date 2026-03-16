import type { PlayerState } from '../types/game';
import DiceDisplay from './DiceDisplay';
import MatchScore from './MatchScore';

interface PlayerAreaProps {
  player: PlayerState;
  removedPool: number;
  isRolling: boolean;
  showEffects?: boolean;
  removedChanged?: boolean;
  inverted?: boolean;
}

export default function PlayerArea({ player, removedPool, isRolling, showEffects = false, removedChanged = false, inverted }: PlayerAreaProps) {
  return (
    <div className={`flex flex-col items-center gap-3 p-4 ${inverted ? 'rotate-180' : ''}`}>
      <div className="flex items-center gap-3 w-full justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">👻</span>
          <h2 className="font-pirate text-xl text-cream">{player.name}</h2>
        </div>
        <MatchScore score={player.matchScore} />
      </div>

      <div className="flex items-center gap-4 text-sm text-teal-400">
        <span>手持ち: <strong className="text-cream text-base">{player.diceCount}</strong>個</span>
        <span className="flex items-center gap-1">
          除外済:
          <strong className={`text-ghost-orange text-base ${removedChanged ? 'animate-counter-bounce' : ''}`}>
            {removedPool}
          </strong>
          個
          {/* Ghost icons for removed dice */}
          {removedPool > 0 && (
            <span className="flex ml-1">
              {Array.from({ length: Math.min(removedPool, 6) }, (_, i) => (
                <span key={i} className="text-xs opacity-40 -ml-0.5">👻</span>
              ))}
              {removedPool > 6 && <span className="text-xs opacity-40">+</span>}
            </span>
          )}
        </span>
      </div>

      <div className="min-h-[60px] flex items-center">
        <DiceDisplay
          dice={player.currentRoll}
          diceCount={player.diceCount}
          isRolling={isRolling}
          showEffects={showEffects}
        />
      </div>
    </div>
  );
}
