import type { DieValue, SpecialEffect, SpecialEffectType, PlayerId } from '../types/game';

export function rollDie(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

export function rollDice(count: number): DieValue[] {
  return Array.from({ length: count }, () => rollDie());
}

export function countValues(dice: DieValue[]): Map<DieValue, number> {
  const counts = new Map<DieValue, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  return counts;
}

export function hasNOfAKind(dice: DieValue[], n: number): DieValue | null {
  const counts = countValues(dice);
  for (const [value, count] of counts) {
    if (count >= n) return value;
  }
  return null;
}

export function isFullHouse(dice: DieValue[]): boolean {
  if (dice.length !== 5) return false;
  const counts = countValues(dice);
  const values = Array.from(counts.values()).sort();
  return values.length === 2 && values[0] === 2 && values[1] === 3;
}

export function checkInstantWin(dice: DieValue[], diceCount: number): boolean {
  if (dice.length === 0) return false;
  // 5個ぞろ目: all same
  if (hasNOfAKind(dice, 5)) return true;
  // 4個ぞろ目: 4 of a kind when holding 5 or 4
  if ((diceCount === 5 || diceCount === 4) && hasNOfAKind(dice, 4)) return true;
  // フルハウス: only when holding 5
  if (diceCount === 5 && isFullHouse(dice)) return true;
  return false;
}

export function getTripleEffects(dice: DieValue[], player: PlayerId): SpecialEffect[] {
  const counts = countValues(dice);
  const effects: SpecialEffect[] = [];

  for (const [value, count] of counts) {
    if (count >= 3) {
      let type: SpecialEffectType | null = null;
      switch (value) {
        case 2: type = 'swap_all'; break;
        case 3: type = 'add_removed_3'; break;
        case 4: type = 'add_removed_4'; break;
        case 5: type = 'five_choice'; break;
      }
      if (type) {
        effects.push({ type, player });
      }
    }
  }

  return effects;
}

export function countOnes(dice: DieValue[]): number {
  return dice.filter(d => d === 1).length;
}

export function countSixes(dice: DieValue[]): number {
  return dice.filter(d => d === 6).length;
}

// Die face SVG dots positions for rendering
export const dieFacePositions: Record<DieValue, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};
