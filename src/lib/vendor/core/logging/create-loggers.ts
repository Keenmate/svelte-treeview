/**
 * Categorized named loggers over the vendored {@link ./log-core} engine. One
 * call per component produces a `NAMESPACE:CATEGORY` logger per category, each
 * with a color-coded `%c` prefix (SPEC §12.1). Colour is applied via the
 * engine's `methodFactory` so the `%c` directive and its CSS argument are
 * ordered correctly — the message arguments stay uncoloured and structured-
 * loggable.
 *
 * The logging engine is vendored (no `loglevel` dependency) — see log-core.ts
 * for why. Consumers depend only on the {@link Logger} / {@link LogLevelDesc}
 * surface below, never on the engine internals.
 */
import { DEFAULT_ENABLED_LEVEL, LOG_LEVELS, getLogger, isLogLevel, toLogLevelNumber, type LogLevelDesc, type CoreLogger } from './log-core.js';
import { registerGlobalLoggingTarget } from './global-logging.js';

/**
 * The public logger surface: the five level methods plus level control.
 * Deliberately lean — it does NOT expose engine internals (`methodFactory`,
 * `levels`, `enableAll`, …), so nothing downstream binds to the vendored
 * implementation. The concrete {@link CoreLogger} structurally satisfies it.
 */
export interface Logger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  /** Set this category's own level; persisted to localStorage (`km-log:NS:CAT`) unless `persist` is `false`. */
  setLevel(level: LogLevelDesc, persist?: boolean): void;
  /** The effective level: this category's own, else the page-wide level, else `warn`. */
  getLevel(): number;
  /** Drop this category's own level (and its persisted copy): it follows the page-wide level again. */
  resetLevel(): void;
}

export type { LogLevelDesc };

/** Baseline categories. A component uses these as-is, redefines, or extends them. */
export const DEFAULT_CATEGORIES = ['INIT', 'DATA', 'UI'] as const;

export { DEFAULT_ENABLED_LEVEL };

/**
 * The level used when no level is set anywhere — element, component type (category) or
 * page: errors and warnings are visible out of the box, info/debug/trace need
 * `enableLogging()`. A level persisted in localStorage (`km-log:NS:CAT`) is the category's
 * own level, so it wins over the page-wide level.
 */
export const DEFAULT_LOG_LEVEL: LogLevelDesc = 'warn';

/** Stable palette; categories are coloured by their index (cycled). */
const PALETTE = [
  '#4c8bf5', // blue
  '#2ea043', // green
  '#d29922', // amber
  '#a371f7', // purple
  '#db61a2', // pink
  '#e5534b', // red
  '#3fb0ac', // teal
  '#8a6d3b', // brown
] as const;

const PREFIXED = new WeakSet<CoreLogger>();

/**
 * First-time setup of a category logger: wrap its methodFactory to emit
 * `%c[NAMESPACE:CATEGORY]` + CSS, then the raw args, and start it at
 * {@link DEFAULT_LOG_LEVEL} as the fallback layer (a persisted own level wins). Idempotent —
 * a second `createLoggers()` for the same name keeps the current levels.
 */
function applyColorPrefix(logger: CoreLogger, label: string, color: string): void {
  if (PREFIXED.has(logger)) return;
  PREFIXED.add(logger);
  // The fallback layer (the page-wide level replaces it); a persisted own level wins.
  logger.setDefaultLevel(DEFAULT_LOG_LEVEL);
  const original = logger.methodFactory;
  const css = `color:${color};font-weight:bold`;
  logger.methodFactory = (methodName, level, loggerName) => {
    const raw = original(methodName, level, loggerName);
    return (...args: unknown[]) => raw(`%c[${label}]`, css, ...args);
  };
  // Re-bind the level methods through the new factory (no own level is set, nothing persisted).
  logger.rebuild();
}

