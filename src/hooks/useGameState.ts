import { useReducer, useCallback } from 'react';
import type {
  GameState,
  GameAction,
  PlayerState,
  PlayerId,
  DieValue,
} from '../types/game';
import { rollDice, checkInstantWin } from '../utils/dice';
import {
  createLogEntry,
  resetLogCounter,
  collectSpecialEffects,
  buildPendingChoices,
  applyChoice,
  applyNormalEffects,
} from '../utils/effects';

function createInitialPlayer(id: PlayerId): PlayerState {
  return {
    id,
    name: id === 1 ? '船長1' : '船長2',
    diceCount: 5,
    currentRoll: [],
    matchScore: 0,
    removedDice: 0,
  };
}

function createInitialState(): GameState {
  resetLogCounter();
  return {
    phase: 'waiting',
    turn: 0,
    round: 1,
    player1: createInitialPlayer(1),
    player2: createInitialPlayer(2),
    removedPool: 0,
    log: [],
    pendingChoices: [],
    currentChoiceIndex: 0,
    priorityRolls: null,
    winner: null,
    matchWinner: null,
    isDraw: false,
    animationPhase: 'idle',
  };
}

function addLogs(state: GameState, messages: string[]): GameState {
  const newLogs = messages.map(m => createLogEntry(m, state.turn));
  return { ...state, log: [...state.log, ...newLogs] };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROLL_DICE': {
      const p1Roll = rollDice(state.player1.diceCount);
      const p2Roll = rollDice(state.player2.diceCount);
      const newTurn = state.turn + 1;
      return {
        ...state,
        turn: newTurn,
        phase: 'rolling',
        animationPhase: 'rolling',
        player1: { ...state.player1, currentRoll: p1Roll },
        player2: { ...state.player2, currentRoll: p2Roll },
        log: [
          ...state.log,
          createLogEntry(`--- ターン ${newTurn} ---`, newTurn),
        ],
      };
    }

    case 'SHOW_RESULTS': {
      const p1Str = state.player1.currentRoll.join(', ');
      const p2Str = state.player2.currentRoll.join(', ');
      let s = addLogs(state, [
        `${state.player1.name}の出目: [${p1Str}]`,
        `${state.player2.name}の出目: [${p2Str}]`,
      ]);
      return { ...s, phase: 'showing_results', animationPhase: 'idle' };
    }

    case 'CHECK_INSTANT_WIN': {
      const p1Win = checkInstantWin(state.player1.currentRoll, state.player1.diceCount);
      const p2Win = checkInstantWin(state.player2.currentRoll, state.player2.diceCount);

      if (p1Win && p2Win) {
        let s = addLogs(state, ['両者とも即勝利条件！引き分け！']);
        return { ...s, phase: 'round_end', isDraw: true, animationPhase: 'victory' };
      }
      if (p1Win) {
        let s = addLogs(state, [`${state.player1.name}が即勝利条件達成！`]);
        const newScore = state.player1.matchScore + 1;
        const p1 = { ...state.player1, matchScore: newScore };
        if (newScore >= 2) {
          return { ...s, player1: p1, phase: 'match_end', matchWinner: 1, animationPhase: 'victory' };
        }
        return { ...s, player1: p1, phase: 'round_end', winner: 1, animationPhase: 'victory' };
      }
      if (p2Win) {
        let s = addLogs(state, [`${state.player2.name}が即勝利条件達成！`]);
        const newScore = state.player2.matchScore + 1;
        const p2 = { ...state.player2, matchScore: newScore };
        if (newScore >= 2) {
          return { ...s, player2: p2, phase: 'match_end', matchWinner: 2, animationPhase: 'victory' };
        }
        return { ...s, player2: p2, phase: 'round_end', winner: 2, animationPhase: 'victory' };
      }

      // No instant win, proceed to check special effects
      const effects = collectSpecialEffects(state);
      if (effects.length > 0) {
        const choices = buildPendingChoices(effects);
        const hasP1 = effects.some(e => e.player === 1);
        const hasP2 = effects.some(e => e.player === 2);

        if (hasP1 && hasP2) {
          return {
            ...state,
            pendingChoices: choices,
            currentChoiceIndex: 0,
            phase: 'resolving_priority',
          };
        }

        const firstChoice = choices[0];
        return {
          ...state,
          pendingChoices: choices,
          currentChoiceIndex: 0,
          phase: firstChoice.player === 1 ? 'resolving_choice_p1' : 'resolving_choice_p2',
        };
      }

      return { ...state, phase: 'resolving_normal' };
    }

    case 'SETUP_CHOICES': {
      const effects = collectSpecialEffects(state);
      if (effects.length === 0) {
        return { ...state, phase: 'resolving_normal' };
      }

      const choices = buildPendingChoices(effects);
      const hasP1 = effects.some(e => e.player === 1);
      const hasP2 = effects.some(e => e.player === 2);

      if (hasP1 && hasP2) {
        // Need priority roll
        return {
          ...state,
          pendingChoices: choices,
          currentChoiceIndex: 0,
          phase: 'resolving_priority',
        };
      }

      // Only one player has choices
      const firstChoice = choices[0];
      return {
        ...state,
        pendingChoices: choices,
        currentChoiceIndex: 0,
        phase: firstChoice.player === 1 ? 'resolving_choice_p1' : 'resolving_choice_p2',
      };
    }

    case 'RESOLVE_PRIORITY': {
      const { p1Die, p2Die } = action;
      if (p1Die === p2Die) {
        let s = addLogs(state, [`優先度ダイス：両者${p1Die}で同じ！振り直し！`]);
        return s;
      }

      let s = addLogs(state, [
        `優先度ダイス：${state.player1.name}=${p1Die} vs ${state.player2.name}=${p2Die}`,
      ]);

      // Higher roll goes first - sort pending choices accordingly
      const firstPlayer: PlayerId = p1Die > p2Die ? 1 : 2;
      const sorted = [...state.pendingChoices].sort((a, b) => {
        if (a.player === firstPlayer && b.player !== firstPlayer) return -1;
        if (a.player !== firstPlayer && b.player === firstPlayer) return 1;
        return 0;
      });

      const firstChoice = sorted[0];
      return {
        ...s,
        pendingChoices: sorted,
        currentChoiceIndex: 0,
        phase: firstChoice.player === 1 ? 'resolving_choice_p1' : 'resolving_choice_p2',
      };
    }

    case 'MAKE_CHOICE': {
      const { player, choice } = action;
      const currentChoice = state.pendingChoices[state.currentChoiceIndex];
      if (!currentChoice || currentChoice.player !== player) return state;

      const result = applyChoice(state, player, currentChoice.effect, choice);
      let s = addLogs(result.state, result.logMessages);

      const nextIndex = state.currentChoiceIndex + 1;
      if (nextIndex < state.pendingChoices.length) {
        const nextChoice = state.pendingChoices[nextIndex];
        return {
          ...s,
          currentChoiceIndex: nextIndex,
          phase: nextChoice.player === 1 ? 'resolving_choice_p1' : 'resolving_choice_p2',
        };
      }

      return { ...s, phase: 'resolving_normal', pendingChoices: [], currentChoiceIndex: 0 };
    }

    case 'RESOLVE_NORMAL_EFFECTS': {
      const result = applyNormalEffects(state);
      let s = addLogs(result.state, result.logMessages);

      // Check round end
      const p1Zero = s.player1.diceCount <= 0;
      const p2Zero = s.player2.diceCount <= 0;

      if (p1Zero && p2Zero) {
        s = addLogs(s, ['両者ともダイスが0！引き分け！']);
        return { ...s, phase: 'round_end', isDraw: true };
      }
      if (p1Zero) {
        const newScore = s.player1.matchScore + 1;
        const p1 = { ...s.player1, matchScore: newScore };
        s = addLogs(s, [`${s.player1.name}のダイスが0に！ラウンド勝利！`]);
        if (newScore >= 2) {
          return { ...s, player1: p1, phase: 'match_end', matchWinner: 1, animationPhase: 'victory' };
        }
        return { ...s, player1: p1, phase: 'round_end', winner: 1, animationPhase: 'victory' };
      }
      if (p2Zero) {
        const newScore = s.player2.matchScore + 1;
        const p2 = { ...s.player2, matchScore: newScore };
        s = addLogs(s, [`${s.player2.name}のダイスが0に！ラウンド勝利！`]);
        if (newScore >= 2) {
          return { ...s, player2: p2, phase: 'match_end', matchWinner: 2, animationPhase: 'victory' };
        }
        return { ...s, player2: p2, phase: 'round_end', winner: 2, animationPhase: 'victory' };
      }

      return { ...s, phase: 'waiting', animationPhase: 'idle' };
    }

    case 'NEXT_ROUND': {
      return {
        ...state,
        phase: 'waiting',
        round: state.round + 1,
        player1: { ...state.player1, diceCount: 5, currentRoll: [] },
        player2: { ...state.player2, diceCount: 5, currentRoll: [] },
        removedPool: 0,
        winner: null,
        isDraw: false,
        pendingChoices: [],
        currentChoiceIndex: 0,
        priorityRolls: null,
        animationPhase: 'idle',
        log: [...state.log, createLogEntry(`=== ラウンド ${state.round + 1} 開始 ===`, state.turn)],
      };
    }

    case 'RESTART_MATCH': {
      const fresh = createInitialState();
      return {
        ...fresh,
        log: [createLogEntry('=== 新しいマッチ開始！ ===', 0)],
      };
    }

    case 'SET_ANIMATION': {
      return { ...state, animationPhase: action.phase };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  const rollAndProcess = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' });

    // Animation sequence
    setTimeout(() => {
      dispatch({ type: 'SHOW_RESULTS' });
      setTimeout(() => {
        dispatch({ type: 'CHECK_INSTANT_WIN' });
      }, 800);
    }, 600);
  }, []);

  const rollPriority = useCallback(() => {
    const p1Die = (Math.floor(Math.random() * 6) + 1) as DieValue;
    const p2Die = (Math.floor(Math.random() * 6) + 1) as DieValue;
    dispatch({ type: 'RESOLVE_PRIORITY', p1Die, p2Die });
  }, []);

  const makeChoice = useCallback((player: PlayerId, choice: string) => {
    dispatch({ type: 'MAKE_CHOICE', player, choice });
  }, []);

  const resolveNormal = useCallback(() => {
    dispatch({ type: 'RESOLVE_NORMAL_EFFECTS' });
  }, []);

  const setupChoices = useCallback(() => {
    dispatch({ type: 'SETUP_CHOICES' });
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const restartMatch = useCallback(() => {
    dispatch({ type: 'RESTART_MATCH' });
  }, []);

  return {
    state,
    dispatch,
    rollAndProcess,
    rollPriority,
    makeChoice,
    resolveNormal,
    setupChoices,
    nextRound,
    restartMatch,
  };
}
