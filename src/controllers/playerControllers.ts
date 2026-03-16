import type { PlayerController, PendingChoice, GameState } from '../types/game';
import { getPlayer, getOpponentId } from '../utils/effects';

/** Human player — returns null so the UI shows ChoiceDialog */
export const humanController: PlayerController = {
  resolveChoice(): string | null {
    return null;
  },
};

/** CPU player — automatically picks the best choice */
export const cpuController: PlayerController = {
  resolveChoice(choice: PendingChoice, state: GameState): string | null {
    const player = getPlayer(state, choice.player);
    const opponent = getPlayer(state, getOpponentId(choice.player));

    switch (choice.effect.type) {
      case 'swap_all':
        // Swap when we have more dice (= losing), skip otherwise
        return player.diceCount > opponent.diceCount ? 'swap' : 'skip';

      case 'add_removed_3':
      case 'add_removed_4':
        // Always send curse (only option)
        return 'add';

      case 'five_choice':
        // Remove 2 own dice if we have 3+, otherwise push 1 to opponent
        return player.diceCount >= 3 ? 'remove2' : 'push1';

      default:
        return choice.options[0]?.value ?? null;
    }
  },
};
