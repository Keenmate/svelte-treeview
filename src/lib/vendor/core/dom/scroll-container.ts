/**
 * Container scroll (SPEC §12.15): bring an inner element into view by scrolling the ONE
 * container around it, never the page. `Element.scrollIntoView()` scrolls every scrollable
 * ancestor (the page included), so a search jump or a keyboard move made the whole page jump.
 *
 * Zero dependencies, SSR-safe (no `document` → `null`, nothing happens). Works on the element's
 * own document, so an element inside an iframe is measured against that iframe.
 *
 * Limits: a CSS-scaled container (`transform: scale`, a zoomed preview) scrolls by the unscaled
 * amount; vertical writing modes aren't handled; only the innermost scroller moves (a scroller
 * clipped inside an outer one stays out of sight unless `shouldRevealContainer`).
 */

import { composedParent } from './composed-tree.js';

/** Which overflow axis makes an ancestor a scroll container. */
export type ScrollAxis = 'y' | 'x' | 'both';

export interface FindScrollContainerOptions {
  /** Stop the walk at this element (exclusive) — e.g. a component's own root when only its
   *  internal scroller may be used. Default: walk until `<body>`. */
  stopAt?: Element | null;
  /** The axis that must scroll: `'y'` (default), `'x'`, or `'both'` (either one). */
  axis?: ScrollAxis;
}

export interface ScrollIntoContainerOptions extends FindScrollContainerOptions {
  /** Vertical: `'nearest'` (default) scrolls only as far as needed — a fully visible element
   *  stays put; `'start'` / `'center'` / `'end'` align it. */
  block?: ScrollLogicalPosition;
  /** Same values, horizontal axis. Default `'nearest'`. */
  inline?: ScrollLogicalPosition;
  /** Default `'auto'` (instant). The caller decides (e.g. from its `--*-scroll-behavior` token). */
  behavior?: ScrollBehavior;
  /** Scroll this container instead of searching (a component that knows its scroller). */
  container?: HTMLElement | null;
  /** Also bring the container itself into the viewport (`'nearest'`) when it isn't fully
   *  visible — e.g. a jump to a search hit in a tree further down the page. Default `false`. */
  shouldRevealContainer?: boolean;
}

const SCROLLING_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/** Below this many pixels on both axes nothing moves — and `scrollTo()` isn't called at all: a
 *  redundant call can disturb a smooth scroll still running (e.g. the next key press while the
 *  list glides) and costs a scroll update for nothing. */
const MIN_DELTA = 1;

function isAvailable(): boolean {
  return typeof document !== 'undefined' && typeof getComputedStyle === 'function';
}

/** Flat-tree parent: a slotted node lays out inside its slot, so the slot's scroller is the
 *  one that moves it; otherwise the composed parent (shadow root → host). */
function flatParent(node: Element): Element | null {
  return node.assignedSlot ?? composedParent(node);
}

function isPage(el: Element, doc: Document): boolean {
  return el === doc.documentElement || el === doc.body || el === doc.scrollingElement;
}

/** The element's own window (an iframe's, not ours) — its `getComputedStyle` / `HTMLElement`. */
function viewOf(el: Element): (Window & typeof globalThis) | null {
  return (el.ownerDocument?.defaultView as (Window & typeof globalThis) | null) ?? null;
}

function scrollsOn(el: Element, style: CSSStyleDeclaration, axis: 'x' | 'y'): boolean {
  return axis === 'y'
    ? SCROLLING_OVERFLOW.has(style.overflowY) && el.scrollHeight > el.clientHeight
    : SCROLLING_OVERFLOW.has(style.overflowX) && el.scrollWidth > el.clientWidth;
}

/**
 * Nearest ancestor of `el` that ACTUALLY scrolls on `axis`: computed overflow `auto` | `scroll`
 * | `overlay` AND content larger than the box. Walks the flat tree (slot → shadow host → light
 * DOM), so a light-DOM wrapper around a custom element is found. Never returns `<html>`,
 * `<body>` or `document.scrollingElement` — the page is not a container. `null` = only the
 * page scrolls (or no DOM).
 */
export function findScrollContainer(el: Element, options: FindScrollContainerOptions = {}): HTMLElement | null {
  if (!isAvailable()) return null;
  const view = viewOf(el);
  if (!view) return null;
  const doc = el.ownerDocument;
  const { stopAt = null, axis = 'y' } = options;
  for (let node = flatParent(el); node; node = flatParent(node)) {
    if (node === stopAt || isPage(node, doc)) return null;
    if (!(node instanceof view.HTMLElement)) continue;
    const style = view.getComputedStyle(node);
    const matches =
      axis === 'both'
        ? scrollsOn(node, style, 'y') || scrollsOn(node, style, 'x')
        : scrollsOn(node, style, axis);
    if (matches) return node;
  }
  return null;
}

