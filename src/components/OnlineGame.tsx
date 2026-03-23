import { useCallback, useState, useEffect, useRef } from 'react';
import { useOnlineGame } from '../hooks/useOnlineGame';
import type { OnlineRole } from '../hooks/useOnlineGame';
import PlayerArea from './PlayerArea';
import GameLog from './GameLog';
import ChoiceDialog from './ChoiceDialog';
import VictoryScreen from './VictoryScreen';
import DiceEffects, { nextEffectId } from './DiceEffects';
import type { DiceEffect } from './DiceEffects';
import type { DieHighlight } from '../types/game';
import { computeDiceHighlights } from '../utils/dice';
import {
  animateDiceRemove,
  animateDiceTransferOut,
  resetDiceStyles,
  waitForHighlightPaint,
} from '../utils/animateDice';

interface OnlineGameProps {
  roomCode: string;
  role: OnlineRole;
  myName: string;
  opponentName: string;
  onGoToTitle: () => void;
}

export default function OnlineGame({
  roomCode,
  role,
  myName,
  opponentName,
  onGoToTitle,
}: OnlineGameProps) {
  const {
    state,
    isHost,
    connected,
    opponentDisconnected,
    roll,
    makeChoice,
    rollPriority,
    nextRound,
    restartMatch,
  } = useOnlineGame(roomCode, role, myName, opponentName);

  const containerRef = useRef<HTMLDivElement>(null);
  const [showEffects, setShowEffects] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [removedChanged, setRemovedChanged] = useState(false);
  const [diceEffects, setDiceEffects] = useState<DiceEffect[]>([]);
  const [p1Incoming, setP1Incoming] = useState(0);
  const [p2Incoming, setP2Incoming] = useState(0);
  const prevRemovedRef = useRef(0);
  const animatingRef = useRef(false);

  // Special effect announcement overlay
  const [specialAnnouncement, setSpecialAnnouncement] = useState<string | null>(null);
  const announcementShownTurnRef = useRef(-1);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-die rolling state for staggered stop animation
  const [p1RollingDice, setP1RollingDice] = useState<boolean[]>([]);
  const [p2RollingDice, setP2RollingDice] = useState<boolean[]>([]);
  const p1StopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const p2StopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // In online mode, both players are "me" at bottom, "opponent" at top.
  // If host: p1 is bottom, p2 is top
  // If guest: p2 is bottom, p1 is top
  const myPlayer = isHost ? state.player1 : state.player2;
  const oppPlayer = isHost ? state.player2 : state.player1;
  const myPrefix = isHost ? 'p1-dice' : 'p2-dice';
  const oppPrefix = isHost ? 'p2-dice' : 'p1-dice';

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
  // Detect when both rolled → trigger dice spinning animation
  // ---------------------------------------------------------------------------
  const lastAnimatedTurnRef = useRef(-1);
  useEffect(() => {
    if (!state.p1Rolled || !state.p2Rolled) return;
    if (lastAnimatedTurnRef.current === state.turn) return;
    lastAnimatedTurnRef.current = state.turn;

    // Clear stale state
    setShowEffects(false);
    setP1Incoming(0);
    setP2Incoming(0);

    // Screen shake
    const el = containerRef.current;
    if (el) {
      el.classList.remove('animate-screen-shake');
      void el.offsetWidth;
      el.classList.add('animate-screen-shake');
    }

    // Start dice animation for both players
    const startAnim = (count: number, setRolling: typeof setP1RollingDice, timers: typeof p1StopTimersRef) => {
      setRolling(Array(count).fill(true));
      timers.current.forEach(clearTimeout);
      timers.current = [];
      for (let i = 0; i < count; i++) {
        const delay = 200 + Math.random() * 400;
        const timer = setTimeout(() => {
          setRolling(prev => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
        }, delay);
        timers.current.push(timer);
      }
    };

    startAnim(state.player1.diceCount, setP1RollingDice, p1StopTimersRef);
    startAnim(state.player2.diceCount, setP2RollingDice, p2StopTimersRef);
  }, [state.p1Rolled, state.p2Rolled, state.turn, state.player1.diceCount, state.player2.diceCount]);

  // ---------------------------------------------------------------------------
  // My roll button handler
  // ---------------------------------------------------------------------------
  const handleMyRoll = useCallback(() => {
    if (state.phase !== 'waiting') return;
    const myRolled = isHost ? state.p1Rolled : state.p2Rolled;
    if (myRolled) return;
    roll();
  }, [state.phase, state.p1Rolled, state.p2Rolled, isHost, roll]);

  // Spacebar shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleMyRoll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMyRoll]);

  // ---------------------------------------------------------------------------
  // Resolving normal effects animation
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

    setShowEffects(true);

    if (!hasOnes && !hasSixes) {
      animatingRef.current = false;
      resetDiceStyles();
      setP1RollingDice([]);
      setP2RollingDice([]);
      return;
    }

    const run = async () => {
      try {
        await waitForHighlightPaint();

        const ghostPromises: Promise<void>[] = [];
        p1Roll.forEach((d, i) => {
          if (d === 1) ghostPromises.push(animateDiceRemove(`p1-dice-${i}`));
        });
        p2Roll.forEach((d, i) => {
          if (d === 1) ghostPromises.push(animateDiceRemove(`p2-dice-${i}`));
        });
        if (ghostPromises.length > 0) await Promise.all(ghostPromises);

        const transferPromises: Promise<void>[] = [];
        p1Roll.forEach((d, i) => {
          if (d === 6) transferPromises.push(animateDiceTransferOut(`p1-dice-${i}`, 'up'));
        });
        p2Roll.forEach((d, i) => {
          if (d === 6) transferPromises.push(animateDiceTransferOut(`p2-dice-${i}`, 'down'));
        });
        if (transferPromises.length > 0) await Promise.all(transferPromises);

        if (p1SixCount > 0) setP2Incoming(p1SixCount);
        if (p2SixCount > 0) setP1Incoming(p2SixCount);

        resetDiceStyles();
        setP1Incoming(0);
        setP2Incoming(0);
        setP1RollingDice([]);
        setP2RollingDice([]);
      } finally {
        animatingRef.current = false;
      }
    };

    run();

    const fallback = setTimeout(() => {
      if (animatingRef.current) {
        animatingRef.current = false;
        setP1Incoming(0);
        setP2Incoming(0);
      }
    }, 1200);
    return () => clearTimeout(fallback);
  }, [state.phase, state.turn, state.player1.currentRoll, state.player2.currentRoll]);

  // Clear incoming dice on round/match end
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
      swap_all: '2×3 入れ替え発動！',
      add_removed_3: '3×3 呪い発動！除外済み3個が相手に！',
      add_removed_4: '4×3 大呪い発動！除外済み4個が相手に！',
      five_choice: '5×3 選択発動！',
    };

    const texts = state.pendingChoices.map(c => effectLabels[c.effect.type]).filter(Boolean);
    if (texts.length === 0) return;

    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    setSpecialAnnouncement(texts.join('\n'));
    announcementTimerRef.current = setTimeout(() => {
      setSpecialAnnouncement(null);
      announcementTimerRef.current = null;
    }, 1500);
  }, [state.phase, state.turn, state.pendingChoices]);

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

  // Determine if the current choice belongs to the current player
  const isMyChoice = currentChoice && (
    (isHost && currentChoice.player === 1) ||
    (!isHost && currentChoice.player === 2)
  );
  const showingChoice = (state.phase === 'resolving_choice_p1' || state.phase === 'resolving_choice_p2') && currentChoice && isMyChoice && !specialAnnouncement;

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------
  const getPlayerName = (id: number) => id === 1 ? state.player1.name : state.player2.name;

  const p1Highlights: DieHighlight[] | undefined = showEffects
    ? computeDiceHighlights(state.player1.currentRoll)
    : undefined;
  const p2Highlights: DieHighlight[] | undefined = showEffects
    ? computeDiceHighlights(state.player2.currentRoll)
    : undefined;

  const isInstantWin = state.instantWinCondition !== null &&
    (state.phase === 'round_end' || state.phase === 'match_end');

  // My and opponent's roll state
  const myRolled = isHost ? state.p1Rolled : state.p2Rolled;
  const oppRolled = isHost ? state.p2Rolled : state.p1Rolled;

  // Dice unrevealed
  const p1Unrevealed = state.phase === 'waiting' && !state.p1Rolled;
  const p2Unrevealed = state.phase === 'waiting' && !state.p2Rolled;
  const myUnrevealed = isHost ? p1Unrevealed : p2Unrevealed;
  const oppUnrevealed = isHost ? p2Unrevealed : p1Unrevealed;

  // Can I roll?
  const canRoll = state.phase === 'waiting' && !myRolled;

  // Resolve which rolling/highlight/incoming arrays correspond to my area vs opponent area
  const myRollingDice = isHost ? p1RollingDice : p2RollingDice;
  const oppRollingDice = isHost ? p2RollingDice : p1RollingDice;
  const myHighlights = isHost ? p1Highlights : p2Highlights;
  const oppHighlights = isHost ? p2Highlights : p1Highlights;
  const myIncoming = isHost ? p1Incoming : p2Incoming;
  const oppIncoming = isHost ? p2Incoming : p1Incoming;

  return (
    <div ref={containerRef} className="h-[100dvh] bg-navy-900 text-cream flex flex-col overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 text-4xl opacity-10 animate-float">👻</div>
        <div className="absolute top-1/4 right-8 text-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>💀</div>
        <div className="absolute bottom-1/4 left-10 text-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>🏴‍☠️</div>
        <div className="absolute bottom-20 right-5 text-4xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>⚓</div>
      </div>

      {/* Top bar: quit button + connection indicator + room code */}
      <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between">
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="
            w-8 h-8 rounded-lg flex items-center justify-center
            bg-navy-800/60 text-teal-400/50 border border-teal-600/20
            hover:bg-navy-700 hover:text-teal-400 hover:border-teal-600/40
            transition-all duration-150 text-sm
          "
          title="タイトルに戻る"
        >
          ⚓
        </button>

        <div className="flex items-center gap-2">
          {/* Room code */}
          <span className="text-xs font-pirate text-teal-400/50 bg-navy-800/40 px-2 py-0.5 rounded">
            Room: {roomCode}
          </span>
          {/* Connection indicator */}
          <span
            className={`text-sm ${connected ? '' : ''}`}
            title={connected ? '接続中' : '切断'}
          >
            {connected ? '🟢' : '🔴'}
          </span>
        </div>
      </div>

      {/* Opponent disconnect overlay */}
      {opponentDisconnected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80">
          <div className="bg-navy-800 border border-red-500/50 rounded-2xl px-6 py-5 max-w-xs w-full mx-4 text-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <p className="font-pirate text-xl text-red-400 mb-2">相手が切断しました</p>
            <p className="text-teal-400/70 text-sm mb-5">対戦相手との接続が切れました</p>
            <button
              onClick={onGoToTitle}
              className="
                px-5 py-2 rounded-xl font-pirate text-base
                bg-ghost-orange text-navy-900
                hover:bg-orange-400 transition-all duration-150
              "
            >
              タイトルに戻る
            </button>
          </div>
        </div>
      )}

      {/* Opponent area (top) */}
      <div className="flex-1 flex flex-col justify-end border-b border-teal-600/20 pt-8">
        <PlayerArea
          player={oppPlayer}
          removedPool={state.removedPool}
          rollingMask={oppRollingDice.length > 0 ? oppRollingDice : undefined}
          highlights={oppHighlights}
          removedChanged={removedChanged}
          inverted
          diceIdPrefix={oppPrefix}
          incomingCount={oppIncoming}
          incomingAnimClass={oppIncoming > 0 ? 'animate-die-incoming-from-bottom' : undefined}
          unrevealed={oppUnrevealed}
          canRoll={false}
          hasRolled={oppRolled}
        />
      </div>

      {/* Center area */}
      <div className="flex-shrink-0 py-1.5 sm:py-2 px-3 sm:px-4 space-y-1 sm:space-y-1.5 bg-navy-800/50 border-y border-teal-600/20">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-teal-400">
            ラウンド <strong className="text-cream">{state.round}</strong>
          </span>
          <span className="font-pirate text-base sm:text-lg text-ghost-orange">
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

        {/* Center action area — waiting or priority */}
        <div className="flex justify-center h-[32px] sm:h-[36px] items-center">
          {!isMyChoice && currentChoice && (state.phase === 'resolving_choice_p1' || state.phase === 'resolving_choice_p2') && !specialAnnouncement ? (
            <div className="px-4 py-1 rounded-lg font-pirate text-base sm:text-lg text-ghost-orange animate-pulse">
              相手が選択中...
            </div>
          ) : state.phase === 'resolving_priority' && !specialAnnouncement ? (
            <button
              onClick={rollPriority}
              className="
                px-4 py-1 sm:px-6 sm:py-1.5 rounded-lg font-pirate text-base sm:text-lg
                bg-ghost-orange text-navy-900
                hover:bg-orange-400 transition-all duration-75
              "
            >
              優先度ダイスを振る！
            </button>
          ) : null}
        </div>
      </div>

      {/* My area (bottom) */}
      <div className="flex-1 flex flex-col justify-start border-t border-teal-600/20">
        <PlayerArea
          player={myPlayer}
          removedPool={state.removedPool}
          rollingMask={myRollingDice.length > 0 ? myRollingDice : undefined}
          highlights={myHighlights}
          removedChanged={removedChanged}
          diceIdPrefix={myPrefix}
          incomingCount={myIncoming}
          incomingAnimClass={myIncoming > 0 ? 'animate-die-incoming-from-top' : undefined}
          unrevealed={myUnrevealed}
          canRoll={canRoll}
          hasRolled={myRolled}
          onRoll={handleMyRoll}
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

      {/* Special choice effect overlay */}
      <DiceEffects effects={diceEffects} />

      {/* Choice dialog — only shown for the current player */}
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
          isRareWin={state.isRareWin}
        />
      )}

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-navy-800 border border-teal-600/30 rounded-2xl px-6 py-5 max-w-xs w-full mx-4 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <p className="font-pirate text-xl text-ghost-orange mb-2">タイトルに戻りますか？</p>
            <p className="text-teal-400/70 text-sm mb-5">対戦相手との接続が切れます</p>
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
                  onGoToTitle();
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
          winnerName={state.matchWinner ? getPlayerName(state.matchWinner) : ''}
          onNext={restartMatch}
          onGoToTitle={onGoToTitle}
          isInstantWin={isInstantWin}
          instantWinCondition={state.instantWinCondition}
          instantWinDice={state.instantWinDice}
          isRareWin={state.isRareWin}
        />
      )}
    </div>
  );
}
