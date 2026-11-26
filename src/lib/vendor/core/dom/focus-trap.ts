/**
 * Focus trap (SPEC §12.19): keep keyboard focus and pointer input inside one panel while it is modal — the
 * plumbing web-commandpalette, web-daterangepicker's modal and web-grid's dialogs each wrote by hand.
 *
 * Two layers, like the native `<dialog>.showModal()`:
 * - **The page behind goes `inert`.** Every sibling along the panel's path up to `<body>` (across shadow roots:
 *   the panel's siblings in its shadow root, then the host's siblings, …) gets the `inert` attribute — no
 *   clicks, no focus, hidden from assistive tech. Only what we set is removed again; an element that was
 *   already inert stays. Overlays mounted LATER (a dropdown portaled to `<body>` from inside the dialog) are
 *   not inert, so they work.
 * - **Tab cycles inside the panel.** Shift+Tab on the first tabbable goes to the last and Tab on the last to
 *   the first — tabbables found on the flat tree (open shadow roots, slotted content).
 *
 * `release()` restores both and returns focus to what had it before (or `returnFocusTo`) when focus is still
 * inside the panel or was lost to `<body>`.
 */
import { ANNOUNCER_ATTRIBUTE } from './announce.js';
import { deepActiveElement } from './active-element.js';

export interface FocusTrapOptions {
  /**
   * What gets focus on start: an element, a function returning one, or `false` = leave focus alone.
   * Default: the first `[autofocus]` inside, else the first tabbable, else the panel itself (it gets
   * `tabindex="-1"` for that, removed on release).
   */
  initialFocus?: HTMLElement | null | false | (() => HTMLElement | null | undefined);
  /** Where focus goes back on release. Default: the element focused when the trap started. `null` = nowhere. */
  returnFocusTo?: HTMLElement | null;
  /** Make the page behind inert. Default `true` (`false` = only the Tab cycling). */
  shouldMakeBackgroundInert?: boolean;
  /** Elements that stay interactive even though they sit in the background (a backdrop next to the panel). */
  keepInteractive?: readonly (Element | null | undefined)[];
}

export interface FocusTrap {
  /** Undo it (idempotent). `shouldReturnFocus` (default `true`) moves focus back. */
  release(opts?: { shouldReturnFocus?: boolean }): void;
  /** `true` once {@link release} ran. */
  readonly isReleased: boolean;
}

const TABBABLE =
  'a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable]:not([contenteditable="false"]), audio[controls], video[controls]';

function isTabbable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.matches(TABBABLE)) return false;
  if ((el as HTMLButtonElement).disabled) return false;
  if (el instanceof HTMLInputElement && el.type === 'hidden') return false;
  if (el.tabIndex < 0) return false;
  if (el.closest('[inert]')) return false;
  // Layout check where the engine has it (jsdom has no layout: everything counts as visible).
  const check = (el as HTMLElement & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  if (typeof check === 'function' && !check.call(el, { visibilityProperty: true })) return false;
  return true;
}

/** Children in the flat tree: a host's shadow root, a slot's assigned elements (or its fallback). */
function flatChildren(el: Element): Element[] {
  if (el.shadowRoot) return [...el.shadowRoot.children];
  if (el instanceof HTMLSlotElement) {
    const assigned = el.assignedElements({ flatten: true });
    return assigned.length ? assigned : [...el.children];
  }
  return [...el.children];
}

/** Every tabbable element inside `container` in flat-tree order (open shadow roots and slots included). */
export function getTabbables(container: Element | ShadowRoot): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (el: Element): void => {
    if (el.hasAttribute('inert')) return;
    if (isTabbable(el)) out.push(el);
    for (const child of flatChildren(el)) walk(child);
  };
  const roots = container instanceof ShadowRoot ? [...container.children] : flatChildren(container);
  for (const el of roots) walk(el);
  return out;
}

