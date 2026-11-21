/**
 * Lock page scroll behind a fullscreen overlay (SPEC §12.9). A single ref-counted
 * lock that PINS `document.body`: the first lock records the page's scroll position
 * and the body's inline styles, then sets `position: fixed` with `top` / `left` at
 * minus the scroll offset (the page looks unmoved) plus `overflow: hidden`; the last
 * release restores the styles and jumps back to the recorded position (instantly,
 * even under `scroll-behavior: smooth`). `overflow: hidden` alone is ignored by iOS
 * Safari for touch scrolling; a pinned body can't scroll anywhere. `<html>` also gets
 * `overflow-x: hidden` while locked: a page wider than the phone screen would otherwise keep the
 * browser zoomed out to fit it, and a fullscreen sheet would be drawn too small / under the
 * system bar (sweep OV-2; web-multiselect did this on its own).
 *
 * Ref-counting makes it safe when several overlays (or several component instances)
 * are open at once — page scroll stays locked until the *last* one closes. The state
 * lives on `globalThis[Symbol.for('km-scroll-lock')]` (see {@link ScrollLockState}), so
 * every bundled copy of core — and non-core code such as pure-css, which uses the
 * same key and shape — shares ONE count and one saved snapshot.
 *
 * SSR-safe: with no `document` (or no `<body>` yet) it's a no-op returning a no-op release.
 */

import { sharedState } from '../global/shared-state.js';
import { once } from '../dom/once.js';

/** The body inline styles the lock writes (and restores). */
const PINNED_PROPERTIES = ['position', 'top', 'left', 'right', 'width', 'overflow', 'padding-right'] as const;
/** The `<html>` inline styles the lock writes (and restores). */
const ROOT_PROPERTIES = ['overflow-x'] as const;

/**
 * Shared lock state, `globalThis[Symbol.for('km-scroll-lock')]`. A documented shape:
 * other libraries may join the same lock by incrementing `count` (and, on the 0→1
 * transition, filling `saved` and pinning the body exactly like core does).
 */
export interface ScrollLockState {
  /** How many active locks are holding page scroll shut. */
  count: number;
  /** Captured on the 0→1 transition, restored on 1→0; `null` while unlocked. */
  saved: {
    scrollX: number;
    scrollY: number;
    /** The body's inline value of each pinned property (`''` = none). */
    style: Record<string, string>;
    /**
     * The element that was pinned (optional; absent = `document.body` at release). Release
     * restores THIS element, so a page that swapped `<body>` meanwhile keeps the new body's
     * own styles and the old one isn't left `position: fixed` (review V-19 #6).
     */
    body?: HTMLElement;
    /**
     * `<html>`'s inline value of each property the lock sets on it (`overflow-x`; `''` = none).
     * Optional: a joiner that didn't fill it (an older copy, pure-css before its port) leaves
     * `<html>` untouched on release.
     */
    rootStyle?: Record<string, string>;
  } | null;
}

const STATE_KEY = 'km-scroll-lock';

function state(): ScrollLockState {
  return sharedState(STATE_KEY, () => ({ count: 0, saved: null }));
}

function pin(body: HTMLElement): void {
  const view = body.ownerDocument.defaultView;
  const scrollX = view?.scrollX ?? 0;
  const scrollY = view?.scrollY ?? 0;
  const style: Record<string, string> = {};
  for (const prop of PINNED_PROPERTIES) style[prop] = body.style.getPropertyValue(prop);
  const root = body.ownerDocument.documentElement;
  const rootStyle: Record<string, string> = {};
  for (const prop of ROOT_PROPERTIES) rootStyle[prop] = root.style.getPropertyValue(prop);
  state().saved = { scrollX, scrollY, style, body, rootStyle };

  // Measure the root's content width before and after pinning: the difference is exactly the
  // vertical scrollbar that disappeared (a classic desktop scrollbar), 0 with overlay scrollbars,
  // touch devices or `scrollbar-gutter: stable`. NOT `innerWidth - clientWidth`: on a phone page
  // wider than the screen the browser zooms out, `innerWidth` follows the zoomed-out visual
  // viewport, and that difference is the horizontal overflow, not a scrollbar.
  const widthBefore = root.clientWidth;
  body.style.setProperty('position', 'fixed');
  body.style.setProperty('top', `${-scrollY}px`);
  body.style.setProperty('left', `${-scrollX}px`);
  body.style.setProperty('right', '0');
  body.style.setProperty('width', '100%');
  body.style.setProperty('overflow', 'hidden');
  root.style.setProperty('overflow-x', 'hidden');
  const scrollbar = widthBefore > 0 ? root.clientWidth - widthBefore : 0;
  if (scrollbar > 0 && view) {
    // Pad the body by it so the content doesn't jump sideways while the lock holds.
    const padding = parseFloat(view.getComputedStyle(body).paddingRight) || 0;
    body.style.setProperty('padding-right', `${padding + scrollbar}px`);
  }
}

function unpin(current: HTMLElement): void {
  const s = state();
  const saved = s.saved;
  s.saved = null;
  if (!saved) return;
  const body = saved.body ?? current;
  for (const prop of PINNED_PROPERTIES) {
    const value = saved.style[prop];
    if (value) body.style.setProperty(prop, value);
    else body.style.removeProperty(prop);
  }
  if (saved.rootStyle) {
    const root = body.ownerDocument.documentElement;
    for (const prop of ROOT_PROPERTIES) {
      const value = saved.rootStyle[prop];
      if (value) root.style.setProperty(prop, value);
      else root.style.removeProperty(prop);
    }
  }
  const view = current.ownerDocument.defaultView;
  try {
    // 'instant' beats a page-level `scroll-behavior: smooth` — the jump back must not animate.
    view?.scrollTo({ left: saved.scrollX, top: saved.scrollY, behavior: 'instant' as ScrollBehavior });
  } catch {
    // No layout engine (jsdom) — nothing to restore.
  }
}

/**
 * Lock page scroll and return a release function. Idempotent per call: the returned
 * release runs at most once, so a double-release can't unbalance the ref count. The
 * body is unpinned and the scroll position restored only when the final lock releases.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined' || !document.body) return () => {};

  const s = state();
  if (s.count === 0) pin(document.body);
  s.count++;

  return once(() => {
    const current = state();
    current.count = Math.max(0, current.count - 1);
    if (current.count === 0 && typeof document !== 'undefined' && document.body) unpin(document.body);
  });
}

/** Test-only: force-release all locks and restore the body immediately. */
export function __resetScrollLock(): void {
  if (typeof document !== 'undefined' && document.body) unpin(document.body);
  const s = state();
  s.count = 0;
  s.saved = null;
}
