/**
 * Keep a fullscreen overlay panel sitting *above* the soft keyboard by tracking
 * `window.visualViewport` (SPEC §12.9). A fullscreen sheet is typically
 * `position: fixed; inset: 0; height: 100dvh` — but on both iOS Safari and modern
 * Android Chrome the on-screen keyboard OVERLAYS the layout viewport (`dvh` is
 * unchanged), so the bottom of a scrolling list would hide behind the keyboard.
 * Pinning the panel to the *visual* viewport (its shrunken height + scroll offset)
 * makes a flex column reflow: the header stays put and the body shrinks to the
 * space that's actually visible, scrolling within it. When the keyboard closes,
 * `visualViewport.height` grows back and the panel expands to fill the sheet again.
 *
 * The panel MUST be a `position: fixed` flex column for the reflow to work; this
 * helper only writes its inline `height`/`top`. Coalesced to one write per frame.
 * No-op (returns a no-op cleanup) where `visualViewport` is unavailable — the
 * overlay keeps its full-height behaviour and the keyboard overlays the list.
 */

import { createFrameScheduler } from '../dom/frame-scheduler.js';

/**
 * Track the soft keyboard and pin `panel`'s bottom edge to the top of the
 * keyboard while it's open. Returns a cleanup that detaches the listeners and
 * puts back the inline `height` / `top` the panel had before (empty → the stylesheet's).
 * Uses the panel's own window (an iframe panel tracks its iframe), and leaves the panel
 * alone while the user has pinch-zoomed (`visualViewport.scale !== 1`: the visual
 * viewport is then smaller than the screen for a reason other than the keyboard).
 */
export function observeKeyboardInset(panel: HTMLElement): () => void {
  const view = panel.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);
  const vv = view?.visualViewport ?? null;
  if (!vv) return () => {};
  const previous = { height: panel.style.height, top: panel.style.top };

  const frame = createFrameScheduler(() => {
    if (vv.scale !== 1) return; // pinch-zoomed: keep the last size (review V-14)
    // vv.height is the viewport area NOT covered by the keyboard; offsetTop is how
    // far the visual viewport has scrolled down within the layout viewport (iOS
    // shifts it to bring the focused field into view). Together they land the
    // panel's bottom edge exactly at the top of the keyboard.
    panel.style.height = `${vv.height}px`;
    panel.style.top = `${vv.offsetTop}px`;
  });
  const schedule = (): void => frame.schedule();

  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  schedule();

  return () => {
    vv.removeEventListener('resize', schedule);
    vv.removeEventListener('scroll', schedule);
    frame.cancel(); // else a queued frame re-applies the inline height after cleanup
    panel.style.height = previous.height;
    panel.style.top = previous.top;
  };
}
