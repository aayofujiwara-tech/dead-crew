import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ref,
  set,
  onValue,
  onDisconnect,
  push,
  update,
  off,
} from 'firebase/database';
import { db } from '../utils/firebase';
import type { GameState, GameAction, PlayerId, DieValue } from '../types/game';
import { gameReducer, createInitialState } from './useGameState';
import { rollDice } from '../utils/dice';
import { createLogEntry, resetLogCounter } from '../utils/effects';

export type OnlineRole = 'host' | 'guest';

// ---------------------------------------------------------------------------
// Firebase serialization helpers — Firebase drops empty arrays/objects
// ---------------------------------------------------------------------------
function serializeState(state: GameState): Record<string, unknown> {
  return {
    ...state,
    log: state.log.length > 0 ? state.log : null,
    pendingChoices: state.pendingChoices.length > 0 ? state.pendingChoices : null,
    instantWinDice: state.instantWinDice.length > 0 ? state.instantWinDice : null,
    player1: {
      ...state.player1,
      currentRoll: state.player1.currentRoll.length > 0 ? state.player1.currentRoll : null,
    },
    player2: {
      ...state.player2,
      currentRoll: state.player2.currentRoll.length > 0 ? state.player2.currentRoll : null,
    },
  };
}

function deserializeState(data: Record<string, unknown>): GameState {
  const raw = data as Record<string, unknown>;
  const p1 = raw.player1 as Record<string, unknown>;
  const p2 = raw.player2 as Record<string, unknown>;
  return {
    ...(raw as unknown as GameState),
    log: Array.isArray(raw.log) ? raw.log : [],
    pendingChoices: Array.isArray(raw.pendingChoices) ? raw.pendingChoices : [],
    instantWinDice: Array.isArray(raw.instantWinDice) ? raw.instantWinDice : [],
    player1: {
      ...(p1 as unknown as GameState['player1']),
      currentRoll: Array.isArray(p1.currentRoll) ? p1.currentRoll : [],
    },
    player2: {
      ...(p2 as unknown as GameState['player2']),
      currentRoll: Array.isArray(p2.currentRoll) ? p2.currentRoll : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useOnlineGame(
  roomCode: string,
  role: OnlineRole,
  myName: string,
  opponentName: string,
) {
  const isHost = role === 'host';
  const myPlayerId: 'p1' | 'p2' = isHost ? 'p1' : 'p2';

  // ---- State ----
  // Host: authoritative local state, synced to Firebase
  // Guest: mirrors Firebase state
  const [state, setState] = useState<GameState>(() => {
    resetLogCounter();
    const initial = createInitialState(
      'online',
      isHost ? myName : opponentName,
      isHost ? opponentName : myName,
    );
    return {
      ...initial,
      log: [createLogEntry('=== ネット対戦開始！ ===', 0)],
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const [connected, setConnected] = useState(true);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // Track the last action timestamp we've processed (host)
  const lastActionRef = useRef(0);
  // Prevent duplicate rolled processing
  const processingRollRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Helper: host dispatches action through reducer and updates state
  // ---------------------------------------------------------------------------
  const hostDispatch = useCallback((action: GameAction) => {
    if (!isHost) return;
    setState(prev => gameReducer(prev, action));
  }, [isHost]);

  // ---------------------------------------------------------------------------
  // Initialize room state in Firebase (host only, on mount)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isHost) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    set(roomRef, {
      host: myName,
      guest: opponentName,
      status: 'playing',
      gameState: serializeState(stateRef.current),
      rolled: { p1: false, p2: false },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    // On disconnect: mark room as finished
    onDisconnect(ref(db, `rooms/${roomCode}/status`)).set('finished');

    return () => {
      // Cleanup on unmount — don't delete room, just mark finished
      set(ref(db, `rooms/${roomCode}/status`), 'finished');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Host: sync local state to Firebase whenever it changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isHost) return;
    const gsRef = ref(db, `rooms/${roomCode}/gameState`);
    set(gsRef, serializeState(state));
    update(ref(db, `rooms/${roomCode}`), { lastActivity: Date.now() });
  }, [isHost, roomCode, state]);

  // ---------------------------------------------------------------------------
  // Guest: subscribe to gameState from Firebase
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isHost) return;
    const gsRef = ref(db, `rooms/${roomCode}/gameState`);
    const unsub = onValue(gsRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        setState(deserializeState(data));
      }
    });
    return () => off(gsRef, 'value', unsub);
  }, [isHost, roomCode]);

  // ---------------------------------------------------------------------------
  // Connection monitoring
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, snap => {
      setConnected(snap.val() === true);
    });
    return () => off(connRef, 'value', unsub);
  }, []);

  // Opponent disconnect detection
  useEffect(() => {
    const statusRef = ref(db, `rooms/${roomCode}/status`);
    const unsub = onValue(statusRef, snap => {
      const val = snap.val();
      if (val === 'finished') {
        setOpponentDisconnected(true);
      }
    });
    return () => off(statusRef, 'value', unsub);
  }, [roomCode]);

  // Guest: set up onDisconnect
  useEffect(() => {
    if (isHost) return;
    onDisconnect(ref(db, `rooms/${roomCode}/status`)).set('finished');
  }, [isHost, roomCode]);

  // ---------------------------------------------------------------------------
  // ROLL: player marks themselves as rolled
  // ---------------------------------------------------------------------------
  const roll = useCallback(() => {
    const key = isHost ? 'p1' : 'p2';
    update(ref(db, `rooms/${roomCode}/rolled`), { [key]: true });
  }, [isHost, roomCode]);

  // ---------------------------------------------------------------------------
  // Host: watch rolled/ — when both rolled, generate dice and advance state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isHost) return;
    const rolledRef = ref(db, `rooms/${roomCode}/rolled`);
    const unsub = onValue(rolledRef, snapshot => {
      const data = snapshot.val();
      if (!data?.p1 || !data?.p2) return;
      if (processingRollRef.current) return;
      processingRollRef.current = true;

      const cur = stateRef.current;
      if (cur.phase !== 'waiting') {
        processingRollRef.current = false;
        return;
      }

      // Generate dice for both players
      const p1Roll = rollDice(cur.player1.diceCount);
      const p2Roll = rollDice(cur.player2.diceCount);
      const newTurn = cur.turn + 1;

      setState(prev => ({
        ...prev,
        turn: newTurn,
        player1: { ...prev.player1, currentRoll: p1Roll },
        player2: { ...prev.player2, currentRoll: p2Roll },
        p1Rolled: true,
        p2Rolled: true,
        instantWinCondition: null,
        instantWinDice: [],
        instantWinPlayer: null,
        isRareWin: false,
        log: [
          ...prev.log,
          createLogEntry(`--- ターン ${newTurn} ---`, newTurn),
        ],
      }));

      // Reset rolled flags in Firebase
      set(rolledRef, { p1: false, p2: false }).then(() => {
        processingRollRef.current = false;
      });
    });
    return () => off(ref(db, `rooms/${roomCode}/rolled`), 'value', unsub);
  }, [isHost, roomCode]);

  // ---------------------------------------------------------------------------
  // Host: auto-advance phases (SHOW_RESULTS → CHECK_INSTANT_WIN → ...)
  // These mirror the useEffects in App.tsx
  // ---------------------------------------------------------------------------

  // When both rolled → SHOW_RESULTS → CHECK_INSTANT_WIN
  const advancedTurnRef = useRef(-1);
  useEffect(() => {
    if (!isHost) return;
    if (!state.p1Rolled || !state.p2Rolled) return;
    if (state.phase !== 'waiting') return;
    if (advancedTurnRef.current === state.turn) return;
    advancedTurnRef.current = state.turn;

    // Brief delay for animation
    const t1 = setTimeout(() => {
      hostDispatch({ type: 'SHOW_RESULTS' });
      setTimeout(() => hostDispatch({ type: 'CHECK_INSTANT_WIN' }), 500);
    }, 800);
    return () => clearTimeout(t1);
  }, [isHost, state.phase, state.p1Rolled, state.p2Rolled, state.turn, hostDispatch]);

  // Auto-resolve resolving_normal phase
  const resolvedTurnRef = useRef(-1);
  useEffect(() => {
    if (!isHost) return;
    if (state.phase !== 'resolving_normal') return;
    if (resolvedTurnRef.current === state.turn) return;
    resolvedTurnRef.current = state.turn;

    const timer = setTimeout(() => {
      hostDispatch({ type: 'RESOLVE_NORMAL_EFFECTS' });
    }, 1000);
    return () => clearTimeout(timer);
  }, [isHost, state.phase, state.turn, hostDispatch]);

  // ---------------------------------------------------------------------------
  // Guest: write actions (CHOICE, PRIORITY, NEXT_ROUND, RESTART) to Firebase
  // Host: process them
  // ---------------------------------------------------------------------------
  const submitAction = useCallback((actionData: { type: string; playerId: string; payload?: unknown }) => {
    const actionsRef = ref(db, `rooms/${roomCode}/actions`);
    push(actionsRef, {
      ...actionData,
      timestamp: Date.now(),
    });
  }, [roomCode]);

  // Host: watch actions/ for guest actions
  useEffect(() => {
    if (!isHost) return;
    const actionsRef = ref(db, `rooms/${roomCode}/actions`);
    const unsub = onValue(actionsRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;
      const entries = Object.entries(data) as [string, { type: string; playerId: string; payload?: Record<string, unknown>; timestamp: number }][];
      // Sort by timestamp and process new ones
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (const [, action] of entries) {
        if (action.timestamp <= lastActionRef.current) continue;
        lastActionRef.current = action.timestamp;

        switch (action.type) {
          case 'CHOICE':
            setState(prev => gameReducer(prev, {
              type: 'MAKE_CHOICE',
              player: (action.playerId === 'p1' ? 1 : 2) as PlayerId,
              choice: (action.payload as { choice: string }).choice,
            }));
            break;
          case 'PRIORITY':
            setState(prev => {
              const p1Die = (Math.floor(Math.random() * 6) + 1) as DieValue;
              const p2Die = (Math.floor(Math.random() * 6) + 1) as DieValue;
              return gameReducer(prev, { type: 'RESOLVE_PRIORITY', p1Die, p2Die });
            });
            break;
          case 'NEXT_ROUND':
            setState(prev => gameReducer(prev, { type: 'NEXT_ROUND' }));
            break;
          case 'RESTART':
            setState(() => {
              resetLogCounter();
              const fresh = createInitialState(
                'online',
                stateRef.current.player1.name,
                stateRef.current.player2.name,
              );
              return {
                ...fresh,
                log: [createLogEntry('=== 再戦開始！ ===', 0)],
              };
            });
            break;
        }
      }
      // Clean up processed actions
      set(actionsRef, null);
    });
    return () => off(actionsRef, 'value', unsub);
  }, [isHost, roomCode]);

  // ---------------------------------------------------------------------------
  // Public action handlers
  // ---------------------------------------------------------------------------
  const makeChoice = useCallback((player: PlayerId, choice: string) => {
    const pid = player === 1 ? 'p1' : 'p2';
    if (isHost && pid === 'p1') {
      // Host's own choice — process directly
      hostDispatch({ type: 'MAKE_CHOICE', player, choice });
    } else if (!isHost && pid === 'p2') {
      // Guest's own choice — send via Firebase
      submitAction({ type: 'CHOICE', playerId: pid, payload: { choice } });
    } else if (isHost && pid === 'p2') {
      // Shouldn't happen normally, but handle gracefully
      hostDispatch({ type: 'MAKE_CHOICE', player, choice });
    }
  }, [isHost, hostDispatch, submitAction]);

  const rollPriority = useCallback(() => {
    if (isHost) {
      const p1Die = (Math.floor(Math.random() * 6) + 1) as DieValue;
      const p2Die = (Math.floor(Math.random() * 6) + 1) as DieValue;
      hostDispatch({ type: 'RESOLVE_PRIORITY', p1Die, p2Die });
    } else {
      submitAction({ type: 'PRIORITY', playerId: 'p2' });
    }
  }, [isHost, hostDispatch, submitAction]);

  const nextRound = useCallback(() => {
    if (isHost) {
      hostDispatch({ type: 'NEXT_ROUND' });
    } else {
      submitAction({ type: 'NEXT_ROUND', playerId: 'p2' });
    }
  }, [isHost, hostDispatch, submitAction]);

  const restartMatch = useCallback(() => {
    if (isHost) {
      setState(() => {
        resetLogCounter();
        const fresh = createInitialState(
          'online',
          stateRef.current.player1.name,
          stateRef.current.player2.name,
        );
        return {
          ...fresh,
          log: [createLogEntry('=== 再戦開始！ ===', 0)],
        };
      });
      // Reset rolled flags
      set(ref(db, `rooms/${roomCode}/rolled`), { p1: false, p2: false });
    } else {
      submitAction({ type: 'RESTART', playerId: 'p2' });
    }
  }, [isHost, roomCode, submitAction]);

  return {
    state,
    isHost,
    myPlayerId,
    connected,
    opponentDisconnected,
    roomCode,
    roll,
    makeChoice,
    rollPriority,
    nextRound,
    restartMatch,
  };
}
