/**
 * Device / viewport / orientation detection (SPEC §12.9). A single, lazily
 * started, ref-counted observable over `matchMedia` + resize — the shared
 * "what kind of screen am I on" signal every component re-derives today.
 *
 * The load-bearing distinction is **capability, not size**: a phone reports a
 * coarse pointer and no hover *regardless of width* (a landscape phone is wide
 * but still wants a fullscreen calendar, because a floating panel near an input
 * thrashes the soft keyboard). So the snapshot carries pointer/hover facts
 * alongside width, and {@link EnvironmentSnapshot.isTouchPrimary} is the
 * "be aggressive out of the box" flag: coarse pointer AND no hover.
 *
 * Detection is **feature-detection, not UA sniffing** — media queries are both
 * reliable and already reactive (orientation flips, a resize, a laptop with a
 * touchscreen all fire `change`). SSR-safe: with no `window` (or no
 * `matchMedia`) it returns a static desktop default and a no-op unsubscribe.
 *
 * Two notification channels, split by cadence: {@link observeEnvironment} fires
 * only on *discrete* flips (breakpoint, orientation, pointer/hover capability) —
 * rare, prompt, what a component reconfigures on; {@link observeViewport} fires
 * on *continuous* raw size changes, throttled to ~30 ms, for the few consumers
 * that track live width. Raw `viewportWidth`/`viewportHeight` are excluded from
 * the discrete equality so a drag-resize no longer storms every subscriber.
 *
 * Zero runtime deps; lives in the main index so any component can read it
 * without an extra import path. Components normally consume both through
 * `BlissElement`'s `environmentChanged()` / `viewportChanged()` hooks rather than
 * subscribing directly.
 */

import { createFrameScheduler } from '../dom/frame-scheduler.js';
import { once } from '../dom/once.js';
import { createThrottle } from '../dom/throttle.js';
import { runSafely, dispatchToListeners } from '../logging/safe-call.js';
import { sharedState } from '../global/shared-state.js';

/** The accuracy of the primary pointing device (the CSS `pointer` media feature): `coarse` = touch/stylus, `fine` = mouse/trackpad. */
export type PointerAccuracy = 'coarse' | 'fine' | 'none';

/** Screen orientation, from `(orientation: portrait)`. */
export type Orientation = 'portrait' | 'landscape';

/**
 * Best-effort operating-system family. Unlike every other field this is
 * **UA/Client-Hints-derived, not feature-detected** — there is no media query
 * for "is this Apple". Treat it as a *hint* for genuine OS-specific quirks (an
 * iOS-Safari-only bug), NOT as a behavior gate where a capability query exists
 * (use {@link EnvironmentSnapshot.isTouchPrimary} for "phone/tablet" decisions).
 * Constant for the session.
 */
export type OS = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';

/** A named breakpoint → its inclusive max viewport width in px (`Infinity` for the largest). */
export type BreakpointMap = Record<string, number>;

/** An immutable read of the current device/viewport/orientation state. */
export interface EnvironmentSnapshot {
  /** Primary pointer capability: `(pointer: coarse)` → `coarse`, else `fine`; `none` when neither matches. */
  readonly pointer: PointerAccuracy;
  /** Any pointer is coarse — touch is available at all, even if a mouse is primary (`(any-pointer: coarse)`). */
  readonly hasCoarsePointer: boolean;
  /** The primary pointer can hover (`(hover: hover)`) — false on touch-first devices. */
  readonly canHover: boolean;
  /**
   * The "treat me like a phone/tablet" flag: coarse primary pointer AND no hover.
   * This — not width — is the signal for aggressive mobile defaults (e.g. a
   * fullscreen calendar), because it holds in landscape where width alone lies.
   */
  readonly isTouchPrimary: boolean;
  /** `portrait` or `landscape`, from `(orientation: portrait)`. */
  readonly orientation: Orientation;
  /** `window.innerWidth` at the last sample. */
  readonly viewportWidth: number;
  /** `window.innerHeight` at the last sample. */
  readonly viewportHeight: number;
  /**
   * The shorter side of the device screen (`min(screen.width, screen.height)`), in CSS px —
   * unlike the viewport it doesn't shrink when a soft keyboard opens. `undefined` when the
   * browser reports no screen size (SSR, jsdom).
   */
  readonly screenShortSide?: number;
  /** The resolved breakpoint name for {@link viewportWidth} (see {@link configureBreakpoints}). */
  readonly breakpoint: string;
  /**
   * Best-effort OS family (UA/Client-Hints hint, not feature detection). Constant
   * for the session. See {@link OS} — prefer {@link isTouchPrimary} for behavior.
   */
  readonly os: OS;
  /** Convenience: `os` is `ios` or `macos`. A UA hint — see {@link os}. */
  readonly isApple: boolean;
  /** Convenience: `os` is `android`. A UA hint — see {@link os}. */
  readonly isAndroid: boolean;
}

