/**
 * Pointer drag (SPEC §12.28): an in-page drag (reorder rows / columns / tree nodes) that works with a
 * mouse, a pen AND a finger — HTML5 drag-and-drop doesn't fire on touch. web-treeview had a touch-event
 * copy (long press, `draggable` juggling), web-grid its own column / row mouse drags.
 *
 * Pointer events throughout. Mouse / pen: the drag starts after `threshold` px of movement. Touch: the
 * finger must rest `longPressMs` first (moving earlier = the user scrolls; the drag never starts); once
 * started, the page doesn't scroll (a non-passive `touchmove` is prevented) and the long-press context
 * menu is suppressed. While dragging: `moveCallback` with the element under the pointer (shadow roots
 * pierced — give the drag image `pointer-events: none`), auto-scroll near the scroll container's edges,
 * Escape / `pointercancel` → `cancelCallback`. After a drop the trailing click is swallowed.
 */

import { findScrollContainer } from './scroll-container.js';
import { guardGhostClick } from '../overlay/ghost-click.js';
import { runSafely } from '../logging/safe-call.js';

export interface PointerDragContext {
  /** The element the drag started on (`getSource`'s answer). */
  source: HTMLElement;
  /** Viewport coordinates. */
  x: number;
  y: number;
  /** The deepest element under the pointer (through open shadow roots), or `null`. */
  target: Element | null;
  pointerType: string;
  /** The event behind this call; `null` for a touch long-press start and an auto-scroll step. */
  event: PointerEvent | KeyboardEvent | null;
  /** The `pointerdown` that armed the drag — present in every callback (also a touch long-press start). */
  pressEvent: PointerEvent;
}

export interface PointerDragOptions {
  /** Which element a press starts a drag on (`null` = not draggable here); default: the container. */
  getSource?: (target: Element, event: PointerEvent) => HTMLElement | null;
  /**
   * Movement (px) before a mouse / pen drag starts, and that cancels a touch long press (default `5`).
   * A function is read per press and gets the `pointerdown` (e.g. `e.pointerType === 'touch' ? 10 : 5`).
   */
  threshold?: number | ((event: PointerEvent) => number);
  /** Touch hold before the drag starts (default `300`). A function is read per press (a component input). */
  longPressMs?: number | (() => number);
  /**
   * Scroll the container near its edges while dragging (default on: `{ edge: 40, maxSpeed: 16 }`); `false` = off.
   * `isEnabled(ctx)` is asked per frame — `false` holds still (a drag the component keeps but refuses: a locked node).
   */
  autoScroll?: false | { edge?: number; maxSpeed?: number; container?: HTMLElement | null; isEnabled?: (ctx: PointerDragContext) => boolean };
  /** The drag starts; `false` refuses it. */
  beforeStartCallback?: (ctx: PointerDragContext) => boolean | void;
  moveCallback?: (ctx: PointerDragContext) => void;
  dropCallback?: (ctx: PointerDragContext) => void;
  cancelCallback?: (ctx: PointerDragContext) => void;
}

export interface PointerDrag {
  readonly isDragging: boolean;
  /** Abort a drag in progress (`cancelCallback`). */
  cancel(): void;
  destroy(): void;
}

