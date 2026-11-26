/**
 * `createTooltip()` — the hover/focus tooltip preset (SPEC §12.2), lifting the
 * `tooltip.ts` shape shared by multiselect / daterangepicker / grid: a portaled
 * tooltip element, show/hide on pointer + keyboard focus with a delay, and
 * `autoUpdate` while visible. `shouldFollowCursor` (multiselect's
 * `option-tooltip-follow-cursor`) anchors to a `VirtualElement` tracking the
 * pointer rather than the trigger — one preset, moving reference.
 *
 * Delegated mode (`selector`): ONE tooltip for many targets inside `trigger` (calendar days, grid
 * cells, tree nodes) — one set of listeners on the root, the target found with `closest(selector)`,
 * the content resolved per target when it shows. Moving from one target to the next while a
 * tooltip shows switches at once (no second show delay).
 *
 * Exit animation: hiding removes `visibleClass` and adds `km-tooltip--hiding`; the element stays
 * mounted (anchored, `pointer-events: none`) until its own `opacity` transition ends — or a timeout
 * of the computed transition duration, so a hidden tab / `display: none` ancestor can't leave it
 * stuck — then it is removed. No transition (motion `none`, OS reduced motion, a 0s duration) →
 * removed at once. Showing again during the fade cancels it. `TOOLTIP_CSS` (layered, adopted into
 * the container's root) draws the default fade + a 4px slide toward the anchor, timed by the motion
 * token `--base-duration-fast`. `data-placement` carries the resolved placement (after flip / shift).
 *
 * Escape: a tooltip shown by keyboard focus takes the first press alone (hides + `preventDefault()`,
 * on `window` capture so it runs before the overlay router) — an open panel and focus stay (WCAG
 * 1.4.13). A hover / tap / `show()` tooltip hides and lets the press through.
 *
 * Scroll (`shouldHideOnScroll`, default on): while shown, a scroll of the page or of a scroller
 * around the target hides it — `watchScrollClose()`, the rule `createPopover({ shouldCloseOnScroll })`
 * uses (a scroll inside the tooltip, of an unrelated scroller, or one that moved the target < 3px
 * doesn't count). The pointer no longer rests on the content that moved under it, and a tooltip
 * would trail its target (or a recycled virtual row). A FOCUS-shown tooltip stays: focus is still
 * on its target, it follows it (`autoUpdate`) and stays until focus leaves / Escape (WCAG 1.4.13
 * "persistent") — so arrowing through a list that scrolls the next item into view never hides it.
 */
import { findOverlayContainer } from './overlay-container.js';
import { anchor } from './anchor.js';
import { watchScrollClose } from './scroll-close.js';
import { coreLog } from '../logging/element-logger.js';
import { adoptStyles } from '../dom/adopt-styles.js';
import { adoptMotionStyles } from '../environment/motion.js';
import type { AnchorHandle, Placement, Strategy, VirtualElement } from './types.js';

/** Show/hide delays, in ms. A single number sets both. */
export type TooltipDelay = number | { show?: number; hide?: number };

/** What a content resolver may return: text, an element, or nothing (= no tooltip for this target). */
export type TooltipContent = string | HTMLElement | null | undefined;

