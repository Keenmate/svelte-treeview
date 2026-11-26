/**
 * Cross-component "one overlay open at a time" coordination.
 *
 * Floating overlays across every KM component (multiselect dropdown, daterangepicker
 * calendar, a future menu, …) — and any *external* popover (a Svelte component, a
 * plain-DOM widget, another framework) — cooperate so that opening one dismisses all
 * the others. There is exactly one coordination channel: a `document` CustomEvent
 * `km-overlay-activate` (namespaced like `km-log`), carrying `{ source, group }`.
 * Everyone routes through it, so **nothing has to import this module to participate**
 * — pure DOM code can both trigger and observe the same behaviour.
 *
 * ## Groups
 * Overlays coordinate only *within a group*. Register with a `group` to scope a set of
 * controls so they dismiss each other but leave other groups untouched — e.g. a toolbar
 * of pickers that shouldn't close a sidebar of pickers. Overlays registered with no
 * group share the default (ungrouped) group. Opening a group-`A` overlay dismisses only
 * other group-`A` overlays. {@link dismissAllOverlays}() (no argument) crosses every
 * group via the {@link ALL_OVERLAY_GROUPS} wildcard.
 *
 * ## Nesting (parents)
 * Overlays form a tree: a dropdown inside a modal, a context menu inside the dropdown, a
 * submenu… Opening a child must not dismiss its ancestors. The detail carries an optional
 * `ancestors` list — the sources NOT to dismiss — and participants are skipped when their
 * source is in it. Core fills it in for you: give {@link registerOverlay} the overlay's
 * panel element (`getElement`) and {@link OverlayHandle.activate} the element that opened
 * it (`trigger`); the parent is the nearest OPEN overlay whose panel contains the trigger
 * (across shadow roots), found in a page-wide registry every copy of core shares. Closing
 * an overlay ({@link OverlayHandle.deactivate}) dismisses the overlays opened inside it,
 * deepest first. External code may pass `ancestors` itself; an activation without it
 * behaves exactly as before.
 *
 * Direction A — dismiss KM overlays from outside code:
 *   document.dispatchEvent(new CustomEvent('km-overlay-activate', { detail: { source: myId, group: 'A' } }))
 *   // or, if you import core: dispatchOverlayActivated(myId, 'A')
 *
 * Direction B — have your own popover dismissed when a KM overlay opens:
 *   document.addEventListener('km-overlay-activate', (e) => {
 *     const { source, group, ancestors = [] } = e.detail;
 *     if (source !== myId && !ancestors.includes(myId) && group === myGroup) closeMyPopover();
 *   })
 *   // or, if you import core: observeOverlayActivation((source, group) => { … })
 *
 * `source` is an opaque identity used only for `===` self-comparison so an opener never
 * dismisses itself. Registered participants get a private token automatically; external
 * callers pass their own (a string, an object, anything).
 *
 * SSR-safe: with no `document`, registration still works but activation is a no-op.
 */

import { deepActiveElement } from '../dom/active-element.js';
import { deepParent } from '../dom/composed-tree.js';
import { sharedState, sharedStateKey } from '../global/shared-state.js';
import { coreLog } from '../logging/element-logger.js';

/** The single coordination event. `detail` is an {@link OverlayActivateDetail}. */
export const OVERLAY_ACTIVATE_EVENT = 'km-overlay-activate';

/**
 * Wildcard group: an activation carrying it dismisses overlays in *every* group. A
 * registry symbol (`Symbol.for`), so every bundled copy of core — and outside code —
 * holds the same value: `dismissAllOverlays()` from one component reaches all of them.
 */
export const ALL_OVERLAY_GROUPS: unique symbol = Symbol.for('km-overlay-all-groups');

