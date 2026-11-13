/**
 * Theme context (SPEC §12.10) — which color scheme the page (or a chosen
 * element) asks for, detected ONCE and shared by every component.
 *
 * Components used to read a framework's dark/light signal with
 * `:host-context(.dark)` and friends. Firefox doesn't support `:host-context()`
 * and Safari only partly, so on those browsers a component on a Tailwind
 * `<html class="dark">` page rendered light. This module moves the detection to
 * JS, once per page, and `BlissElement` mirrors the result onto every host as
 * `data-context-theme="dark|light"`, which plain `:host([…])` CSS can match in
 * every browser.
 *
 * **Detect once, reuse.** One cached value per watched element: the page
 * (`<html>`, then `<body>`) by default, or a `theme-source` element. Detection
 * runs when the first subscriber arrives and again only when one shared
 * `MutationObserver` sees `class` / `data-theme` / `data-bs-theme` change on a
 * watched element. 50 components on one page cost one detection and one
 * observer, not 50. Subscribers are notified only when their result changes.
 *
 * **Resolution, highest first** (per-instance `data-theme` forcing is pure CSS
 * in the component and sits above all of this):
 *   1. {@link setThemeMode} `'dark' | 'light'` — forced globally; observers pause.
 *   2. The subscriber's `theme-source` element, when it carries a signal.
 *   3. The page: `<html>`, then `<body>`.
 *   4. `null` — nothing to mirror; the inherited `color-scheme` applies.
 *
 * State lives on `globalThis` under a `Symbol.for` key, so two copies of core
 * bundled into one page (two components shipping their own) still share one
 * mode, one cache and one observer per element.
 */

import { sharedState } from '../global/shared-state.js';
import { composedParent } from '../dom/composed-tree.js';
import { coreLog } from '../logging/element-logger.js';
import { once } from '../dom/once.js';

/** A concrete color scheme. */
export type ColorScheme = 'dark' | 'light';

/** The global theme mode: force a scheme, or `'auto'` to detect. */
export type ThemeMode = ColorScheme | 'auto';

/**
 * Where a component reads its theme from instead of the page:
 * - a CSS selector — the nearest matching ancestor (crossing shadow roots),
 *   else the first match in the document;
 * - `'closest'` — the nearest ancestor that carries a theme signal, re-resolved
 *   whenever an ancestor gains or loses one (a section switched to dark later);
 * - an `Element` (property only).
 * `null` / unset means the page.
 */
export type ThemeSource = string | Element | null;

/** Receives the effective scheme (`null` when nothing is detected or forced). */
export type ThemeListener = (scheme: ColorScheme | null) => void;

/** Host attribute `BlissElement` writes with the effective scheme. */
export const THEME_CONTEXT_ATTRIBUTE = 'data-context-theme';

/** The attribute every `BlissElement` observes to pick its theme source. */
export const THEME_SOURCE_ATTRIBUTE = 'theme-source';

/** Attributes that carry a theme signal (and the only ones observed). */
const SIGNAL_ATTRIBUTES = ['class', 'data-theme', 'data-bs-theme'];

/**
 * Read the theme signal on ONE element, in priority order, stopping at the
 * first match: `data-theme`, then `data-bs-theme`, then a `.dark` / `.light`
 * class. Only `dark` / `light` count — a named theme like
 * `data-theme="corporate"` is not a scheme and falls through.
 */
export function readThemeSignal(el: Element): ColorScheme | null {
  for (const attr of ['data-theme', 'data-bs-theme']) {
    const value = el.getAttribute(attr);
    if (value === 'dark' || value === 'light') return value;
  }
  if (el.classList.contains('dark')) return 'dark';
  if (el.classList.contains('light')) return 'light';
  return null;
}

// ── shared state ───────────────────────────────────────────────────────────

interface Subscriber {
  /** The source element this subscriber watches, or null for the page only. */
  source: Watch | null;
  listener: ThemeListener;
  /** Last value delivered; `undefined` before the first delivery. */
  last: ColorScheme | null | undefined;
  /** `'closest'` subscribers: the host, and its composed ancestors below the page (re-resolved on a signal change). */
  closest?: { host: Element; chain: Element[] };
}

