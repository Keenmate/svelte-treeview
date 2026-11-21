/**
 * The one "close on scroll" rule for core's floating layers (`createPopover()`, `openMenu()`):
 * like a native `<select>`, close when the user scrolls the content the layer belongs to —
 *   - never a scroll inside the layer itself (its own list);
 *   - only a scroll of the page or of a scroller AROUND the reference (an unrelated scroller —
 *     a log panel auto-scrolling, a sidebar list — doesn't count);
 *   - only once the reference has actually moved (≥ 3px) since the watch started: a scroll event
 *     can arrive a frame late (a scroll that finished just before the click that opened it);
 *   - never a scroll the browser makes as part of opening: WebKit fires `focus` — which opens a
 *     focus-triggered popover — BEFORE it scrolls the focused input into view. Only when the focused
 *     element is the reference (or inside it) and is not fully visible at the start, a scroll in the
 *     first two frames moves the baseline instead of closing. Otherwise there is no such window: a
 *     real scroll right after opening (a page scrolling, the user) closes as usual.
 * `scroll` doesn't cross a shadow boundary, so it listens on the document and on every shadow
 * root between it and the reference.
 */
import { deepActiveElement } from '../dom/active-element.js';
import { composedParent } from '../dom/composed-tree.js';

type Rectish = { getBoundingClientRect(): DOMRect | { top: number; left: number } };

export interface ScrollCloseOptions {
  /** What the layer is attached to; a virtual reference (no element) moves only with the page. */
  reference: Element | Rectish;
  /** Is the scroll event inside the layer (its panels)? Those never close it. */
  isInside(event: Event): boolean;
  /** Called for a scroll that counts (it may be called again; make it idempotent). */
  onScroll(event: Event): void;
}

/** The document plus every shadow root between it and `node`. */
export function scrollRoots(node: Node | null): (Document | ShadowRoot)[] {
  const roots: (Document | ShadowRoot)[] = [];
  for (let n: Node | null = node; n; ) {
    const root = n.getRootNode();
    if (!(root instanceof ShadowRoot)) break;
    roots.push(root);
    n = root.host;
  }
  if (typeof document !== 'undefined') roots.push(document);
  return roots;
}

/**
 * How far (CSS px) the reference must move to count as scrolled away. Under it is the browser
 * rounding a position: Firefox follows its scroll-into-view of a focused field with a 1px
 * correction scroll 10–25 ms later, which closed a Tab-opened dropdown. A user scroll is far larger
 * (and adds up — the baseline doesn't move).
 */
const MIN_MOVE = 3;

/** Is `el` fully inside the viewport and every clipping (non-`visible` overflow) ancestor? */
function isFullyVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  const inside = (top: number, left: number, bottom: number, right: number): boolean =>
    rect.top >= top && rect.left >= left && rect.bottom <= bottom && rect.right <= right;
  if (!inside(0, 0, window.innerHeight, window.innerWidth)) return false;
  for (let n = composedParent(el); n && n !== document.documentElement && n !== document.body; n = composedParent(n)) {
    const style = getComputedStyle(n);
    if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
    const clip = n.getBoundingClientRect();
    if (!inside(clip.top, clip.left, clip.bottom, clip.right)) return false;
  }
  return true;
}

/**
 * Can the browser still scroll as part of this open? Only its scroll-into-view of a focused
 * element the layer belongs to, and only when that element isn't fully in view yet.
 */
function canFocusScroll(element: Element | null): boolean {
  if (!element) return false;
  const focused = deepActiveElement();
  if (!focused || (focused !== element && !element.contains(focused))) return false;
  return !isFullyVisible(focused);
}

/** Start watching; returns the stop. SSR-safe (no document → a no-op stop). */
export function watchScrollClose(opts: ScrollCloseOptions): () => void {
  if (typeof document === 'undefined') return () => {};
  const { reference } = opts;
  const element = reference instanceof Element ? reference : null;
  const spot = (): { top: number; left: number } => {
    const rect = reference.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  };
  let startedAt = spot();
  /** The opening frames of a focus-opened layer: scrolls re-baseline instead of closing (see the file comment). */
  let isSettling = canFocusScroll(element);
  const settle = (): void => {
    isSettling = false;
    // The browser may have moved the page already and deliver the scroll event later (WebKit, or a
    // throttled / faked rAF ending the window first): where the reference is now is the baseline.
    startedAt = spot();
  };
  let cancelSettle = (): void => {};
  if (isSettling) {
    const raf = typeof requestAnimationFrame === 'function' && document.visibilityState !== 'hidden' ? requestAnimationFrame : null;
    if (raf) {
      let id = raf(() => (id = raf(settle)));
      cancelSettle = () => cancelAnimationFrame(id);
    } else {
      const id = setTimeout(settle, 50);
      cancelSettle = () => clearTimeout(id);
    }
  }
  const hasMoved = (): boolean => {
    const now = spot();
    return Math.abs(now.top - startedAt.top) >= MIN_MOVE || Math.abs(now.left - startedAt.left) >= MIN_MOVE;
  };
  /** The document / window, or a scroller that contains the reference (across shadow roots). */
  const isAroundReference = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return true;
    if (!element) return false; // a virtual reference: only the page moves it
    for (let n: Element | null = element; n; n = composedParent(n)) if (n === target) return true;
    return false;
  };
  const onScroll = (event: Event): void => {
    if (opts.isInside(event)) return;
    if (!isAroundReference(event.target)) return;
    if (isSettling) {
      startedAt = spot(); // the browser placing things as the layer opens — not the user leaving
      return;
    }
    if (!hasMoved()) return;
    opts.onScroll(event);
  };
  const roots = scrollRoots(element);
  for (const root of roots) root.addEventListener('scroll', onScroll, { capture: true, passive: true });
  return () => {
    cancelSettle();
    for (const root of roots) root.removeEventListener('scroll', onScroll, { capture: true });
  };
}