/** A subscriber notified with each new snapshot (fired immediately on subscribe unless opted out). */
export type EnvironmentListener = (snapshot: EnvironmentSnapshot) => void;

/** Options for {@link observeEnvironment} and {@link observeViewport}. */
export interface ObserveEnvironmentOptions {
  /** Fire the listener synchronously with the current snapshot on subscribe. Default `true`. */
  shouldFireImmediately?: boolean;
}

/** The static snapshot returned during SSR / when no media-query support exists. */
const SSR_DEFAULT: EnvironmentSnapshot = {
  pointer: 'fine',
  hasCoarsePointer: false,
  canHover: true,
  isTouchPrimary: false,
  orientation: 'landscape',
  viewportWidth: 1024,
  viewportHeight: 768,
  breakpoint: 'desktop',
  os: 'unknown',
  isApple: false,
  isAndroid: false,
};

/**
 * Default breakpoints: phone ≤ 768, tablet ≤ 1024, everything larger is desktop —
 * the same lines as pure-css `$mobile-breakpoint` / `$tablet-breakpoint`. In a
 * browser the `mobile` / `tablet` lines are overridden by the base tokens
 * `--base-breakpoint-mobile` / `--base-breakpoint-tablet` when the page defines
 * them (see {@link readBreakpointTokens}).
 */
const DEFAULT_BREAKPOINTS: BreakpointMap = { mobile: 768, tablet: 1024, desktop: Infinity };

/** The base-css-variables tokens that move the default `mobile` / `tablet` lines. */
export const BREAKPOINT_TOKENS = {
  mobile: '--base-breakpoint-mobile',
  tablet: '--base-breakpoint-tablet',
} as const;

/**
 * Page-wide breakpoint table. It lives on `globalThis` (not in this module) because every
 * component bundles its own copy of core: `configureBreakpoints()` through one copy must
 * move every component's buckets.
 */
interface BreakpointState {
  /** Breakpoints as `[name, maxWidth]` sorted ascending by width; last entry is the catch-all. */
  breakpoints: Array<[string, number]>;
  /**
   * The lines are settled: the base tokens were found, the page finished loading without them
   * (defaults kept), or {@link configureBreakpoints} set them explicitly — which always wins.
   */
  isSettled: boolean;
}

const BREAKPOINT_STATE_KEY = '@keenmate/web-components-core:breakpoints';

function breakpointState(): BreakpointState {
  return sharedState(BREAKPOINT_STATE_KEY, () => ({ breakpoints: sortBreakpoints(DEFAULT_BREAKPOINTS), isSettled: false }));
}

/**
 * `document` event fired by {@link configureBreakpoints}, so the other copies of core
 * (each caching its own snapshot) recompute. `detail.source` is the sending copy.
 */
export const BREAKPOINTS_CHANGE_EVENT = 'km-breakpoints-change';

/** This copy of core's identity, so it ignores its own {@link BREAKPOINTS_CHANGE_EVENT}. */
const COPY_ID = {};

function onBreakpointsChange(e: Event): void {
  if ((e as CustomEvent<{ source?: unknown }>).detail?.source !== COPY_ID) recompute();
}

