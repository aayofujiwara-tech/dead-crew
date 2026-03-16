import { useCallback, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import TitleScreen from './components/TitleScreen';
import PlayerArea from './components/PlayerArea';
import GameLog from './components/GameLog';
import ChoiceDialog from './components/ChoiceDialog';
import VictoryScreen from './components/VictoryScreen';

function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title');

  const {
    state,
    rollAndProcess,
    rollPriority,
    makeChoice,
    resolveNormal,
    nextRound,
    restartMatch,
  } = useGameState();

  const handleRoll = useCallback(() => {
    if (state.phase === 'waiting') {
      rollAndProcess();
    }
  }, [state.phase, rollAndProcess]);

  const currentChoice = state.pendingChoices[state.currentChoiceIndex];
  const showingChoice = (state.phase === 'resolving_choice_p1' || state.phase === 'resolving_choice_p2') && currentChoice;

  const handleGoToTitle = useCallback(() => {
    restartMatch();
    setScreen('title');
  }, [restartMatch]);

  const getPlayerName = (id: number) => id === 1 ? state.player1.name : state.player2.name;

  if (screen === 'title') {
    return <TitleScreen onStart={() => setScreen('game')} />;
  }

  return (
    <div className="min-h-[100dvh] bg-navy-900 text-cream flex flex-col overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 text-4xl opacity-10 animate-float">👻</div>
        <div className="absolute top-1/4 right-8 text-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>💀</div>
        <div className="absolute bottom-1/4 left-10 text-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>🏴‍☠️</div>
        <div className="absolute bottom-20 right-5 text-4xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>⚓</div>
      </div>

      {/* Player 2 area (inverted) */}
      <div className="flex-1 flex flex-col justify-end border-b border-teal-600/20">
        <PlayerArea
          player={state.player2}
          removedPool={state.removedPool}
          isRolling={state.animationPhase === 'rolling'}
          inverted
        />
      </div>

      {/* Center area */}
      <div className="flex-shrink-0 py-3 px-4 space-y-3 bg-navy-800/50 border-y border-teal-600/20">
        <div className="flex items-center justify-between text-sm">
          <span className="text-teal-400">
            ラウンド <strong className="text-cream">{state.round}</strong>
          </span>
          <span className="font-pirate text-lg text-ghost-orange">
            デッドクルー
          </span>
          <span className="text-teal-400">
            ターン <strong className="text-cream">{state.turn}</strong>
          </span>
        </div>

        <GameLog log={state.log} />

        {/* Action buttons */}
        <div className="flex justify-center">
          {state.phase === 'waiting' && (
            <button
              onClick={handleRoll}
              className="
                px-8 py-3 rounded-xl font-pirate text-xl
                bg-teal-600 text-navy-900
                hover:bg-teal-400 active:scale-95
                transition-all duration-200
                shadow-[0_0_20px_rgba(45,212,191,0.3)]
                animate-glow-pulse
              "
            >
              振る！
            </button>
          )}

          {state.phase === 'showing_results' && (
            <div className="text-teal-400 animate-pulse text-sm">処理中...</div>
          )}

          {state.phase === 'resolving_priority' && (
            <button
              onClick={rollPriority}
              className="
                px-6 py-2 rounded-lg font-pirate text-lg
                bg-ghost-orange text-navy-900
                hover:bg-orange-400 transition-all
              "
            >
              優先度ダイスを振る！
            </button>
          )}

          {state.phase === 'resolving_normal' && (
            <button
              onClick={resolveNormal}
              className="
                px-6 py-2 rounded-lg font-pirate text-lg
                bg-teal-600 text-navy-900
                hover:bg-teal-400 transition-all
              "
            >
              効果を処理する
            </button>
          )}
        </div>
      </div>

      {/* Player 1 area */}
      <div className="flex-1 flex flex-col justify-start border-t border-teal-600/20">
        <PlayerArea
          player={state.player1}
          removedPool={state.removedPool}
          isRolling={state.animationPhase === 'rolling'}
        />
      </div>

      {/* Choice dialog */}
      {showingChoice && (
        <ChoiceDialog
          choice={currentChoice}
          playerName={getPlayerName(currentChoice.player)}
          onChoose={makeChoice}
          inverted={currentChoice.player === 2}
        />
      )}

      {/* Round end screen */}
      {state.phase === 'round_end' && (
        <VictoryScreen
          type="round"
          winner={state.winner}
          isDraw={state.isDraw}
          winnerName={state.winner ? getPlayerName(state.winner) : ''}
          onNext={nextRound}
        />
      )}

      {/* Match end screen */}
      {state.phase === 'match_end' && (
        <VictoryScreen
          type="match"
          winner={state.matchWinner}
          isDraw={false}
          winnerName={state.matchWinner ? getPlayerName(state.matchWinner) : ''}
          onNext={restartMatch}
          onGoToTitle={handleGoToTitle}
        />
      )}
    </div>
  );
}

export default App;
