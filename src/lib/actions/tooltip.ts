/**
 * `tooltip` — a Svelte action that mirrors the KeenMate core `createTooltip`
 * preset (web-components-core `positioning/tooltip.ts`, as used by
 * web-multiselect's option tooltips) but built on the `@floating-ui/dom` this
 * package already ships — no vanilla-DOM helper vendored in.
 *
 * Behaviour parity with core createTooltip:
 *  - shows on `mouseenter` / `focusin`, hides on `mouseleave` / `focusout`
 *  - independent show / hide delays
 *  - portals a `role="tooltip"` element to `document.body` (escapes the tree's
 *    overflow clip), positioned via `computePosition` + `autoUpdate`
 *  - `followCursor`: anchors to a virtual element tracking the pointer
 *  - inherits `data-theme` from the nearest themed ancestor so a portaled
 *    tooltip stays dark/light-correct
 *  - a CSS-class contract (`.stv__tooltip` + `--visible`) themed via `--stv-*`
 *
 * Content is either a string (rendered as text) or an `HTMLElement` (adopted
 * into the tooltip — this is how the `tooltip` snippet is supported: Node.svelte
 * renders the snippet into a hidden host element and hands it over here).
 */
import { computePosition, autoUpdate, offset as offsetMw, flip, shift } from '@floating-ui/dom';
import type { TooltipPlacement, TooltipDelay } from '../ltree/types.js';

export type { TooltipPlacement, TooltipDelay };

export interface TooltipParams {
	/** Text, or an element to adopt as the tooltip body. Null / empty disables. */
	content?: string | HTMLElement | null;
	/** Master switch — when false the tooltip never shows (listeners detached). */
	enabled?: boolean;
	/** Preferred placement. Default `'top-start'`. */
	placement?: TooltipPlacement;
	/** Gap from the trigger (or cursor), in px. Default `8`. */
	offset?: number;
	/** Show / hide delay(s), in ms. Default `{ show: 400, hide: 100 }`. */
	delay?: TooltipDelay;
	/** Anchor to the pointer instead of the trigger. Default `false`. */
	followCursor?: boolean;
	/** Class(es) on the tooltip element. Default `'stv__tooltip'`. */
	cssClass?: string;
	/** Class toggled while visible. Default `'stv__tooltip--visible'`. */
	visibleClass?: string;
}

function normalizeDelay(delay: TooltipDelay | undefined): { show: number; hide: number } {
	if (typeof delay === 'number') return { show: delay, hide: delay };
	return { show: delay?.show ?? 400, hide: delay?.hide ?? 100 };
}

function hasContent(c: TooltipParams['content']): boolean {
	if (c == null) return false;
	if (typeof c === 'string') return c.trim().length > 0;
	return true; // HTMLElement
}