/** Parse a token value like `768px` / `768` → 768; anything else (absent, `48em`, junk) → `undefined`. */
function parsePx(raw: string | undefined | null): number | undefined {
  const text = (raw ?? '').trim();
  const m = /^(\d+(?:\.\d+)?)(px)?$/i.exec(text);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** This copy is waiting for the window `load` event to take its final token read. */
let isWaitingForLoad = false;

/**
 * Read `--base-breakpoint-mobile` / `--base-breakpoint-tablet` from the root element's
 * computed style (browser only). Found → applied and settled. Not found while the page is
 * still loading → kept on the defaults and read again on the next snapshot, and one final
 * time on the window `load` event, then settled whatever it finds (review V-13: a stylesheet
 * injected by JS or still downloading used to lock in the defaults for good). Not found
 * after load → defaults, settled. Bounded: nothing is read after the page has loaded.
 * Absent or unparsable tokens keep the {@link DEFAULT_BREAKPOINTS}; an explicit
 * {@link configureBreakpoints} call is never overridden.
 */
function readBreakpointTokens(): void {
  const state = breakpointState();
  if (state.isSettled) return;
  if (typeof document === 'undefined' || !document.documentElement || typeof getComputedStyle !== 'function') return;
  if (loadBreakpointTokens(state)) return;
  if (document.readyState === 'complete' || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    state.isSettled = true;
    return;
  }
  if (isWaitingForLoad) return;
  isWaitingForLoad = true;
  window.addEventListener(
    'load',
    () => {
      isWaitingForLoad = false;
      const s = breakpointState();
      if (s.isSettled) return;
      const found = loadBreakpointTokens(s);
      s.isSettled = true;
      if (!found) return;
      // The lines moved after snapshots were taken: re-resolve here and in every other copy.
      if (subscriberCount() > 0) recompute();
      if (typeof CustomEvent === 'function') {
        document.dispatchEvent(new CustomEvent(BREAKPOINTS_CHANGE_EVENT, { detail: { source: COPY_ID } }));
      }
    },
    { once: true },
  );
}

/** Read the tokens once; when either is set, apply it and settle. Returns whether one was found. */
function loadBreakpointTokens(state: BreakpointState): boolean {
  let style: CSSStyleDeclaration;
  try {
    style = getComputedStyle(document.documentElement);
  } catch {
    return false;
  }
  const mobile = parsePx(style.getPropertyValue(BREAKPOINT_TOKENS.mobile));
  const tablet = parsePx(style.getPropertyValue(BREAKPOINT_TOKENS.tablet));
  if (mobile === undefined && tablet === undefined) return false;
  state.breakpoints = sortBreakpoints({
    ...DEFAULT_BREAKPOINTS,
    ...(mobile !== undefined ? { mobile } : {}),
    ...(tablet !== undefined ? { tablet } : {}),
  });
  state.isSettled = true;
  return true;
}

/** Discrete-change subscribers: notified only when a *category* field flips (see {@link environmentEqual}). */
const subscribers = new Set<EnvironmentListener>();
/** Continuous-geometry subscribers: notified on raw viewport-size changes, throttled to {@link VIEWPORT_THROTTLE_MS}. */
const viewportSubscribers = new Set<EnvironmentListener>();
/** Cached snapshot while subscribed; `null` when idle (no listeners) so a fresh read recomputes. */
let current: EnvironmentSnapshot | null = null;
/** The live `MediaQueryList`s, held so we can detach on the last unsubscribe. */
let mqls: MediaQueryList[] = [];

/** Throttle window (ms) for the continuous viewport channel — one notify per window, leading + trailing. */
const VIEWPORT_THROTTLE_MS = 30;

function sortBreakpoints(map: BreakpointMap): Array<[string, number]> {
  return Object.entries(map).sort((a, b) => a[1] - b[1]);
}

function resolveBreakpoint(width: number): string {
  const { breakpoints } = breakpointState();
  for (const [name, max] of breakpoints) {
    if (width <= max) return name;
  }
  // No catch-all matched (all finite and width exceeds them): fall to the largest.
  const largest = breakpoints[breakpoints.length - 1];
  return largest ? largest[0] : 'desktop';
}

function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** Client Hints surface (Chromium-only); typed narrowly since lib.dom lags. */
interface UADataLike {
  platform?: string;
  mobile?: boolean;
}

/** A "Macintosh" UA with a real touchscreen is an iPad (iPadOS 13+ masquerades as desktop Safari). */
function looksLikeIpad(): boolean {
  return typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 1;
}

/**
 * Best-effort OS family. Prefers `navigator.userAgentData.platform` (Client
 * Hints), falls back to the UA string for Safari/Firefox, and corrects the
 * iPad-as-Mac masquerade via `maxTouchPoints`. Constant for the session — no
 * media query can report this, so it is UA-derived by nature.
 */
function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'unknown';

  const uaData = (navigator as Navigator & { userAgentData?: UADataLike }).userAgentData;
  const platform = uaData?.platform?.toLowerCase();
  if (platform) {
    if (platform.includes('android')) return 'android';
    if (platform.includes('ios')) return 'ios';
    if (platform.includes('mac')) return looksLikeIpad() ? 'ios' : 'macos';
    if (platform.includes('windows')) return 'windows';
    if (platform.includes('linux')) return 'linux';
  }

  const ua = navigator.userAgent ?? '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipod|ipad/i.test(ua)) return 'ios';
  // iPadOS 13+ reports a desktop "Macintosh" UA; a touchscreen gives it away.
  if (/macintosh|mac os x/i.test(ua)) return looksLikeIpad() ? 'ios' : 'macos';
  if (/windows/i.test(ua)) return 'windows';
  if (/linux/i.test(ua)) return 'linux';
  return 'unknown';
}

