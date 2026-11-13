/**
 * Categorized loggers for @keenmate/svelte-treeview — a thin shim over the core
 * logging module (vendored from @keenmate/web-components-core into
 * `vendor/core/logging`, SPEC §12.1). Core owns the engine (its own `loglevel`
 * port) and the colour-coded `%c[STV:CAT]` prefix (built in a `methodFactory`,
 * ordering-safe), so the old vendored `loglevel` + `loglevel-plugin-prefix` are gone.
 * Mirrors web-treeview's logger.ts; namespace `STV` (the component's prefix, like
 * web-daterangepicker's `DRP`) so it never shares levels with web-treeview's `TREEVIEW`.
 *
 * Categories (`STV:*`):
 * - INIT   — tree initialization and configuration
 * - DATA   — data insertion, tree manipulation, node operations
 * - RENDER — progressive / virtual rendering
 * - INDEX  — search indexing operations
 * - DRAG   — drag and drop
 * - UI     — user interactions (click, expand/collapse, selection, menus)
 *
 * Levels coalesce, closest first: a category's own level → the tree's type level
 * (these functions / `window.components['svelte-treeview'].logging`) → the page level
 * (`window.components.logging`, shared with every KeenMate component) → `warn`.
 *
 * ```js
 * import { enableLogging, setLogLevel, setCategoryLevel } from '@keenmate/svelte-treeview';
 * enableLogging();                           // all categories → debug
 * setLogLevel('info');                       // all categories → info
 * setCategoryLevel('STV:INDEX', 'debug');    // one category (bare 'INDEX' works too)
 * resetLogging();                            // back to the page level (else warn)
 * ```
 */
import { createLoggers, type Logger, type LogLevelDesc } from './vendor/core/logging/create-loggers.js';

export type { Logger, LogLevelDesc };

const CATEGORIES = ['INIT', 'DATA', 'RENDER', 'INDEX', 'DRAG', 'UI'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * The single logger bundle for this component. Exported so global-api.ts can expose
 * its controls on `window.components['svelte-treeview'].logging`.
 */
export const logging = createLoggers('STV', CATEGORIES);

// The category loggers, by their historical names.
export const initLogger: Logger = logging.loggers.INIT;
export const dataLogger: Logger = logging.loggers.DATA;
export const renderLogger: Logger = logging.loggers.RENDER;
export const indexLogger: Logger = logging.loggers.INDEX;
export const dragLogger: Logger = logging.loggers.DRAG;
export const uiLogger: Logger = logging.loggers.UI;

/** Full (namespaced) category names, as they print. */
export const LOGGING_CATEGORIES = CATEGORIES.map((c) => `STV:${c}`);

/** Enable all logging (default `debug`). */
export function enableLogging(level?: LogLevelDesc): void {
	logging.enableLogging(level);
}

/** Disable all logging (silent — wins over the page-wide level). */
export function disableLogging(): void {
	logging.disableLogging();
}

/** Clear the tree's own levels: it follows the page-wide level again, else `warn`. */
export function resetLogging(): void {
	logging.resetLogging();
}

/** Set the same level on every category. */
export function setLogLevel(level: LogLevelDesc): void {
	logging.setLogLevel(level);
}

/**
 * Set the level of one category — the full name (`STV:INDEX`) or the bare suffix
 * (`INDEX`). `null` clears it (back to the type / page level).
 */
export function setCategoryLevel(category: string, level: LogLevelDesc | null = 'debug'): void {
	const bare = (category.includes(':') ? category.split(':').pop()! : category) as Category;
	logging.setCategoryLevel(bare, level);
}

// No forced level here: core gives every bundle its default (`warn`), a persisted
// `km-log:STV:*` level wins, and `window.components.logging` is the page-wide switch.

export default initLogger;
