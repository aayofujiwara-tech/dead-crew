import type { PlayerState, DieHighlight } from '../types/game';
import DiceDisplay from './DiceDisplay';
import MatchScore from './MatchScore';

interface PlayerAreaProps {
  player: PlayerState;
  removedPool: number;
  /** Per-die rolling state */
  rollingMask?: boolean[];
  highlights?: DieHighlight[];
  removedChanged?: boolean;
  inverted?: boolean;
  isCpu?: boolean;
  diceIdPrefix?: string;
  incomingCount?: number;
  incomingAnimClass?: string;
  /** Whether this player's dice are hidden (hasn't rolled yet) */
  unrevealed?: boolean;
  /** Whether the roll button should be active */
  canRoll?: boolean;
  /** Whether this player has already rolled */
  hasRolled?: boolean;
  /** Called when the player clicks their roll button */
  onRoll?: () => void;
}

export default function PlayerArea({
  player, removedPool, rollingMask, highlights,
  removedChanged = false, inverted, isCpu, diceIdPrefix,
  incomingCount, incomingAnimClass,
  unrevealed, canRoll, hasRolled, onRoll,
}: PlayerAreaProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 ${inverted ? 'flex-col-reverse' : ''}`}
      data-player={player.id === 1 ? 'p1' : 'p2'}
    >
      <div className="flex items-center gap-2 w-full justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base sm:text-xl">👻</span>
          <h2 className="font-pirate text-base sm:text-xl text-cream">{player.name}</h2>
          {isCpu && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-ghost-orange/20 text-ghost-orange border border-ghost-orange/40 font-bold">
              CPU
            </span>
          )}
        </div>
        <MatchScore score={player.matchScore} />
      </div>

      <div className="flex items-center gap-3 text-xs sm:text-sm text-teal-400">
        <span>手持ち: <strong className="text-cream text-sm sm:text-base">{player.diceCount}</strong>個</span>
        <span className="flex items-center gap-1">
          除外済:
          <strong className={`text-ghost-orange text-sm sm:text-base ${removedChanged ? 'animate-counter-bounce' : ''}`}>
            {removedPool}
          </strong>
          個
          {removedPool > 0 && (
            <span className="flex ml-1">
              {Array.from({ length: Math.min(removedPool, 6) }, (_, i) => (
                <span key={i} className="text-[10px] opacity-40 -ml-0.5">👻</span>
              ))}
              {removedPool > 6 && <span className="text-[10px] opacity-40">+</span>}
            </span>
          )}
        </span>
      </div>

      <div className="h-[48px] sm:h-[56px] flex items-center">
        <DiceDisplay
          dice={player.currentRoll}
          diceCount={player.diceCount}
          rollingMask={rollingMask}
          highlights={highlights}
          inverted={inverted}
          diceIdPrefix={diceIdPrefix}
          unrevealed={unrevealed}
          incomingCount={incomingCount}
          incomingAnimClass={incomingAnimClass}
        />
      </div>

      {/* Per-player roll button */}
      <div className="h-[30px] sm:h-[36px] flex items-center justify-center">
        {canRoll ? (
          <button
            onClick={onRoll}
            className="
              px-5 py-1 sm:px-6 sm:py-1.5 rounded-xl font-pirate text-base sm:text-lg
              bg-teal-600 text-navy-900 hover:bg-teal-400 active:scale-95
              shadow-[0_0_15px_rgba(45,212,191,0.3)] animate-glow-pulse
              transition-all duration-75
            "
          >
            振る！
          </button>
        ) : hasRolled ? (
          <span className="text-teal-400/50 text-xs sm:text-sm font-pirate">待機中...</span>
        ) : (
          <span className="text-teal-600/20 text-xs sm:text-sm">-</span>
        )}
      </div>
    </div>
  );
}