/** Memoized OS — it never changes within a session. */
let osCache: OS | undefined;
function getOS(): OS {
  return (osCache ??= detectOS());
}

function matches(query: string): boolean {
  return canMatchMedia() && window.matchMedia(query).matches;
}

/** Sample the environment right now (pure read; does not attach listeners). */
/** `min(screen.width, screen.height)`, or `undefined` when the browser reports no screen size. */
function readScreenShortSide(): number | undefined {
  if (typeof screen === 'undefined') return undefined;
  const side = Math.min(screen.width, screen.height);
  return Number.isFinite(side) && side > 0 ? side : undefined;
}

function computeSnapshot(): EnvironmentSnapshot {
  if (!canMatchMedia()) return { ...SSR_DEFAULT };
  readBreakpointTokens();

  const hasCoarsePointer = matches('(any-pointer: coarse)');
  const coarsePrimary = matches('(pointer: coarse)');
  const finePrimary = matches('(pointer: fine)');
  const canHover = matches('(hover: hover)');
  const pointer: PointerAccuracy = coarsePrimary ? 'coarse' : finePrimary ? 'fine' : 'none';
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const screenShortSide = readScreenShortSide();
  const os = getOS();

  return {
    pointer,
    hasCoarsePointer,
    canHover,
    isTouchPrimary: coarsePrimary && !canHover,
    orientation: matches('(orientation: portrait)') ? 'portrait' : 'landscape',
    viewportWidth,
    viewportHeight,
    ...(screenShortSide !== undefined ? { screenShortSide } : {}),
    breakpoint: resolveBreakpoint(viewportWidth),
    os,
    isApple: os === 'ios' || os === 'macos',
    isAndroid: os === 'android',
  };
}

/**
 * Discrete equality: the *category* fields that change rarely (a bucket flip, a
 * rotation, plugging in a mouse, a {@link classifyDevice} class change). Raw `viewportWidth`/`viewportHeight` are
 * DELIBERATELY excluded — they change every frame during a drag-resize, and
 * routing that through `environmentChanged` fired a per-frame storm on every
 * component. The continuous size signal lives on its own throttled channel
 * ({@link viewportEqual} / {@link observeViewport}); the discrete channel only
 * fires when something a component actually reconfigures on has flipped.
 */
