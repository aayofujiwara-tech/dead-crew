/**
 * Dice animation using the Web Animations API (WAAPI).
 *
 * Previous approach set inline CSS transition + transform + opacity in the same
 * microtask, which caused browsers to batch the style changes and skip the
 * transition entirely — the dice just vanished instantly instead of animating.
 *
 * WAAPI avoids this problem because el.animate() always runs from the explicit
 * start keyframe to the end keyframe, regardless of the current computed style.
 * fill:'forwards' keeps the final state (opacity:0) applied until the animation
 * is explicitly canceled, so no visibility:hidden hack is needed either.
 */

export function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
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
    { duration: 400, easing: 'ease-in', fill: 'forwards' },
  );

  try {
    await anim.finished;
  } catch {
    // Animation was canceled (e.g. element removed) — that's fine
  }
}

/** Cancel all WAAPI animations on dice elements, restoring their original state */
export function resetDiceStyles(): void {
  document.querySelectorAll('[data-dice-id]').forEach(el => {
    el.getAnimations().forEach(a => a.cancel());
  });
}