/** Options for {@link createTooltip}. */
export interface TooltipOptions {
  /**
   * The element the tooltip describes; hover/focus on it toggles the tooltip. With
   * {@link selector}: the ROOT the targets live in (a component's shadow root works).
   */
  trigger: HTMLElement | ShadowRoot;
  /**
   * Delegated mode: the targets inside `trigger` that get a tooltip (`'.drp__day[data-tooltip]'`).
   * One tooltip element serves all of them; `content` is usually a function of the target.
   */
  selector?: string;
  /**
   * Tooltip content — text (set as text, never parsed as HTML), an element to append, or a function
   * called at every show with the target (the trigger, or the matched element in delegated mode).
   * A function returning `null` / `undefined` / `''` shows nothing for that target.
   */
  content: string | HTMLElement | ((target: HTMLElement) => TooltipContent);
  /**
   * Where to mount the tooltip. Default `document.body` (portaled) — or, when the trigger
   * is inside a modal `<dialog>` / open popover (the top layer), that element. Pass the
   * component's `ShadowRoot` to keep the tooltip inside the shadow tree, so it
   * inherits shadow-scoped CSS custom properties and component tooltip styles.
   */
  container?: HTMLElement | ShadowRoot;
  /** Preferred placement. Default `'top'`. */
  placement?: Placement;
  /** Gap from the trigger, in px. Default `8`. */
  offset?: number;
  /** Show/hide delay(s), in ms. Default `0`. */
  delay?: TooltipDelay;
  /** Anchor to the pointer via a `VirtualElement` instead of the trigger. Default `false`. */
  shouldFollowCursor?: boolean;
  /**
   * Touch: a tap on a target toggles its tooltip (a tap elsewhere closes it), and the emulated
   * hover / focus a tap produces is ignored. For targets that do nothing else on a tap (a calendar
   * badge, a status icon). Default `false` (a tap shows it through the emulated hover).
   */
  shouldToggleOnTap?: boolean;
  /** Class(es) applied to the tooltip element. */
  cssClass?: string;
  /**
   * Class toggled on the tooltip while it is visible. Default `'is-visible'`. Removed when hiding
   * starts; the element itself stays mounted through the exit fade (`km-tooltip--hiding`).
   */
  visibleClass?: string;
  /** An arrow element (kept as the tooltip's last child, positioned by `anchor()`'s `arrow`). */
  arrow?: HTMLElement;
  /** Positioning strategy. Default `'fixed'`. */
  strategy?: Strategy;
  /**
   * Resolve the fixed containing block from the tooltip (see `anchor()`); for a target that is itself
   * a containing block (a cell with `transform` on hover). Default `false`.
   */
  shouldUseFixedContainingBlock?: boolean;
  /** Element to inherit `data-theme` from (C-CS-10). Default: the target. */
  inheritThemeFrom?: HTMLElement;
  /**
   * Called right before the tooltip becomes visible, with the target. Return `false` to not show
   * it. Also the place to dismiss a related tooltip that would otherwise overlap (e.g. a
   * remove-button tooltip hiding its parent badge tooltip).
   */
  beforeShowCallback?(target: HTMLElement): boolean | void;
  /**
   * Hide when the page, or a scroll container around the target (also inside shadow roots),
   * scrolls while the tooltip shows and the target actually moved — the `createPopover()`
   * `shouldCloseOnScroll` rule. A scroll inside the tooltip itself never hides it, and neither does
   * any scroll while the tooltip is shown by keyboard focus (it follows its focused target).
   * Default `true`.
   */
  shouldHideOnScroll?: boolean;
}

/** Handle returned by {@link createTooltip}. */
export interface TooltipHandle {
  /** The tooltip element (created and owned by the tooltip). */
  readonly element: HTMLElement;
  /** Whether the tooltip is currently shown. */
  readonly isVisible: boolean;
  /** The target the tooltip shows for (`null` while hidden). */
  readonly target: HTMLElement | null;
  /**
   * Whether the tooltip is shown because its target got keyboard focus (not hover / tap / `show()`).
   * Such a tooltip takes the first Escape on its own (WCAG 1.4.13) — see {@link createTooltip}.
   */
  readonly isFocusShown: boolean;
  /** Show now (ignores the show delay) — for `target` (delegated mode), else the trigger. */
  show(target?: HTMLElement): void;
  /**
   * Hide now (ignores the hide delay). The element fades out and is removed when its transition
   * ends (at once without one); a show during the fade cancels it.
   */
  hide(): void;
  /** Re-resolve the content for the current target (its data changed while shown). */
  refresh(): void;
  /** Remove listeners, hide, and drop the element at once (no fade). Idempotent. */
  destroy(): void;
}

let tooltipSeq = 0;

