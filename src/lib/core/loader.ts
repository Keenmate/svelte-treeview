/**
 * The page-wide loader hook of the KeenMate suite — `window.components.renderLoadingCallback`
 * (web-components-core `renderLoader()`, SPEC §12.14) — read WITHOUT depending on core.
 * Mirrored from core `src/dom/render-loader.ts` (tracked in scripts/core-sync.json).
 *
 * OPTIONAL: an app that never touches `window.components` loses nothing — the tree's own
 * `loadingPlaceholder` snippet always wins and is never routed through this hook, and with
 * neither the default loader is drawn.
 *
 * Core publishes the hook as an accessor on `window.components` whose value lives on
 * `globalThis[Symbol.for('@keenmate/web-components-core:loader')]` (shared by every bundled
 * core copy). A page with no core component may have assigned it as a plain property.
 * Reading `window.components.renderLoadingCallback` covers both; the Symbol state is the
 * fallback when `window.components` was replaced after core published. The pre-rc19 core
 * name `renderLoaderCallback` is still read last, so a page written for it keeps working.
 *
 * The tree's precedence: `loadingPlaceholder` snippet > this page hook > the default
 * `.stv__loader` (core's `<prefix>__loader`, drawn from the `--stv-loader-*` tokens).
 */
import { uiLogger } from '../logger.js';

/** What the page hook receives — the same shape core passes (`LoaderRenderContext`). */
export interface LoaderRenderContext {
	/** The component — `'svelte-treeview'` (core passes the custom-element tag name). */
	component: string;
	/** Which loading state — the tree has one: `'overlay'` (`isLoading`). */
	context: string;
	/** The element to fill. Already carries `role="status"` + `aria-label`. */
	containerElement: HTMLElement;
	/** The component root (`.stv__container`) — there is no custom-element host. */
	element: HTMLElement;
	/** The accessible label on the container (`labels.loading`). */
	label: string;
}

/** The page hook's shape (core `RenderLoaderCallback`). May return a cleanup. */
export type RenderLoaderCallback = (ctx: LoaderRenderContext) => void | (() => void);

const STATE_KEY = Symbol.for('@keenmate/web-components-core:loader');

/** The page-wide `window.components.renderLoadingCallback`, or `undefined`. */
export function getPageLoaderCallback(): RenderLoaderCallback | undefined {
	if (typeof globalThis === 'undefined') return undefined;
	const g = globalThis as unknown as {
		components?: { renderLoadingCallback?: unknown; renderLoaderCallback?: unknown };
		[STATE_KEY]?: { callback?: unknown };
	};
	const candidates = [
		g.components?.renderLoadingCallback,
		g[STATE_KEY]?.callback,
		g.components?.renderLoaderCallback // pre-rc19 core name
	];
	const cb = candidates.find((candidate) => typeof candidate === 'function');
	return cb as RenderLoaderCallback | undefined;
}

export interface PageLoaderParams {
	hook: RenderLoaderCallback;
	label: string;
}

/**
 * Svelte action: let the page hook fill `node` (the overlay, already `role="status"`).
 * A throwing hook is logged and the default `.stv__loader` is drawn instead — a loading
 * state is never blank. On destroy: the hook's cleanup runs and the nodes it added go.
 */
export function pageLoader(node: HTMLElement, params: PageLoaderParams) {
	const before = new Set<Node>(Array.from(node.childNodes));
	const discard = () => {
		for (const child of Array.from(node.childNodes)) if (!before.has(child)) child.remove();
	};
	let cleanup: (() => void) | undefined;
	try {
		const result = params.hook({
			component: 'svelte-treeview',
			context: 'overlay',
			containerElement: node,
			element: node.closest<HTMLElement>('.stv__container') ?? node,
			label: params.label
		});
		if (typeof result === 'function') cleanup = result;
	} catch (error) {
		uiLogger.error('window.components.renderLoadingCallback threw — drawing the default loader', error);
		discard();
		const span = node.ownerDocument.createElement('span');
		span.className = 'stv__loader';
		span.setAttribute('aria-hidden', 'true');
		node.appendChild(span);
	}
	return {
		destroy() {
			try {
				cleanup?.();
			} catch (error) {
				uiLogger.error('loader cleanup threw', error);
			}
			discard();
		}
	};
}