interface Watch {
  /** The page watch tracks <html> + <body>; a source watch tracks one element. */
  kind: 'page' | 'source';
  /** The source element (unused for the page watch). */
  element: Element | null;
  /** Cached detection result. */
  value: ColorScheme | null;
  observer: MutationObserver | null;
  /** Whether the observer is attached (false while paused or unsubscribed). */
  isObserving: boolean;
  /** The <body> the page observer is attached to (to notice a swapped body). */
  body: HTMLElement | null;
  subscribers: Set<Subscriber>;
}

interface ThemeState {
  mode: ThemeMode;
  page: Watch;
  sources: Map<Element, Watch>;
  /** The `'closest'` subscribers and the ONE observer on their ancestors (added lazily: older copies of core share this state). */
  closest?: ClosestState;
}

interface ClosestState {
  subscribers: Set<Subscriber>;
  observer: MutationObserver | null;
}

const STATE_KEY = '@keenmate/web-components-core/theme@1';

function state(): ThemeState {
  return sharedState(STATE_KEY, () => ({
    mode: 'auto',
    page: newWatch('page', null),
    sources: new Map(),
  }));
}

function newWatch(kind: Watch['kind'], element: Element | null): Watch {
  return { kind, element, value: null, observer: null, isObserving: false, body: null, subscribers: new Set() };
}

const hasDom = (): boolean => typeof document !== 'undefined' && typeof MutationObserver !== 'undefined';

// ── detection ──────────────────────────────────────────────────────────────

function detect(watch: Watch): ColorScheme | null {
  if (watch.kind === 'source') return watch.element ? readThemeSignal(watch.element) : null;
  const html = document.documentElement;
  return (html && readThemeSignal(html)) ?? (document.body ? readThemeSignal(document.body) : null);
}

/** Effective scheme for one subscriber, from cached values only (no detection). */
function effective(sub: Subscriber): ColorScheme | null {
  const s = state();
  if (s.mode !== 'auto') return s.mode;
  return sub.source?.value ?? s.page.value;
}

function deliver(sub: Subscriber): void {
  const next = effective(sub);
  if (next === sub.last) return;
  sub.last = next;
  // A throwing listener is logged and skipped — the other subscribers still hear the flip.
  try {
    sub.listener(next);
  } catch (error) {
    coreLog(null, 'UI', 'THEME').error('theme listener threw', error);
  }
}

/** Every subscriber whose result depends on `watch` (the page affects all). */
function dependents(watch: Watch): Subscriber[] {
  const s = state();
  if (watch.kind === 'source') return [...watch.subscribers];
  const all = [...s.page.subscribers];
  for (const w of s.sources.values()) all.push(...w.subscribers);
  return all;
}

function redetect(watch: Watch): void {
  const next = detect(watch);
  if (next === watch.value) return;
  watch.value = next;
  for (const sub of dependents(watch)) deliver(sub);
}

// ── observing ────────────────────────────────────────────────────────────────

/** A watch observes only while it has subscribers AND the mode is 'auto'. */
function shouldObserve(watch: Watch): boolean {
  if (state().mode !== 'auto') return false;
  if (watch.kind === 'source') return watch.subscribers.size > 0;
  // The page is the fallback for source subscribers too.
  const s = state();
  return s.page.subscribers.size > 0 || [...s.sources.values()].some((w) => w.subscribers.size > 0);
}

function startWatch(watch: Watch): void {
  if (watch.isObserving) return;
  watch.isObserving = true;
  watch.value = detect(watch);
  // One observer per watched element for its whole life: a pause (forced mode)
  // only disconnects it, and resuming re-attaches the same instance.
  const observer = (watch.observer ??= new MutationObserver(() => {
    if (watch.kind === 'page' && document.body !== watch.body) attachBody(watch);
    redetect(watch);
  }));
  if (watch.kind === 'source') {
    observer.observe(watch.element!, { attributes: true, attributeFilter: SIGNAL_ATTRIBUTES });
    return;
  }
  // <html> attributes, plus its direct children so a swapped <body>
  // (Turbo / htmx full-body navigation) is noticed and re-attached.
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: SIGNAL_ATTRIBUTES,
    childList: true,
  });
  attachBody(watch);
}

function attachBody(watch: Watch): void {
  watch.body = document.body;
  if (watch.body) {
    watch.observer?.observe(watch.body, { attributes: true, attributeFilter: SIGNAL_ATTRIBUTES });
  }
}

function stopWatch(watch: Watch): void {
  if (!watch.isObserving) return;
  watch.isObserving = false;
  watch.observer?.disconnect();
  watch.body = null;
}