/** The class core puts on every tooltip element (the hook for {@link TOOLTIP_CSS}). */
export const TOOLTIP_CLASS = 'km-tooltip';
/** The class on a tooltip while it fades out (still mounted, `pointer-events: none`). */
export const TOOLTIP_HIDING_CLASS = 'km-tooltip--hiding';

/** The 4px slide toward the anchor, per resolved placement side (entry and exit). */
const towardAnchor = (cls: string): string =>
  [
    `:where(.${cls}[data-placement^="top"]) { translate: 0 4px; }`,
    `:where(.${cls}[data-placement^="bottom"]) { translate: 0 -4px; }`,
    `:where(.${cls}[data-placement^="left"]) { translate: 4px 0; }`,
    `:where(.${cls}[data-placement^="right"]) { translate: -4px 0; }`,
  ].join(' ');

/**
 * The default tooltip motion (SPEC §12.2): fade + a tiny slide toward the anchor on show
 * (`@starting-style`) and on hide (`km-tooltip--hiding`). In `@layer component` with
 * zero-specificity `:where()` selectors, so a component's own tooltip rules (same layer, an
 * `overrides` layer, or un-layered) win; durations only through the motion token
 * `--base-duration-fast` (0s under `data-motion="none"` / OS reduced motion = instant).
 * `createTooltip` adopts it into the root its container lives in.
 */
export const TOOLTIP_CSS = `
@layer component {
  :where(.${TOOLTIP_CLASS}) {
    transition:
      opacity var(--base-duration-fast, 0.1s) var(--base-ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
      translate var(--base-duration-fast, 0.1s) var(--base-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
  }
  :where(.${TOOLTIP_HIDING_CLASS}) { opacity: 0; pointer-events: none; }
  ${towardAnchor(TOOLTIP_HIDING_CLASS)}
  @starting-style {
    :where(.${TOOLTIP_CLASS}) { opacity: 0; }
    ${towardAnchor(TOOLTIP_CLASS)}
  }
}
`;

/**
 * A CSS engine that can run transitions (not SSR / jsdom, whose stylesheet parser rejects
 * `@layer` blocks — and which never animates anyway).
 */
const canAnimate = (): boolean => typeof CSS !== 'undefined' && typeof CSS.supports === 'function';

/** Longest `duration + delay` of the element's computed transitions, in ms (0 = none). */
function transitionMs(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const toMs = (value: string): number => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return 0;
    return value.trim().endsWith('ms') ? n : n * 1000;
  };
  const durations = (style.transitionDuration || '').split(',').map(toMs);
  const delays = (style.transitionDelay || '').split(',').map(toMs);
  let max = 0;
  // CSS repeats the shorter list to the longer one's length.
  durations.forEach((duration, i) => {
    max = Math.max(max, duration + (delays[i % delays.length] ?? 0));
  });
  return max;
}

/** How long after a touch the browser's emulated mouse / focus events are ignored (toggle-on-tap). */
const TOUCH_GHOST_MS = 800;

/** Add `id` to the element's space-separated `aria-describedby` (keeping what is there). */
function addDescribedBy(el: Element, id: string): void {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  if (!ids.includes(id)) el.setAttribute('aria-describedby', [...ids, id].join(' '));
}

function removeDescribedBy(el: Element, id: string): void {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((x) => x && x !== id);
  if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
  else el.removeAttribute('aria-describedby');
}

function normalizeDelay(delay: TooltipDelay | undefined): { show: number; hide: number } {
  if (typeof delay === 'number') return { show: delay, hide: delay };
  return { show: delay?.show ?? 0, hide: delay?.hide ?? 0 };
}