/** Detail payload of {@link OVERLAY_ACTIVATE_EVENT}. */
export interface OverlayActivateDetail {
  /** Opaque identity of the overlay that opened; peers with a different source dismiss. */
  source: unknown;
  /** Coordination group; only same-group overlays dismiss (or all when {@link ALL_OVERLAY_GROUPS}). */
  group: unknown;
  /** Sources of the opener's ancestor overlays (parent first) — never dismissed by this activation. */
  ancestors?: readonly unknown[];
}

/**
 * Why core dismissed an overlay: another overlay opened (`'overlay'`, also `dismissAllOverlays`),
 * the overlay it was opened from closed (`'parent'`), Escape (`'escape'`) or a pointer press
 * outside it (`'outside-click'`) — the last two only for overlays that opt in.
 */
export type OverlayDismissReason = 'overlay' | 'parent' | 'escape' | 'outside-click';

/** Options of {@link registerOverlay}. */
export interface RegisterOverlayOptions {
  /** The overlay's panel (or root) element — overlays opened from inside it become its children. */
  getElement?: () => Element | null | undefined;
  /**
   * Close on Escape (overlay tree step 2): Escape closes only the DEEPEST open overlay that opts
   * in — one level per press — and returns focus to what opened it. A function is asked at each
   * Escape (`false` = this overlay doesn't take part in that press). Default `false`.
   */
  shouldCloseOnEscape?: boolean | (() => boolean);
  /**
   * Runs when an Escape press would close this overlay (it is the deepest that takes part). Return
   * `false` to keep it open — the overlay handled the key itself (stepped back a level, cleared its
   * search); the press is consumed either way, so nothing below closes.
   */
  beforeEscapeCallback?(): boolean | void;
  /**
   * Close on a click outside the panel: a press that STARTED outside and a click that ENDED
   * outside, decided once that click has finished (after the page's own click handlers), like the
   * browser's popover light dismiss. Everything above the overlay that was clicked in closes
   * (outside every overlay → the whole chain), deepest first. Not counted as outside: the
   * overlay's own trigger (it toggles it), {@link getInsideElements}, a click during which the
   * overlay was (re)activated or {@link OverlayHandle.claimCurrentClick claimed} (a page button
   * that drives it through its API). A keyboard "click" (Enter on a button) never closes it. A
   * function is asked at each click (`false` = this click doesn't close it). Default `false`.
   */
  shouldCloseOnOutsideClick?: boolean | (() => boolean);
  /**
   * More elements a press on doesn't count as outside (besides the panel and the trigger) — the
   * host around the trigger, a hint, a counter that toggles the panel. Read at each press.
   */
  getInsideElements?: () => readonly (Element | null | undefined)[];
}

/** Options of {@link OverlayHandle.activate}. */
export interface ActivateOverlayOptions {
  /** The element that opened the overlay; the nearest open overlay containing it becomes the parent. */
  trigger?: Element | null;
  /** The parent overlay's source, when known (overrides the `trigger` lookup). */
  parent?: unknown;
  /**
   * Where focus goes after an Escape close. Default: the `trigger`. `null` returns focus nowhere
   * (a focus-triggered picker would reopen on it).
   */
  returnFocusTo?: HTMLElement | null;
  /**
   * More groups this activation dismisses, besides the overlay's own — with the same exclusions (this
   * overlay and its ancestors). `startModalSession` passes the default group: a modal opening closes the
   * page's dropdowns / popovers / menus, but not the chain it was opened from.
   */
  dismissGroups?: readonly unknown[];
}

/** Handle returned by {@link registerOverlay}. */
export interface OverlayHandle {
  /**
   * This overlay opened: broadcast so every *other* overlay in its group dismisses —
   * except its ancestors (see the module notes on nesting).
   */
  activate(opts?: ActivateOverlayOptions): void;
  /**
   * This overlay closed: the overlays opened inside it are dismissed too (deepest first).
   * `shouldReturnFocus` moves focus back to `returnFocusTo` / the trigger when it was inside the panel
   * (or lost to `<body>`) — what an Escape close does, for the component's own close paths (✕, a pick).
   */
  deactivate(opts?: { shouldReturnFocus?: boolean }): void;
  /**
   * Keep this overlay open through the click being handled right now: call it from an API
   * method a page control may invoke (`scrollToIndex()`, `refresh()` from a button outside the
   * panel), so that click isn't taken as an outside click. No-op outside a click.
   */
  claimCurrentClick(): void;
  /** Stop participating (call on disconnect/destroy). Also deactivates. */
  destroy(): void;
}

