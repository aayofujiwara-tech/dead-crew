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
import type { DieHighlight, GameMode } from './types/game';
import { computeDiceHighlights } from './utils/dice';
import { cpuController } from './controllers/playerControllers';
import {
  animateDiceRemove,
  animateDiceTransferOut,
  resetDiceStyles,
  waitMs,
  waitForHighlightPaint,
} from './utils/animateDice';

function App() {
  const [screen, setScreen] = useState<'title' | 'rule' | 'game'>('title');
  const [shaking, setShaking] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [removedChanged, setRemovedChanged] = useState(false);
  const [diceEffects, setDiceEffects] = useState<DiceEffect[]>([]);
  // Incoming dice counts for slide-in animation
  const [p1Incoming, setP1Incoming] = useState(0);
  const [p2Incoming, setP2Incoming] = useState(0);
  const prevRemovedRef = useRef(0);
  const animatingRef = useRef(false);

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

  // When phase becomes 'resolving_normal':
  // 1. Animate 1s (fade out via DOM)
  // 2. Animate 6s (slide out via DOM)
  // 3. Update state (resolveNormal)
  // 4. Show incoming dice (React state + CSS animation)
  // 5. Clear incoming dice
  useEffect(() => {
    if (state.phase !== 'resolving_normal') return;
    if (animatingRef.current) return;
    animatingRef.current = true;

    const p1Roll = state.player1.currentRoll;
    const p2Roll = state.player2.currentRoll;
    const p1SixCount = p1Roll.filter(d => d === 6).length;
    const p2SixCount = p2Roll.filter(d => d === 6).length;
    const hasOnes = p1Roll.some(d => d === 1) || p2Roll.some(d => d === 1);
    const hasSixes = p1SixCount > 0 || p2SixCount > 0;

    // Show colored highlights on 1s and 6s
    setShowEffects(true);

    // No special dice — resolve immediately
    if (!hasOnes && !hasSixes) {
      animatingRef.current = false;
      resolveNormal();
      return;
    }

    const run = async () => {
      try {
        // Wait for React to flush setShowEffects(true) and browser to paint
        // the highlight colors (orange for 6, gray for 1) BEFORE moving dice.
        // Without this, highlights and animation start in the same frame.
        await waitForHighlightPaint();

        // Step 1: Animate 1s (ghost/remove) — all in parallel
        const ghostPromises: Promise<void>[] = [];
        p1Roll.forEach((d, i) => {
          if (d === 1) ghostPromises.push(animateDiceRemove(`p1-dice-${i}`));
        });
        p2Roll.forEach((d, i) => {
          if (d === 1) ghostPromises.push(animateDiceRemove(`p2-dice-${i}`));
        });
        if (ghostPromises.length > 0) {
          await Promise.all(ghostPromises);
        }

        // Step 2: Animate 6s (slide out toward center) — all in parallel
        // P1 (bottom) slides UP, P2 (top) slides DOWN
        const transferPromises: Promise<void>[] = [];
        p1Roll.forEach((d, i) => {
          if (d === 6) transferPromises.push(animateDiceTransferOut(`p1-dice-${i}`, 'up'));
        });
        p2Roll.forEach((d, i) => {
          if (d === 6) transferPromises.push(animateDiceTransferOut(`p2-dice-${i}`, 'down'));
        });
        if (transferPromises.length > 0) {
          await Promise.all(transferPromises);
        }

        // Step 3: Update state (diceCount changes)
        resolveNormal();

        // Step 4: Show incoming dice with slide-in animation
        // P1's 6s → incoming to P2's area (slide in from bottom, since P1 is below)
        // P2's 6s → incoming to P1's area (slide in from top, since P2 is above)
        if (p1SixCount > 0) setP2Incoming(p1SixCount);
        if (p2SixCount > 0) setP1Incoming(p2SixCount);

        // Step 5: Wait for incoming animation to complete, then clear
        if (hasSixes) {
          await waitMs(350);
          setP1Incoming(0);
          setP2Incoming(0);
        }
      } finally {
        animatingRef.current = false;
      }
    };

    run();

    // Fallback: if animation takes too long, force resolve
    const fallback = setTimeout(() => {
      if (animatingRef.current) {
        animatingRef.current = false;
        setP1Incoming(0);
        setP2Incoming(0);
        resolveNormal();
      }
    }, 1200);

    return () => clearTimeout(fallback);
  }, [state.phase, state.turn, state.player1.currentRoll, state.player2.currentRoll, resolveNormal]);

  // Reset inline animation styles only AFTER React has re-rendered with new dice.
  // When ROLL_DICE fires, animationPhase becomes 'rolling' and currentRoll changes
  // in the same render batch. The useEffect runs after DOM commit, so stale inline
  // styles (visibility:hidden etc.) are safely cleared on the reused DOM nodes.
  // The dice-roll CSS animation starts at opacity:0 so no flash occurs.
  useEffect(() => {
    if (state.animationPhase === 'rolling') {
      resetDiceStyles();
    }
  }, [state.animationPhase]);

  // Screen shake on roll
  const handleRoll = useCallback(() => {
    if (state.phase === 'waiting') {
      setShaking(true);
      setShowEffects(false);
      setP1Incoming(0);
      setP2Incoming(0);
      // NOTE: Do NOT call resetDiceStyles() here — the old dice are still in DOM
      // with visibility:hidden. Clearing now would flash them for one frame.
      // Styles are reset in the useEffect above after ROLL_DICE re-renders.
      setTimeout(() => setShaking(false), 150);
      rollAndProcess();
    }
  }, [state.phase, rollAndProcess]);

  // Spacebar shortcut to roll dice
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.phase === 'waiting') {
          handleRoll();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, handleRoll]);

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
  const isCpuMode = state.mode === 'cpu';
  const isCpuTurn = isCpuMode && currentChoice?.player === 2;
  const showingChoice = (state.phase === 'resolving_choice_p1' || state.phase === 'resolving_choice_p2') && currentChoice && !isCpuTurn;

  // Auto-resolve CPU choices after a short delay
  useEffect(() => {
    if (!isCpuTurn) return;
    if (state.phase !== 'resolving_choice_p2') return;

    const timer = setTimeout(() => {
      const cpuChoice = cpuController.resolveChoice(currentChoice, state);
      if (cpuChoice) {
        handleChoice(2, cpuChoice);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state.phase, state.currentChoiceIndex, isCpuTurn, currentChoice, state, handleChoice]);

  const handleGoToTitle = useCallback(() => {
    restartMatch();
    setScreen('title');
  }, [restartMatch]);

  const getPlayerName = (id: number) => id === 1 ? state.player1.name : state.player2.name;

  // Compute per-die highlights (colors only, animation handled by DOM/CSS)
  const p1Highlights: DieHighlight[] | undefined = showEffects
    ? computeDiceHighlights(state.player1.currentRoll)
    : undefined;
  const p2Highlights: DieHighlight[] | undefined = showEffects
    ? computeDiceHighlights(state.player2.currentRoll)
    : undefined;

  const handleStart = useCallback((mode: GameMode) => {
    restartMatch(mode);
    setScreen('game');
  }, [restartMatch]);

  if (screen === 'title') {
    return <TitleScreen onStart={handleStart} onShowRules={() => setScreen('rule')} />;
  }

  if (screen === 'rule') {
    return <RuleScreen onBack={() => setScreen('title')} />;
  }

  const isInstantWin = state.instantWinCondition !== null &&
    (state.phase === 'round_end' || state.phase === 'match_end');

  return (
    <div className={`min-h-[100dvh] bg-navy-900 text-cream flex flex-col overflow-hidden relative ${shaking ? 'animate-screen-shake' : ''}`}>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 text-4xl opacity-10 animate-float">👻</div>
        <div className="absolute top-1/4 right-8 text-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>💀</div>
        <div className="absolute bottom-1/4 left-10 text-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>🏴‍☠️</div>
        <div className="absolute bottom-20 right-5 text-4xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>⚓</div>
      </div>

      {/* Player 2 area (top) */}
      <div className="flex-1 flex flex-col justify-end border-b border-teal-600/20">
        <PlayerArea
          player={state.player2}
          removedPool={state.removedPool}
          isRolling={state.animationPhase === 'rolling'}
          highlights={p2Highlights}
          removedChanged={removedChanged}
          inverted={!isCpuMode}
          isCpu={isCpuMode}
          diceIdPrefix="p2-dice"
          incomingCount={p2Incoming}
          incomingAnimClass={p2Incoming > 0 ? 'animate-die-incoming-from-bottom' : undefined}
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

          {isCpuTurn && (
            <div className="px-6 py-2 rounded-lg font-pirate text-lg text-ghost-orange animate-pulse">
              CPUが選択中...
            </div>
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

      {/* Player 1 area (bottom) */}
      <div className="flex-1 flex flex-col justify-start border-t border-teal-600/20">
        <PlayerArea
          player={state.player1}
          removedPool={state.removedPool}
          isRolling={state.animationPhase === 'rolling'}
          highlights={p1Highlights}
          removedChanged={removedChanged}
          diceIdPrefix="p1-dice"
          incomingCount={p1Incoming}
          incomingAnimClass={p1Incoming > 0 ? 'animate-die-incoming-from-top' : undefined}
        />
      </div>

      {/* Special choice effect overlay (curse, swap only) */}
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
          instantWinCondition={state.instantWinCondition}
          instantWinDice={state.instantWinDice}
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
          instantWinCondition={state.instantWinCondition}
          instantWinDice={state.instantWinDice}
        />
      )}
    </div>
  );
}

export default App;
