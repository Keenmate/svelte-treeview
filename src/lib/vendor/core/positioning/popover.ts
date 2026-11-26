/**
 * `createPopover()` — the popover preset (SPEC §12.2): a panel that floats next to a
 * reference and stays until something closes it (the shape of a dropdown, a calendar, a
 * picker, an info panel). Three things are separate: OPEN (the state, the overlay tree,
 * `visibleClass`), MOUNTED (by default `open()` mounts the panel — `document.body`, or the open
 * modal `<dialog>` around the reference — and `close()` removes it; `shouldKeepMounted` leaves
 * a component-owned panel where it is) and ANCHORED (positioned next to the reference; off for
 * a fullscreen / modal presentation of the same open panel, see `setAnchored()`). Optional:
 * the overlay tree (Escape / outside click / group exclusivity), close on scroll / resize.
 * Every {@link AnchorOptions} field goes to `anchor()`.
 *
 * Fits small reveals and big panels alike (dropdowns, calendars, pickers): `shouldKeepMounted`,
 * `setAnchored()` and the {@link AnchorOptions} pass-through cover the gaps found in
 * `docs/review/2026-11-06-createpopover-fit.md`. Call `anchor()` directly only for a follower
 * that needs no open state / overlay tree (a hint, a tooltip-like label).
 */
import { findOverlayContainer } from './overlay-container.js';
import { anchor } from './anchor.js';
import type { AnchorHandle, AnchorOptions } from './types.js';
import { registerOverlay, type OverlayDismissReason, type OverlayHandle } from '../overlay/active-overlay.js';
import { coreLog } from '../logging/element-logger.js';
import { watchScrollClose } from './scroll-close.js';

/** A DOM element or a floating-ui `VirtualElement` to anchor against. */
type Reference = Parameters<typeof anchor>[1];

/** The inline styles `anchor()` writes for placement, put back when the popover stops anchoring. */
const PLACEMENT_STYLES = ['position', 'left', 'top'] as const;

/** How long an anchored panel waits, hidden, for its first placement before it shows anyway. */
const REVEAL_FALLBACK_MS = 200;

/**
 * Why a popover closed: the overlay tree's reasons (`'overlay'`, `'parent'`, `'escape'`,
 * `'outside-click'`), a scroll outside the panel (`'scroll'`), a window resize (`'resize'`), the
 * reference element removed from the page while open (`'reference-removed'` — a re-rendered row
 * or cell; like a tooltip, the panel goes with it), or `close()` / `destroy()` called in code (`'api'`).
 */
export type PopoverCloseReason = OverlayDismissReason | 'scroll' | 'resize' | 'reference-removed' | 'api';

/** `true` / `false`, or a function asked each time (return `false` to keep the popover open). */
export type PopoverCloseRule = boolean | (() => boolean);

/**
 * Options for {@link createPopover}: the panel, its reference, where to mount it — and every
 * {@link AnchorOptions} field (`placement` defaults to `'bottom-start'`, `inheritThemeFrom` to
 * the reference when it is an element), passed to `anchor()` as given.
 */