interface Participant {
  /** Private per-registration identity, used as the event `source` on activate. */
  readonly id: object;
  /** Coordination group (default `undefined` — the ungrouped group). */
  readonly group: unknown;
  /** Called when another overlay in the same group activates (or a dismiss is requested). */
  readonly dismiss: (reason: OverlayDismissReason) => void;
}

/**
 * One OPEN overlay in the page-wide tree. Shared by every copy of core, so a context
 * menu from one component finds the dropdown of another as its parent.
 */
interface OpenOverlay {
  readonly getElement?: () => Element | null | undefined;
  /** Ancestor sources, parent first. */
  readonly ancestors: readonly unknown[];
  readonly dismiss: (reason: OverlayDismissReason) => void;
  /** The element that opened it — focus returns there; a press on it doesn't count as outside. */
  readonly trigger?: Element | null;
  /** Overrides `trigger` as the focus target after Escape; `null` = none. */
  readonly returnFocusTo?: HTMLElement | null;
  readonly shouldCloseOnEscape?: boolean | (() => boolean);
  /** Added after rc24 (optional: older copies of core don't write it). */
  readonly beforeEscapeCallback?: () => boolean | void;
  /**
   * Written by copies of core older than the click-time rule: their routers close on the
   * `pointerdown`. This copy's router honours it too (at click time).
   */
  readonly shouldCloseOnOutsideClick?: boolean | (() => boolean);
  /**
   * The outside-click rule, decided at click time. Stored under its own name so an older core
   * copy's `pointerdown` router (same page, shared registry) never acts on it.
   */
  readonly outsideClickRule?: boolean | (() => boolean);
  readonly getInsideElements?: () => readonly (Element | null | undefined)[];
}

/**
 * A `shouldCloseOn*` value now: a function is asked (a throw counts as `false`, logged).
 * Note: on a page with several core copies, routing runs in the copy that installed it first;
 * a copy older than this treats any function as `true`.
 */
function isOn(value: boolean | (() => boolean) | undefined): boolean {
  if (typeof value !== 'function') return !!value;
  try {
    return value() === true;
  } catch (error) {
    coreLog(null, 'UI', 'ELEMENT').error('overlay shouldCloseOn* callback threw', error);
    return false;
  }
}

/**
 * Escape / outside-click routing (step 2), installed ONCE per page by whichever copy of core
 * needs it first; it reads the shared registry, so overlays from every copy are routed. The key
 * is versioned: the click-time outside rule needs this copy's router even when an older copy
 * installed its `pointerdown` one (both handle Escape; the second sees `defaultPrevented`); v3
 * also decides a click whose propagation a page handler stopped (an rc19 router misses it).
 */
const routing = (): { isInstalled: boolean } => sharedState(sharedStateKey('overlay-routing-v3'), () => ({ isInstalled: false }));

/**
 * The click in progress: the overlays its press started outside of, and the overlays claimed
 * (re-activated or {@link OverlayHandle.claimCurrentClick}) since that press. Shared, so a
 * claim from any copy of core reaches the router. `clickPath` is the click's path while it is
 * being dispatched (seen on the way down, not yet decided on the way up).
 */
interface PendingClick {
  candidates: Set<unknown> | null;
  claimed: Set<unknown>;
  clickPath?: readonly EventTarget[] | null;
}
const pendingClick = (): PendingClick =>
  sharedState(sharedStateKey('overlay-pending-click'), (): PendingClick => ({ candidates: null, claimed: new Set<unknown>() }));

