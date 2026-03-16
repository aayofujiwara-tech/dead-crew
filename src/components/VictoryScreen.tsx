import type { PlayerId } from '../types/game';

interface VictoryScreenProps {
  type: 'round' | 'match';
  winner: PlayerId | null;
  isDraw: boolean;
  winnerName: string;
  onNext: () => void;
  onGoToTitle?: () => void;
}

export default function VictoryScreen({ type, winner: _winner, isDraw, winnerName, onNext, onGoToTitle }: VictoryScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="animate-victory-burst text-center">
        <div className="bg-navy-700 border-2 border-ghost-orange rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(249,115,22,0.3)]">
          {isDraw ? (
            <>
              <div className="text-5xl mb-4">💀💀</div>
              <h2 className="font-pirate text-3xl text-cream mb-2">引き分け！</h2>
              <p className="text-teal-400 mb-6">両者ともダイスが消えた...</p>
            </>
          ) : type === 'match' ? (
            <>
              <div className="text-5xl mb-4">👑🏴‍☠️</div>
              <h2 className="font-pirate text-3xl text-ghost-orange mb-2">マッチ勝利！</h2>
              <p className="text-cream text-xl mb-2">{winnerName}</p>
              <p className="text-teal-400 mb-6">幽霊船の新たな支配者だ！</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">👻🎉</div>
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