function environmentEqual(a: EnvironmentSnapshot, b: EnvironmentSnapshot): boolean {
  return (
    a.pointer === b.pointer &&
    a.hasCoarsePointer === b.hasCoarsePointer &&
    a.canHover === b.canHover &&
    a.isTouchPrimary === b.isTouchPrimary &&
    a.orientation === b.orientation &&
    a.breakpoint === b.breakpoint &&
    // The device class is derived from the short side too (a foldable opening
    // 390 → 720 px stays in the `mobile` width bucket but becomes a tablet).
    classifyDevice(a) === classifyDevice(b)
  );
}

/** Continuous equality: just the raw viewport dimensions (the noisy channel). */
function viewportEqual(a: EnvironmentSnapshot, b: EnvironmentSnapshot): boolean {
  return a.viewportWidth === b.viewportWidth && a.viewportHeight === b.viewportHeight;
}

/**
 * Recompute and notify. The cached snapshot is always refreshed (so a
 * synchronous `getEnvironment()` between throttled notifies still reads the live
 * size). Discrete subscribers fire immediately on a category flip; viewport
 * subscribers fire on a size change, throttled to {@link VIEWPORT_THROTTLE_MS}.
 */
function recompute(): void {
  const next = computeSnapshot();
  const prev = current;
  current = next;
  if (!prev || !environmentEqual(prev, next)) {
    dispatchToChannel(subscribers, next);
  }
  if (viewportSubscribers.size > 0 && (!prev || !viewportEqual(prev, next))) {
    viewportThrottle.schedule();
  }
}

/**
 * Call every listener of one channel. A throwing listener is logged and skipped,
 * so it can't keep the rest of the page (other components' responsive rules)
 * from hearing the change.
 */
function dispatchToChannel(channel: Set<EnvironmentListener>, snapshot: EnvironmentSnapshot): void {
  // A listener that calls configureBreakpoints() runs a nested recompute, which notifies the
  // newer snapshot itself: stop here so no one is handed the stale one after it (review V-19 #1).
  dispatchToListeners(channel, snapshot, LISTENER_LOG, () => current !== snapshot);
}

const LISTENER_LOG = { message: 'environment listener threw' } as const;

/** Fire the current snapshot at every continuous-viewport subscriber. */
function fireViewport(): void {
  const snap = current;
  if (!snap) return;
  dispatchToChannel(viewportSubscribers, snap);
}

/**
 * The viewport channel's throttle — one notify per {@link VIEWPORT_THROTTLE_MS},
 * leading + trailing; the trailing notify carries the latest (settled) size.
 */
const viewportThrottle = createThrottle(fireViewport, VIEWPORT_THROTTLE_MS);

const onMediaChange = (): void => recompute();

// Coalesce resize bursts to one recompute per frame where rAF exists.
const resizeFrame = createFrameScheduler(() => recompute());
const onResize = (): void => resizeFrame.schedule();

function addMqlListener(mql: MediaQueryList): void {
  if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onMediaChange);
  else if (typeof mql.addListener === 'function') mql.addListener(onMediaChange); // older Safari
}

function removeMqlListener(mql: MediaQueryList): void {
  if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onMediaChange);
  else if (typeof mql.removeListener === 'function') mql.removeListener(onMediaChange);
}

/** start() attached the window / document listeners (stop() removes only those). */
let isListening = false;

/** Attach the shared media-query + resize listeners on the first subscriber. */
function start(): void {
  if (!canMatchMedia()) {
    current = { ...SSR_DEFAULT };
    return;
  }
  mqls = [
    window.matchMedia('(pointer: coarse)'),
    window.matchMedia('(pointer: fine)'),
    window.matchMedia('(any-pointer: coarse)'),
    window.matchMedia('(hover: hover)'),
    window.matchMedia('(orientation: portrait)'),
  ];
  for (const mql of mqls) addMqlListener(mql);
  if (typeof window.addEventListener === 'function') window.addEventListener('resize', onResize);
  if (typeof document !== 'undefined') document.addEventListener(BREAKPOINTS_CHANGE_EVENT, onBreakpointsChange);
  isListening = true;
  current = computeSnapshot();
}