/** Does the event's composed path contain `el`? */
function pathContains(path: readonly EventTarget[], el: Element | null | undefined): boolean {
  return !!el && path.includes(el);
}

/** The deepest open overlay (longest ancestor chain; the later one on a tie) matching `filter`. */
function deepestOpen(filter: (entry: OpenOverlay) => boolean): [unknown, OpenOverlay] | undefined {
  let best: [unknown, OpenOverlay] | undefined;
  for (const pair of openOverlays()) {
    if (!filter(pair[1])) continue;
    if (!best || pair[1].ancestors.length >= best[1].ancestors.length) best = pair;
  }
  return best;
}

/** Close one open overlay as the router: out of the tree, its subtree first, then itself. */
function closeRouted(source: unknown, entry: OpenOverlay, reason: OverlayDismissReason): void {
  const open = openOverlays();
  if (!open.has(source)) return;
  open.delete(source);
  dismissDescendants(source);
  try {
    entry.dismiss(reason);
  } catch (error) {
    coreLog(null, 'UI', 'ELEMENT').error('overlay dismiss threw', error);
  }
}

function onRoutedKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
  const hit = deepestOpen((e) => isOn(e.shouldCloseOnEscape));
  if (!hit) return;
  const [source, entry] = hit;
  event.preventDefault();
  event.stopPropagation();
  let shouldClose = true;
  if (entry.beforeEscapeCallback) {
    try {
      shouldClose = entry.beforeEscapeCallback() !== false;
    } catch (error) {
      coreLog(null, 'UI', 'ELEMENT').error('overlay beforeEscapeCallback threw', error);
    }
  }
  if (!shouldClose) return;
  const hadFocus = hasFocusInside(entry);
  closeRouted(source, entry, 'escape');
  if (hadFocus) returnFocus(entry);
}

/** Focus is inside the overlay's panel (or was lost to `<body>`). */
function hasFocusInside(entry: OpenOverlay): boolean {
  const panel = entry.getElement?.();
  const active = deepActiveElement();
  return !!panel && !!active && (panel === active || panel.contains(active) || active === document.body);
}

/** Focus goes back to what opened the overlay (`returnFocusTo`, else the trigger; `null` = nowhere). */
function returnFocus(entry: OpenOverlay): void {
  const focusTarget = entry.returnFocusTo === undefined ? entry.trigger : entry.returnFocusTo;
  if (focusTarget instanceof HTMLElement && focusTarget.isConnected) focusTarget.focus({ preventScroll: true });
}

/** The open overlays with an outside-click rule that an event with this `path` is outside of. */
function outsideOf(path: readonly EventTarget[]): [unknown, OpenOverlay][] {
  // The overlay pressed in (the deepest whose panel is on the path) and its ancestors stay.
  const inside = deepestOpen((e) => pathContains(path, e.getElement?.()));
  const keep = new Set<unknown>(inside ? [inside[0], ...inside[1].ancestors] : []);
  return [...openOverlays()].filter(
    ([source, e]) =>
      (e.outsideClickRule ?? e.shouldCloseOnOutsideClick) !== undefined &&
      !keep.has(source) &&
      !pathContains(path, e.trigger ?? null) &&
      !(e.getInsideElements?.() ?? []).some((el) => pathContains(path, el)),
  );
}

/** A press: remember what it started outside of. Nothing closes yet — the click decides. */
function onRoutedPointerDown(event: PointerEvent): void {
  const pending = pendingClick();
  pending.claimed.clear();
  pending.clickPath = null;
  pending.candidates = new Set(outsideOf(event.composedPath()).map(([source]) => source));
}

/**
 * The press is over (the click, if any, runs in the same task): once that task is done, a press
 * that never got its click — a drag, a release elsewhere — is forgotten, so a later keyboard
 * "click" doesn't close what it started outside of.
 */