function syncWatch(watch: Watch): void {
  if (shouldObserve(watch)) startWatch(watch);
  else stopWatch(watch);
}

// ── source resolution ──────────────────────────────────────────────────────

/** <html>/<body> are the page — share the page watch instead of a second one. */
function isPageElement(el: Element): boolean {
  return el === document.documentElement || el === document.body;
}

/**
 * Resolve a {@link ThemeSource} for `host` to the element to watch, or `null`
 * for the page. Ancestor walks start at the host's PARENT: a signal on the host
 * itself is per-instance forcing, which the component's CSS handles.
 */
export function resolveThemeSource(host: Element, source: ThemeSource | undefined): Element | null {
  if (!source || !hasDom()) return null;
  let found: Element | null = null;
  if (typeof source !== 'string') {
    found = source;
  } else if (source === 'closest') {
    for (let el = composedParent(host); el; el = composedParent(el)) {
      if (readThemeSignal(el)) {
        found = el;
        break;
      }
    }
  } else {
    try {
      for (let el = composedParent(host); el && !found; el = composedParent(el)) {
        if (el.matches(source)) found = el;
      }
      found ??= document.querySelector(source);
    } catch {
      coreLog(host, 'INIT', 'THEME').warn(`theme-source "${source}" is not a valid selector; using the page`);
      return null;
    }
  }
  return found && !isPageElement(found) ? found : null;
}

// ── 'closest' re-resolution ────────────────────────────────────────────────

function closestState(): ClosestState {
  const s = state();
  return (s.closest ??= { subscribers: new Set(), observer: null });
}

/** The host's composed ancestors below the page (the page watch covers <html> / <body>). */
function ancestorChain(host: Element): Element[] {
  const chain: Element[] = [];
  for (let el = composedParent(host); el && !isPageElement(el); el = composedParent(el)) chain.push(el);
  return chain;
}

/** Point a subscriber at `el`'s watch (or the page), keeping the shared watches in step. */
function moveSubscriber(sub: Subscriber, el: Element | null): void {
  const s = state();
  const current = sub.source?.element ?? null;
  if (current === el) return;
  const previous = sub.source;
  (previous ?? s.page).subscribers.delete(sub);
  if (previous) {
    syncWatch(previous);
    if (previous.subscribers.size === 0) s.sources.delete(previous.element!);
  }
  let next: Watch | null = null;
  if (el) {
    next = s.sources.get(el) ?? null;
    if (!next) s.sources.set(el, (next = newWatch('source', el)));
  }
  sub.source = next;
  (next ?? s.page).subscribers.add(sub);
  if (next) syncWatch(next);
  syncWatch(s.page);
}

/** Re-resolve the `'closest'` subscribers whose ancestor chain contains one of `targets`. */
function reresolveClosest(targets: ReadonlySet<Node>): void {
  for (const sub of closestState().subscribers) {
    if (!sub.closest || !sub.closest.chain.some((el) => targets.has(el))) continue;
    moveSubscriber(sub, resolveThemeSource(sub.closest.host, 'closest'));
    deliver(sub);
  }
}

/**
 * One observer for every `'closest'` subscriber's ancestors, while any exists and the mode is
 * `'auto'`. `MutationObserver` can't unobserve one target, so a change in the set re-attaches it.
 */
function syncClosest(): void {
  const c = closestState();
  c.observer?.disconnect();
  if (state().mode !== 'auto' || c.subscribers.size === 0) return;
  c.observer ??= new MutationObserver((records) => reresolveClosest(new Set(records.map((r) => r.target))));
  const observed = new Set<Element>();
  for (const sub of c.subscribers) {
    for (const el of sub.closest?.chain ?? []) {
      if (observed.has(el)) continue;
      observed.add(el);
      c.observer.observe(el, { attributes: true, attributeFilter: SIGNAL_ATTRIBUTES });
    }
  }
}

// ── public API ─────────────────────────────────────────────────────────────

/** The current global theme mode (`'auto'` unless {@link setThemeMode} forced one). */
export function getThemeMode(): ThemeMode {
  return state().mode;
}

/**
 * Force every component on the page to `'dark'` or `'light'`, or return to
 * detection with `'auto'`. While forced, the observers pause (nothing needs
 * detecting); `'auto'` re-detects once and resumes. A per-instance
 * `data-theme` on a component still wins (component CSS).
 */
