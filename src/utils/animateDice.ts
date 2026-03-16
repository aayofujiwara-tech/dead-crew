/**
 * Direct DOM animation for dice.
 * Outgoing animations (1s remove, 6s transfer-out) use inline styles
 * to avoid React state/render timing issues.
 * Incoming animations use React state + CSS classes (see DiceDisplay).
 */

export function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Fade a die out in place (for 1s — ghost/remove) */
export async function animateDiceRemove(diceId: string): Promise<void> {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  if (!el) return;
  el.style.transition = 'all 300ms ease-out';
  el.style.transform = 'scale(0) translateY(-30px)';
  el.style.opacity = '0';
  await waitMs(300);
  // Lock hidden — prevent flash when React re-renders
  el.style.transition = 'none';
  el.style.visibility = 'hidden';
}

/**
 * Slide a die out toward center and fade (for 6s — transfer).
 * direction 'up' = P1's dice slide up toward center
 * direction 'down' = P2's dice slide down toward center
 */
export async function animateDiceTransferOut(
  diceId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  if (!el) return;

  const dy = direction === 'up' ? -60 : 60;
  el.style.transition = 'all 400ms ease-in';
  el.style.transform = `translateY(${dy}px)`;
  el.style.opacity = '0';
  await waitMs(400);
  // Lock hidden — prevent flash when React re-renders
  el.style.transition = 'none';
  el.style.visibility = 'hidden';
}

/** Reset all inline styles set by DOM animations */
export function resetDiceStyles(): void {
  document.querySelectorAll('[data-dice-id]').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.transition = '';
    htmlEl.style.transform = '';
    htmlEl.style.opacity = '';
    htmlEl.style.visibility = '';
  });
}
