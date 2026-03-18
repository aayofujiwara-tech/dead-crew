import type { PlayerId, PendingTargetChoice, PlayerState } from '../types/game';

interface TargetChoiceDialogProps {
  choice: PendingTargetChoice;
  players: [PlayerState, PlayerState, PlayerState];
  removedPool: number;
  remaining: number; // how many more of this type for this player
  onChoose: (target: PlayerId) => void;
}

export default function TargetChoiceDialog({
  choice,
  players,
  removedPool,
  remaining,
  onChoose,
}: TargetChoiceDialogProps) {
  const actor = players[choice.player - 1];
  const opponents = players.filter(p => p.id !== choice.player);

  const isRevive = choice.effectType === 'revive';
  const effectLabel = isRevive
    ? `除外済みプールから1個を相手に押し付ける`
    : `自分のダイスを1個相手に渡す`;
  const emoji = isRevive ? '👻' : '🎲';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="
        bg-navy-700 border-2 border-teal-500 rounded-xl p-6 max-w-sm w-full
        shadow-[0_0_30px_rgba(45,212,191,0.2)]
      ">
        <h3 className="font-pirate text-xl text-ghost-orange mb-2 text-center">
          {actor.name}の選択
        </h3>
        <p className="text-teal-400 text-sm mb-1 text-center">
          {emoji} {isRevive ? '4' : '6'}の効果：{effectLabel}
        </p>
        {isRevive && (
          <p className="text-teal-400/60 text-xs mb-1 text-center">
            除外済みプール: {removedPool}個
          </p>
        )}
        <p className="text-cream/50 text-xs mb-4 text-center">
          残り {remaining} 回
        </p>
        <p className="text-cream text-sm mb-3 text-center font-bold">
          誰に渡しますか？
        </p>
        <div className="flex gap-3 justify-center">
          {opponents.map(opp => (
            <button
              key={opp.id}
              onClick={() => onChoose(opp.id)}
              className="
                flex-1 py-3 px-4 rounded-lg
                bg-navy-800 border border-teal-600/50
                hover:bg-teal-600/20 hover:border-teal-400
                transition-all duration-200
                text-center
              "
            >
              <div className="text-cream font-bold text-sm">{opp.name}</div>
              <div className="text-teal-400/70 text-xs">ダイス: {opp.diceCount}個</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