export function tooltip(trigger: HTMLElement, initial: TooltipParams) {
	let params: TooltipParams = initial;
	let el: HTMLElement | null = null;
	let visible = false;
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let stopAutoUpdate: (() => void) | undefined;
	let cursorRect: DOMRect | undefined;

	const cursorReference = {
		getBoundingClientRect: () => cursorRect ?? trigger.getBoundingClientRect(),
		// So Floating UI's autoUpdate can still attach scroll/resize observers to a
		// real ancestor while we anchor to the moving pointer rect.
		contextElement: trigger
	};

	function active(): boolean {
		return params.enabled !== false && hasContent(params.content);
	}

	function ensureEl(): HTMLElement {
		if (el) return el;
		el = document.createElement('div');
		el.setAttribute('role', 'tooltip');
		el.className = params.cssClass ?? 'stv__tooltip';
		el.style.position = 'fixed';
		el.style.top = '0';
		el.style.left = '0';
		el.style.margin = '0';
		return el;
	}

	function renderContent(): void {
		const root = ensureEl();
		const c = params.content;
		if (typeof c === 'string') {
			root.textContent = c;
		} else if (c instanceof HTMLElement) {
			// Adopt the (snippet) host element; make it visible in case the caller
			// kept it display:none in place. Svelte keeps updating it by reference.
			root.replaceChildren(c);
			c.style.display = '';
		}
	}

	function inheritTheme(root: HTMLElement): void {
		const themed = trigger.closest('[data-theme]');
		const theme = themed?.getAttribute('data-theme');
		if (theme) root.setAttribute('data-theme', theme);
		else root.removeAttribute('data-theme');
	}

	function position(): void {
		if (!el) return;
		const reference = params.followCursor ? cursorReference : trigger;
		computePosition(reference, el, {
			strategy: 'fixed',
			placement: params.placement ?? 'top-start',
			middleware: [offsetMw(params.offset ?? 8), flip(), shift({ padding: 8 })]
		}).then(({ x, y }) => {
			if (!el) return;
			el.style.left = `${x}px`;
			el.style.top = `${y}px`;
		});
	}

	const onMouseMove = (e: MouseEvent): void => {
		cursorRect = new DOMRect(e.clientX, e.clientY, 0, 0);
		position();
	};

	function clearTimers(): void {
		if (showTimer) clearTimeout(showTimer);
		if (hideTimer) clearTimeout(hideTimer);
		showTimer = hideTimer = undefined;
	}

	function show(): void {
		clearTimers();
		if (visible || !active()) return;
		visible = true;
		const root = ensureEl();
		renderContent();
		inheritTheme(root);
		// Mount INSIDE the tree's .stv__container, not document.body: the library
		// declares its --stv-* tokens (and inherits the theme's --base-*) on
		// .stv__container, so a body-level portal renders with NO background/colour
		// (every var() empty). position:fixed still escapes the container's overflow.
		// Mirrors web-multiselect portaling into its shadow root for the same reason.
		const container = trigger.closest<HTMLElement>('.stv__container') ?? document.body;
		container.appendChild(root);
		if (params.followCursor) trigger.addEventListener('mousemove', onMouseMove);
		const reference = params.followCursor ? cursorReference : trigger;
		stopAutoUpdate = autoUpdate(reference as Element, root, position);
		// Next frame so the transition (if any) runs from the hidden state.
		requestAnimationFrame(() => root.classList.add(params.visibleClass ?? 'stv__tooltip--visible'));
	}

	function hide(): void {
		clearTimers();
		if (!visible) return;
		visible = false;
		if (params.followCursor) trigger.removeEventListener('mousemove', onMouseMove);
		stopAutoUpdate?.();
		stopAutoUpdate = undefined;
		if (el) {
			el.classList.remove(params.visibleClass ?? 'stv__tooltip--visible');
			el.remove();
		}
	}

	function scheduleShow(): void {
		clearTimers();
		if (!active()) return;
		const { show: d } = normalizeDelay(params.delay);
		if (d > 0) showTimer = setTimeout(show, d);
		else show();
	}
	function scheduleHide(): void {
		clearTimers();
		const { hide: d } = normalizeDelay(params.delay);
		if (d > 0) hideTimer = setTimeout(hide, d);
		else hide();
	}

	trigger.addEventListener('mouseenter', scheduleShow);
	trigger.addEventListener('mouseleave', scheduleHide);
	trigger.addEventListener('focusin', scheduleShow);
	trigger.addEventListener('focusout', scheduleHide);

	return {
		update(next: TooltipParams) {
			params = next;
			if (!active()) {
				hide();
			} else if (visible) {
				// Live content / placement change while shown.
				renderContent();
				position();
			}
		},
		destroy() {
			trigger.removeEventListener('mouseenter', scheduleShow);
			trigger.removeEventListener('mouseleave', scheduleHide);
			trigger.removeEventListener('focusin', scheduleShow);
			trigger.removeEventListener('focusout', scheduleHide);
			hide();
			el = null;
		}
	};
}