/** Detach every listener and drop cached state on the last unsubscribe. */
function stop(): void {
  for (const mql of mqls) removeMqlListener(mql);
  mqls = [];
  // Only what start() attached (no matchMedia → it attached nothing).
  if (isListening && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('resize', onResize);
  }
  if (isListening && typeof document !== 'undefined') document.removeEventListener(BREAKPOINTS_CHANGE_EVENT, onBreakpointsChange);
  isListening = false;
  resizeFrame.cancel(); // a queued frame would re-cache a snapshot nobody observes
  viewportThrottle.cancel();
  current = null;
}

/** Total live subscribers across both channels — the shared listeners live while this is > 0. */
function subscriberCount(): number {
  return subscribers.size + viewportSubscribers.size;
}

/**
 * Read the current environment synchronously. Returns the cached snapshot while
 * anything is subscribed, otherwise samples fresh (without attaching listeners).
 * The imperative-read companion to {@link observeEnvironment} — use it inside a
 * component's `reinit()`/`connect()` to configure initial state.
 */
export function getEnvironment(): EnvironmentSnapshot {
  return current ?? computeSnapshot();
}

/**
 * Subscribe to environment changes. The listener fires immediately with the
 * current snapshot (unless `shouldFireImmediately: false`), then again whenever the pointer,
 * hover, orientation, or resolved breakpoint changes (a viewport-size change alone doesn't
 * notify — use {@link observeViewport} for that). A listener that throws (also on the
 * immediate call) is logged; the subscription stands. Returns an
 * unsubscribe function; the shared `matchMedia`/resize listeners are attached on
 * the first subscriber and torn down when the last one leaves. No-op-safe during
 * SSR (fires once with the desktop default, returns a no-op unsubscribe).
 */
export function observeEnvironment(listener: EnvironmentListener, opts: ObserveEnvironmentOptions = {}): () => void {
  return subscribe(subscribers, listener, opts);
}

/**
 * Subscribe to *continuous* viewport-size changes — the noisy companion to
 * {@link observeEnvironment}. The listener fires immediately with the current
 * snapshot (unless `shouldFireImmediately: false`), then again whenever `viewportWidth`/
 * `viewportHeight` change, **throttled to one notify per {@link VIEWPORT_THROTTLE_MS}
 * (≈30 ms), leading + trailing** — so a drag-resize yields a steady ~33 Hz
 * stream plus a final settled read, not the per-frame flood raw `resize` would.
 * Use this only when you genuinely track live element/window width (e.g. a
 * container-query-style layout); for "which device / breakpoint am I" prefer
 * {@link observeEnvironment}, which fires only on discrete flips. Shares the same
 * lazily-started, ref-counted `matchMedia`/`resize` listeners; returns an
 * unsubscribe. No-op-safe during SSR.
 */
export function observeViewport(listener: EnvironmentListener, opts: ObserveEnvironmentOptions = {}): () => void {
  return subscribe(viewportSubscribers, listener, opts);
}

/** Join one channel; the shared listeners start with the first subscriber of either and stop with the last. */
function subscribe(channel: Set<EnvironmentListener>, listener: EnvironmentListener, opts: ObserveEnvironmentOptions): () => void {
  const first = subscriberCount() === 0;
  channel.add(listener);
  if (first) start();
  const unsubscribe = once(() => {
    channel.delete(listener);
    if (subscriberCount() === 0) stop();
  });
  // A throwing first call is logged like any later one; the subscription stands and
  // the caller still gets its unsubscribe (a rethrow here would leak the listener).
  if (opts.shouldFireImmediately !== false) runSafely(() => listener(getEnvironment()), LISTENER_LOG);
  return unsubscribe;
}

/**
 * Redefine the breakpoint buckets used to resolve {@link EnvironmentSnapshot.breakpoint}.
 * Keys are names, values are inclusive max widths in px (use `Infinity` for the
 * largest bucket). Applies globally and immediately re-notifies active
 * subscribers if the resolved breakpoint changed. Defaults:
 * `{ mobile: 768, tablet: 1024, desktop: Infinity }`, with the `mobile` / `tablet`
 * lines taken from the `--base-breakpoint-mobile` / `--base-breakpoint-tablet`
 * tokens when the page defines them. An explicit call here always wins over the
 * tokens. Page-wide across every copy of core: the table is shared on `globalThis` and
 * the other copies hear {@link BREAKPOINTS_CHANGE_EVENT}.
 */