function onRoutedPointerUp(): void {
  const pending = pendingClick();
  const candidates = pending.candidates;
  if (!candidates) return;
  setTimeout(() => {
    if (pending.candidates === candidates && !pending.clickPath) pending.candidates = null;
  }, 0);
}

/**
 * The click on its way down (`window`, capture): remember its path. If a page handler stops its
 * propagation, the bubble listener never runs, so the click is decided once its task is done.
 */
function onRoutedClickCapture(event: MouseEvent): void {
  const pending = pendingClick();
  if (!pending.candidates) return;
  const path = event.composedPath();
  pending.clickPath = path;
  setTimeout(() => {
    if (pending.clickPath === path) decideClick(path);
  }, 0);
}

/**
 * The click has run every page handler (this listens on `window`, bubble phase): close what it
 * both started and ended outside of, unless claimed meanwhile.
 */
function onRoutedClick(event: MouseEvent): void {
  decideClick(event.composedPath());
}

function decideClick(path: readonly EventTarget[]): void {
  const pending = pendingClick();
  const candidates = pending.candidates;
  pending.candidates = null;
  pending.clickPath = null;
  if (!candidates || candidates.size === 0) {
    pending.claimed.clear();
    return;
  }
  const toClose = outsideOf(path)
    .filter(([source, e]) => candidates.has(source) && !pending.claimed.has(source) && isOn(e.outsideClickRule ?? e.shouldCloseOnOutsideClick))
    .sort((a, b) => b[1].ancestors.length - a[1].ancestors.length);
  pending.claimed.clear();
  for (const [source, entry] of toClose) closeRouted(source, entry, 'outside-click');
}

/** A cancelled press (a touch that became a scroll) never ends in a click: forget it. */
function onRoutedPointerCancel(): void {
  const pending = pendingClick();
  pending.candidates = null;
  pending.clickPath = null;
  pending.claimed.clear();
}

function ensureRouting(): void {
  const state = routing();
  if (state.isInstalled || !hasDocument()) return;
  state.isInstalled = true;
  document.addEventListener('keydown', onRoutedKeydown, true);
  document.addEventListener('pointerdown', onRoutedPointerDown, true);
  document.addEventListener('pointerup', onRoutedPointerUp, true);
  document.addEventListener('pointercancel', onRoutedPointerCancel, true);
  window.addEventListener('click', onRoutedClickCapture, true);
  window.addEventListener('click', onRoutedClick);
}

const openOverlays = (): Map<unknown, OpenOverlay> =>
  sharedState(sharedStateKey('open-overlays'), () => new Map<unknown, OpenOverlay>());

const participants = new Set<Participant>();
/** Installed lazily on first registration; removed when the last participant disposes. */
let listening = false;

function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

/** An activation in `eventGroup` dismisses a participant in `participantGroup` when they match. */
function groupMatches(participantGroup: unknown, eventGroup: unknown): boolean {
  return eventGroup === ALL_OVERLAY_GROUPS || participantGroup === eventGroup;
}

/** The single document listener: dismiss same-group participants that aren't the opener or its ancestors. */
function onActivated(e: Event): void {
  const detail = (e as CustomEvent<OverlayActivateDetail>).detail;
  const source = detail?.source;
  const group = detail?.group;
  const ancestors: readonly unknown[] = Array.isArray(detail?.ancestors) ? detail.ancestors : [];
  // Snapshot: a dismiss handler may destroy (mutating the set) mid-iteration.
  for (const p of Array.from(participants)) {
    if (p.id !== source && !ancestors.includes(p.id) && groupMatches(p.group, group)) {
      p.dismiss('overlay');
      // A dismissed overlay is closed even if its dismiss handler forgot to deactivate():
      // drop it from the tree (and close what it opened) so it can't be picked as a parent.
      const open = openOverlays();
      if (open.has(p.id)) {
        open.delete(p.id);
        dismissDescendants(p.id);
      }
    }
  }
}