/** The deepest element at a viewport point, through open shadow roots. */
export function deepElementFromPoint(doc: Document, x: number, y: number): Element | null {
  if (typeof doc.elementFromPoint !== 'function') return null; // no layout (jsdom)
  let el = doc.elementFromPoint(x, y);
  while (el?.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

export function createPointerDrag(container: HTMLElement, options: PointerDragOptions): PointerDrag {
  const readOption = (value: number | ((event: PointerEvent) => number) | undefined, fallback: number, press: PointerEvent): number => {
    const n = typeof value === 'function' ? value(press) : value;
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  };
  // read per press (onDown): a component input (touchDragDelay) may change between drags
  let threshold = 5;
  let longPressMs = 300;
  const getSource = options.getSource ?? ((): HTMLElement => container);
  const doc = container.ownerDocument;
  const view = doc.defaultView ?? window;

  let source: HTMLElement | null = null;
  let pressEvent: PointerEvent | null = null;
  let pointerId = -1;
  let pointerType = '';
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let isDragging = false;
  let isArmed = false; // touch: the long press elapsed
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let scrollFrame = 0;
  let scroller: HTMLElement | null = null;

  const context = (event: PointerDragContext['event']): PointerDragContext => ({
    source: source!,
    x: lastX,
    y: lastY,
    target: deepElementFromPoint(doc, lastX, lastY),
    pointerType,
    event,
    pressEvent: pressEvent!,
  });
  const call = (fn: ((ctx: PointerDragContext) => unknown) | undefined, event: PointerDragContext['event'], name: string): unknown => {
    if (!fn) return undefined;
    const result = runSafely(() => fn(context(event)), { source: container, message: `pointer drag ${name} threw` });
    return result.isOk ? result.value : undefined;
  };

  const stopAutoScroll = (): void => {
    if (scrollFrame) view.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  };
  const autoScroll = (): void => {
    scrollFrame = 0;
    if (!isDragging || !scroller || options.autoScroll === false) return;
    const { edge = 40, maxSpeed = 16, isEnabled } = options.autoScroll ?? {};
    if (isEnabled) {
      const allowed = runSafely(() => isEnabled(context(null)), { source: container, message: 'autoScroll.isEnabled threw' });
      if (allowed.isOk && allowed.value === false) {
        scrollFrame = view.requestAnimationFrame(autoScroll); // ask again next frame
        return;
      }
    }
    const r = scroller.getBoundingClientRect();
    const speed = (d: number): number => (d < edge ? Math.ceil(((edge - d) / edge) * maxSpeed) : 0);
    const dy = speed(lastY - r.top) ? -speed(lastY - r.top) : speed(r.bottom - lastY);
    const dx = speed(lastX - r.left) ? -speed(lastX - r.left) : speed(r.right - lastX);
    if (!dx && !dy) return;
    const before = scroller.scrollTop + scroller.scrollLeft;
    scroller.scrollTop += dy;
    scroller.scrollLeft += dx;
    if (scroller.scrollTop + scroller.scrollLeft !== before) call(options.moveCallback, null, 'moveCallback'); // new content under the pointer
    scrollFrame = view.requestAnimationFrame(autoScroll);
  };

  const reset = (): void => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    stopAutoScroll();
    view.removeEventListener('pointermove', onMove, true);
    view.removeEventListener('pointerup', onUp, true);
    view.removeEventListener('pointercancel', onCancelEvent, true);
    view.removeEventListener('keydown', onKey, true);
    container.removeEventListener('touchmove', onTouchMove);
    container.removeEventListener('contextmenu', onContextMenu, true);
    if (pointerId !== -1) {
      try {
        if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
      } catch {
        // already released
      }
    }
    isDragging = false;
    isArmed = false;
    source = null;
    pressEvent = null;
    pointerId = -1;
  };

  const start = (event: PointerEvent | null): void => {
    if (call(options.beforeStartCallback, event, 'beforeStartCallback') === false) return reset();
    isDragging = true;
    const auto = options.autoScroll === false ? null : options.autoScroll;
    scroller = auto?.container ?? findScrollContainer(source!, { axis: 'both' }) ?? (container.scrollHeight > container.clientHeight ? container : null);
    try {
      if (pointerId !== -1) container.setPointerCapture(pointerId);
    } catch {
      // the pointer is gone
    }
    call(options.moveCallback, event, 'moveCallback');
  };

  const onMove = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    lastX = event.clientX;
    lastY = event.clientY;
    const moved = Math.hypot(lastX - startX, lastY - startY);
    if (!isDragging) {
      if (pointerType === 'touch' && !isArmed) {
        if (moved > threshold) reset(); // a scroll, not a drag
        return;
      }
      // armed touch (`longPressMs: 0`) drags like a mouse: past the threshold
      if (moved > threshold) start(event);
      return;
    }
    event.preventDefault();
    call(options.moveCallback, event, 'moveCallback');
    if (!scrollFrame) scrollFrame = view.requestAnimationFrame(autoScroll);
  };

  const onUp = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    if (isDragging) {
      lastX = event.clientX;
      lastY = event.clientY;
      const src = source!;
      call(options.dropCallback, event, 'dropCallback');
      guardGhostClick([src, container], { durationMs: 400 }); // the click that ends a drag isn't a click
    }
    reset();
  };

  const cancel = (event: PointerDragContext['event']): void => {
    if (isDragging) call(options.cancelCallback, event, 'cancelCallback');
    reset();
  };
  const onCancelEvent = (event: PointerEvent): void => {
    if (event.pointerId === pointerId) cancel(event);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !isDragging) return;
    event.preventDefault();
    event.stopPropagation();
    cancel(event);
  };
  /** Touch: after the long press the finger drags, the page must not scroll. */
  const onTouchMove = (event: TouchEvent): void => {
    if (isArmed || isDragging) event.preventDefault();
  };
  const onContextMenu = (event: Event): void => {
    if (isArmed || isDragging || pressTimer) event.preventDefault();
  };

  const onDown = (event: PointerEvent): void => {
    if (source || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const found = getSource(event.target as Element, event);
    if (!found) return;
    threshold = readOption(options.threshold, 5, event);
    longPressMs = readOption(options.longPressMs, 300, event);
    source = found;
    pressEvent = event;
    pointerId = event.pointerId;
    pointerType = event.pointerType;
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    view.addEventListener('pointermove', onMove, true);
    view.addEventListener('pointerup', onUp, true);
    view.addEventListener('pointercancel', onCancelEvent, true);
    view.addEventListener('keydown', onKey, true);
    if (pointerType === 'touch') {
      container.addEventListener('touchmove', onTouchMove, { passive: false });
      container.addEventListener('contextmenu', onContextMenu, true);
      // No long press: armed at once (the page doesn't scroll), the drag starts past the threshold like a mouse.
      if (longPressMs <= 0) isArmed = true;
      else pressTimer = setTimeout(() => {
        pressTimer = null;
        isArmed = true;
        start(null);
      }, longPressMs);
    }
  };
  container.addEventListener('pointerdown', onDown);

  return {
    get isDragging() {
      return isDragging;
    },
    cancel: () => cancel(null),
    destroy() {
      cancel(null);
      container.removeEventListener('pointerdown', onDown);
    },
  };
}