export interface PopoverOptions extends Omit<AnchorOptions, 'inheritThemeFrom'> {
  /**
   * The element (or virtual element) the panel anchors to — or a function returning it, asked at
   * each `open()` / `reanchor()` (a component whose anchor depends on what is rendered).
   */
  reference: Reference | (() => Reference);
  /** The panel element to position (and, unless {@link shouldKeepMounted}, mount). */
  panel: HTMLElement;
  /**
   * The panel lives where the component put it (built once, its listeners and state on it):
   * `open()` / `close()` don't mount or remove it, they only toggle {@link visibleClass} (or the
   * `hidden` attribute without one). `container` is ignored. Default `false`.
   */
  shouldKeepMounted?: boolean;
  /**
   * Whether `open()` anchors the panel. `false` opens it unpositioned (a fullscreen / modal
   * presentation the component's CSS places); switch while open with `setAnchored()`. Default `true`.
   */
  isAnchored?: boolean;
  /**
   * Where to mount the panel while open. Default: the nearest open modal `<dialog>` /
   * `:popover-open` element around the reference (the top layer), else `document.body`. A
   * `ShadowRoot` keeps the panel inside a component's styles.
   */
  container?: HTMLElement | ShadowRoot;
  /**
   * Copy the nearest `data-theme` from this element onto the panel. Default: the reference (when
   * it is an element). `false` copies nothing (a panel mounted in the component's own shadow root
   * already inherits the theme).
   */
  inheritThemeFrom?: HTMLElement | false;
  /**
   * Added to the panel on `open()`, removed on close: style the panel hidden without it (even
   * `display: none` — the class makes it measurable). Until its first position the panel also
   * has an inline `visibility: hidden`, so it never shows at 0,0 for a frame.
   */
  visibleClass?: string;
  /**
   * Join the page-wide overlay tree (SPEC §12.9) and close on Escape — only the deepest open
   * overlay closes, and focus returns to {@link returnFocusTo} (default: the reference). A
   * function is asked at each Escape. Default `false`.
   */
  shouldCloseOnEscape?: PopoverCloseRule;
  /**
   * Join the overlay tree and close on a click outside the panel, the reference and
   * {@link getInsideElements}, decided when the click ends (after the page's own click handlers:
   * a page button that drives the popover can {@link PopoverHandle.claimCurrentClick claim} it).
   * A function is asked at each click. Default `false`.
   */
  shouldCloseOnOutsideClick?: PopoverCloseRule;
  /** More elements a press on doesn't count as outside (a host, a hint, a toggle button). Read at each press. */
  getInsideElements?: () => readonly (Element | null | undefined)[];
  /**
   * Where focus goes after an Escape close (only when focus was inside the panel). Default: the
   * reference. `null`: nowhere (a focus-triggered picker would reopen on it).
   */
  returnFocusTo?: HTMLElement | null;
  /**
   * Close when the page scrolls, or a scroll container around the reference does (also inside
   * shadow roots), and the reference has actually moved since the popover opened. A scroll inside
   * the panel, of an unrelated scroller elsewhere, or a late scroll event from a scroll that ended
   * before the popover opened doesn't count. A function is asked at each scroll. Default `false`.
   */
  shouldCloseOnScroll?: PopoverCloseRule;
  /** Close when the window resizes. A function is asked at each resize. Default `false`. */
  shouldCloseOnResize?: PopoverCloseRule;
  /**
   * Join the overlay tree in this coordination group: opening another overlay of the group
   * closes this one (but never an overlay it was opened from). Implied (ungrouped) by the
   * Escape / outside-press options.
   */
  overlayGroup?: unknown;
  /**
   * The popover closed, for any reason (see {@link PopoverCloseReason}) — `close()` and
   * `destroy()` in code report `'api'`. Runs after the panel is unmounted.
   */
  closeCallback?(reason: PopoverCloseReason): void;
}

/** Handle returned by {@link createPopover}. */
export interface PopoverHandle {
  /** Whether the panel is currently open. */
  readonly isOpen: boolean;
  /** Mount + position the panel and keep it placed. */
  open(): void;
  /** Unmount the panel and stop positioning (`closeCallback('api')`). */
  close(): void;
  /** Recompute the position once (no-op when closed or not anchored). */
  update(): void;
  /**
   * Re-anchor from scratch while open: re-reads `reference` and forgets a frozen placement
   * (`lockPlacement: 'freeze'` picks its side again — after async content changed the panel's
   * height). No-op when closed or not anchored.
   */
  reanchor(): void;
  /** Whether the open panel is positioned next to the reference. */
  readonly isAnchored: boolean;
  /**
   * Anchor or un-anchor the panel, open or not (the next `open()` follows it). Un-anchoring an
   * open panel keeps it open, mounted and in the overlay tree, and puts back its own inline
   * `position` / `left` / `top` / sizes, so the component's CSS places it (fullscreen, modal).
   */
  setAnchored(isAnchored: boolean): void;
  /**
   * Keep the popover open through the click being handled right now (its overlay-tree outside
   * click): call it from an API method a page control outside the panel may invoke. No-op when
   * closed or not in the overlay tree.
   */
  claimCurrentClick(): void;
  /** Close and release everything. Idempotent; `open()` does nothing afterwards. */
  destroy(): void;
}

