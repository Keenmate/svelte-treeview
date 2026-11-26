/**
 * `tooltip` — a Svelte action over the Keenmate core `createTooltip` preset (vendored
 * `src/lib/vendor/core/positioning/tooltip.ts`, core-sync group "positioning") — the same
 * tooltip web-treeview's rows and web-multiselect's options use.
 *
 * Core owns the behaviour: show on hover / focus with delays, `autoUpdate` positioning,
 * follow-cursor, `data-theme` inherit, the exit fade (`km-tooltip--hiding`, `data-placement`),
 * hide on a scroll that moves the row, the first Escape hiding a focus-shown tooltip (WCAG
 * 1.4.13), mounting inside an open modal `<dialog>`, and `aria-describedby` on the target.
 *
 * What this wrapper adds:
 *  - the tree's defaults (placement `'top-start'`, delay `{ show: 400, hide: 100 }`);
 *  - mounting INSIDE the tree's `.stv__container` (not `document.body` — the `--stv-*` /
 *    `--base-*` variables only resolve there; `position: fixed` still escapes its overflow);
 *  - the `.stv__tooltip` / `--visible` class contract themed via `--stv-tooltip-*`;
 *  - `enabled` + live `content`: content is read at each show, so an `update()` only refreshes
 *    a visible tooltip. An `HTMLElement` (the `tooltip` snippet's hidden host in Node.svelte) is
 *    adopted into the tooltip and un-hidden — Svelte keeps updating it by reference.
 * A change of placement / offset / delay / follow-cursor / classes re-creates the core tooltip.
 */
import { createTooltip, type TooltipHandle } from '../vendor/core/positioning/tooltip.js';
import type { TooltipPlacement, TooltipDelay } from '../ltree/types.js';

export type { TooltipPlacement, TooltipDelay };

export interface TooltipParams {
	/** Text, or an element to adopt as the tooltip body. Null / empty disables. */
	content?: string | HTMLElement | null;
	/** Master switch — when false the tooltip never shows. */
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

/** The options that need a new core tooltip when they change (content / enabled don't). */
function structuralKey(p: TooltipParams): string {
	const d = normalizeDelay(p.delay);
	return [p.placement ?? 'top-start', p.offset ?? 8, d.show, d.hide, !!p.followCursor, p.cssClass ?? '', p.visibleClass ?? ''].join('|');
}

export function tooltip(trigger: HTMLElement, initial: TooltipParams) {
	let params: TooltipParams = initial;
	let handle: TooltipHandle | null = null;
	let key = '';

	const isActive = (): boolean => params.enabled !== false && hasContent(params.content);

	function create(): void {
		handle?.destroy();
		key = structuralKey(params);
		handle = createTooltip({
			trigger,
			// Resolved at create: the row is already inside its tree when the action runs.
			container: trigger.closest<HTMLElement>('.stv__container') ?? undefined,
			content: () => {
				if (!isActive()) return null;
				const c = params.content!;
				// The snippet host stays display:none in place; shown once adopted.
				if (c instanceof HTMLElement) c.style.display = '';
				return c;
			},
			placement: params.placement ?? 'top-start',
			offset: params.offset ?? 8,
			delay: normalizeDelay(params.delay),
			shouldFollowCursor: !!params.followCursor,
			cssClass: params.cssClass ?? 'stv__tooltip',
			visibleClass: params.visibleClass ?? 'stv__tooltip--visible'
		});
	}

	create();

	return {
		update(next: TooltipParams) {
			params = next;
			if (structuralKey(params) !== key) create();
			else if (!isActive()) handle?.hide();
			else handle?.refresh(); // live content change while shown (no-op when hidden)
		},
		destroy() {
			handle?.destroy();
			handle = null;
		}
	};
}
