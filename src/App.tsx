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
import type { DieHighlight, GameMode, PlayerId } from './types/game';
import { computeDiceHighlights } from './utils/dice';
import { cpuController } from './controllers/playerControllers';
import {
  animateDiceRemove,
  animateDiceTransferOut,
  resetDiceStyles,
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

  // Special effect announcement overlay
  const [specialAnnouncement, setSpecialAnnouncement] = useState<string | null>(null);
  const announcementShownTurnRef = useRef<number>(-1);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-die rolling state for staggered stop animation
  const [p1RollingDice, setP1RollingDice] = useState<boolean[]>([]);
  const [p2RollingDice, setP2RollingDice] = useState<boolean[]>([]);
  const p1StopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const p2StopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Track whether the "both rolled" advance has fired for this turn
  const advancedRef = useRef(false);

  const {
    state,
    rollPlayer,
    showResults,
    checkInstantWin,
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

  // ---------------------------------------------------------------------------
  // Individual roll handler
  // ---------------------------------------------------------------------------
  const handlePlayerRoll = useCallback((player: PlayerId) => {
    if (state.phase !== 'waiting') return;
    if (player === 1 && state.p1Rolled) return;
    if (player === 2 && state.p2Rolled) return;

    // First roll of the turn — clear stale styles from previous turn
    const isFirstRoll = !state.p1Rolled && !state.p2Rolled;
    if (isFirstRoll) {
      resetDiceStyles();
      setShowEffects(false);
      setP1Incoming(0);
      setP2Incoming(0);
      advancedRef.current = false;
    }

    // Screen shake
    setShaking(true);
    setTimeout(() => setShaking(false), 150);

    // Dispatch roll — generates dice values in state
    rollPlayer(player);

    // Start staggered dice stop animation
    const diceCount = player === 1 ? state.player1.diceCount : state.player2.diceCount;
    const setRollingDice = player === 1 ? setP1RollingDice : setP2RollingDice;
    const timersRef = player === 1 ? p1StopTimersRef : p2StopTimersRef;

    // All dice start spinning
    setRollingDice(Array(diceCount).fill(true));

    // Clear any existing timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Generate random stop times (200–600ms), each die stops independently
    for (let i = 0; i < diceCount; i++) {
      const delay = 200 + Math.random() * 400;
      const timer = setTimeout(() => {
        setRollingDice(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
      }, delay);
      timersRef.current.push(timer);
    }
  }, [state.phase, state.p1Rolled, state.p2Rolled, state.player1.diceCount, state.player2.diceCount, rollPlayer]);

  // ---------------------------------------------------------------------------
  // Detect when both players have rolled AND all dice have stopped
  // → advance to SHOW_RESULTS → CHECK_INSTANT_WIN
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'waiting') return;
    if (!state.p1Rolled || !state.p2Rolled) return;
    if (advancedRef.current) return;

    const p1AllStopped = p1RollingDice.length > 0 && p1RollingDice.every(r => !r);
    const p2AllStopped = p2RollingDice.length > 0 && p2RollingDice.every(r => !r);

    if (p1AllStopped && p2AllStopped) {
      advancedRef.current = true;
      // Brief pause to let the user see final dice, then advance
      setTimeout(() => {
        showResults();
        setTimeout(() => checkInstantWin(), 500);
      }, 300);
    }
  }, [state.phase, state.p1Rolled, state.p2Rolled, p1RollingDice, p2RollingDice, showResults, checkInstantWin]);

  // ---------------------------------------------------------------------------
  // CPU auto-roll: after P1 rolls and all P1 dice stop, CPU rolls after 500ms
  // ---------------------------------------------------------------------------
  const isCpuMode = state.mode === 'cpu';

  useEffect(() => {
    if (!isCpuMode) return;
    if (state.phase !== 'waiting') return;
    if (!state.p1Rolled || state.p2Rolled) return;

    // Wait for P1 dice to finish stopping
    const p1AllStopped = p1RollingDice.length > 0 && p1RollingDice.every(r => !r);
    if (!p1AllStopped) return;

    const timer = setTimeout(() => handlePlayerRoll(2), 500);
    return () => clearTimeout(timer);
  }, [isCpuMode, state.phase, state.p1Rolled, state.p2Rolled, p1RollingDice, handlePlayerRoll]);

  // ---------------------------------------------------------------------------
  // Spacebar shortcut: rolls P1
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.phase === 'waiting' && !state.p1Rolled) {
          handlePlayerRoll(1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.p1Rolled, handlePlayerRoll]);

  // ---------------------------------------------------------------------------
  // Resolving normal effects (1s and 6s animation)
  // ---------------------------------------------------------------------------
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

        // Step 3: Show incoming dice BEFORE resolving state
        if (p1SixCount > 0) setP2Incoming(p1SixCount);
        if (p2SixCount > 0) setP1Incoming(p2SixCount);

        // Step 4: Update state (diceCount changes, phase → waiting)
        resolveNormal();
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

  // Clear incoming dice indicators when the round/match ends
  useEffect(() => {
    if (state.phase === 'round_end' || state.phase === 'match_end') {
      setP1Incoming(0);
      setP2Incoming(0);
      setShowEffects(false);
      resetDiceStyles();
      setP1RollingDice([]);
      setP2RollingDice([]);
    }
  }, [state.phase]);

  // ---------------------------------------------------------------------------
  // Special effect announcement overlay
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const isChoicePhase =
      state.phase === 'resolving_priority' ||
      state.phase === 'resolving_choice_p1' ||
      state.phase === 'resolving_choice_p2';
    if (!isChoicePhase) return;
    if (announcementShownTurnRef.current === state.turn) return;
    if (state.pendingChoices.length === 0) return;

    announcementShownTurnRef.current = state.turn;

    const effectLabels: Record<string, string> = {
      swap_all: '👻 2×3 入れ替え発動！',
      add_removed_3: '💀 3×3 呪い発動！除外済み3個が相手に！',
      add_removed_4: '⚓ 4×3 大呪い発動！除外済み4個が相手に！',
      five_choice: '🏴‍☠️ 5×3 選択発動！',
    };

    const texts = state.pendingChoices
      .map(c => effectLabels[c.effect.type])
      .filter(Boolean);
    if (texts.length === 0) return;

    // Clear any existing timer before starting a new one
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);

    setSpecialAnnouncement(texts.join('\n'));
    announcementTimerRef.current = setTimeout(() => {
      setSpecialAnnouncement(null);
      announcementTimerRef.current = null;
    }, 1500);
    // Do NOT return cleanup — the timer must survive re-renders from dependency changes
  }, [state.phase, state.turn, state.pendingChoices]);

  // Force-clear announcement when phase returns to waiting or round/match ends
  useEffect(() => {
    if (state.phase === 'waiting' || state.phase === 'resolving_normal' || state.phase === 'round_end' || state.phase === 'match_end') {
      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
        announcementTimerRef.current = null;
      }
      setSpecialAnnouncement(null);
    }
  }, [state.phase]);

  // ---------------------------------------------------------------------------
  // Choice handling
  // ---------------------------------------------------------------------------
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
  const isCpuTurn = isCpuMode && currentChoice?.player === 2;
  const showingChoice = (state.phase === 'resolving_choice_p1' || state.phase === 'resolving_choice_p2') && currentChoice && !isCpuTurn && !specialAnnouncement;

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

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------
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

  // Roll button visibility:
  // P1 can roll when phase is 'waiting' and hasn't rolled yet
  // P2 can roll when phase is 'waiting' and hasn't rolled yet (and not CPU)
  const p1CanRoll = state.phase === 'waiting' && !state.p1Rolled;
  const p2CanRoll = state.phase === 'waiting' && !state.p2Rolled && !isCpuMode;

  // Dice unrevealed: show "?" when opponent hasn't rolled yet
  // In non-waiting phases (showing_results, resolving_*), both are revealed
  const p1Unrevealed = state.phase === 'waiting' && !state.p1Rolled;
  const p2Unrevealed = state.phase === 'waiting' && !state.p2Rolled;

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
          rollingMask={p2RollingDice.length > 0 ? p2RollingDice : undefined}
          highlights={p2Highlights}
          removedChanged={removedChanged}
          inverted={!isCpuMode}
          isCpu={isCpuMode}
          diceIdPrefix="p2-dice"
          incomingCount={p2Incoming}
          incomingAnimClass={p2Incoming > 0 ? 'animate-die-incoming-from-bottom' : undefined}
          unrevealed={p2Unrevealed}
          canRoll={p2CanRoll}
          hasRolled={state.p2Rolled}
          onRoll={() => handlePlayerRoll(2)}
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

        <GameLog
          log={state.log}
          turn={state.turn}
          player1Name={state.player1.name}
          player2Name={state.player2.name}
          player1Roll={state.p1Rolled ? state.player1.currentRoll : []}
          player2Roll={state.p2Rolled ? state.player2.currentRoll : []}
        />

        {/* Center action area — priority dice / CPU choosing only */}
        <div className="flex justify-center h-[40px] items-center">
          {isCpuTurn ? (
            <div className="px-6 py-2 rounded-lg font-pirate text-lg text-ghost-orange animate-pulse">
              CPUが選択中...
            </div>
          ) : state.phase === 'resolving_priority' && !specialAnnouncement ? (
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
          ) : null}
        </div>
      </div>

      {/* Player 1 area (bottom) */}
      <div className="flex-1 flex flex-col justify-start border-t border-teal-600/20">
        <PlayerArea
          player={state.player1}
          removedPool={state.removedPool}
          rollingMask={p1RollingDice.length > 0 ? p1RollingDice : undefined}
          highlights={p1Highlights}
          removedChanged={removedChanged}
          diceIdPrefix="p1-dice"
          incomingCount={p1Incoming}
          incomingAnimClass={p1Incoming > 0 ? 'animate-die-incoming-from-top' : undefined}
          unrevealed={p1Unrevealed}
          canRoll={p1CanRoll}
          hasRolled={state.p1Rolled}
          onRoll={() => handlePlayerRoll(1)}
        />
      </div>

      {/* Special effect announcement overlay */}
      {specialAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/80 pointer-events-auto">
          <div className="text-center space-y-2 animate-instant-win-text">
            {specialAnnouncement.split('\n').map((line, i) => (
              <p key={i} className="text-2xl sm:text-3xl font-pirate text-ghost-orange drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

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