export function configureBreakpoints(map: BreakpointMap): void {
  const state = breakpointState();
  state.isSettled = true;
  state.breakpoints = sortBreakpoints(map);
  if (subscriberCount() > 0) recompute();
  if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent(BREAKPOINTS_CHANGE_EVENT, { detail: { source: COPY_ID } }));
  }
}

// ── device classification (capability, not width) ──────────────────────────

/**
 * A device's coarse class, derived from **capability + physical size**, NOT the
 * viewport-width {@link EnvironmentSnapshot.breakpoint}. The two axes differ on
 * purpose: `breakpoint` answers "how wide is the window" (a narrowed desktop is
 * `mobile`); `deviceClass` answers "what kind of device is this" (a narrowed
 * desktop stays `desktop`, a landscape iPad stays `tablet`). This is the axis to
 * key mobile/tablet UX off — it's the one every KM component must agree on.
 */
export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

/**
 * The phone/tablet boundary, in **CSS px** (not inches), applied to the *shorter*
 * viewport side. This is the Material `sw600dp` line — "smallest width ≥ 600dp ⇒
 * tablet" — and it's the orientation-robust test we want: a device's shorter side
 * stays constant across rotation, so a phone reads as a phone in landscape too.
 *
 * Why 600, against the 2026 CSS-width map (physical ÷ DPR, what media queries see —
 * inches lie): phones lay out at ~320–360 (compact), ~390–393 (mainstream), and up
 * to ~430 CSS px, with ~480 as the large-phone/Pro-Max stress point. 7" tablets
 * start ~600, iPad mini ~768, and folds *open* jump to ~700+. So 480→600 is an
 * empty band with no phones in it — `< 600` catches every phone (comfortable
 * headroom over ~480) while handing tablets and opened foldables to the tablet
 * class. A hard constant on purpose: the whole point is that "what is a phone"
 * can't drift per app.
 */
export const TABLET_MIN_SHORT_SIDE = 600;

/**
 * Classify the device from the live environment (SPEC §12.9). Capability decides
 * first — a non-`isTouchPrimary` device is always `desktop`, at any window width,
 * so a shrunk desktop window keeps its `desktop` class (and a floating dropdown,
 * not a fullscreen sheet). Only touch-primary devices consult the size line: the
 * short side below {@link TABLET_MIN_SHORT_SIDE} ⇒ `mobile`, else `tablet`
 * (orientation-robust — a landscape phone still reads as `mobile`). The short side is
 * `min(viewportWidth, screenShortSide)`: a soft keyboard that shrinks the viewport HEIGHT
 * can't turn a landscape tablet into a phone mid-typing (review V-05), while a narrow
 * window (iPad Slide Over) still reads as `mobile`. Without a screen size it falls back to
 * the shorter viewport side.
 *
 * This is the shared *classification*; how each class maps to a presentation is a
 * component decision (see `resolvePresentation`).
 */
export function classifyDevice(env: EnvironmentSnapshot): DeviceClass {
  if (!env.isTouchPrimary) return 'desktop';
  const shortSide =
    env.screenShortSide !== undefined
      ? Math.min(env.viewportWidth, env.screenShortSide)
      : Math.min(env.viewportWidth, env.viewportHeight);
  return shortSide < TABLET_MIN_SHORT_SIDE ? 'mobile' : 'tablet';
}

/** Test-only: the number of live subscribers on the continuous viewport channel. */
export function __viewportSubscriberCount(): number {
  return viewportSubscribers.size;
}

/** Test-only: detach listeners and reset breakpoints + cache to defaults. */
export function __resetEnvironment(): void {
  isWaitingForLoad = false;
  subscribers.clear();
  viewportSubscribers.clear();
  stop();
  const state = breakpointState();
  state.breakpoints = sortBreakpoints(DEFAULT_BREAKPOINTS);
  state.isSettled = false;
  osCache = undefined;
}
