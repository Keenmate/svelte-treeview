/**
 * The page-wide loader hook of the KeenMate suite — `window.components.renderLoaderCallback`
 * (web-components-core `renderLoader()`, SPEC §12.14) — read WITHOUT depending on core.
 *
 * Core publishes the hook as an accessor on `window.components` whose value lives on
 * `globalThis[Symbol.for('@keenmate/web-components-core:loader')]` (shared by every bundled
 * core copy). A page with no core component may have assigned it as a plain property.
 * Reading `window.components.renderLoaderCallback` covers both; the Symbol state is the
 * fallback when `window.components` was replaced after core published.
 *
 * The tree's precedence: `loadingPlaceholder` snippet > this page hook > the default
 * `.stv-loader` (drawn from the `--stv-loader-*` tokens).
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

/** The page-wide `window.components.renderLoaderCallback`, or `undefined`. */
export function getPageLoaderCallback(): RenderLoaderCallback | undefined {
	if (typeof globalThis === 'undefined') return undefined;
	const g = globalThis as unknown as {
		components?: { renderLoaderCallback?: unknown };
		[STATE_KEY]?: { callback?: unknown };
	};
	const cb = g.components?.renderLoaderCallback ?? g[STATE_KEY]?.callback;
	return typeof cb === 'function' ? (cb as RenderLoaderCallback) : undefined;
}

export interface PageLoaderParams {
	hook: RenderLoaderCallback;
	label: string;
}

/**
 * Svelte action: let the page hook fill `node` (the overlay, already `role="status"`).
 * A throwing hook is logged and the default `.stv-loader` is drawn instead — a loading
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
		uiLogger.error('window.components.renderLoaderCallback threw — drawing the default loader', error);
		discard();
		const span = node.ownerDocument.createElement('span');
		span.className = 'stv-loader';
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