export function createTooltip(opts: TooltipOptions): TooltipHandle {
  const root = opts.trigger;
  const isDelegated = !!opts.selector;
  /** The host element of the root: the trigger itself, or the shadow root's host. */
  const rootElement: HTMLElement = root instanceof HTMLElement ? root : (root.host as HTMLElement);
  if (!isDelegated && !(root instanceof HTMLElement)) {
    coreLog(rootElement, 'UI', 'ELEMENT').warn('createTooltip: a ShadowRoot trigger needs a `selector` (delegated mode)');
  }
  const placement = opts.placement ?? 'top';
  const visibleClass = opts.visibleClass ?? 'is-visible';
  const delay = normalizeDelay(opts.delay);
  const shouldHideOnScroll = opts.shouldHideOnScroll ?? true;

  const element = document.createElement('div');
  element.setAttribute('role', 'tooltip');
  if (opts.cssClass) element.className = opts.cssClass;
  element.classList.add(TOOLTIP_CLASS);
  // The tooltip describes its target for assistive tech while it is shown (aria-describedby).
  element.id ||= `km-tooltip-${++tooltipSeq}`;
  if (typeof opts.content !== 'function') setContent(opts.content);

  function setContent(content: TooltipContent): void {
    element.replaceChildren();
    if (typeof content === 'string') element.textContent = content;
    else if (content) element.append(content);
    if (opts.arrow) element.append(opts.arrow);
  }

  /** The target an event node belongs to: the trigger, or the closest selector match inside the root. */
  const findTarget = (node: EventTarget | null): HTMLElement | null => {
    if (!(node instanceof Node)) return null;
    if (!isDelegated) return root.contains(node) ? rootElement : null;
    const el = node instanceof Element ? node : node.parentElement;
    const match = el?.closest(opts.selector!);
    return match instanceof HTMLElement && root.contains(match) ? match : null;
  };

  let handle: AnchorHandle | undefined;
  /** The target `handle` anchors to — kept through the exit fade (`current` is cleared at hide). */
  let anchoredTarget: HTMLElement | null = null;
  let visible = false;
  /** Shown by keyboard focus (set when it becomes visible / switches target; hover, tap, `show()` = false). */
  let isFocusShown = false;
  let isDestroyed = false;
  /** The target shown (or about to be shown, while the show delay runs). */
  let current: HTMLElement | null = null;
  /** The exit fade in progress: its fallback timer, transitionend listener, prior inline pointer-events. */
  let fade: { timer?: ReturnType<typeof setTimeout>; onEnd: (event: TransitionEvent) => void; pointerEvents: string } | undefined;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let lastTouchAt = -Infinity;
  const isTouchGhost = (): boolean => !!opts.shouldToggleOnTap && Date.now() - lastTouchAt < TOUCH_GHOST_MS;

  // The pointer as an offset from the target's top-left corner, not a viewport point: a scroll
  // moves the target without a mousemove (a tapped card on a phone keeps focus, so nothing hides
  // the tooltip), and a viewport point would leave the tooltip behind on screen.
  let cursorOffset: { x: number; y: number } | undefined;
  const setCursor = (event: MouseEvent, target: HTMLElement): void => {
    const rect = target.getBoundingClientRect();
    cursorOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const cursorReference: VirtualElement = {
    getBoundingClientRect: () => {
      const rect = (current ?? rootElement).getBoundingClientRect();
      return cursorOffset ? new DOMRect(rect.left + cursorOffset.x, rect.top + cursorOffset.y, 0, 0) : rect;
    },
    get contextElement() {
      return current ?? rootElement;
    },
  };

  const onMouseMove = (event: Event): void => {
    if (!current) return;
    setCursor(event as MouseEvent, current);
    if (visible) handle?.update();
  };

  // Begin following the pointer the moment it ENTERS the target — seed the rect from the enter
  // event and attach the move listener NOW, not in show(). When a show delay is set, show() runs
  // after it; if the pointer is stationary during that window (the normal "hover to read" case)
  // no mousemove fires, so the cursor would still be undefined at show time and the
  // VirtualElement falls back to the target's full rect → the tooltip pins to the target's
  // corner instead of the cursor. Seeding here guarantees a cursor rect before the first anchor().
  const startTrackingCursor = (event: MouseEvent, target: HTMLElement): void => {
    setCursor(event, target);
    root.addEventListener('mousemove', onMouseMove);
  };
  const stopTrackingCursor = (): void => {
    root.removeEventListener('mousemove', onMouseMove);
  };

  /** The scroll watch while shown (`shouldHideOnScroll`), and the target it measures. */
  let stopScrollWatch: (() => void) | undefined;
  let scrollWatchTarget: HTMLElement | null = null;
  const unwatchScroll = (): void => {
    stopScrollWatch?.();
    stopScrollWatch = undefined;
    scrollWatchTarget = null;
  };
  /** (Re)start the watch for `target` — a new target in delegated mode gets a fresh baseline. */
  const watchScroll = (target: HTMLElement): void => {
    if (!shouldHideOnScroll || scrollWatchTarget === target) return;
    unwatchScroll();
    scrollWatchTarget = target;
    stopScrollWatch = watchScrollClose({
      reference: target,
      isInside: (event) => event.composedPath().includes(element), // the tooltip's own content scrolling
      scrollCallback: () => {
        if (visible && !isFocusShown) hide();
      },
    });
  };

  const clearTimers = (): void => {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
    showTimer = hideTimer = undefined;
  };

  // Dismissible without moving the pointer or focus (WCAG 1.4.13). On `window` capture, so it runs
  // before the overlay router (document capture) and any component handler. A focus-shown tooltip
  // consumes the press (preventDefault): the router and components that skip a defaultPrevented
  // Escape leave the open panel / focus alone — the next Escape does that. A hover-shown one just
  // hides and lets the press through (it closes whatever else Escape closes, as before).
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing || !visible) return;
    if (isFocusShown && !event.defaultPrevented) event.preventDefault();
    hide();
  };

  // Toggle-on-tap: a tap outside the root and the tooltip closes it.
  const onDocumentPointerDown = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (path.includes(element) || path.includes(rootElement)) return;
    hide();
  };

  /** Stop anchoring (the tooltip stays mounted — switching targets, or the end of the fade). */
  const detach = (): void => {
    handle?.destroy();
    handle = undefined;
    if (anchoredTarget) removeDescribedBy(anchoredTarget, element.id);
    anchoredTarget = null;
  };

  /** Stop the exit fade where it is (shown again, or finishing): the element stays mounted. */
  const cancelFade = (): void => {
    element.classList.remove(TOOLTIP_HIDING_CLASS);
    if (!fade) return;
    if (fade.timer) clearTimeout(fade.timer);
    element.removeEventListener('transitionend', fade.onEnd);
    element.style.pointerEvents = fade.pointerEvents;
    fade = undefined;
  };

  /** The end of a hide: unanchor and unmount. */
  const unmount = (): void => {
    cancelFade();
    detach();
    element.removeAttribute('data-placement');
    element.remove();
  };

  /** Fade out, then unmount — at once when the tooltip has no transition (motion none, reduced motion). */
  const startFade = (): void => {
    element.classList.add(TOOLTIP_HIDING_CLASS);
    const ms = transitionMs(element);
    if (ms <= 0) {
      unmount();
      return;
    }
    const onEnd = (event: TransitionEvent): void => {
      if (event.target === element && event.propertyName === 'opacity') unmount();
    };
    // Hit-testing off while it fades (inline: a component's hoverable-tooltip CSS would win otherwise).
    fade = { onEnd, pointerEvents: element.style.pointerEvents };
    element.style.pointerEvents = 'none';
    element.addEventListener('transitionend', onEnd);
    // A hidden tab or a display:none ancestor never fires transitionend.
    fade.timer = setTimeout(unmount, ms);
  };

  const show = (target: HTMLElement | null = current ?? (isDelegated ? null : rootElement), isByFocus = false): void => {
    clearTimers();
    if (isDestroyed || !target) return;
    if (visible && target === current) return;
    if (typeof opts.content === 'function') {
      const content = opts.content(target);
      if (content == null || content === '') {
        hide();
        return;
      }
      setContent(content);
    }
    if (opts.beforeShowCallback?.(target) === false) {
      hide();
      return;
    }
    // Shown again while fading out: continue from where the fade is (no remount, no new entry).
    cancelFade();
    if (handle && anchoredTarget !== target) detach();
    current = target;
    isFocusShown = isByFocus;
    if (!visible) {
      visible = true;
      // Resolved at each show: a target inside a modal <dialog> mounts the tooltip in the dialog.
      const container = opts.container ?? findOverlayContainer(target);
      // The requested placement until the first one resolves (the entry slide needs a side at once).
      if (!handle) element.setAttribute('data-placement', placement);
      if (element.parentNode !== container) container.append(element);
      const styleRoot = element.getRootNode();
      if (canAnimate() && (styleRoot.nodeType === 9 || styleRoot.nodeType === 11)) {
        adoptStyles(styleRoot as unknown as DocumentOrShadowRoot, TOOLTIP_CSS);
      }
      adoptMotionStyles(element); // the data-motion copied from the target maps onto the tokens
      window.addEventListener('keydown', onKeydown, true);
      if (opts.shouldToggleOnTap) document.addEventListener('pointerdown', onDocumentPointerDown, true);
    }
    if (!handle) {
      const reference = opts.shouldFollowCursor ? cursorReference : target;
      anchoredTarget = target;
      handle = anchor(element, reference, {
        placement,
        strategy: opts.strategy,
        offset: opts.offset ?? 8,
        inheritThemeFrom: opts.inheritThemeFrom ?? target,
        ...(opts.arrow ? { arrow: { element: opts.arrow } } : {}),
        ...(opts.shouldUseFixedContainingBlock ? { shouldUseFixedContainingBlock: true } : {}),
        // The final placement after flip / shift, for direction-aware component CSS (arrow, motion).
        placedCallback: (resolved) => element.setAttribute('data-placement', resolved),
        // A target removed from the page while its tooltip shows (a re-rendered row) takes the
        // tooltip with it at once, instead of leaving it mounted with positioning running.
        beforeComputeCallback: () => {
          if (!target.isConnected) hide(true);
        },
      });
    }
    addDescribedBy(target, element.id);
    watchScroll(target);
    // Ensure cursor tracking is live. For a pointer show it was already attached on enter (so the
    // cursor was seeded through the show delay); for an imperative show() / focus show it's
    // attached here. addEventListener is idempotent on the same function ref.
    if (opts.shouldFollowCursor) root.addEventListener('mousemove', onMouseMove);
    element.classList.add(visibleClass);
  };

  /** Hide (with the exit fade); `isImmediate` unmounts at once (destroy, a removed target). */
  const hide = (isImmediate = false): void => {
    clearTimers();
    // Always detach cursor tracking — the listener may have been attached on enter while the
    // show delay was still pending (never became visible).
    stopTrackingCursor();
    // A later focus / show() places the tooltip at the target, not where the pointer last was.
    cursorOffset = undefined;
    current = null;
    if (!visible) {
      if (isImmediate && handle) unmount(); // cut a running fade short
      return;
    }
    visible = false;
    isFocusShown = false;
    unwatchScroll();
    element.classList.remove(visibleClass);
    if (anchoredTarget) removeDescribedBy(anchoredTarget, element.id);
    window.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    if (isImmediate || !anchoredTarget?.isConnected) unmount();
    else startFade();
  };

  const scheduleShow = (target: HTMLElement, isByFocus = false): void => {
    clearTimers();
    // Moving between targets while one shows (or still fades out): switch at once.
    if (delay.show > 0 && !visible && !fade) {
      current = target;
      showTimer = setTimeout(() => show(target, isByFocus), delay.show);
    } else show(target, isByFocus);
  };
  const scheduleHide = (): void => {
    clearTimers();
    if (delay.hide > 0) hideTimer = setTimeout(() => hide(), delay.hide);
    else hide();
  };

  /** The pointer leaving doesn't hide a tooltip whose target still has keyboard focus. */
  const hasFocusWithin = (): boolean => !!current?.matches(':focus-within');

  // --- single trigger: enter / leave on the trigger -------------------------------------------
  const onMouseEnter = (event: MouseEvent): void => {
    if (isTouchGhost()) return;
    if (opts.shouldFollowCursor) startTrackingCursor(event, rootElement);
    scheduleShow(rootElement);
  };
  // The pointer may move onto the tooltip itself (hoverable content, WCAG 1.4.13).
  const onMouseLeave = (): void => {
    if (hasFocusWithin() || (!isDelegated && rootElement.matches(':focus-within'))) return;
    scheduleHide();
  };

  // --- delegated: over / out on the root ------------------------------------------------------
  const onMouseOver = (event: Event): void => {
    if (isTouchGhost()) return;
    const target = findTarget(event.target);
    if (target && target === current) {
      if (visible) clearTimers(); // back from the tooltip onto its own target: keep it
      if (visible || showTimer) return;
    }
    if (!target) {
      if (current && !hasFocusWithin()) scheduleHide();
      return;
    }
    if (opts.shouldFollowCursor) startTrackingCursor(event as MouseEvent, target);
    scheduleShow(target);
  };
  const onMouseOut = (event: Event): void => {
    const next = (event as MouseEvent).relatedTarget;
    if (next instanceof Node && (root.contains(next) || element.contains(next))) return; // mouseover handles it
    if (!hasFocusWithin()) scheduleHide();
  };

  // --- both: focus, tap ------------------------------------------------------------------------
  const onFocusIn = (event: Event): void => {
    if (isTouchGhost()) return;
    const target = findTarget(event.target);
    if (target) scheduleShow(target, true);
  };
  // Focus moving between two controls inside the target keeps the tooltip where it is.
  const onFocusOut = (event: Event): void => {
    const next = (event as FocusEvent).relatedTarget;
    if (next instanceof Node && current?.contains(next)) return;
    scheduleHide();
  };
  const onPointerDown = (event: Event): void => {
    if ((event as PointerEvent).pointerType !== 'mouse') lastTouchAt = Date.now();
  };
  const onClick = (event: Event): void => {
    if (!isTouchGhost()) return;
    const target = findTarget(event.target);
    if (target && !(visible && target === current)) show(target);
    else hide();
  };

  type Listener = [EventTarget, string, (event: Event) => void];
  const listeners: Listener[] = isDelegated
    ? [[root, 'mouseover', onMouseOver], [root, 'mouseout', onMouseOut]]
    : [[root, 'mouseenter', onMouseEnter as (event: Event) => void], [root, 'mouseleave', onMouseLeave]];
  listeners.push([root, 'focusin', onFocusIn], [root, 'focusout', onFocusOut]);
  if (opts.shouldToggleOnTap) listeners.push([root, 'pointerdown', onPointerDown], [root, 'click', onClick]);
  listeners.push([element, 'mouseenter', clearTimers], [element, 'mouseleave', onMouseLeave]);
  for (const [target, type, fn] of listeners) target.addEventListener(type, fn);

  return {
    element,
    get isVisible() {
      return visible;
    },
    get target() {
      return visible ? current : null;
    },
    get isFocusShown() {
      return visible && isFocusShown;
    },
    show(target?: HTMLElement) {
      show(target ?? (isDelegated ? current : rootElement));
    },
    hide() {
      hide();
    },
    refresh() {
      if (!visible || !current || typeof opts.content !== 'function') return;
      const target = current;
      const content = opts.content(target);
      if (content == null || content === '') hide();
      else {
        setContent(content);
        handle?.update();
      }
    },
    destroy() {
      if (isDestroyed) return;
      hide(true);
      isDestroyed = true;
      for (const [target, type, fn] of listeners) target.removeEventListener(type, fn);
    },
  };
}
