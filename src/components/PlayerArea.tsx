import type { PlayerState } from '../types/game';
import DiceDisplay from './DiceDisplay';
import MatchScore from './MatchScore';

interface PlayerAreaProps {
  player: PlayerState;
  removedPool: number;
  isRolling: boolean;
  inverted?: boolean;
}

export default function PlayerArea({ player, removedPool, isRolling, inverted }: PlayerAreaProps) {
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
        <span>除外済: <strong className="text-ghost-orange text-base">{removedPool}</strong>個</span>
      </div>

      <div className="min-h-[60px] flex items-center">
        <DiceDisplay
          dice={player.currentRoll}
          diceCount={player.diceCount}
          isRolling={isRolling}
        />
      </div>
    </div>
  );
}
