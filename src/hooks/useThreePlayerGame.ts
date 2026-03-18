import { useReducer, useCallback } from 'react';
import type {
  ThreePlayerGameState,
  ThreePlayerAction,
  PendingTargetChoice,
  PlayerState,
  PlayerId,
  DieValue,
} from '../types/game';
import { rollDice } from '../utils/dice';
import { createLogEntry, resetLogCounter } from '../utils/effects';

function createPlayer(id: PlayerId, name: string): PlayerState {
  return {
    id,
    name,
    diceCount: 3,
    currentRoll: [],
    matchScore: 0,
    removedDice: 0,
  };
}

function createInitialState(names: [string, string, string]): ThreePlayerGameState {
  resetLogCounter();
  return {
    phase: 'waiting',
    turn: 0,
    round: 1,
    players: [
      createPlayer(1, names[0]),
      createPlayer(2, names[1]),
      createPlayer(3, names[2]),
    ],
    removedPool: 1, // 3-player starts with 1 in pool
    log: [],
    rolled: [false, false, false],
    choiceQueue: [],
    currentChoiceIndex: 0,
    priorityOrder: null,
    winner: null,
    matchWinner: null,
    isDraw: false,
  };
}

function addLogs(state: ThreePlayerGameState, messages: string[]): ThreePlayerGameState {
  const newLogs = messages.map(m => createLogEntry(m, state.turn));
  return { ...state, log: [...state.log, ...newLogs] };
}

function checkRoundEnd(state: ThreePlayerGameState): ThreePlayerGameState {
  const zeroPlayers = state.players.filter(p => p.diceCount <= 0);

  if (zeroPlayers.length === 0) {
    // No winner — clear rolls and return to waiting
    const clearedPlayers = state.players.map(p => ({
      ...p,
      diceCount: Math.max(0, p.diceCount),
      currentRoll: [] as DieValue[],
    })) as [PlayerState, PlayerState, PlayerState];

    return {
      ...state,
      players: clearedPlayers,
      phase: 'waiting',
      rolled: [false, false, false],
      choiceQueue: [],
      currentChoiceIndex: 0,
      priorityOrder: null,
    };
  }

  if (zeroPlayers.length >= 2) {
    // Multiple players at 0 — draw
    const s = addLogs(state, ['複数プレイヤーのダイスが0！引き分け！']);
    return { ...s, phase: 'round_end', isDraw: true, rolled: [false, false, false] };
  }

  // Exactly one winner
  const winner = zeroPlayers[0];
  const winnerId = winner.id as PlayerId;
  const newPlayers = state.players.map(p => ({
    ...p,
    matchScore: p.id === winnerId ? p.matchScore + 1 : p.matchScore,
  })) as [PlayerState, PlayerState, PlayerState];

  const newScore = newPlayers[winnerId - 1].matchScore;
  let s = addLogs(state, [`${winner.name}のダイスが0に！ラウンド勝利！`]);
  s = { ...s, players: newPlayers };

  if (newScore >= 2) {
    return { ...s, phase: 'match_end', matchWinner: winnerId, rolled: [false, false, false] };
  }

  return { ...s, phase: 'round_end', winner: winnerId, rolled: [false, false, false] };
}

/** Skip revive choices when pool is empty */
function skipEmptyRevives(
  state: ThreePlayerGameState,
  startIndex: number,
  pool: number,
): { state: ThreePlayerGameState; nextIndex: number } {
  let s = state;
  let idx = startIndex;
  while (idx < s.choiceQueue.length && s.choiceQueue[idx].effectType === 'revive' && pool <= 0) {
    s = addLogs(s, [
      `${s.players[s.choiceQueue[idx].player - 1].name}：4の効果 → 除外済みプールが空、スキップ`,
    ]);
    idx++;
  }
  return { state: s, nextIndex: idx };
}

