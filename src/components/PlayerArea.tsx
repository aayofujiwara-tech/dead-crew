import type { PlayerState, DieHighlight } from '../types/game';
import DiceDisplay from './DiceDisplay';
import MatchScore from './MatchScore';

interface PlayerAreaProps {
  player: PlayerState;
  removedPool: number;
  isRolling: boolean;
  highlights?: DieHighlight[];
  removedChanged?: boolean;
  inverted?: boolean;
  isCpu?: boolean;
  diceIdPrefix?: string;
  incomingCount?: number;
  incomingAnimClass?: string;
}

export default function PlayerArea({
  player, removedPool, isRolling, highlights,
  removedChanged = false, inverted, isCpu, diceIdPrefix,
  incomingCount, incomingAnimClass,
}: PlayerAreaProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 p-4 ${inverted ? 'flex-col-reverse' : ''}`}
      data-player={player.id === 1 ? 'p1' : 'p2'}
    >
      <div className="flex items-center gap-3 w-full justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">👻</span>
          <h2 className="font-pirate text-xl text-cream">{player.name}</h2>
          {isCpu && (
            <span className="text-xs px-2 py-0.5 rounded bg-ghost-orange/20 text-ghost-orange border border-ghost-orange/40 font-bold">
              CPU
            </span>
          )}
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
          highlights={highlights}
          inverted={inverted}
          diceIdPrefix={diceIdPrefix}
          incomingCount={incomingCount}
          incomingAnimClass={incomingAnimClass}
        />
      </div>
    </div>
  );
}
