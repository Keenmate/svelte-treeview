/**
 * `startModalSession()` (SPEC §12.19): everything a modal panel needs while open — a dialog, a centered picker,
 * a phone full-screen sheet — in one call with ONE idempotent `end()` for every close path:
 *
 * - the focus trap: the page behind is `inert`, Tab cycles inside, focus goes in and comes back (`createFocusTrap`);
 * - `role="dialog"` (unless the panel has a role) + `aria-modal="true"`, restored on end;
 * - an optional backdrop: `true` = core creates one (`Z_INDEX.modalBackdrop`, `--base-overlay-bg`) right before
 *   the panel, an element = your own; a click on it dismisses;
 * - Escape through the overlay tree (the deepest overlay closes first: a dropdown opened inside closes before
 *   the dialog), the phone Back gesture, page scroll lock and the keyboard inset (`startSheetSession`);
 * - the page's open overlays (default group: dropdowns, popovers, menus) are dismissed at open — never the chain
 *   the modal was opened from (`shouldDismissPageOverlays: false` keeps them);
 * - opened by a press (`isOpenedByPointer`): the tap's trailing "ghost" click on the panel / backdrop is swallowed.
 *
 * Core never closes the panel itself: `dismissCallback(reason)` tells the component, which closes and calls `end()`.
 * The panel's own `z-index` is the component's (`Z_INDEX.modal`, §12.18).
 */
import { createFocusTrap, type FocusTrapOptions } from '../dom/focus-trap.js';
import { Z_INDEX } from '../dom/z-index.js';
import { registerOverlay, type OverlayHandle } from './active-overlay.js';
import { guardGhostClick } from './ghost-click.js';
import { startSheetSession, type SheetSessionOptions } from './sheet-session.js';

/** Why a modal asks to close: Escape, the phone Back gesture, a backdrop click, or the overlay tree. */
export type ModalDismissReason = 'escape' | 'back' | 'backdrop' | 'overlay' | 'parent';

export interface ModalSessionOptions
  extends Pick<SheetSessionOptions, 'shouldLockScroll' | 'shouldCheckContainingBlock' | 'logSource'>,
    Pick<FocusTrapOptions, 'initialFocus' | 'returnFocusTo' | 'shouldMakeBackgroundInert'> {
  /** The user asked to close (see {@link ModalDismissReason}): close the panel and call `end()`. */
  dismissCallback: (reason: ModalDismissReason) => void;
  /**
   * `true` = core inserts a backdrop `<div class="km-modal-backdrop">` right before the panel and removes it on
   * end; an element = your own (core only wires its click); omitted / `false` = none (a full-screen sheet).
   */
  backdrop?: boolean | HTMLElement;
  /** A backdrop click dismisses (`'backdrop'`). Default `true`. */
  shouldCloseOnBackdropClick?: boolean;
  /** Escape dismisses (`'escape'`). Default `true`. A function is asked at each press. */
  shouldCloseOnEscape?: boolean | (() => boolean);
  /** Runs before an Escape close; `false` keeps the panel open (it handled the key — cleared a search). */
  beforeEscapeCallback?(): boolean | void;
  /** The phone Back gesture dismisses (`'back'`). Default `true`. */
  shouldCloseOnBack?: boolean;
  /** The element that opened the modal (overlay-tree parent lookup; default focus return). */
  trigger?: Element | null;
  /**
   * Size the panel to the visual viewport while the on-screen keyboard is up (inline `height` / `top`,
   * `--km-keyboard-inset`). Default `false` — turn it on for a FULL-SCREEN sheet; a centered dialog keeps its size.
   */
  shouldFitToVisibleViewport?: boolean;
  /** Overlay-tree group (default: a modal-only group, so other overlays opening don't dismiss it). */
  group?: unknown;
  /**
   * At open, dismiss the page's overlays — the default (ungrouped) group of the overlay router: open
   * dropdowns, popovers, menus. Never the chain the modal was opened from (the overlay its `trigger` sits in
   * and that one's ancestors), nor anything opened after the session started (a dropdown inside the panel).
   * Overlays in a named group are left alone. Default `true`.
   */
  shouldDismissPageOverlays?: boolean;
  /**
   * The modal opened on a PRESS (`pointerdown` / `mousedown` of a tap): swallow that tap's trailing click if it
   * lands on the panel or backdrop (it would pick an option / dismiss at once) — {@link guardGhostClick}.
   * Leave it off for a modal opened on `click` or the keyboard. Default `false`.
   */
  isOpenedByPointer?: boolean;
}

export interface ModalSession {
  /** Undo everything (idempotent) — call it on EVERY close. `shouldReturnFocus` default `true`. */
  end(opts?: { shouldReturnFocus?: boolean }): void;
  /** Re-arm the Back entry from inside `dismissCallback('back')` (one level up; the modal stays open). */
  rearmBack(): void;
  /** The backdrop in use (core's or yours), `null` without one. */
  readonly backdrop: HTMLElement | null;
  /** `true` once {@link end} ran. */
  readonly isEnded: boolean;
}

