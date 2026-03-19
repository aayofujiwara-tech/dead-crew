import { useCallback, useState, useEffect, useRef } from 'react';
import { useThreePlayerGame } from '../hooks/useThreePlayerGame';
import PlayerArea from './PlayerArea';
import TargetChoiceDialog from './TargetChoiceDialog';
import VictoryScreen from './VictoryScreen';
import type { DieHighlight, PlayerId } from '../types/game';
import {
  resetDiceStyles,
} from '../utils/animateDice';

interface ThreePlayerGameProps {
  names: [string, string, string];
  onGoToTitle: () => void;
  /** Which players are CPU-controlled */
  cpuPlayers?: PlayerId[];
}

/** CPU picks the opponent with the most dice; random on tie */
function cpuPickTarget(
  actorId: PlayerId,
  players: readonly [{ id: PlayerId; diceCount: number }, { id: PlayerId; diceCount: number }, { id: PlayerId; diceCount: number }],
): PlayerId {
  const opponents = players.filter(p => p.id !== actorId);
  if (opponents[0].diceCount > opponents[1].diceCount) return opponents[0].id;
  if (opponents[1].diceCount > opponents[0].diceCount) return opponents[1].id;
  return Math.random() < 0.5 ? opponents[0].id : opponents[1].id;
}

/** Compute dice highlights for 3-player mode: 1=ghost, 4=triple(teal), 6=push(orange) */
function computeHighlights3P(dice: number[]): DieHighlight[] {
  return dice.map(v => {
    if (v === 1) return 'ghost';
    if (v === 4) return 'triple';
    if (v === 6) return 'push';
    return 'normal';
  });
}