/** Does `container` contain `node`, crossing shadow roots (a trigger inside a component's shadow DOM)? */
function containsComposed(container: Element, node: Node): boolean {
  for (let n: Node | null = node; n; n = deepParent(n)) {
    if (n === container) return true;
  }
  return false;
}

/** The ancestor chain (parent first) of an overlay opened from `trigger`, or under `parent`. */
function resolveAncestors(self: unknown, opts: ActivateOverlayOptions | undefined): unknown[] {
  const open = openOverlays();
  let parent: unknown = opts?.parent;
  if (parent === undefined && opts?.trigger) {
    // The nearest open overlay containing the trigger = the deepest candidate (longest chain).
    let depth = -1;
    for (const [source, entry] of open) {
      if (source === self) continue;
      const el = entry.getElement?.();
      if (el && containsComposed(el, opts.trigger) && entry.ancestors.length > depth) {
        parent = source;
        depth = entry.ancestors.length;
      }
    }
  }
  if (parent === undefined) return [];
  return [parent, ...(open.get(parent)?.ancestors ?? [])];
}

/** Dismiss every open overlay whose ancestor chain contains `source`, deepest first. */
function dismissDescendants(source: unknown): void {
  const descendants = [...openOverlays()].filter(([, entry]) => entry.ancestors.includes(source));
  descendants.sort((a, b) => b[1].ancestors.length - a[1].ancestors.length);
  const open = openOverlays();
  for (const [descendant, entry] of descendants) {
    open.delete(descendant); // closed now, whether or not its handler deactivates
    try {
      entry.dismiss('parent');
    } catch (error) {
      coreLog(null, 'UI', 'ELEMENT').error('overlay dismiss threw', error);
    }
  }
}

function ensureListening(): void {
  if (listening || !hasDocument()) return;
  document.addEventListener(OVERLAY_ACTIVATE_EVENT, onActivated);
  listening = true;
}

function stopListeningIfIdle(): void {
  if (listening && participants.size === 0 && hasDocument()) {
    document.removeEventListener(OVERLAY_ACTIVATE_EVENT, onActivated);
    listening = false;
  }
}

/** Broadcast the coordination event. No-op without a `document` (SSR). */
function broadcast(source: unknown, group: unknown, ancestors?: readonly unknown[]): void {
  if (!hasDocument()) return;
  const detail: OverlayActivateDetail = ancestors && ancestors.length > 0 ? { source, group, ancestors } : { source, group };
  document.dispatchEvent(new CustomEvent<OverlayActivateDetail>(OVERLAY_ACTIVATE_EVENT, { detail }));
}

/**
 * Register an overlay as a participant. `onDismiss` runs when another overlay in the
 * same `group` opens (or a dismiss is requested, or its parent overlay closes) — make it
 * idempotent (a closed overlay closing again should be a no-op). `group` scopes
 * coordination (default: ungrouped). Pass `getElement` so overlays opened from inside
 * this one become its children instead of dismissing it. Returns a handle to drive activation.
 */