export function setThemeMode(mode: ThemeMode): void {
  if (mode !== 'auto' && mode !== 'dark' && mode !== 'light') {
    coreLog(null, 'INIT', 'THEME').warn(`setThemeMode: unknown mode "${String(mode)}"; expected 'dark', 'light' or 'auto'`);
    return;
  }
  const s = state();
  if (s.mode === mode) return;
  s.mode = mode;
  if (!hasDom()) return;
  const watches = [s.page, ...s.sources.values()];
  for (const w of watches) syncWatch(w);
  syncClosest();
  // Back to 'auto': an ancestor may have changed its signal while the observers were paused.
  if (mode === 'auto') {
    for (const sub of closestState().subscribers) {
      if (sub.closest) moveSubscriber(sub, resolveThemeSource(sub.closest.host, 'closest'));
    }
  }
  for (const sub of dependents(s.page)) deliver(sub);
}

/**
 * The effective scheme for `host` right now: forced mode, else its
 * `source` element's signal, else the page. Uses the cached values while
 * anything is subscribed; otherwise detects fresh (without observing).
 */
export function getThemeContext(host?: Element, source?: ThemeSource): ColorScheme | null {
  const s = state();
  if (s.mode !== 'auto') return s.mode;
  if (!hasDom()) return null;
  const el = host ? resolveThemeSource(host, source) : null;
  const cached = el ? s.sources.get(el) : undefined;
  const sourceValue = cached?.isObserving ? cached.value : el ? readThemeSignal(el) : null;
  const pageValue = s.page.isObserving ? s.page.value : detect(s.page);
  return sourceValue ?? pageValue;
}

/** Options for {@link observeThemeContext}. */
export interface ObserveThemeContextOptions {
  /** Fire the listener synchronously with the current scheme on subscribe. Default `true`. */
  shouldFireImmediately?: boolean;
}

/**
 * Subscribe `host` to its theme context. The listener fires immediately with
 * the current scheme (unless `shouldFireImmediately: false`), then only when
 * the effective scheme changes. The source is resolved now; `'closest'` is resolved again
 * whenever one of the host's ancestors gains or loses a theme signal (the ancestors are the
 * ones at subscribe time — a moved host re-subscribes on connect). To change the source,
 * unsubscribe and subscribe again. Shared observers start with the first subscriber of a
 * watched element and stop with the last. SSR-safe: fires `null` once (or the
 * forced mode) and returns a no-op.
 */
export function observeThemeContext(
  host: Element,
  source: ThemeSource | undefined,
  listener: ThemeListener,
  opts: ObserveThemeContextOptions = {},
): () => void {
  const s = state();
  if (!hasDom()) {
    if (opts.shouldFireImmediately !== false) listener(s.mode === 'auto' ? null : s.mode);
    return () => {};
  }

  const el = resolveThemeSource(host, source);
  let watch: Watch | null = null;
  if (el) {
    watch = s.sources.get(el) ?? null;
    if (!watch) s.sources.set(el, (watch = newWatch('source', el)));
  }
  const sub: Subscriber = { source: watch, listener, last: undefined };
  (watch ?? s.page).subscribers.add(sub);
  if (watch) syncWatch(watch);
  syncWatch(s.page);
  if (source === 'closest') {
    sub.closest = { host, chain: ancestorChain(host) };
    closestState().subscribers.add(sub);
    syncClosest();
  }

  if (opts.shouldFireImmediately !== false) deliver(sub);
  else sub.last = effective(sub);

  return once(() => {
    // `sub.source`, not `watch`: a 'closest' subscriber may have moved since.
    const current = sub.source;
    (current ?? s.page).subscribers.delete(sub);
    if (current) {
      syncWatch(current);
      if (current.subscribers.size === 0) s.sources.delete(current.element!);
    }
    syncWatch(s.page);
    if (sub.closest && closestState().subscribers.delete(sub)) syncClosest();
  });
}

/** Test-only: drop all subscribers, observers and the forced mode. */
export function __resetTheme(): void {
  const s = state();
  for (const w of [s.page, ...s.sources.values()]) {
    w.subscribers.clear();
    stopWatch(w);
    w.observer = null;
    w.value = null;
  }
  s.sources.clear();
  s.mode = 'auto';
  const c = closestState();
  c.subscribers.clear();
  c.observer?.disconnect();
  c.observer = null;
}
