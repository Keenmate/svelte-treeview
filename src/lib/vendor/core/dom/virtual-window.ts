/**
 * Virtual window (SPEC §12.26): render only the rows in (and around) the visible part of a long
 * list of FIXED-height rows. web-multiselect (absolute rows), web-treeview (spacer + translated
 * content) and web-grid (table spacer rows) each had a copy of the range math, the resize watch and
 * the index → scroll jump.
 *
 * Core computes the range and calls `render({ start, end, offsetTop, totalHeight, window })`; the
 * component renders rows `start … end - 1` (end exclusive) into `window`. By default core builds the
 * structure inside the scroller:
 *
 * ```
 * scroller (overflow: auto — the component's)
 *   └─ .km-virtual-spacer  (position: relative; height: count × rowHeight)
 *        └─ .km-virtual-window (position: absolute; top: 0; inset-inline: 0; translateY(offsetTop))
 * ```
 *
 * `hasStructure: false` (a `<table>`) builds nothing: `window` is `null` and the component sizes its
 * own spacers from `offsetTop` / `totalHeight`.
 */

import { getScrollTopForBox, scrollContainerToBox } from './scroll-container.js';
import { observeElementSize } from '../environment/element-size.js';
import { runSafely } from '../logging/safe-call.js';

export interface VirtualRange {
  /** First rendered index. */
  start: number;
  /** One past the last rendered index. */
  end: number;
}

export interface VirtualRenderContext extends VirtualRange {
  /** Content offset of row `start`, px (`start × rowHeight`) — the window's translate. */
  offsetTop: number;
  /** `count × rowHeight`, px — the spacer height. */
  totalHeight: number;
  /** Where the rows go (`null` with `hasStructure: false`). */
  window: HTMLElement | null;
  /**
   * `getPinned()` indexes OUTSIDE `start … end - 1` (ascending, `< count`): rows that must stay in the DOM while
   * scrolled away (a row being edited keeps its focus / input). The component keeps their elements alive —
   * e.g. absolutely placed at `index × rowHeight` in the spacer, or a table row between its spacer rows.
   */
  pinned: number[];
}

export interface VirtualWindowOptions {
  getCount: () => number;
  /** Row height, px (a function when it comes from CSS / density and may change — read on every compute). */
  rowHeight: number | (() => number);
  /** Rows rendered above and below the visible ones (default `5`). */
  overscan?: number;
  render: (ctx: VirtualRenderContext) => void;
  /**
   * Height of a sticky header INSIDE the scroller that covers the top rows (a grid's `thead`), px —
   * `scrollToIndex` keeps a row out from under it.
   */
  insetTop?: number | (() => number);
  /** Build the spacer + window (default `true`); `false` = the component lays the rows out itself. */
  hasStructure?: boolean;
  /**
   * With `hasStructure: false`: where row 0 starts in the scroller's content, px (a `<thead>` inside the scroller
   * pushes the rows down by its height). Default `0`. With the structure core measures the spacer instead.
   */
  listTop?: number | (() => number);
  /** Log source for a throwing `render` (default: the scroller). */
  logSource?: unknown;
  /** Indexes that stay rendered outside the visible range (see `VirtualRenderContext.pinned`); read on every compute. */
  getPinned?: () => readonly number[];
}

export interface VirtualRangeInput {
  /** The scroller's `scrollTop` minus the list's top in its content, px. */
  scrollTop: number;
  /** The visible height, px. */
  viewport: number;
  count: number;
  rowHeight: number;
  overscan?: number;
}

/**
 * The pure range math under `createVirtualWindow` — for a component that measures and renders on its own
 * schedule: the rows in `[scrollTop, scrollTop + viewport]`, `overscan` more on each side, clamped to `count`.
 */
export function computeVirtualRange({ scrollTop, viewport, count, rowHeight, overscan = 5 }: VirtualRangeInput): VirtualRange {
  const n = Math.max(0, Math.floor(count));
  const h = Math.max(1, rowHeight);
  const first = Math.floor(Math.max(0, scrollTop) / h);
  const last = Math.ceil(Math.max(0, scrollTop + viewport) / h);
  return { start: Math.max(0, Math.min(n, first - overscan)), end: Math.max(0, Math.min(n, last + overscan)) };
}

export interface VirtualWindow {
  /** The rendered range. */
  readonly range: VirtualRange;
  /** The rows' container (`null` with `hasStructure: false`). */
  readonly window: HTMLElement | null;
  /** The count / row height / data changed: recompute and render (always renders). */
  refresh(): void;
  /** Scroll so row `index` is in view (`block: 'nearest'` default; `'auto'` behaviour renders at once). */
  scrollToIndex(index: number, options?: { block?: ScrollLogicalPosition; behavior?: ScrollBehavior }): void;
  /** The row index under a viewport `clientY`, or `-1` (outside the rows). */
  indexAt(clientY: number): number;
  /** Remove the structure and listeners. */
  destroy(): void;
}