/** A computed length in px; a percentage (`scroll-padding: 10%`) resolves against `base`. */
function px(value: string, base = 0): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.trim().endsWith('%') ? (n / 100) * base : n;
}

/**
 * How far to scroll one axis so the target box [tStart, tEnd] sits in the view [vStart, vEnd].
 * `nearest` follows the CSSOM rules: a box already inside, or one larger than the view that
 * covers it, doesn't move; otherwise the closer edge aligns.
 */
function axisDelta(position: ScrollLogicalPosition, tStart: number, tEnd: number, vStart: number, vEnd: number): number {
  switch (position) {
    case 'start':
      return tStart - vStart;
    case 'end':
      return tEnd - vEnd;
    case 'center':
      return (tStart + tEnd) / 2 - (vStart + vEnd) / 2;
    default: {
      const isLarger = tEnd - tStart > vEnd - vStart;
      if (tStart < vStart && tEnd > vEnd) return 0;
      if (tStart < vStart) return isLarger ? tEnd - vEnd : tStart - vStart;
      if (tEnd > vEnd) return isLarger ? tStart - vStart : tEnd - vEnd;
      return 0;
    }
  }
}

/** Scroll the page (window) so `el` sits in the viewport — only the page, never a clip wrapper. */
function scrollPageTo(el: Element, view: Window, block: ScrollLogicalPosition, inline: ScrollLogicalPosition, behavior: ScrollBehavior): void {
  const root = el.ownerDocument.documentElement;
  const rootStyle = view.getComputedStyle(root);
  const height = root.clientHeight || view.innerHeight;
  const width = root.clientWidth || view.innerWidth;
  const target = el.getBoundingClientRect();
  const style = view.getComputedStyle(el);
  const dy = axisDelta(
    block,
    target.top - px(style.scrollMarginTop),
    target.bottom + px(style.scrollMarginBottom),
    px(rootStyle.scrollPaddingTop, height),
    height - px(rootStyle.scrollPaddingBottom, height),
  );
  const isRtl = rootStyle.direction === 'rtl';
  const dx = axisDelta(
    isRtl && inline === 'start' ? 'end' : isRtl && inline === 'end' ? 'start' : inline,
    target.left - px(style.scrollMarginLeft),
    target.right + px(style.scrollMarginRight),
    px(rootStyle.scrollPaddingLeft, width),
    width - px(rootStyle.scrollPaddingRight, width),
  );
  if (Math.abs(dy) >= MIN_DELTA || Math.abs(dx) >= MIN_DELTA) {
    try {
      view.scrollTo({ top: view.scrollY + dy, left: view.scrollX + dx, behavior });
    } catch {
      // No layout engine (jsdom) — nothing to scroll.
    }
  }
}

function isFullyInViewport(el: Element, view: Window): boolean {
  const rect = el.getBoundingClientRect();
  const root = el.ownerDocument.documentElement;
  const height = root.clientHeight || view.innerHeight;
  const width = root.clientWidth || view.innerWidth;
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= height && rect.right <= width;
}

/**
 * Bring `el` into view by scrolling ONE container — `options.container` or
 * `findScrollContainer(el, options)` — never the page. The view honours the container's
 * `scroll-padding` and the element's `scroll-margin` (sticky headers are a CSS matter, as with
 * native scrolling). Nothing to move → no `scrollTo()` call.
 *
 * No container → the PAGE scrolls (window `scrollTo`, the same alignment rules and the root's
 * `scroll-padding`): a `center` jump centres the row in the window; `nearest` moves the page only
 * if `el` is off-screen. Unlike `el.scrollIntoView()` this never scrolls an `overflow: hidden` /
 * `clip` wrapper. With `stopAt` and no container below it, nothing scrolls — the caller asked to
 * stay inside `stopAt`. Returns the container used, `null` for the page / no scroll.
 */