function reducer(state: ThreePlayerGameState, action: ThreePlayerAction): ThreePlayerGameState {
  switch (action.type) {
    case 'ROLL_PLAYER': {
      const idx = action.player - 1;
      if (state.rolled[idx]) return state;

      const player = state.players[idx];
      const roll = rollDice(player.diceCount);

      const isFirstRoll = !state.rolled[0] && !state.rolled[1] && !state.rolled[2];
      const newTurn = isFirstRoll ? state.turn + 1 : state.turn;

      const newPlayers = [...state.players] as [PlayerState, PlayerState, PlayerState];
      newPlayers[idx] = { ...player, currentRoll: roll };

      const newRolled = [...state.rolled] as [boolean, boolean, boolean];
      newRolled[idx] = true;

      return {
        ...state,
        turn: newTurn,
        players: newPlayers,
        rolled: newRolled,
        log: isFirstRoll
          ? [...state.log, createLogEntry(`--- ターン ${newTurn} ---`, newTurn)]
          : state.log,
      };
    }

    case 'SHOW_RESULTS': {
      const logs = state.players.map(
        p => `${p.name}の出目: [${p.currentRoll.join(', ')}]`,
      );
      const s = addLogs(state, logs);
      return { ...s, phase: 'showing_results' };
    }

    case 'PROCESS_EFFECTS': {
      // Step 1: Apply 1s — remove to pool
      const newPlayers = state.players.map(p => ({ ...p })) as [PlayerState, PlayerState, PlayerState];
      let pool = state.removedPool;
      const logs: string[] = [];

      for (let i = 0; i < 3; i++) {
        const ones = newPlayers[i].currentRoll.filter(d => d === 1).length;
        if (ones > 0) {
          newPlayers[i].diceCount -= ones;
          pool += ones;
          logs.push(`${newPlayers[i].name}：1が${ones}個 → ${ones}個除外`);
        }
      }

      let s: ThreePlayerGameState = { ...state, players: newPlayers, removedPool: pool };
      s = addLogs(s, logs);

      // Step 2: Collect choice effects (4s and 6s)
      const choiceQueue: PendingTargetChoice[] = [];
      const playersWithChoices = new Set<PlayerId>();

      for (let i = 0; i < 3; i++) {
        const pid = (i + 1) as PlayerId;
        const roll = newPlayers[i].currentRoll;

        const fours = roll.filter(d => d === 4).length;
        for (let j = 0; j < fours; j++) {
          choiceQueue.push({ player: pid, effectType: 'revive' });
        }

        const sixes = roll.filter(d => d === 6).length;
        for (let j = 0; j < sixes; j++) {
          choiceQueue.push({ player: pid, effectType: 'give' });
        }

        if (fours > 0 || sixes > 0) {
          playersWithChoices.add(pid);
        }
      }

      if (choiceQueue.length === 0) {
        return checkRoundEnd(s);
      }

      s = { ...s, choiceQueue, currentChoiceIndex: 0 };

      if (playersWithChoices.size > 1) {
        return { ...s, phase: 'resolving_priority' };
      }

      // Single player with choices — skip empty revives from start
      const { state: s2, nextIndex } = skipEmptyRevives(s, 0, pool);
      if (nextIndex >= choiceQueue.length) {
        return checkRoundEnd(s2);
      }
      return { ...s2, currentChoiceIndex: nextIndex, phase: 'resolving_choices' };
    }

    case 'ROLL_PRIORITY': {
      const playersWithChoices = [...new Set(state.choiceQueue.map(c => c.player))];

      // Generate rolls
      const rollMap = new Map<PlayerId, DieValue>();
      for (const pid of playersWithChoices) {
        rollMap.set(pid, (Math.floor(Math.random() * 6) + 1) as DieValue);
      }

      // Check for ties
      const rollValues = [...rollMap.values()];
      const hasTie = new Set(rollValues).size < rollValues.length;

      const rollStr = playersWithChoices
        .map(p => `${state.players[p - 1].name}=${rollMap.get(p)}`)
        .join(' vs ');

      if (hasTie) {
        const s = addLogs(state, [`優先度ダイス：${rollStr} → 同じ目！振り直し！`]);
        return s; // stay in resolving_priority
      }

      // Sort by roll descending
      const sorted = [...playersWithChoices].sort(
        (a, b) => rollMap.get(b)! - rollMap.get(a)!,
      );

      let s = addLogs(state, [`優先度ダイス：${rollStr}`]);

      // Reorder choiceQueue by priority
      const newQueue = [...state.choiceQueue].sort((a, b) => {
        const aIdx = sorted.indexOf(a.player);
        const bIdx = sorted.indexOf(b.player);
        return aIdx - bIdx;
      });

      // Skip empty revives from start
      const { state: s2, nextIndex } = skipEmptyRevives(
        { ...s, choiceQueue: newQueue },
        0,
        state.removedPool,
      );
      if (nextIndex >= newQueue.length) {
        return checkRoundEnd(s2);
      }

      return {
        ...s2,
        currentChoiceIndex: nextIndex,
        priorityOrder: sorted,
        phase: 'resolving_choices',
      };
    }

    case 'CHOOSE_TARGET': {
      const choice = state.choiceQueue[state.currentChoiceIndex];
      if (!choice) return state;

      const newPlayers = state.players.map(p => ({ ...p })) as [PlayerState, PlayerState, PlayerState];
      let pool = state.removedPool;
      const logs: string[] = [];
      const actorIdx = choice.player - 1;
      const targetIdx = action.target - 1;

      if (choice.effectType === 'revive') {
        if (pool > 0) {
          pool -= 1;
          newPlayers[targetIdx].diceCount += 1;
          logs.push(
            `${newPlayers[actorIdx].name}：4の効果 → 除外済みから1個を${newPlayers[targetIdx].name}に押し付けた！`,
          );
        } else {
          logs.push(
            `${newPlayers[actorIdx].name}：4の効果 → 除外済みプールが空、効果なし`,
          );
        }
      } else {
        // give (6)
        if (newPlayers[actorIdx].diceCount > 0) {
          newPlayers[actorIdx].diceCount -= 1;
          newPlayers[targetIdx].diceCount += 1;
          logs.push(
            `${newPlayers[actorIdx].name}：6の効果 → ${newPlayers[targetIdx].name}に1個渡した！`,
          );
        }
      }

      let s: ThreePlayerGameState = { ...state, players: newPlayers, removedPool: pool };
      s = addLogs(s, logs);

      const rawNext = state.currentChoiceIndex + 1;
      const { state: s2, nextIndex } = skipEmptyRevives(s, rawNext, pool);

      if (nextIndex >= state.choiceQueue.length) {
        return checkRoundEnd(s2);
      }

      return { ...s2, currentChoiceIndex: nextIndex };
    }

    case 'NEXT_ROUND': {
      const newPlayers = state.players.map(p => ({
        ...p,
        diceCount: 3,
        currentRoll: [] as DieValue[],
      })) as [PlayerState, PlayerState, PlayerState];

      return {
        ...state,
        phase: 'waiting',
        round: state.round + 1,
        players: newPlayers,
        removedPool: 1,
        rolled: [false, false, false],
        choiceQueue: [],
        currentChoiceIndex: 0,
        priorityOrder: null,
        winner: null,
        isDraw: false,
        log: [
          ...state.log,
          createLogEntry(`=== ラウンド ${state.round + 1} 開始 ===`, state.turn),
        ],
      };
    }

    case 'RESTART': {
      const fresh = createInitialState(action.names);
      return {
        ...fresh,
        log: [createLogEntry('=== 新しいマッチ開始！ ===', 0)],
      };
    }

    default:
      return state;
  }
}

export function useThreePlayerGame(names: [string, string, string]) {
  const [state, dispatch] = useReducer(
    reducer,
    names,
    createInitialState,
  );

  const rollPlayer = useCallback((player: PlayerId) => {
    dispatch({ type: 'ROLL_PLAYER', player });
  }, []);

  const showResults = useCallback(() => {
    dispatch({ type: 'SHOW_RESULTS' });
  }, []);

  const processEffects = useCallback(() => {
    dispatch({ type: 'PROCESS_EFFECTS' });
  }, []);

  const rollPriority = useCallback(() => {
    dispatch({ type: 'ROLL_PRIORITY' });
  }, []);

  const chooseTarget = useCallback((target: PlayerId) => {
    dispatch({ type: 'CHOOSE_TARGET', target });
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const restart = useCallback((newNames: [string, string, string]) => {
    dispatch({ type: 'RESTART', names: newNames });
  }, []);

  return {
    state,
    rollPlayer,
    showResults,
    processEffects,
    rollPriority,
    chooseTarget,
    nextRound,
    restart,
  };
}
