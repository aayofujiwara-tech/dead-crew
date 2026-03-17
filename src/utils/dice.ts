import type { DieValue, SpecialEffect, SpecialEffectType, PlayerId, DieHighlight } from '../types/game';

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
  const counts = countValues(dice);
  const values = Array.from(counts.values()).sort();
  return values.length === 2 && values[0] === 2 && values[1] === 3;
}

export function isDoubleTriple(dice: DieValue[]): boolean {
  const counts = countValues(dice);
  const values = Array.from(counts.values()).sort();
  return values.length === 2 && values[0] === 3 && values[1] === 3;
}

export interface InstantWinResult {
  name: string;
  points: number;
  isRare: boolean;
}

export function checkInstantWin(dice: DieValue[]): boolean {
  return getInstantWinCondition(dice) !== null;
}

export function getInstantWinCondition(dice: DieValue[]): InstantWinResult | null {
  if (dice.length === 0) return null;

  // 6個ぞろ目: 6 dice all the same (rare, 2 points)
  if (dice.length === 6 && hasNOfAKind(dice, 6)) {
    return { name: '6個ぞろ目', points: 2, isRare: true };
  }

  // 5個ぞろ目: 5+ dice the same (rare when exactly 5 dice)
  if (hasNOfAKind(dice, 5)) {
    const rare = dice.length === 5;
    return { name: '5個ぞろ目', points: rare ? 2 : 1, isRare: rare };
  }

  // 4個ぞろ目
  if (hasNOfAKind(dice, 4)) {
    return { name: '4個ぞろ目', points: 1, isRare: false };
  }

  // ダブルトリプル: 3+3, implicitly 6 dice (rare, 2 points)
  if (isDoubleTriple(dice)) {
    return { name: 'ダブルトリプル', points: 2, isRare: true };
  }

  // フルハウス: 3+2, implicitly 5 dice
  if (isFullHouse(dice)) {
    return { name: 'フルハウス', points: 1, isRare: false };
  }

  return null;
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

export function computeDiceHighlights(dice: DieValue[]): DieHighlight[] {
  const counts = countValues(dice);
  return dice.map(v => {
    if (v === 1) return 'ghost';
    if (v === 6) return 'push';
    if (counts.get(v)! >= 3 && v >= 2 && v <= 5) return 'triple';
    return 'normal';
  });
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
