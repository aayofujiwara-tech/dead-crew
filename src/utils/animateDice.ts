/**
 * Dice animation using the Web Animations API (WAAPI).
 *
 * Key design decisions:
 * - WAAPI instead of CSS transitions: el.animate() always runs from explicit
 *   start→end keyframes regardless of style batching, so animations never skip.
 * - fill:'forwards' keeps the final state applied after animation completes.
 * - Backup inline styles (opacity/visibility) set AFTER animation to survive
 *   React re-renders that might briefly disrupt the WAAPI fill effect.
 * - resetDiceStyles cancels WAAPI AND clears backup inline styles.
 */

export function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Wait for the next animation frame.
 * Ensures the browser has painted the current DOM state before we start
 * animating, so highlights are visible before dice move.
 */
function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Shrink and fade a die out in place (for 1s — ghost/remove) */
export async function animateDiceRemove(diceId: string): Promise<void> {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  if (!el) return;

  const anim = el.animate(
    [
      { transform: 'scale(1) translateY(0)', opacity: 1 },
      { transform: 'scale(0) translateY(-30px)', opacity: 0 },
    ],
    { duration: 300, easing: 'ease-out', fill: 'forwards' },
  );

  try {
    await anim.finished;
  } catch {
    // Animation was canceled (e.g. element removed) — that's fine
  }

  // Backup: inline styles survive React re-renders even if WAAPI fill flickers
  el.style.opacity = '0';
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

  const anim = el.animate(
    [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: `translateY(${dy}px)`, opacity: 0 },
    ],
    // ease-out: fast start → gradual slowdown. The dice visibly shoots away
    // immediately instead of the old ease-in that sat still then vanished.
    { duration: 400, easing: 'ease-out', fill: 'forwards' },
  );

  try {
    await anim.finished;
  } catch {
    // Animation was canceled (e.g. element removed) — that's fine
  }

  // Backup: inline styles survive React re-renders even if WAAPI fill flickers
  el.style.opacity = '0';
  el.style.visibility = 'hidden';
}

/**
 * Wait for highlight colors to paint before starting movement animations.
 * Call this after React's setShowEffects(true) has been flushed.
 */
export async function waitForHighlightPaint(): Promise<void> {
  await nextFrame();
}

/** Cancel all WAAPI animations AND clear backup inline styles on dice elements */
export function resetDiceStyles(): void {
  document.querySelectorAll('[data-dice-id]').forEach(el => {
    // Cancel WAAPI animations (removes fill:forwards effect)
    el.getAnimations().forEach(a => a.cancel());
    // Clear backup inline styles
    const htmlEl = el as HTMLElement;
    htmlEl.style.opacity = '';
    htmlEl.style.visibility = '';
  });
}