/** `node` is `container` or inside it, crossing shadow boundaries (and slots) upward. */
function containsFlat(container: Element, node: Node | null): boolean {
  for (let n: Node | null = node; n; ) {
    if (n === container) return true;
    const slot = (n as Element).assignedSlot;
    if (slot) n = slot;
    else if (n.parentNode instanceof ShadowRoot) n = n.parentNode.host;
    else n = n.parentNode;
  }
  return false;
}

/** Set `inert` on every sibling along the panel's path up to `<body>`; returns the undo. */
function inertBackground(panel: Element, keep: readonly (Element | null | undefined)[]): () => void {
  const changed: Element[] = [];
  const keepSet = new Set(keep.filter(Boolean));
  const body = panel.ownerDocument.body;
  for (let node: Element = panel; node !== body; ) {
    const parent = node.parentNode;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling === node || keepSet.has(sibling) || sibling.hasAttribute('inert')) continue;
      if (sibling.localName === 'style' || sibling.localName === 'script' || sibling.localName === 'template') continue;
      if (sibling.hasAttribute(ANNOUNCER_ATTRIBUTE)) continue; // announce() keeps talking over a modal
      sibling.setAttribute('inert', '');
      changed.push(sibling);
    }
    if (parent instanceof ShadowRoot) node = parent.host;
    else if (parent instanceof Element) node = parent;
    else break; // a detached tree / the document itself
  }
  return () => {
    for (const el of changed) el.removeAttribute('inert');
  };
}

/** Start a focus trap on an open, mounted `panel`. SSR-safe (no-op handle). */
export function createFocusTrap(panel: HTMLElement, opts: FocusTrapOptions = {}): FocusTrap {
  let isReleased = false;
  if (typeof document === 'undefined' || !panel.isConnected) {
    return {
      release() {
        isReleased = true;
      },
      get isReleased() {
        return isReleased;
      },
    };
  }

  const previous = deepActiveElement();
  const returnTo = opts.returnFocusTo !== undefined ? opts.returnFocusTo : previous instanceof HTMLElement ? previous : null;
  const undoInert = (opts.shouldMakeBackgroundInert ?? true) ? inertBackground(panel, opts.keepInteractive ?? []) : () => {};

  let addedTabIndex = false;
  const focusPanel = (): void => {
    if (!panel.hasAttribute('tabindex')) {
      panel.setAttribute('tabindex', '-1');
      addedTabIndex = true;
    }
    panel.focus({ preventScroll: true });
  };

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tabbables = getTabbables(panel);
    if (tabbables.length === 0) {
      e.preventDefault();
      focusPanel();
      return;
    }
    const first = tabbables[0]!;
    const last = tabbables[tabbables.length - 1]!;
    const active = deepActiveElement();
    const index = active ? tabbables.indexOf(active as HTMLElement) : -1;
    if (e.shiftKey && (index <= 0)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (index === -1 || index === tabbables.length - 1)) {
      e.preventDefault();
      first.focus();
    }
  };
  panel.addEventListener('keydown', onKeydown);

  // Initial focus.
  if (opts.initialFocus !== false) {
    const wanted = typeof opts.initialFocus === 'function' ? opts.initialFocus() : opts.initialFocus;
    const target =
      wanted ??
      (getTabbables(panel).find((el) => el.hasAttribute('autofocus')) ?? getTabbables(panel)[0] ?? null);
    if (target) target.focus({ preventScroll: true });
    else focusPanel();
  }

  return {
    release(releaseOpts) {
      if (isReleased) return;
      isReleased = true;
      panel.removeEventListener('keydown', onKeydown);
      undoInert();
      const active = deepActiveElement();
      const hadFocus = !active || active === panel.ownerDocument.body || containsFlat(panel, active);
      if (addedTabIndex) panel.removeAttribute('tabindex');
      if ((releaseOpts?.shouldReturnFocus ?? true) && hadFocus && returnTo?.isConnected) {
        returnTo.focus({ preventScroll: true });
      }
    },
    get isReleased() {
      return isReleased;
    },
  };
}
