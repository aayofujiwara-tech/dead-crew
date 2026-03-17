export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type PlayerId = 1 | 2;

export type DieHighlight = 'normal' | 'ghost' | 'push' | 'triple' | 'instant-win';

export interface PlayerState {
  id: PlayerId;
  name: string;
  diceCount: number;
  currentRoll: DieValue[];
  matchScore: number;
  removedDice: number;
}

export type GamePhase =
  | 'waiting'          // waiting to roll
  | 'rolling'          // dice animation
  | 'showing_results'  // showing roll results before processing
  | 'resolving_instant_win' // checking instant win
  | 'resolving_priority'    // rolling for priority when both have choices
  | 'resolving_choice_p1'   // player 1 making a choice
  | 'resolving_choice_p2'   // player 2 making a choice
  | 'resolving_normal'      // processing normal effects (1s and 6s)
  | 'round_end'        // round ended
  | 'match_end';       // match ended

export type SpecialEffectType =
  | 'swap_all'          // 2×3: swap all dice
  | 'add_removed_3'     // 3×3: add 3 removed to opponent
  | 'add_removed_4'     // 4×3: add 4 removed to opponent
  | 'five_choice';      // 5×3: remove 2 own OR push 1 to opponent

export interface SpecialEffect {
  type: SpecialEffectType;
  player: PlayerId;
}

export interface ChoiceOption {
  label: string;
  description: string;
  value: string;
}

export interface PendingChoice {
  player: PlayerId;
  effect: SpecialEffect;
  options: ChoiceOption[];
}

export interface LogEntry {
  id: number;
  message: string;
  turn: number;
}

export type GameMode = 'cpu' | 'local';

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  turn: number;
  round: number;
  player1: PlayerState;
  player2: PlayerState;
  removedPool: number;
  log: LogEntry[];
  pendingChoices: PendingChoice[];
  currentChoiceIndex: number;
  priorityRolls: { p1: number; p2: number } | null;
  winner: PlayerId | null;
  matchWinner: PlayerId | null;
  isDraw: boolean;
  animationPhase: 'idle' | 'rolling' | 'removing' | 'moving' | 'victory';
  instantWinCondition: string | null;
  instantWinDice: DieValue[];
  instantWinPlayer: PlayerId | null;
  isRareWin: boolean;
  /** Whether each player has pressed their roll button this turn */
  p1Rolled: boolean;
  p2Rolled: boolean;
}

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'ROLL_PLAYER'; player: PlayerId }
  | { type: 'SET_ROLL_RESULTS'; p1Roll: DieValue[]; p2Roll: DieValue[] }
  | { type: 'SHOW_RESULTS' }
  | { type: 'CHECK_INSTANT_WIN' }
  | { type: 'SETUP_CHOICES' }
  | { type: 'RESOLVE_PRIORITY'; p1Die: DieValue; p2Die: DieValue }
  | { type: 'MAKE_CHOICE'; player: PlayerId; choice: string }
  | { type: 'RESOLVE_NORMAL_EFFECTS' }
  | { type: 'CHECK_ROUND_END' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESTART_MATCH'; mode?: GameMode }
  | { type: 'SET_ANIMATION'; phase: GameState['animationPhase'] };

/** Abstraction for player input (human, CPU, or future remote player) */
export interface PlayerController {
  /** Resolve a pending choice. Returns the chosen value, or null if the human should decide via UI. */
  resolveChoice(choice: PendingChoice, state: GameState): string | null;
}
