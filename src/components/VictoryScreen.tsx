import type { PlayerId, DieValue } from '../types/game';
import { dieFacePositions } from '../utils/dice';

interface VictoryScreenProps {
  type: 'round' | 'match';
  winner: PlayerId | null;
  isDraw: boolean;
  winnerName: string;
  onNext: () => void;
  onGoToTitle?: () => void;
  isInstantWin?: boolean;
  instantWinCondition?: string | null;
  instantWinDice?: DieValue[];
  isRareWin?: boolean;
}

const CONFETTI_PIECES = ['🎉', '✨', '⭐', '🌟', '💫', '🔥', '👑', '💀'];
const RARE_CONFETTI_PIECES = ['👑', '💎', '🌟', '✨', '🔥', '⚡', '🏆', '💫'];

function Confetti({ isRare }: { isRare?: boolean }) {
  const pieces = isRare ? RARE_CONFETTI_PIECES : CONFETTI_PIECES;
  const count = isRare ? 35 : 20;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 400;
        const piece = pieces[i % pieces.length];
        return (
          <div
            key={i}
            className={`absolute animate-confetti ${isRare ? 'text-2xl' : 'text-xl'}`}
            style={{
              left: `${left}%`,
              top: `${15 + Math.random() * 35}%`,
              animationDelay: `${delay}ms`,
              animationDuration: `${400 + Math.random() * 300}ms`,
            }}
          >
            {piece}
          </div>
        );
      })}
    </div>
  );
}

function GoldDieFace({ value }: { value: DieValue }) {
  const dots = dieFacePositions[value];
  return (
    <div
      className="
        w-10 h-10 sm:w-14 sm:h-14 rounded-lg shadow-lg
        flex items-center justify-center
        border-2 border-yellow-500
        bg-yellow-200
        animate-dice-gold-pulse
      "
    >
      <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-11 sm:h-11">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={10} fill="#0a0e1a" />
        ))}
      </svg>
    </div>
  );
}

export default function VictoryScreen({
  type,
  winner: _winner,
  isDraw,
  winnerName,
  onNext,
  onGoToTitle,
  isInstantWin,
  instantWinCondition,
  instantWinDice,
  isRareWin,
}: VictoryScreenProps) {
  const borderColor = isRareWin
    ? 'border-yellow-400'
    : 'border-ghost-orange';
  const shadowColor = isRareWin
    ? 'shadow-[0_0_60px_rgba(234,179,8,0.5)]'
    : 'shadow-[0_0_50px_rgba(249,115,22,0.3)]';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {(isInstantWin || type === 'match') && <Confetti isRare={isRareWin} />}

      <div className="animate-victory-burst text-center">
        <div className={`bg-navy-700 border-2 ${borderColor} rounded-2xl p-8 max-w-sm w-full ${shadowColor}`}>
          {/* Instant win: show condition name + winning dice */}
          {isInstantWin && instantWinCondition && (
            <>
              <div className="animate-instant-win-text font-pirate text-2xl text-ghost-orange mb-2 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                即勝利！
              </div>
              <div className="font-pirate text-xl text-yellow-400 mb-1">
                {instantWinCondition}達成！
              </div>
              {isRareWin && (
                <div className="font-pirate text-base text-yellow-300 mb-3 animate-pulse drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">
                  レア勝利！マッチ即制覇！
                </div>
              )}
              {instantWinDice && instantWinDice.length > 0 && (
                <div className="flex gap-2 justify-center mb-4 flex-wrap">
                  {instantWinDice.map((v, i) => (
                    <GoldDieFace key={i} value={v} />
                  ))}
                </div>
              )}
            </>
          )}

          {isDraw ? (
            <>
              <div className="text-5xl mb-4">💀💀</div>
              <h2 className="font-pirate text-3xl text-cream mb-2">引き分け！</h2>
              <p className="text-teal-400 mb-6">両者ともダイスが消えた...</p>
            </>
          ) : type === 'match' ? (
            <>
              {!isInstantWin && <div className="text-5xl mb-4">👑🏴‍☠️</div>}
              <h2 className={`font-pirate text-3xl mb-2 ${isRareWin ? 'text-yellow-400' : 'text-ghost-orange'}`}>
                マッチ勝利！
              </h2>
              <p className="text-cream text-xl mb-2">{winnerName}</p>
              <p className="text-teal-400 mb-6">
                {isRareWin ? '伝説の一振りで幽霊船を支配した！' : '幽霊船の新たな支配者だ！'}
              </p>
            </>
          ) : (
            <>
              {!isInstantWin && <div className="text-5xl mb-4">👻🎉</div>}
              <h2 className="font-pirate text-3xl text-teal-400 mb-2">ラウンド勝利！</h2>
              <p className="text-cream text-xl mb-2">{winnerName}</p>
              <p className="text-teal-400/70 mb-6">幽霊船員を全て成仏させた！</p>
            </>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={onNext}
              className="
                px-6 py-3 rounded-xl font-pirate text-lg
                bg-ghost-orange text-navy-900
                hover:bg-orange-400 transition-all
                shadow-[0_0_15px_rgba(249,115,22,0.4)]
              "
            >
              {type === 'match' ? 'もう一度遊ぶ' : '次のラウンドへ'}
            </button>
            {type === 'match' && onGoToTitle && (
              <button
                onClick={onGoToTitle}
                className="
                  px-6 py-2 rounded-xl font-pirate text-base
                  bg-navy-800 text-teal-400 border border-teal-600/50
                  hover:bg-teal-600/20 hover:border-teal-400 transition-all
                "
              >
                タイトルに戻る
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