export default function ThreePlayerGame({ names, onGoToTitle, cpuPlayers = [] }: ThreePlayerGameProps) {
  const cpuSet = new Set(cpuPlayers);
  const isCpuPlayer = (id: PlayerId) => cpuSet.has(id);
  const {
    state,
    rollPlayer,
    showResults,
    processEffects,
    rollPriority,
    chooseTarget,
    nextRound,
    restart,
  } = useThreePlayerGame(names);

  const containerRef = useRef<HTMLDivElement>(null);
  const [showEffects, setShowEffects] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [removedChanged, setRemovedChanged] = useState(false);
  const prevRemovedRef = useRef(state.removedPool);
  // Per-die rolling state for staggered stop
  const [rollingDice, setRollingDice] = useState<[boolean[], boolean[], boolean[]]>([[], [], []]);
  const stopTimersRef = useRef<ReturnType<typeof setTimeout>[][]>([[], [], []]);
  const advancedRef = useRef(false);

  // Track removed pool changes for bounce animation
  useEffect(() => {
    if (state.removedPool !== prevRemovedRef.current) {
      prevRemovedRef.current = state.removedPool;
      setRemovedChanged(true);
      const t = setTimeout(() => setRemovedChanged(false), 300);
      return () => clearTimeout(t);
    }
  }, [state.removedPool]);

  // -----------------------------------------------------------------------
  // Individual roll handler
  // -----------------------------------------------------------------------
  const handlePlayerRoll = useCallback((player: PlayerId) => {
    if (state.phase !== 'waiting') return;
    const idx = player - 1;
    if (state.rolled[idx]) return;

    const isFirstRoll = !state.rolled[0] && !state.rolled[1] && !state.rolled[2];
    if (isFirstRoll) {
      setShowEffects(false);
      advancedRef.current = false;
    }

    // Screen shake
    const el = containerRef.current;
    if (el) {
      el.classList.remove('animate-screen-shake');
      void el.offsetWidth;
      el.classList.add('animate-screen-shake');
    }

    rollPlayer(player);

    // Staggered dice stop
    const diceCount = state.players[idx].diceCount;
    const newRolling = [...rollingDice] as [boolean[], boolean[], boolean[]];
    newRolling[idx] = Array(diceCount).fill(true);
    setRollingDice(newRolling);

    // Clear existing timers
    stopTimersRef.current[idx].forEach(clearTimeout);
    stopTimersRef.current[idx] = [];

    for (let i = 0; i < diceCount; i++) {
      const delay = 200 + Math.random() * 400;
      const timer = setTimeout(() => {
        setRollingDice(prev => {
          const next = [...prev] as [boolean[], boolean[], boolean[]];
          const arr = [...next[idx]];
          arr[i] = false;
          next[idx] = arr;
          return next;
        });
      }, delay);
      stopTimersRef.current[idx].push(timer);
    }
  }, [state.phase, state.rolled, state.players, rollPlayer, rollingDice]);

  // -----------------------------------------------------------------------
  // Detect all players rolled AND all dice stopped → advance
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'waiting') return;
    if (!state.rolled[0] || !state.rolled[1] || !state.rolled[2]) return;
    if (advancedRef.current) return;

    const allStopped = rollingDice.every(
      arr => arr.length > 0 && arr.every(r => !r),
    );

    if (allStopped) {
      advancedRef.current = true;
      setTimeout(() => {
        showResults();
        setTimeout(() => processEffects(), 500);
      }, 300);
    }
  }, [state.phase, state.rolled, rollingDice, showResults, processEffects]);

  // -----------------------------------------------------------------------
  // Animate 1s removal during showing_results → resolving phase
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (state.phase !== 'showing_results') return;

    // Show highlights briefly before processing
    setShowEffects(true);
  }, [state.phase]);

  // -----------------------------------------------------------------------
  // Handle animation when effects are being processed
  // (1s are already applied in state by PROCESS_EFFECTS, but we animate beforehand)
  // -----------------------------------------------------------------------
  // We animate the 1s removal in the showing_results → process_effects transition.
  // Since PROCESS_EFFECTS handles 1s in the reducer, we show highlights during showing_results.

  // -----------------------------------------------------------------------
  // Clear state on round/match end
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (state.phase === 'round_end' || state.phase === 'match_end') {
      setShowEffects(false);
      resetDiceStyles();
      setRollingDice([[], [], []]);
    }
  }, [state.phase]);

  // -----------------------------------------------------------------------
  // Spacebar shortcut: rolls P1
  // -----------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.phase === 'waiting' && !state.rolled[0]) {
          handlePlayerRoll(1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.rolled, handlePlayerRoll]);

  // -----------------------------------------------------------------------
  // CPU auto-roll: after a human rolls and dice stop, CPUs roll with stagger
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (cpuSet.size === 0) return;
    if (state.phase !== 'waiting') return;

    // Need at least one human to have rolled
    const anyHumanRolled = ([1, 2, 3] as PlayerId[]).some(
      id => !isCpuPlayer(id) && state.rolled[id - 1],
    );
    if (!anyHumanRolled) return;

    // Wait for all rolled players' dice to stop
    for (let i = 0; i < 3; i++) {
      if (state.rolled[i]) {
        const allStopped = rollingDice[i].length > 0 && rollingDice[i].every(r => !r);
        if (!allStopped) return;
      }
    }

    // Schedule CPU rolls with stagger
    const timers: ReturnType<typeof setTimeout>[] = [];
    const unrolledCpus = cpuPlayers.filter(id => !state.rolled[id - 1]);
    unrolledCpus.forEach((id, idx) => {
      const delay = 500 + idx * 300; // 500ms, 800ms, ...
      timers.push(setTimeout(() => handlePlayerRoll(id), delay));
    });

    return () => timers.forEach(clearTimeout);
  }, [cpuPlayers, cpuSet.size, state.phase, state.rolled, rollingDice, handlePlayerRoll]);

  // -----------------------------------------------------------------------
  // CPU auto-choose target for choice effects
  // -----------------------------------------------------------------------
  const currentChoice = state.choiceQueue[state.currentChoiceIndex];
  // Only treat as CPU choice turn during resolving_choices (NOT during resolving_priority)
  const isCpuChoiceTurn =
    currentChoice != null &&
    isCpuPlayer(currentChoice.player) &&
    state.phase === 'resolving_choices';
  // Check if all players with pending choices are CPUs (for auto-priority)
  const allChoicersAreCpu =
    cpuSet.size > 0 &&
    state.choiceQueue.length > 0 &&
    [...new Set(state.choiceQueue.map(c => c.player))].every(id => isCpuPlayer(id));
  const isCpuPriority = state.phase === 'resolving_priority' && allChoicersAreCpu;

  useEffect(() => {
    if (!isCpuChoiceTurn || !currentChoice) return;

    const timer = setTimeout(() => {
      const target = cpuPickTarget(currentChoice.player, state.players);
      chooseTarget(target);
    }, 500);
    return () => clearTimeout(timer);
  }, [isCpuChoiceTurn, state.currentChoiceIndex, state.players, chooseTarget, currentChoice]);

  // -----------------------------------------------------------------------
  // CPU auto-priority roll (when all players with choices are CPUs)
  // Uses state.log.length as dep to re-fire on tie (tie adds logs but keeps same phase/queue)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isCpuPriority) return;

    const timer = setTimeout(() => rollPriority(), 700);
    return () => clearTimeout(timer);
  }, [isCpuPriority, rollPriority, state.log.length]);

  // -----------------------------------------------------------------------
  // Fallback: force CPU choice if resolving_choices is stuck for 2 seconds
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isCpuChoiceTurn || !currentChoice) return;

    const fallback = setTimeout(() => {
      const target = cpuPickTarget(currentChoice.player, state.players);
      chooseTarget(target);
    }, 2000);
    return () => clearTimeout(fallback);
  }, [isCpuChoiceTurn, state.currentChoiceIndex, state.players, chooseTarget, currentChoice]);

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  const handleGoToTitle = useCallback(() => {
    onGoToTitle();
  }, [onGoToTitle]);

  // Highlights
  const highlights = state.players.map(p =>
    showEffects ? computeHighlights3P(p.currentRoll) : undefined,
  );

  // Current choice info — currentChoice and isCpuChoiceTurn declared above
  const showTargetDialog =
    state.phase === 'resolving_choices' && currentChoice != null && !isCpuChoiceTurn;

  // Count remaining choices of same type for same player
  const choiceRemaining = currentChoice
    ? state.choiceQueue
        .slice(state.currentChoiceIndex)
        .filter(
          c =>
            c.player === currentChoice.player &&
            c.effectType === currentChoice.effectType,
        ).length
    : 0;

  // Roll buttons — CPU players can't roll manually
  const canRoll = state.players.map(
    (p, i) => state.phase === 'waiting' && !state.rolled[i] && !isCpuPlayer(p.id),
  );

  // Unrevealed
  const unrevealed = state.players.map(
    (_, i) => state.phase === 'waiting' && !state.rolled[i],
  );

  // Game log: current turn entries
  const currentTurnLogs = state.log.filter(e => e.turn === state.turn);

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] bg-navy-900 text-cream flex flex-col overflow-hidden relative"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 text-4xl opacity-10 animate-float">👻</div>
        <div className="absolute top-1/4 right-8 text-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>💀</div>
        <div className="absolute bottom-1/4 left-10 text-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>🏴‍☠️</div>
      </div>

      {/* Go to title button */}
      <button
        onClick={() => setShowQuitConfirm(true)}
        className="
          absolute top-2 left-2 z-30
          w-8 h-8 rounded-lg flex items-center justify-center
          bg-navy-800/60 text-teal-400/50 border border-teal-600/20
          hover:bg-navy-700 hover:text-teal-400 hover:border-teal-600/40
          transition-all duration-150 text-sm
        "
        title="タイトルに戻る"
      >
        ⚓
      </button>

      {/* Player 2 area (top) — inverted */}
      <div className="flex-1 flex flex-col justify-end border-b border-teal-600/20 min-h-0">
        <PlayerArea
          player={state.players[1]}
          removedPool={state.removedPool}
          rollingMask={rollingDice[1].length > 0 ? rollingDice[1] : undefined}
          highlights={highlights[1]}
          removedChanged={removedChanged}
          inverted
          isCpu={isCpuPlayer(2)}
          diceIdPrefix="p2-dice"
          unrevealed={unrevealed[1]}
          canRoll={canRoll[1]}
          hasRolled={state.rolled[1]}
          onRoll={() => handlePlayerRoll(2)}
        />
      </div>

      {/* Player 3 area (middle) — inverted */}
      <div className="flex-1 flex flex-col justify-end border-b border-teal-600/20 min-h-0">
        <PlayerArea
          player={state.players[2]}
          removedPool={state.removedPool}
          rollingMask={rollingDice[2].length > 0 ? rollingDice[2] : undefined}
          highlights={highlights[2]}
          removedChanged={removedChanged}
          inverted
          isCpu={isCpuPlayer(3)}
          diceIdPrefix="p3-dice"
          unrevealed={unrevealed[2]}
          canRoll={canRoll[2]}
          hasRolled={state.rolled[2]}
          onRoll={() => handlePlayerRoll(3)}
        />
      </div>

      {/* Center area */}
      <div className="flex-shrink-0 py-1 px-3 space-y-1 bg-navy-800/50 border-y border-teal-600/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-teal-400">
            ラウンド <strong className="text-cream">{state.round}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-ghost-orange text-xs">除外済み:</span>
            <strong
              className={`text-ghost-orange text-sm ${removedChanged ? 'animate-counter-bounce' : ''}`}
            >
              {state.removedPool}
            </strong>
            <span className="text-ghost-orange text-xs">個</span>
            {state.removedPool > 0 && (
              <span className="flex ml-0.5">
                {Array.from(
                  { length: Math.min(state.removedPool, 8) },
                  (_, i) => (
                    <span key={i} className="text-[10px] opacity-40 -ml-0.5">
                      👻
                    </span>
                  ),
                )}
                {state.removedPool > 8 && (
                  <span className="text-[10px] opacity-40">+</span>
                )}
              </span>
            )}
          </span>
          <span className="text-teal-400">
            ターン <strong className="text-cream">{state.turn}</strong>
          </span>
        </div>

        {/* Simple log for 3-player */}
        <div className="w-full bg-navy-900/50 rounded-lg border border-teal-600/20 overflow-hidden">
          <div className="h-[48px] overflow-y-auto px-2 py-0.5 text-[11px] leading-snug">
            {currentTurnLogs.map(entry => (
              <div key={entry.id} className="text-cream/70 truncate">
                {entry.message}
              </div>
            ))}
            {currentTurnLogs.length === 0 && (
              <div className="text-teal-600/40 text-center pt-1">
                3人対戦モード
              </div>
            )}
          </div>
        </div>

        {/* Priority roll button / CPU choosing indicator */}
        <div className="flex justify-center h-[28px] items-center">
          {isCpuPriority ? (
            <div className="px-4 py-1 rounded-lg font-pirate text-base text-ghost-orange animate-pulse">
              CPUが優先度を決定中...
            </div>
          ) : state.phase === 'resolving_priority' ? (
            <button
              onClick={rollPriority}
              className="
                px-4 py-1 rounded-lg font-pirate text-base
                bg-ghost-orange text-navy-900
                hover:bg-orange-400 transition-all duration-75
              "
            >
              優先度ダイスを振る！
            </button>
          ) : isCpuChoiceTurn ? (
            <div className="px-4 py-1 rounded-lg font-pirate text-base text-ghost-orange animate-pulse">
              CPUが選択中...
            </div>
          ) : null}
        </div>
      </div>

      {/* Player 1 area (bottom) */}
      <div className="flex-1 flex flex-col justify-start border-t border-teal-600/20 min-h-0">
        <PlayerArea
          player={state.players[0]}
          removedPool={state.removedPool}
          rollingMask={rollingDice[0].length > 0 ? rollingDice[0] : undefined}
          highlights={highlights[0]}
          removedChanged={removedChanged}
          diceIdPrefix="p1-dice"
          unrevealed={unrevealed[0]}
          canRoll={canRoll[0]}
          hasRolled={state.rolled[0]}
          onRoll={() => handlePlayerRoll(1)}
        />
      </div>

      {/* Target choice dialog */}
      {showTargetDialog && (
        <TargetChoiceDialog
          choice={currentChoice}
          players={state.players}
          removedPool={state.removedPool}
          remaining={choiceRemaining}
          onChoose={chooseTarget}
        />
      )}

      {/* Round end screen */}
      {state.phase === 'round_end' && (
        <VictoryScreen
          type="round"
          winner={state.winner}
          isDraw={state.isDraw}
          winnerName={state.winner ? state.players[state.winner - 1].name : ''}
          onNext={nextRound}
          isInstantWin={false}
        />
      )}

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-navy-800 border border-teal-600/30 rounded-2xl px-6 py-5 max-w-xs w-full mx-4 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <p className="font-pirate text-xl text-ghost-orange mb-2">
              タイトルに戻りますか？
            </p>
            <p className="text-teal-400/70 text-sm mb-5">
              現在のゲームの進行状況は失われます
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="
                  px-5 py-2 rounded-xl font-pirate text-base
                  bg-navy-700 text-cream/60 border border-teal-600/30
                  hover:bg-navy-600 hover:text-cream transition-all duration-150
                "
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  handleGoToTitle();
                }}
                className="
                  px-5 py-2 rounded-xl font-pirate text-base
                  bg-ghost-orange text-navy-900
                  hover:bg-orange-400 transition-all duration-150
                "
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match end screen */}
      {state.phase === 'match_end' && (
        <VictoryScreen
          type="match"
          winner={state.matchWinner}
          isDraw={false}
          winnerName={
            state.matchWinner ? state.players[state.matchWinner - 1].name : ''
          }
          onNext={() => restart(names)}
          onGoToTitle={handleGoToTitle}
          isInstantWin={false}
        />
      )}
    </div>
  );
}