/** Modals coordinate among themselves only: a page dropdown opening never dismisses one. */
const MODAL_GROUP = Symbol.for('km-overlay-modal');

/** Inline style of core's backdrop (exported for the manifest test). @internal */
export const MODAL_BACKDROP_STYLE =
  `position:fixed;inset:0;z-index:${Z_INDEX.modalBackdrop};` +
  'background:var(--km-modal-backdrop-bg,var(--base-overlay-bg,rgba(30,41,59,.5)));';

/** Start the session for an open, mounted `panel`; returns its handle. SSR-safe (no-op handle). */
export function startModalSession(panel: HTMLElement, opts: ModalSessionOptions): ModalSession {
  let isEnded = false;
  const undo: (() => void)[] = [];

  // Backdrop (before the trap: it must stay interactive).
  let backdrop: HTMLElement | null = null;
  if (opts.backdrop instanceof HTMLElement) backdrop = opts.backdrop;
  else if (opts.backdrop === true && panel.parentNode) {
    backdrop = panel.ownerDocument.createElement('div');
    backdrop.className = 'km-modal-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.style.cssText = MODAL_BACKDROP_STYLE;
    panel.parentNode.insertBefore(backdrop, panel);
    const created = backdrop;
    undo.push(() => created.remove());
  }
  if (backdrop && (opts.shouldCloseOnBackdropClick ?? true)) {
    const onClick = (e: Event): void => {
      if (e.target === backdrop) opts.dismissCallback('backdrop');
    };
    const el = backdrop;
    el.addEventListener('click', onClick);
    undo.push(() => el.removeEventListener('click', onClick));
  }

  // ARIA.
  const hadRole = panel.hasAttribute('role');
  const prevModal = panel.getAttribute('aria-modal');
  if (!hadRole) panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  undo.push(() => {
    if (!hadRole) panel.removeAttribute('role');
    if (prevModal === null) panel.removeAttribute('aria-modal');
    else panel.setAttribute('aria-modal', prevModal);
  });

  // Scroll lock, keyboard inset, Back.
  const shouldCloseOnBack = opts.shouldCloseOnBack ?? true;
  const sheet = startSheetSession(panel, {
    ...(shouldCloseOnBack ? { backCallback: () => opts.dismissCallback('back') } : {}),
    shouldLockScroll: opts.shouldLockScroll,
    // sizes the panel to the visual viewport (inline height / top): right for a full-screen sheet only
    shouldFitToVisibleViewport: opts.shouldFitToVisibleViewport ?? false,
    shouldCheckContainingBlock: opts.shouldCheckContainingBlock,
    logSource: opts.logSource,
  });

  // Escape through the overlay tree (children opened inside close first).
  const overlay: OverlayHandle = registerOverlay(
    (reason) => {
      if (isEnded) return;
      opts.dismissCallback(reason === 'escape' ? 'escape' : reason === 'parent' ? 'parent' : 'overlay');
    },
    opts.group ?? MODAL_GROUP,
    {
      getElement: () => panel,
      shouldCloseOnEscape: opts.shouldCloseOnEscape ?? true,
      ...(opts.beforeEscapeCallback ? { beforeEscapeCallback: opts.beforeEscapeCallback } : {}),
      getInsideElements: () => [backdrop],
    },
  );

  if (opts.isOpenedByPointer) undo.push(guardGhostClick([panel, backdrop]));

  // Focus trap last: it moves focus in.
  const trap = createFocusTrap(panel, {
    initialFocus: opts.initialFocus,
    // the trigger, else whatever had focus (a null trigger is "unknown", not "nowhere")
    returnFocusTo: opts.returnFocusTo !== undefined ? opts.returnFocusTo : opts.trigger instanceof HTMLElement ? opts.trigger : undefined,
    shouldMakeBackgroundInert: opts.shouldMakeBackgroundInert,
    keepInteractive: [backdrop],
  });
  // Opening dismisses the page's (default-group) overlays, except the chain the trigger is in.
  overlay.activate({
    trigger: opts.trigger ?? null,
    returnFocusTo: null,
    ...((opts.shouldDismissPageOverlays ?? true) ? { dismissGroups: [undefined] } : {}),
  });

  return {
    end(endOpts) {
      if (isEnded) return;
      isEnded = true;
      overlay.destroy();
      sheet.end();
      for (const fn of undo.reverse()) fn();
      trap.release(endOpts);
    },
    rearmBack: () => sheet.rearmBack(),
    get backdrop() {
      return backdrop;
    },
    get isEnded() {
      return isEnded;
    },
  };
}
