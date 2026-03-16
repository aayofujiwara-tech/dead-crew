/**
 * Direct DOM animation for dice.
 * Completely bypasses React state to avoid render-timing issues.
 */

function wait(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Fade a die out in place (for 1s — ghost/remove) */
export async function animateDiceRemove(diceId: string): Promise<void> {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  if (!el) return;
  el.style.transition = 'all 300ms ease-out';
  el.style.transform = 'scale(0) translateY(-30px)';
  el.style.opacity = '0';
  await wait(300);
}

/** Move a die toward the target player area (for 6s — push/transfer) */
export async function animateDiceTransfer(
  diceId: string,
  targetSelector: string,
): Promise<void> {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  const target = document.querySelector(targetSelector) as HTMLElement | null;
  if (!el || !target) return;

  const fromRect = el.getBoundingClientRect();
  const toRect = target.getBoundingClientRect();
  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);

  el.style.transition = 'all 400ms ease-in-out';
  el.style.transform = `translate(${dx}px, ${dy}px) scale(0.8)`;
  el.style.opacity = '0.5';
  await wait(350);
  el.style.opacity = '0';
  await wait(50);
}

/** Hide a die instantly (cleanup after animation) */
export function hideDice(diceId: string): void {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = '0';
}

/** Reset all inline styles set by animations */
export function resetDiceStyles(): void {
  document.querySelectorAll('[data-dice-id]').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.transition = '';
    htmlEl.style.transform = '';
    htmlEl.style.opacity = '';
  });
}
