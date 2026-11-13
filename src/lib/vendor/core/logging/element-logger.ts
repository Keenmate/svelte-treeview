/**
 * Routing for core's OWN messages (SPEC §12.1): core never calls `console.*`
 * directly. A message that has an element behind it (input validation, a
 * throwing `on<Name>` twin, an action / menu callback, a bad `theme-source`) is
 * logged through THAT element's instance logger, so the line carries the
 * component's namespace and instance:
 *
 * ```
 * [MULTISELECT:INIT] #country  rejected invalid value for attribute …
 * [CORE:ELEMENT] web-grid#main  …        ← tag has no logging bundle registered
 * [CORE:THEME]  …                        ← no element behind the message
 * ```
 *
 * Elements whose tag has no bundle (see `registerComponent`'s `logging` option)
 * fall back to core's `CORE` bundle with the tag kept in the instance part.
 */
import { createLoggers, type InstanceLogger, type LoggerBundle, type LogLevelDesc } from './create-loggers.js';
import { sharedState, sharedStateKey } from '../global/shared-state.js';
import { getLoggerBundle } from './logger-registry.js';

/** Categories of core's own `CORE` bundle. */
export const CORE_LOG_CATEGORIES = ['ELEMENT', 'ACTIONS', 'MENU', 'THEME'] as const;
export type CoreLogCategory = (typeof CORE_LOG_CATEGORIES)[number];

/**
 * Core's own logger bundle (`CORE:ELEMENT`, `CORE:ACTIONS`, `CORE:MENU`, `CORE:THEME`),
 * created on first use — importing this module has no side effect (the package is
 * `sideEffects: false`; review L-23). One bundle per PAGE: every copy of core shares it, so
 * `setCategoryLevel()` from any copy reaches core messages from all of them.
 */
export function getCoreLogging(): LoggerBundle<CoreLogCategory> {
  return sharedState(sharedStateKey('core-logging'), () => createLoggers('CORE', CORE_LOG_CATEGORIES));
}

/**
 * {@link getCoreLogging} as an object: every property is read from the bundle on access, so the
 * bundle (and `window.components.logging`) is created only when something actually uses it.
 */
export const coreLogging: LoggerBundle<CoreLogCategory> = /* @__PURE__ */ new Proxy({} as LoggerBundle<CoreLogCategory>, {
  get: (_target, key) => Reflect.get(getCoreLogging(), key),
  has: (_target, key) => Reflect.has(getCoreLogging(), key),
  ownKeys: () => Reflect.ownKeys(getCoreLogging()),
  getOwnPropertyDescriptor: (_target, key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(getCoreLogging(), key);
    return descriptor && { ...descriptor, configurable: true };
  },
});

const NO_OVERRIDE = (): undefined => undefined;

/** Core loggers with no instance part, emitting per call (see makeInstanceLogger). */
let plainCore: Record<CoreLogCategory, InstanceLogger> | undefined;

let instanceSeq = 0;
const SEQ = new WeakMap<Element, number>();
const OVERRIDES = new WeakMap<Element, () => LogLevelDesc | undefined>();

interface CachedLoggers {
  /** The component bundle these were built from; `undefined` = CORE fallback. */
  bundle: LoggerBundle<string> | undefined;
  loggers: Record<string, InstanceLogger>;
}
const CACHE = new WeakMap<Element, CachedLoggers>();

/**
 * Register where an element's per-instance level override comes from
 * (`BlissElement` wires its `enableLogging()` state here), so messages logged
 * on the element's behalf by core helpers honour it too.
 */
export function setInstanceLogLevelSource(el: Element, getLevel: () => LogLevelDesc | undefined): void {
  OVERRIDES.set(el, getLevel);
}

/** The element's id, else a stable running number. */
function instanceKey(el: Element): string {
  if (el.id) return el.id;
  let n = SEQ.get(el);
  if (n === undefined) SEQ.set(el, (n = ++instanceSeq));
  return String(n);
}

/**
 * All instance loggers of `el`, keyed by category: from its tag's own bundle
 * (`[NS:CAT] #id`) when registered, else CORE's (`[CORE:CAT] tag#id`). Rebuilt
 * when the tag's bundle registration changes, otherwise cached per element.
 */
export function getElementLoggers(el: Element): { bundle: LoggerBundle<string> | undefined; loggers: Record<string, InstanceLogger> } {
  const bundle = getLoggerBundle(el.localName);
  const cached = CACHE.get(el);
  if (cached && cached.bundle === bundle) return cached;
  const getOverride = (): LogLevelDesc | undefined => (OVERRIDES.get(el) ?? NO_OVERRIDE)();
  const loggers = bundle
    ? bundle.forInstance(() => `#${instanceKey(el)}`, getOverride)
    : (getCoreLogging().forInstance(() => `${el.localName}#${instanceKey(el)}`, getOverride) as Record<string, InstanceLogger>);
  const entry: CachedLoggers = { bundle, loggers };
  CACHE.set(el, entry);
  return entry;
}

const isCustomElement = (el: Element): boolean => el.localName.includes('-');

/** A plain element inside a component's shadow root stands for that component. */
function componentOf(el: Element): Element | undefined {
  if (isCustomElement(el)) return el;
  const root = el.getRootNode?.();
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root.host : undefined;
}

/**
 * Resolve the component element behind a log source: a custom element (or a
 * plain element inside one's shadow root), a shadow root's host, or a ctx's
 * `element` (a component context carries the component there).
 */
export function toLogElement(source: unknown): Element | undefined {
  if (!source || typeof source !== 'object' || typeof Element === 'undefined') return undefined;
  if (source instanceof Element) return componentOf(source);
  if (typeof ShadowRoot !== 'undefined' && source instanceof ShadowRoot) return componentOf(source.host);
  // Only custom elements count — a surface ctx may expose some unrelated DOM node.
  const element = (source as { element?: unknown }).element;
  if (element instanceof Element && isCustomElement(element)) return element;
  return undefined;
}

/**
 * The logger for one core message. With an element behind `source`: that
 * element's instance logger for `category` (falling back to the bundle's first
 * category when the component redefined its categories without it), or — when
 * its tag has no bundle — CORE's `coreCategory` logger labelled `tag#id`.
 * Without an element: CORE's `coreCategory` logger with no instance part.
 */
export function coreLog(source: unknown, category: string, coreCategory: CoreLogCategory): InstanceLogger {
  const el = toLogElement(source);
  if (!el) return (plainCore ??= getCoreLogging().forInstance('', NO_OVERRIDE))[coreCategory];
  const { bundle, loggers } = getElementLoggers(el);
  if (!bundle) return loggers[coreCategory]!;
  return loggers[category] ?? loggers[bundle.LOGGING_CATEGORIES[0]!]!;
}
