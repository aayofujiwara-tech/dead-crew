import { useCallback, useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import TitleScreen from './components/TitleScreen';
import RuleScreen from './components/RuleScreen';
import PlayerArea from './components/PlayerArea';
import GameLog from './components/GameLog';
import ChoiceDialog from './components/ChoiceDialog';
import VictoryScreen from './components/VictoryScreen';
import DiceEffects, { nextEffectId } from './components/DiceEffects';
import type { DiceEffect } from './components/DiceEffects';
import { countOnes, countSixes } from './utils/dice';

function App() {
  const [screen, setScreen] = useState<'title' | 'rule' | 'game'>('title');
  const [shaking, setShaking] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [removedChanged, setRemovedChanged] = useState(false);
  const [diceEffects, setDiceEffects] = useState<DiceEffect[]>([]);
  const prevRemovedRef = useRef(0);
  // Ref-based guard: prevents the resolving_normal effect from firing twice
  // for the same turn, without causing re-renders or cleanup cycles.
  const resolvedTurnRef = useRef(-1);

  const {
    state,
    rollAndProcess,
    rollPriority,
    makeChoice,
    resolveNormal,
    nextRound,
    restartMatch,
  } = useGameState();

  // Track removed pool changes for bounce animation
  useEffect(() => {
    if (state.removedPool !== prevRemovedRef.current) {
      prevRemovedRef.current = state.removedPool;
      setRemovedChanged(true);
      const t = setTimeout(() => setRemovedChanged(false), 300);
      return () => clearTimeout(t);
    }
  }, [state.removedPool]);

  // When phase becomes 'resolving_normal', immediately resolve game logic
  // and fire cosmetic animations as fire-and-forget (no blocking).
  useEffect(() => {
    if (state.phase !== 'resolving_normal') return;
    // Guard: only fire once per turn to prevent double-dispatch
    if (resolvedTurnRef.current === state.turn) return;
    resolvedTurnRef.current = state.turn;

    // Fire cosmetic effects (non-blocking)
    const effects: DiceEffect[] = [];
    const p1Ones = countOnes(state.player1.currentRoll);
    const p2Ones = countOnes(state.player2.currentRoll);
    const p1Sixes = countSixes(state.player1.currentRoll);
    const p2Sixes = countSixes(state.player2.currentRoll);

    if (p1Ones + p2Ones > 0) {
      effects.push({ id: nextEffectId(), type: 'ghost', count: p1Ones + p2Ones });
    }
    if (p1Sixes > 0) {
      effects.push({ id: nextEffectId(), type: 'push_up', count: p1Sixes });
    }
    if (p2Sixes > 0) {
      effects.push({ id: nextEffectId(), type: 'push_down', count: p2Sixes });
    }

    if (effects.length > 0) {
      setShowEffects(true);
      setDiceEffects(effects);
      // Clean up visuals after animation completes — purely cosmetic
      setTimeout(() => {
        setShowEffects(false);
        setDiceEffects([]);
      }, 350);
    }

    // Resolve game logic immediately — never blocked by animation
    resolveNormal();
  }, [state.phase, state.turn, state.player1.currentRoll, state.player2.currentRoll, resolveNormal]);

  // Safety: if somehow stuck in resolving_normal for >500ms, force resolve
  useEffect(() => {
    if (state.phase !== 'resolving_normal') return;
    const fallback = setTimeout(() => {
      resolveNormal();
    }, 500);
    return () => clearTimeout(fallback);
  }, [state.phase, resolveNormal]);

  // Screen shake on roll
  const handleRoll = useCallback(() => {
    if (state.phase === 'waiting') {
      setShaking(true);
      setTimeout(() => setShaking(false), 150);
      rollAndProcess();
    }
  }, [state.phase, rollAndProcess]);

  // Spawn effects for special choices (swap, curse)
  const handleChoice = useCallback((player: Parameters<typeof makeChoice>[0], choice: Parameters<typeof makeChoice>[1]) => {
    const currentPending = state.pendingChoices[state.currentChoiceIndex];
    if (currentPending) {
      const effects: DiceEffect[] = [];
      if (currentPending.effect.type === 'swap_all' && choice === 'swap') {
        effects.push({ id: nextEffectId(), type: 'swap', count: 1 });
      }
      if (currentPending.effect.type === 'add_removed_3' || currentPending.effect.type === 'add_removed_4') {
        const count = currentPending.effect.type === 'add_removed_3' ? 3 : 4;
        effects.push({ id: nextEffectId(), type: 'curse', count: Math.min(count, state.removedPool) });
      }
      if (effects.length > 0) {
        setDiceEffects(prev => [...prev, ...effects]);
        setTimeout(() => setDiceEffects([]), 400);
      }
    }
    makeChoice(player, choice);
  }, [makeChoice, state.pendingChoices, state.currentChoiceIndex, state.removedPool]);

  const currentChoice = state.pendingChoices[state.currentChoiceIndex];
  const showingChoice = (state.phase === 'resolving_choice_p1' || state.phase === 'resolving_choice_p2') && currentChoice;

  const handleGoToTitle = useCallback(() => {
    restartMatch();
    setScreen('title');
  }, [restartMatch]);

  const getPlayerName = (id: number) => id === 1 ? state.player1.name : state.player2.name;

  if (screen === 'title') {
    return <TitleScreen onStart={() => setScreen('game')} onShowRules={() => setScreen('rule')} />;
  }

  if (screen === 'rule') {
    return <RuleScreen onBack={() => setScreen('title')} />;
  }

  const isInstantWin = (state.phase === 'round_end' || state.phase === 'match_end') &&
    !state.isDraw && state.animationPhase === 'victory';

  return (
    <div className={`min-h-[100dvh] bg-navy-900 text-cream flex flex-col overflow-hidden relative ${shaking ? 'animate-screen-shake' : ''}`}>
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
          showEffects={showEffects}
          removedChanged={removedChanged}
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
          {(state.phase === 'waiting' || state.phase === 'rolling' || state.phase === 'showing_results') && (
            <button
              onClick={handleRoll}
              disabled={state.phase !== 'waiting'}
              className={`
                px-8 py-3 rounded-xl font-pirate text-xl
                transition-all duration-75
                ${state.phase === 'waiting'
                  ? 'bg-teal-600 text-navy-900 hover:bg-teal-400 active:scale-95 shadow-[0_0_20px_rgba(45,212,191,0.3)] animate-glow-pulse'
                  : 'bg-teal-600/40 text-navy-900/60 cursor-not-allowed'
                }
              `}
            >
              振る！
            </button>
          )}

          {state.phase === 'resolving_priority' && (
            <button
              onClick={rollPriority}
              className="
                px-6 py-2 rounded-lg font-pirate text-lg
                bg-ghost-orange text-navy-900
                hover:bg-orange-400 transition-all duration-75
              "
            >
              優先度ダイスを振る！
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
          showEffects={showEffects}
          removedChanged={removedChanged}
        />
      </div>

      {/* Dice movement effect overlay */}
      <DiceEffects effects={diceEffects} />

      {/* Choice dialog */}
      {showingChoice && (
        <ChoiceDialog
          choice={currentChoice}
          playerName={getPlayerName(currentChoice.player)}
          onChoose={handleChoice}
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
          isInstantWin={isInstantWin}
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
          isInstantWin={isInstantWin}
        />
      )}
    </div>
  );
}

export default App;
