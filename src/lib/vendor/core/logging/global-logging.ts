/**
 * The page-wide logging level (SPEC §12.1 / §12.3), published as the non-enumerable
 * `window.components.logging`:
 *
 * ```js
 * window.components.logging.enableLogging('debug'); // the page level
 * window.components.logging.disableLogging();       // page level = silent
 * window.components.logging.setLogLevel('warn');
 * window.components.logging.resetLogging();         // no page level (built-in warn)
 * window.components.logging.getCategories();        // ['CORE:ELEMENT', 'MULTISELECT:INIT', …]
 * ```
 *
 * Levels coalesce, closest first: an element's own level (`el.enableLogging()`), else its
 * component type's own level per category (`window.components['web-x'].logging`, or one
 * persisted in localStorage), else this page level, else `warn`. Nothing is set by default.
 * Setting the page level never overwrites a type's own level, so the order of calls
 * doesn't matter.
 *
 * Components bundle their own copy of core, so the state lives on `globalThis` under a
 * `Symbol.for` key: every core copy on the page shares ONE bundle list, ONE page level and
 * ONE controls object. A bundle from an older copy of core (no `setPageLevel`) still gets
 * the page level pushed as its level, the way it always did.
 */
import { DEFAULT_ENABLED_LEVEL, isLogLevel, type LogLevelDesc } from './log-core.js';
import { sharedState } from '../global/shared-state.js';

/** The page-wide controls — same method names as a component's `logging` entry. */
export interface GlobalLoggingControls {
  /** Set the page level (default: `debug`). */
  enableLogging(level?: LogLevelDesc): void;
  /** Set the page level to `silent`. */
  disableLogging(): void;
  /** Set the page level. */
  setLogLevel(level: LogLevelDesc): void;
  /** Clear the page level: categories without their own level fall back to `warn`. */
  resetLogging(): void;
  /** Every `NAMESPACE:CATEGORY` label currently known, in registration order. */
  getCategories(): string[];
}

/** The slice of a `LoggerBundle` the page switch drives (kept minimal: shared across core copies/versions). */
export interface GlobalLoggingTarget {
  readonly namespace: string;
  readonly LOGGING_CATEGORIES: readonly string[];
  setLogLevel(level: LogLevelDesc): void;
  /** Absent on bundles from core rc17 and older (they get the level pushed via `setLogLevel`). */
  setPageLevel?(level: LogLevelDesc | null): void;
}

interface GlobalLoggingState {
  /** The page level; `undefined` = not set. */
  level: LogLevelDesc | undefined;
  bundles: Set<GlobalLoggingTarget>;
  controls: GlobalLoggingControls;
}

const STATE_KEY = '@keenmate/web-components-core:logging';

/** The fallback a bundle from an older copy of core gets when the page level is cleared. */
const LEGACY_FALLBACK: LogLevelDesc = 'warn';

function applyTo(bundle: GlobalLoggingTarget, level: LogLevelDesc | undefined): void {
  if (typeof bundle.setPageLevel === 'function') bundle.setPageLevel(level ?? null);
  else bundle.setLogLevel(level ?? LEGACY_FALLBACK);
}

function createControls(s: GlobalLoggingState): GlobalLoggingControls {
  const applyAll = (level: LogLevelDesc | undefined): void => {
    // Check BEFORE storing: a stored bad level would make every later createLoggers()
    // (any lazily loaded component, any copy of core) throw at registration.
    if (level !== undefined && !isLogLevel(level)) {
      throw new TypeError(`window.components.logging: invalid level "${String(level)}" (expected trace | debug | info | warn | error | silent)`);
    }
    s.level = level;
    for (const bundle of s.bundles) applyTo(bundle, level);
  };
  return {
    enableLogging: (level = DEFAULT_ENABLED_LEVEL) => applyAll(level),
    disableLogging: () => applyAll('silent'),
    setLogLevel: (level) => applyAll(level),
    resetLogging: () => applyAll(undefined),
    getCategories: () => {
      const out = new Set<string>();
      for (const bundle of s.bundles) {
        for (const category of bundle.LOGGING_CATEGORIES) out.add(`${bundle.namespace}:${category}`);
      }
      return [...out];
    },
  };
}

function state(): GlobalLoggingState {
  const s = sharedState(STATE_KEY, () => {
    const created = { level: undefined, bundles: new Set(), controls: undefined } as unknown as GlobalLoggingState;
    created.controls = createControls(created);
    return created;
  });
  // State created by an older copy of core carries its controls (no resetLogging, levels
  // pushed over every type's own level): take them over, so every copy uses one model.
  if (typeof s.controls?.resetLogging !== 'function') {
    s.controls = createControls(s);
    if (typeof window !== 'undefined' && window.components && Object.prototype.hasOwnProperty.call(window.components, 'logging')) {
      delete (window.components as { logging?: unknown }).logging;
    }
  }
  return s;
}

/** The page-wide controls (also reachable as `window.components.logging` in a browser). */
export function getGlobalLogging(): GlobalLoggingControls {
  return state().controls;
}

/**
 * Publish the controls as the NON-enumerable `window.components.logging`, so
 * enumerating `window.components` still yields only component tags (tag names
 * always contain a hyphen, so `logging` can't clash). Idempotent; SSR-safe.
 */
export function publishGlobalLogging(): void {
  if (typeof window === 'undefined') return;
  const controls = state().controls; // first: may take over (and unpublish) an older copy's controls
  const components = (window.components ??= {}) as object;
  if (Object.prototype.hasOwnProperty.call(components, 'logging')) return;
  Object.defineProperty(components, 'logging', {
    value: controls,
    enumerable: false,
    configurable: true,
    writable: false,
  });
}

/**
 * This copy's enlisted bundles by namespace + categories. Within one copy of core, two
 * bundles with the same key drive the same named loggers, so a repeated `createLoggers()`
 * (or `createPerfLogger()`) replaces the earlier entry instead of growing the page-wide set
 * forever (review L-15). Per copy on purpose: another copy's bundle has its own loggers.
 */
const enlistedByKey = new Map<string, GlobalLoggingTarget>();

/**
 * Enlist a bundle under the page switch; it adopts the current page level now (late
 * registration). Called by `createLoggers()`.
 */
export function registerGlobalLoggingTarget(bundle: GlobalLoggingTarget): void {
  const s = state();
  const key = `${bundle.namespace}|${bundle.LOGGING_CATEGORIES.join(',')}`;
  const earlier = enlistedByKey.get(key);
  if (earlier && earlier !== bundle) s.bundles.delete(earlier);
  enlistedByKey.set(key, bundle);
  s.bundles.add(bundle);
  // isLogLevel: the shared state may come from an older copy of core that stored a bad level.
  const level = s.level !== undefined && isLogLevel(s.level) ? s.level : undefined;
  // An older bundle with no page level set keeps its own level (nothing to push).
  if (typeof bundle.setPageLevel === 'function' || level !== undefined) applyTo(bundle, level);
  publishGlobalLogging();
}

/** @internal Test hook: clear the page-wide level (every bundle falls back to `warn`). */
export function __resetGlobalLogging(): void {
  state().controls.resetLogging();
}