const read = (value: number | (() => number) | undefined, fallback: number): number => {
  const n = typeof value === 'function' ? value() : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function createVirtualWindow(scroller: HTMLElement, options: VirtualWindowOptions): VirtualWindow {
  const { getCount, render, overscan = 5, hasStructure = true } = options;
  const logSource = options.logSource ?? scroller;
  let spacer: HTMLElement | null = null;
  let windowEl: HTMLElement | null = null;
  if (hasStructure) {
    const doc = scroller.ownerDocument;
    spacer = doc.createElement('div');
    spacer.className = 'km-virtual-spacer';
    spacer.style.cssText = 'position: relative; inline-size: 100%;';
    windowEl = doc.createElement('div');
    windowEl.className = 'km-virtual-window';
    windowEl.style.cssText = 'position: absolute; top: 0; inset-inline: 0;';
    spacer.append(windowEl);
    scroller.append(spacer);
  }
  let range: VirtualRange = { start: 0, end: 0 };
  let lastViewport = 0;
  let isDestroyed = false;

  const rowHeight = (): number => Math.max(1, read(options.rowHeight, 1));
  const count = (): number => Math.max(0, Math.floor(read(getCount(), 0)));
  /** The list's top in the scroller's content (a header above the spacer inside the scroller). */
  const listTop = (): number => {
    if (!spacer) return read(options.listTop, 0);
    const a = spacer.getBoundingClientRect();
    const b = scroller.getBoundingClientRect();
    return a.top - b.top + scroller.scrollTop - scroller.clientTop;
  };

  const compute = (): VirtualRange => {
    const n = count();
    const h = rowHeight();
    const viewport = scroller.clientHeight || lastViewport;
    if (scroller.clientHeight) lastViewport = scroller.clientHeight;
    if (!viewport) return { start: 0, end: Math.min(n, overscan * 2 + 1) }; // hidden / not laid out yet
    return computeVirtualRange({ scrollTop: scroller.scrollTop - listTop(), viewport, count: n, rowHeight: h, overscan });
  };

  /** Pinned indexes outside `r`, valid and ascending. */
  const pinnedFor = (r: VirtualRange): number[] => {
    if (!options.getPinned) return [];
    const n = count();
    const list = runSafely(() => options.getPinned!(), { source: logSource, message: 'virtual window getPinned threw' });
    const raw = list.isOk && Array.isArray(list.value) ? list.value : [];
    return [...new Set(raw.map((i) => Math.floor(i)))].filter((i) => i >= 0 && i < n && (i < r.start || i >= r.end)).sort((a, b) => a - b);
  };
  let pinnedKey = '';

  const paint = (next: VirtualRange, pinned: number[] = pinnedFor(next)): void => {
    range = next;
    pinnedKey = pinned.join(',');
    const h = rowHeight();
    const totalHeight = count() * h;
    const offsetTop = next.start * h;
    if (spacer && windowEl) {
      spacer.style.blockSize = `${totalHeight}px`;
      windowEl.style.transform = `translateY(${offsetTop}px)`;
    }
    runSafely(() => render({ ...next, offsetTop, totalHeight, window: windowEl, pinned }), { source: logSource, message: 'virtual window render threw' });
  };

  const update = (isForced: boolean): void => {
    if (isDestroyed) return;
    const next = compute();
    const pinned = pinnedFor(next);
    if (isForced || next.start !== range.start || next.end !== range.end || pinned.join(',') !== pinnedKey) paint(next, pinned);
  };

  const onScroll = (): void => update(false);
  scroller.addEventListener('scroll', onScroll, { passive: true });
  const stopSize = observeElementSize(scroller, () => update(false), { shouldFireImmediately: false });
  paint(compute());

  return {
    get range() {
      return { ...range };
    },
    get window() {
      return windowEl;
    },
    refresh: () => update(true),
    scrollToIndex(index, opts = {}) {
      const n = count();
      if (!n) return;
      const h = rowHeight();
      const i = Math.max(0, Math.min(n - 1, Math.floor(index)));
      const box = { top: listTop() + i * h, height: h };
      const insetTop = read(options.insetTop, 0);
      if (getScrollTopForBox(scroller, box, { block: opts.block, insetTop }) === null) return;
      scrollContainerToBox(scroller, box, { block: opts.block, insetTop, behavior: opts.behavior });
      if ((opts.behavior ?? 'auto') === 'auto') update(false); // render now, not on the scroll event
    },
    indexAt(clientY) {
      const b = scroller.getBoundingClientRect();
      const y = clientY - b.top - scroller.clientTop + scroller.scrollTop - listTop();
      if (clientY < b.top || clientY > b.bottom || y < 0) return -1;
      const index = Math.floor(y / rowHeight());
      return index < count() ? index : -1;
    },
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      scroller.removeEventListener('scroll', onScroll);
      stopSize();
      spacer?.remove();
    },
  };
}