/** Ask a close rule (a throwing function counts as `false`, logged). */
function isOn(rule: PopoverCloseRule | undefined, panel: HTMLElement): boolean {
  if (typeof rule !== 'function') return !!rule;
  try {
    return rule() === true;
  } catch (error) {
    coreLog(panel, 'UI', 'ELEMENT').error('popover shouldCloseOn* callback threw', error);
    return false;
  }
}

export function createPopover(opts: PopoverOptions): PopoverHandle {
  const {
    reference: referenceOption,
    panel,
    shouldKeepMounted = false,
    isAnchored: isAnchoredOption = true,
    container: containerOption,
    inheritThemeFrom,
    visibleClass,
    shouldCloseOnEscape,
    shouldCloseOnOutsideClick,
    getInsideElements,
    returnFocusTo,
    shouldCloseOnScroll,
    shouldCloseOnResize,
    overlayGroup,
    closeCallback,
    ...anchorOptions
  } = opts;
  const isInOverlayTree = !!shouldCloseOnEscape || !!shouldCloseOnOutsideClick || 'overlayGroup' in opts;
  const resolveReference = (): Reference =>
    typeof referenceOption === 'function' ? (referenceOption as () => Reference)() : referenceOption;
  /** The reference resolved at the last open / reanchor. */
  let reference: Reference = typeof referenceOption === 'function' ? null! : referenceOption;
  const referenceElement = (): Element | null => (reference instanceof Element ? reference : null);
  let overlay: OverlayHandle | undefined;
  // Resolved at each open: a trigger inside a modal <dialog> mounts the panel in the dialog.
  const container = (): HTMLElement | ShadowRoot => containerOption ?? findOverlayContainer(referenceElement());
  let handle: AnchorHandle | undefined;
  let isOpen = false;
  let isDestroyed = false;
  let isAnchored = isAnchoredOption;
  let stopListening: (() => void) | undefined;
  /** The panel's own inline placement styles from before anchoring, put back when un-anchored. */
  let ownPlacement: Map<string, string> | undefined;
  /** The panel's own inline `visibility` while core hides it until the first placement. */
  let ownVisibility: string | undefined;
  /** Bumped per hide-until-placed, so an earlier fallback timer can't reveal a later one early. */
  let revealAttempt = 0;

  const themeSource = (): HTMLElement | undefined =>
    inheritThemeFrom === false ? undefined : (inheritThemeFrom ?? (reference instanceof HTMLElement ? reference : undefined));

  /** Drop the inline `visibility: hidden` that waited for the first placement. */
  const reveal = (): void => {
    if (ownVisibility === undefined) return;
    panel.style.visibility = ownVisibility;
    ownVisibility = undefined;
  };

  /** Anchor the open panel (it is mounted and, with a visibleClass, displayed). */
  const attach = (): void => {
    reference = resolveReference();
    if (!ownPlacement) ownPlacement = new Map(PLACEMENT_STYLES.map((prop) => [prop, panel.style[prop]]));
    if (ownVisibility === undefined) {
      ownVisibility = panel.style.visibility;
      panel.style.visibility = 'hidden';
      // Safety net: a computation that fails (logged by anchor()) never places the panel —
      // show it anyway rather than leave an open panel invisible.
      const attempt = ++revealAttempt;
      setTimeout(() => attempt === revealAttempt && reveal(), REVEAL_FALLBACK_MS);
    }
    const { placedCallback, beforeComputeCallback } = anchorOptions;
    const theme = themeSource();
    /** Only a reference that was in the page at anchoring and left since counts as removed. */
    const wasConnected = !!referenceElement()?.isConnected;
    handle = anchor(panel, reference, {
      ...anchorOptions,
      placement: anchorOptions.placement ?? 'bottom-start',
      ...(theme ? { inheritThemeFrom: theme } : {}),
      // A reference removed from the page while open (a virtualised row re-rendered) takes the
      // panel with it, instead of leaving it at stale coordinates — like createTooltip().
      beforeComputeCallback() {
        const ref = referenceElement();
        if (isOpen && wasConnected && ref && !ref.isConnected) {
          closeWith('reference-removed');
          return;
        }
        beforeComputeCallback?.();
      },
      placedCallback(placement) {
        if (isOpen) reveal();
        placedCallback?.(placement);
      },
    });
  };

  /** Stop anchoring; with `shouldRestorePlacement`, the panel's own position / left / top come back. */
  const detach = (shouldRestorePlacement: boolean): void => {
    handle?.destroy(); // puts back the sizes it wrote
    handle = undefined;
    reveal();
    if (shouldRestorePlacement && ownPlacement) {
      for (const [prop, value] of ownPlacement) panel.style[prop as (typeof PLACEMENT_STYLES)[number]] = value;
      ownPlacement = undefined;
    }
  };

  const show = (): void => {
    if (shouldKeepMounted) {
      if (!visibleClass) panel.hidden = false;
    } else {
      container().append(panel);
    }
    if (visibleClass) panel.classList.add(visibleClass);
  };

  const hide = (): void => {
    if (visibleClass) panel.classList.remove(visibleClass);
    if (shouldKeepMounted) {
      if (!visibleClass) panel.hidden = true;
    } else {
      panel.remove();
    }
  };

  const closeWith = (reason: PopoverCloseReason): void => {
    if (!isOpen) return;
    isOpen = false;
    stopListening?.();
    stopListening = undefined;
    detach(true);
    hide();
    overlay?.destroy(); // also closes overlays opened from inside the panel
    overlay = undefined;
    if (!closeCallback) return;
    try {
      closeCallback(reason);
    } catch (error) {
      coreLog(panel, 'UI', 'ELEMENT').error('popover closeCallback threw', error);
    }
  };

  /** Scroll / resize listeners for the open popover; returns their removal. */
  const listen = (): (() => void) | undefined => {
    if (typeof window === 'undefined' || (!shouldCloseOnScroll && !shouldCloseOnResize)) return undefined;
    const removals: (() => void)[] = [];
    if (shouldCloseOnScroll) {
      removals.push(
        watchScrollClose({
          reference,
          isInside: (event) => event.composedPath().includes(panel), // its own list scrolling
          scrollCallback: () => {
            if (isOn(shouldCloseOnScroll, panel)) closeWith('scroll');
          },
        }),
      );
    }
    if (shouldCloseOnResize) {
      const onResize = (): void => {
        if (isOn(shouldCloseOnResize, panel)) closeWith('resize');
      };
      window.addEventListener('resize', onResize);
      removals.push(() => window.removeEventListener('resize', onResize));
    }
    return () => {
      for (const remove of removals) remove();
    };
  };

  return {
    get isOpen() {
      return isOpen;
    },
    get isAnchored() {
      return isOpen && !!handle;
    },
    open() {
      if (isOpen || isDestroyed) return;
      isOpen = true;
      reference = resolveReference();
      show();
      if (isAnchored) attach();
      stopListening = listen();
      if (isInOverlayTree) {
        overlay = registerOverlay(
          (reason) => {
            if (!isOpen) return;
            closeWith(reason);
          },
          overlayGroup,
          { getElement: () => panel, shouldCloseOnEscape, shouldCloseOnOutsideClick, getInsideElements },
        );
        overlay.activate({ trigger: referenceElement(), ...(returnFocusTo !== undefined ? { returnFocusTo } : {}) });
      }
    },
    close() {
      closeWith('api');
    },
    update() {
      handle?.update();
    },
    claimCurrentClick() {
      overlay?.claimCurrentClick();
    },
    reanchor() {
      if (!isOpen || !handle) return;
      detach(false); // keep left / top: the new anchor overwrites them in the same task
      attach();
    },
    setAnchored(next: boolean) {
      if (isDestroyed || next === isAnchored) return;
      isAnchored = next;
      if (!isOpen) return;
      if (next) attach();
      else detach(true);
    },
    // Not `this.close()`: a destructured `destroy` (`const { destroy } = popover`) still works.
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      closeWith('api');
    },
  };
}