export function scrollIntoContainer(el: Element, options: ScrollIntoContainerOptions = {}): HTMLElement | null {
  if (!isAvailable()) return null;
  const view = viewOf(el);
  if (!view) return null;
  const { block = 'nearest', inline = 'nearest', behavior = 'auto', shouldRevealContainer = false } = options;
  const container = options.container ?? findScrollContainer(el, options);

  if (!container) {
    if (!options.stopAt) scrollPageTo(el, view, block, inline, behavior);
    return null;
  }

  if (shouldRevealContainer && !isFullyInViewport(container, view)) {
    container.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior });
  }

  const box = container.getBoundingClientRect();
  const boxStyle = view.getComputedStyle(container);
  const target = el.getBoundingClientRect();
  const targetStyle = view.getComputedStyle(el);

  const h = container.clientHeight;
  const w = container.clientWidth;
  const viewTop = box.top + container.clientTop + px(boxStyle.scrollPaddingTop, h);
  const viewBottom = box.top + container.clientTop + h - px(boxStyle.scrollPaddingBottom, h);
  const viewLeft = box.left + container.clientLeft + px(boxStyle.scrollPaddingLeft, w);
  const viewRight = box.left + container.clientLeft + w - px(boxStyle.scrollPaddingRight, w);

  const dy = axisDelta(
    block,
    target.top - px(targetStyle.scrollMarginTop),
    target.bottom + px(targetStyle.scrollMarginBottom),
    viewTop,
    viewBottom,
  );
  // `start` / `end` are logical: in a right-to-left container the inline start is the RIGHT edge.
  const isRtl = boxStyle.direction === 'rtl';
  const dx = axisDelta(
    isRtl && inline === 'start' ? 'end' : isRtl && inline === 'end' ? 'start' : inline,
    target.left - px(targetStyle.scrollMarginLeft),
    target.right + px(targetStyle.scrollMarginRight),
    viewLeft,
    viewRight,
  );

  if (Math.abs(dy) >= MIN_DELTA || Math.abs(dx) >= MIN_DELTA) {
    container.scrollTo({ top: container.scrollTop + dy, left: container.scrollLeft + dx, behavior });
  }
  return container;
}

/** A target inside a scroll container, in its content coordinates (`scrollTop` space): a virtual-list row. */
export interface ScrollBox {
  /** Distance from the top of the scrolled content, px (`index × rowHeight`). */
  top: number;
  /** Height, px (`rowHeight`). */
  height: number;
}

/** Options for {@link getScrollTopForBox} / {@link scrollContainerToBox}. */
export interface ScrollContainerToBoxOptions {
  /** `'nearest'` (default) moves only as far as needed — a fully visible box stays put; `'start'` / `'center'` / `'end'` align it. */
  block?: ScrollLogicalPosition;
  /** `'auto'` (default) sets `scrollTop` synchronously (a virtual list renders the new window right after); `'smooth'` animates. */
  behavior?: ScrollBehavior;
  /**
   * Extra top inset in px on top of the container's `scroll-padding-top` — a sticky header measured
   * in JS (a grid's `thead`). Prefer CSS `scroll-padding-top` when the height is known in CSS.
   */
  insetTop?: number;
}

/**
 * The `scrollTop` that brings `box` into view in `container` by the same rules as
 * {@link scrollIntoContainer} (`block`, the container's `scroll-padding`), clamped to the scroll
 * range — or `null` when nothing has to move. For a target that isn't rendered: a virtual list's
 * row by index (`{ top: index * rowHeight, height: rowHeight }`). Compute-only, for a caller that
 * must prepare (render the window) before it scrolls; {@link scrollContainerToBox} also applies it.
 */
export function getScrollTopForBox(container: HTMLElement, box: ScrollBox, options: ScrollContainerToBoxOptions = {}): number | null {
  const h = container.clientHeight;
  const style = isAvailable() ? getComputedStyle(container) : null;
  const padTop = (style ? px(style.scrollPaddingTop, h) : 0) + (options.insetTop ?? 0);
  const padBottom = style ? px(style.scrollPaddingBottom, h) : 0;
  const scrollTop = container.scrollTop;
  const dy = axisDelta(options.block ?? 'nearest', box.top, box.top + box.height, scrollTop + padTop, scrollTop + h - padBottom);
  const max = Math.max(0, container.scrollHeight - h);
  const target = Math.max(0, Math.min(scrollTop + dy, max));
  return Math.abs(target - scrollTop) >= MIN_DELTA ? target : null;
}

/**
 * Scroll `container` so `box` (content coordinates) is in view — {@link scrollIntoContainer} for a
 * target that isn't rendered, e.g. a virtual-list row by index. Returns the new `scrollTop`, or
 * `null` when nothing moved. `behavior: 'auto'` sets `scrollTop` synchronously.
 */
export function scrollContainerToBox(container: HTMLElement, box: ScrollBox, options: ScrollContainerToBoxOptions = {}): number | null {
  const target = getScrollTopForBox(container, box, options);
  if (target === null) return null;
  if ((options.behavior ?? 'auto') === 'auto') container.scrollTop = target;
  else container.scrollTo({ top: target, behavior: options.behavior });
  return target;
}