/**
 * An instance-scoped logger (SPEC §12.3): the same five level methods as a
 * `loglevel` logger, but every line is prefixed with an instance id and gated by
 * the closest level that is set: the instance's own, else its category's (component
 * type), else the page-wide one, else `warn`. It emits via `console` directly (not
 * through `loglevel`'s level gate), so one element can log more — or less — than its type.
 */
export interface InstanceLogger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/** Category metadata captured so {@link LoggerBundle.forInstance} can match colors/labels. */
interface CategoryMeta {
  label: string;
  color: string;
  logger: CoreLogger;
}

/**
 * [method, its level, the `console` method to emit through]. `trace` / `debug` go through
 * `console.log`, like the type loggers (log-core): Chrome hides `console.debug` ("Verbose")
 * by default, so `el.enableLogging()` output would be invisible; `console.trace` would spam stacks.
 */
const INSTANCE_METHODS: readonly [keyof InstanceLogger, number, 'log' | 'info' | 'warn' | 'error'][] = [
  ['trace', LOG_LEVELS.TRACE, 'log'],
  ['debug', LOG_LEVELS.DEBUG, 'log'],
  ['info', LOG_LEVELS.INFO, 'info'],
  ['warn', LOG_LEVELS.WARN, 'warn'],
  ['error', LOG_LEVELS.ERROR, 'error'],
];

/**
 * An instance label: a fixed string, or a function read on every line (so an
 * `id` assigned after the element was created still shows up). An empty label
 * omits the instance part entirely (`%c[NS:CAT]` only).
 */
export type InstanceLabel = string | (() => string);

function makeInstanceLogger(meta: CategoryMeta, instanceId: InstanceLabel, getOverride: () => LogLevelDesc | undefined): InstanceLogger {
  const css = `color:${meta.color};font-weight:bold`;
  const idCss = 'color:#888';
  const labelOf = typeof instanceId === 'function' ? instanceId : () => instanceId;
  const out = {} as Record<keyof InstanceLogger, (...args: unknown[]) => void>;
  for (const [name, methodLevel, consoleMethod] of INSTANCE_METHODS) {
    out[name] = (...args: unknown[]): void => {
      const override = getOverride();
      // The closest level that is set: the element's own, else the category's effective level.
      const effective = toLogLevelNumber(override) ?? meta.logger.getLevel();
      if (methodLevel < effective) return;
      // Looked up per call (not bound once), so a console replaced later — a test
      // spy, a log collector — still receives the line.
      const emit = (console[consoleMethod] ?? console.log).bind(console);
      const id = labelOf();
      if (id) emit(`%c[${meta.label}]%c ${id}`, css, idCss, ...args);
      else emit(`%c[${meta.label}]`, css, ...args);
    };
  }
  return out as InstanceLogger;
}

export interface LoggerBundle<C extends string> {
  /** The namespace this bundle was built with (the `NAMESPACE` in `NAMESPACE:CATEGORY`). */
  readonly namespace: string;
  /** One logger per category, keyed by category name. */
  loggers: Record<C, Logger>;
  /** Set this component type's own level on every category (default: `debug`). */
  enableLogging(level?: LogLevelDesc): void;
  /** Set this component type's own level to `silent` (wins over the page-wide level). */
  disableLogging(): void;
  /** Set this component type's own level on every category. */
  setLogLevel(level: LogLevelDesc): void;
  /** Clear this component type's own levels (and persisted copies): it follows the page-wide level. */
  resetLogging(): void;
  /**
   * Set the own level of one category — bare (`'DATA'`) or namespaced as it prints
   * (`'GRID:DATA'`; the namespace must be this bundle's); `null` clears it. Unknown → no-op.
   */
  setCategoryLevel(category: C | `${string}:${C}`, level: LogLevelDesc | null): void;
  /**
   * @internal Driven by the page-wide switch: the level every category falls back to while it
   * has no own level (`null` → {@link DEFAULT_LOG_LEVEL}).
   */
  setPageLevel(level: LogLevelDesc | null): void;
  /**
   * Build instance-scoped loggers (one per category) for a single element.
   * `instanceId` prefixes each line (a function is re-read per line; `''` omits
   * the instance part); `getOverrideLevel` (the element's own level, `undefined` = none) is
   * read on every call, so toggling an instance's level takes effect live. Used by `BlissElement`.
   */
  forInstance(instanceId: InstanceLabel, getOverrideLevel: () => LogLevelDesc | undefined): Record<C, InstanceLogger>;
  /** The category list this bundle was built with. */
  readonly LOGGING_CATEGORIES: readonly C[];
}