export function registerOverlay(
  onDismiss: (reason: OverlayDismissReason) => void,
  group?: unknown,
  opts: RegisterOverlayOptions = {},
): OverlayHandle {
  const participant: Participant = { id: {}, group, dismiss: onDismiss };
  participants.add(participant);
  ensureListening();

  const deactivate = (deactivateOpts?: { shouldReturnFocus?: boolean }): void => {
    const open = openOverlays();
    const entry = open.get(participant.id);
    if (!entry) return;
    const hadFocus = !!deactivateOpts?.shouldReturnFocus && hasFocusInside(entry);
    open.delete(participant.id);
    dismissDescendants(participant.id); // closing a parent closes its subtree
    if (hadFocus) returnFocus(entry);
  };

  return {
    activate(activateOpts?: ActivateOverlayOptions): void {
      const ancestors = resolveAncestors(participant.id, activateOpts);
      openOverlays().set(participant.id, {
        getElement: opts.getElement,
        ancestors,
        dismiss: onDismiss,
        trigger: activateOpts?.trigger ?? null,
        ...(activateOpts?.returnFocusTo !== undefined ? { returnFocusTo: activateOpts.returnFocusTo } : {}),
        shouldCloseOnEscape: opts.shouldCloseOnEscape,
        ...(opts.beforeEscapeCallback ? { beforeEscapeCallback: opts.beforeEscapeCallback } : {}),
        outsideClickRule: opts.shouldCloseOnOutsideClick,
        getInsideElements: opts.getInsideElements,
      });
      // Opened (or re-opened) during a click: that click doesn't close it.
      pendingClick().claimed.add(participant.id);
      if (opts.shouldCloseOnEscape || opts.shouldCloseOnOutsideClick) ensureRouting();
      // Route through the event so external listeners see KM activations too; the shared
      // listener dismisses every *other* same-group participant that isn't an ancestor.
      broadcast(participant.id, participant.group, ancestors);
      for (const group of activateOpts?.dismissGroups ?? []) {
        if (group !== participant.group) broadcast(participant.id, group, ancestors);
      }
    },
    deactivate,
    claimCurrentClick(): void {
      pendingClick().claimed.add(participant.id);
    },
    destroy(): void {
      participants.delete(participant);
      deactivate();
      stopListeningIfIdle();
    },
  };
}

/**
 * Framework-agnostic trigger for non-registered code (Svelte, plain DOM, …): announce
 * that an overlay opened so all registered/listening overlays in `group` except `source`
 * dismiss. Pass your own stable `source` to avoid dismissing yourself; pass a `group`
 * (default: ungrouped) to scope it, or {@link ALL_OVERLAY_GROUPS} to hit every group; pass
 * `ancestors` to keep the overlays your overlay was opened from.
 */
export function dispatchOverlayActivated(source?: unknown, group?: unknown, ancestors?: readonly unknown[]): void {
  broadcast(source, group, ancestors);
}

/**
 * Dismiss registered/listening overlays right now (e.g. route change, modal open). With
 * no argument (or `undefined`) it crosses every group; pass a `group` to dismiss just that group.
 */
export function dismissAllOverlays(group?: unknown): void {
  broadcast(undefined, group === undefined ? ALL_OVERLAY_GROUPS : group);
}

/**
 * Subscribe to overlay activations (typed sugar over the DOM event). The handler gets
 * the opener's `source`, `group` and `ancestors`; compare them to your own to decide
 * whether to close. Returns an unsubscribe function. No-op without a `document`.
 */
export function observeOverlayActivation(handler: (source: unknown, group: unknown, ancestors: readonly unknown[]) => void): () => void {
  if (!hasDocument()) return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<OverlayActivateDetail>).detail;
    handler(detail?.source, detail?.group, Array.isArray(detail?.ancestors) ? detail.ancestors : []);
  };
  document.addEventListener(OVERLAY_ACTIVATE_EVENT, listener);
  return () => document.removeEventListener(OVERLAY_ACTIVATE_EVENT, listener);
}

/** Test-only: drop all participants and detach the listener. */
export function __resetOverlays(): void {
  participants.clear();
  openOverlays().clear();
  if (listening && hasDocument()) {
    document.removeEventListener(OVERLAY_ACTIVATE_EVENT, onActivated);
  }
  listening = false;
  const route = routing();
  if (route.isInstalled && hasDocument()) {
    document.removeEventListener('keydown', onRoutedKeydown, true);
    document.removeEventListener('pointerdown', onRoutedPointerDown, true);
    document.removeEventListener('pointerup', onRoutedPointerUp, true);
    document.removeEventListener('pointercancel', onRoutedPointerCancel, true);
    window.removeEventListener('click', onRoutedClickCapture, true);
    window.removeEventListener('click', onRoutedClick);
  }
  route.isInstalled = false;
  onRoutedPointerCancel();
}
