/**
 * `window.components['svelte-treeview']` — the same entry shape every KeenMate web
 * component publishes through core's `registerComponent()` (SPEC §12.3): `version()`,
 * `config`, `logging` (this tree's type-level controls) and `getInstances()` (the live
 * TreeControllers). svelte-treeview isn't a custom element, so the element bits
 * (`register()`, per-tag responsive / custom-style hooks) are left out.
 *
 * The page-wide switch is the NON-enumerable `window.components.logging`, published by
 * the vendored core logging module (shared with every web-* component on the page):
 *
 * ```js
 * window.components.logging.enableLogging('debug');                  // every component
 * window.components['svelte-treeview'].logging.enableLogging();      // just the tree(s)
 * window.components['svelte-treeview'].logging.setCategoryLevel('INDEX', 'debug');
 * window.components['svelte-treeview'].getInstances();               // TreeController[]
 * ```
 *
 * Imported by TreeController + index.ts so it runs whenever the tree is used.
 */
import { logging } from './logger.js';
import type { LogLevelDesc } from './vendor/core/logging/create-loggers.js';
import { publishGlobalLogging, type GlobalLoggingControls } from './vendor/core/logging/global-logging.js';
import { getRegisteredTrees } from './core/clipboard.js';

// Generated constants (scripts/generate-constants.js)
import { VERSION, PACKAGE_NAME, AUTHOR, LICENSE, REPOSITORY, HOMEPAGE } from './constants.generated.js';

/** Type-level logging controls — core's `ComponentLoggingControls`. */
export interface TreeviewLoggingControls {
	/** Set the tree's level on every category (default: `debug`). */
	enableLogging(level?: LogLevelDesc): void;
	/** Set the tree's level to `silent`. */
	disableLogging(): void;
	setLogLevel(level: LogLevelDesc): void;
	/** Clear the tree's own levels: it follows the page-wide level again. */
	resetLogging(): void;
	/** Bare (`'DATA'`) or namespaced as it prints (`'STV:DATA'`); `null` clears that category. */
	setCategoryLevel(category: string, level: LogLevelDesc | null): void;
	getCategories(): string[];
}

/** `window.components['svelte-treeview']` — core's `RegisteredComponent` minus the element bits. */
export interface GlobalTreeviewAPI {
	/** The build version (shortcut for `config.version`). */
	version(): string;
	config: {
		name: string;
		version: string;
		author: string;
		license: string;
		repository: string;
		homepage: string;
	};
	logging: TreeviewLoggingControls;
	/** The live tree controllers (one per mounted Tree / TreeProvider). */
	getInstances(): unknown[];
}

declare global {
	interface Window {
		/** Registry of KeenMate components, keyed by tag/package name (+ the non-enumerable page-wide `logging`). */
		components?: Record<string, unknown> & {
			'svelte-treeview'?: GlobalTreeviewAPI;
			readonly logging?: GlobalLoggingControls;
		};
	}
}

const ENTRY_KEY = 'svelte-treeview';

if (typeof window !== 'undefined') {
	const entry: GlobalTreeviewAPI = {
		version: () => VERSION,
		config: {
			name: PACKAGE_NAME,
			version: VERSION,
			author: AUTHOR,
			license: LICENSE,
			repository: REPOSITORY,
			homepage: HOMEPAGE
		},
		logging: {
			enableLogging: (level) => logging.enableLogging(level),
			disableLogging: () => logging.disableLogging(),
			setLogLevel: (level) => logging.setLogLevel(level),
			resetLogging: () => logging.resetLogging(),
			setCategoryLevel: (category, level) => logging.setCategoryLevel(category as never, level),
			getCategories: () => [...logging.LOGGING_CATEGORIES]
		},
		getInstances: () => getRegisteredTrees()
	};
	const components = (window.components ??= {});
	// Adopt an entry the page created before this script ran (registerComponent does the same).
	const existing = components[ENTRY_KEY];
	components[ENTRY_KEY] = existing && typeof existing === 'object' ? Object.assign(existing, entry) : entry;
	publishGlobalLogging(); // re-publish if the page replaced window.components
}