/**
 * Build a bundle of colored, categorized loggers for `namespace`.
 *
 * ```ts
 * const { loggers } = createLoggers('MULTISELECT');                          // INIT/DATA/UI
 * const { loggers } = createLoggers('TREEVIEW', ['INIT','DATA','INDEX']);    // redefine
 * const { loggers } = createLoggers('DROPZONE', [...DEFAULT_CATEGORIES, 'FILE']); // extend
 * export const { INIT: initLogger, DATA: dataLogger, UI: uiLogger } = loggers;
 * ```
 */
export function createLoggers(namespace: string): LoggerBundle<(typeof DEFAULT_CATEGORIES)[number]>;
export function createLoggers<const C extends string>(namespace: string, categories: readonly C[]): LoggerBundle<C>;
export function createLoggers<C extends string>(
  namespace: string,
  categories: readonly C[] = DEFAULT_CATEGORIES as readonly string[] as readonly C[],
): LoggerBundle<C> {
  const loggers = {} as Record<C, Logger>;
  const meta = {} as Record<C, CategoryMeta>;

  categories.forEach((category, i) => {
    const label = `${namespace}:${category}`;
    const color = PALETTE[i % PALETTE.length]!;
    const logger = getLogger(label);
    applyColorPrefix(logger, label, color);
    loggers[category] = logger;
    meta[category] = { label, color, logger };
  });

  const setAll = (level: LogLevelDesc): void => {
    for (const category of categories) loggers[category].setLevel(level, false);
  };

  const bundle: LoggerBundle<C> = {
    namespace,
    loggers,
    LOGGING_CATEGORIES: categories,
    enableLogging(level: LogLevelDesc = DEFAULT_ENABLED_LEVEL) {
      setAll(level);
    },
    disableLogging() {
      setAll('silent');
    },
    setLogLevel(level: LogLevelDesc) {
      setAll(level);
    },
    resetLogging() {
      for (const category of categories) loggers[category].resetLevel();
    },
    setPageLevel(level: LogLevelDesc | null) {
      const fallback = level != null && isLogLevel(level) ? level : DEFAULT_LOG_LEVEL;
      for (const category of categories) meta[category].logger.setDefaultLevel(fallback);
    },
    setCategoryLevel(category: C | `${string}:${C}`, level: LogLevelDesc | null) {
      let name: string = category;
      const colon = name.indexOf(':');
      if (colon >= 0) {
        if (name.slice(0, colon).toUpperCase() !== namespace.toUpperCase()) return;
        name = name.slice(colon + 1);
      }
      const logger = (loggers as Record<string, Logger>)[name] ?? (loggers as Record<string, Logger>)[name.toUpperCase()];
      if (level === null) logger?.resetLevel();
      else logger?.setLevel(level, false);
    },
    forInstance(instanceId: InstanceLabel, getOverrideLevel: () => LogLevelDesc | undefined) {
      const result = {} as Record<C, InstanceLogger>;
      for (const category of categories) {
        result[category] = makeInstanceLogger(meta[category], instanceId, getOverrideLevel);
      }
      return result;
    },
  };
  // Enlist under the page-wide switch (window.components.logging); adopts the
  // current global level when one was already set.
  registerGlobalLoggingTarget(bundle);
  return bundle;
}
