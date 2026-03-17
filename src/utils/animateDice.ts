/**
 * Dice animation using the Web Animations API (WAAPI).
 *
 * Key design decisions:
 * - WAAPI instead of CSS transitions: el.animate() always runs from explicit
 *   start→end keyframes regardless of style batching, so animations never skip.
 * - fill:'forwards' keeps the final state applied after animation completes.
 * - During animation, dice are lifted to position:absolute so they don't
 *   affect the layout of adjacent dice. A same-sized placeholder is inserted
 *   to preserve the original space.
 * - resetDiceStyles cancels WAAPI, clears inline styles, AND removes placeholders.
 */

export function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Wait for the next animation frame (double-rAF).
 * Ensures the browser has painted the current DOM state before we start
 * animating, so highlights are visible before dice move.
 */
function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/**
 * Lift an element to position:absolute so it no longer affects flex layout.
 * A same-sized placeholder is inserted at its original position.
 */
function liftToAbsolute(el: HTMLElement): void {
  // Measure before changing position
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const left = el.offsetLeft;
  const top = el.offsetTop;

  // Insert a placeholder to hold the space in the flex layout
  const placeholder = document.createElement('div');
  placeholder.style.width = `${width}px`;
  placeholder.style.height = `${height}px`;
  placeholder.style.flexShrink = '0';
  placeholder.dataset.dicePlaceholder = el.dataset.diceId ?? '';
  el.parentNode!.insertBefore(placeholder, el);

  // Lift to absolute — element now floats above the layout
  el.style.position = 'absolute';
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.pointerEvents = 'none';
  el.style.zIndex = '10';
}

/** Shrink and fade a die out in place (for 1s — ghost/remove) */
export async function animateDiceRemove(diceId: string): Promise<void> {
  const el = document.querySelector(`[data-dice-id="${diceId}"]`) as HTMLElement | null;
  if (!el) return;

  liftToAbsolute(el);

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

  liftToAbsolute(el);

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

/**
 * Cancel all WAAPI animations, clear backup inline styles on dice elements,
 * and remove any placeholders that were inserted during animation.
 */
export function resetDiceStyles(): void {
  // Remove placeholders
  document.querySelectorAll('[data-dice-placeholder]').forEach(el => el.remove());

  // Reset dice elements
  document.querySelectorAll('[data-dice-id]').forEach(el => {
    // Cancel WAAPI animations (removes fill:forwards effect)
    el.getAnimations().forEach(a => a.cancel());
    // Clear all inline styles set during animation
    const h = el as HTMLElement;
    h.style.opacity = '';
    h.style.visibility = '';
    h.style.position = '';
    h.style.left = '';
    h.style.top = '';
    h.style.width = '';
    h.style.height = '';
    h.style.pointerEvents = '';
    h.style.zIndex = '';
  });
}
