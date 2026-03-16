import type {
  GameState,
  PlayerState,
  PlayerId,
  SpecialEffect,
  PendingChoice,
  ChoiceOption,
  LogEntry,
} from '../types/game';
import { countOnes, countSixes, getTripleEffects } from './dice';

let logIdCounter = 0;

export function createLogEntry(message: string, turn: number): LogEntry {
  return { id: ++logIdCounter, message, turn };
}

export function resetLogCounter(): void {
  logIdCounter = 0;
}

export function getPlayer(state: GameState, id: PlayerId): PlayerState {
  return id === 1 ? state.player1 : state.player2;
}

export function getOpponentId(id: PlayerId): PlayerId {
  return id === 1 ? 2 : 1;
}

export function buildChoicesForEffect(effect: SpecialEffect): ChoiceOption[] {
  switch (effect.type) {
    case 'swap_all':
      return [
        { label: '入れ替える', description: '両者のダイスを全て入れ替える', value: 'swap' },
        { label: '入れ替えない', description: 'そのまま何もしない', value: 'skip' },
      ];
    case 'add_removed_3':
      return [
        { label: '呪いを送る！', description: '除外済みダイスを3個相手に追加', value: 'add' },
      ];
    case 'add_removed_4':
      return [
        { label: '呪いを送る！', description: '除外済みダイスを4個相手に追加', value: 'add' },
      ];
    case 'five_choice':
      return [
        { label: '2個成仏', description: '自分のダイスを2個除外する', value: 'remove2' },
        { label: '1個押し付け', description: 'ダイスを1個相手に渡す', value: 'push1' },
      ];
    default:
      return [];
  }
}

export function collectSpecialEffects(state: GameState): SpecialEffect[] {
  const p1Effects = getTripleEffects(state.player1.currentRoll, 1);
  const p2Effects = getTripleEffects(state.player2.currentRoll, 2);
  return [...p1Effects, ...p2Effects];
}

export function buildPendingChoices(effects: SpecialEffect[]): PendingChoice[] {
  return effects.map(effect => ({
    player: effect.player,
    effect,
    options: buildChoicesForEffect(effect),
  }));
}

export function applyChoice(
  state: GameState,
  player: PlayerId,
  effect: SpecialEffect,
  choice: string
): { state: GameState; logMessages: string[] } {
  const logs: string[] = [];
  let newState = { ...state };
  const playerState = { ...(player === 1 ? state.player1 : state.player2) };
  const opponentId = getOpponentId(player);
  const opponentState = { ...(opponentId === 1 ? state.player1 : state.player2) };
  const playerName = playerState.name;
  const opponentName = opponentState.name;

  switch (effect.type) {
    case 'swap_all': {
      if (choice === 'swap') {
        const tempCount = playerState.diceCount;
        playerState.diceCount = opponentState.diceCount;
        opponentState.diceCount = tempCount;
        logs.push(`${playerName}：2×3発動 → ${opponentName}とダイスを入れ替え！`);
      } else {
        logs.push(`${playerName}：2×3 → 入れ替えをスキップ`);
      }
      break;
    }
    case 'add_removed_3': {
      const toAdd = Math.min(3, newState.removedPool);
      if (toAdd > 0) {
        opponentState.diceCount += toAdd;
        newState.removedPool -= toAdd;
        logs.push(`${playerName}：3×3発動 → ${opponentName}に除外済み${toAdd}個追加！`);
      } else {
        logs.push(`${playerName}：3×3 → 除外済みダイスなし、効果なし`);
      }
      break;
    }
    case 'add_removed_4': {
      const toAdd = Math.min(4, newState.removedPool);
      if (toAdd > 0) {
        opponentState.diceCount += toAdd;
        newState.removedPool -= toAdd;
        logs.push(`${playerName}：4×3発動 → ${opponentName}に除外済み${toAdd}個追加！`);
      } else {
        logs.push(`${playerName}：4×3 → 除外済みダイスなし、効果なし`);
      }
      break;
    }
    case 'five_choice': {
      if (choice === 'remove2') {
        const toRemove = Math.min(2, playerState.diceCount);
        playerState.diceCount -= toRemove;
        newState.removedPool += toRemove;
        logs.push(`${playerName}：5×3発動 → ${toRemove}個成仏させた`);
      } else {
        if (playerState.diceCount > 0) {
          playerState.diceCount -= 1;
          opponentState.diceCount += 1;
          logs.push(`${playerName}：5×3発動 → ${opponentName}に1個押し付け！`);
        }
      }
      break;
    }
  }

  if (player === 1) {
    newState.player1 = playerState;
    newState.player2 = opponentState;
  } else {
    newState.player2 = playerState;
    newState.player1 = opponentState;
  }

  return { state: newState, logMessages: logs };
}

export function applyNormalEffects(state: GameState): { state: GameState; logMessages: string[] } {
  const logs: string[] = [];
  const p1 = { ...state.player1 };
  const p2 = { ...state.player2 };
  let removedPool = state.removedPool;

  // Count 1s (remove from game)
  const p1Ones = countOnes(p1.currentRoll);
  const p2Ones = countOnes(p2.currentRoll);

  if (p1Ones > 0) {
    p1.diceCount -= p1Ones;
    removedPool += p1Ones;
    logs.push(`${p1.name}：1が出た → ${p1Ones}個成仏`);
  }
  if (p2Ones > 0) {
    p2.diceCount -= p2Ones;
    removedPool += p2Ones;
    logs.push(`${p2.name}：1が出た → ${p2Ones}個成仏`);
  }

  // Count 6s (give to opponent)
  const p1Sixes = countSixes(p1.currentRoll);
  const p2Sixes = countSixes(p2.currentRoll);

  if (p1Sixes > 0) {
    p1.diceCount -= p1Sixes;
    p2.diceCount += p1Sixes;
    logs.push(`${p1.name}：6が出た → ${p2.name}に${p1Sixes}個渡す`);
  }
  if (p2Sixes > 0) {
    p2.diceCount -= p2Sixes;
    p1.diceCount += p2Sixes;
    logs.push(`${p2.name}：6が出た → ${p1.name}に${p2Sixes}個渡す`);
  }

  return {
    state: { ...state, player1: p1, player2: p2, removedPool },
    logMessages: logs,
  };
}
