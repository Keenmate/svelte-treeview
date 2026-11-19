/**
 * UI strings of the tree (SPEC §12.24, rulebook D-NC-24). Per key: the `labels` prop (partial; a
 * string — `''` included — wins) → the page-wide `window.components.locale.labels['svelte-treeview']`
 * → these English defaults. `''` = deliberately empty (render nothing). Then formatting:
 * `window.components.locale.formatLabelCallback` (ICU / FormatJS / i18next) or the default `{name}`
 * replacement from `params`. Every label is rendered as text, so nothing is escaped.
 *
 * `resolveLabel()` is the single label seam (vendored core `/locale` underneath).
 */
import { formatLabel, resolveLabel as resolveLabelLayers } from '../vendor/core/locale/labels.js';
import { getPageLocale } from '../vendor/core/locale/page-locale.js';
import { resolveLocale } from '../vendor/core/locale/settings.js';
import { callSafely } from '../vendor/core/logging/safe-call.js';

/** The key of this component's table in `window.components.locale.labels`. */
export const LABELS_TAG = 'svelte-treeview';

export interface TreeLabels {
	/** Empty state when the tree has no nodes at all. */
	noData: string;
	/** Empty state when nodes exist but the search filter matched none. */
	noResults: string;
	/** Default drop-placeholder text (when no `dropPlaceholder` snippet is given). */
	dropHere: string;
	/** Shown for a node that has no display value. */
	noDisplayValue: string;
	/** Data loading — the `isLoading` overlay's aria-label and the progressive "more children" row. */
	loading: string;
	/** Accessible label of the trailing info button on a clipped node label (`nodeTitleOverflow: 'info'`). */
	showFullLabel: string;
	/** Built-in context-menu items (texts of the built-in action names). */
	copy: string;
	cut: string;
	paste: string;
	delete: string;
	expand: string;
	collapse: string;
	expandSubtree: string;
	collapseSubtree: string;
	expandAll: string;
	collapseAll: string;
	sort: string;
	sortSubtree: string;
	sortAll: string;
}

export const DEFAULT_LABELS: Readonly<TreeLabels> = Object.freeze({
	noData: 'No data',
	noResults: 'No results found',
	dropHere: 'Drop here',
	noDisplayValue: '[N/A]',
	loading: 'Loading…',
	showFullLabel: 'Show full label',
	copy: 'Copy',
	cut: 'Cut',
	paste: 'Paste',
	delete: 'Delete',
	expand: 'Expand',
	collapse: 'Collapse',
	expandSubtree: 'Expand subtree',
	collapseSubtree: 'Collapse subtree',
	expandAll: 'Expand all',
	collapseAll: 'Collapse all',
	sort: 'Sort',
	sortSubtree: 'Sort subtree',
	sortAll: 'Sort all'
});

export function resolveLabel(
	labels: Partial<TreeLabels> | null | undefined,
	key: keyof TreeLabels,
	params?: Record<string, string | number>
): string {
	const own = labels && typeof labels === 'object' ? labels : null;
	const template = resolveLabelLayers(LABELS_TAG, DEFAULT_LABELS, own, key);
	let text = formatLabel(template, params);
	const callback = getPageLocale()?.formatLabelCallback;
	if (typeof callback === 'function') {
		const result = callSafely(
			() =>
				callback({
					component: LABELS_TAG,
					key,
					template,
					params: params ?? {},
					locale: resolveLocale()
				}),
			{ message: `formatLabelCallback threw for "${LABELS_TAG}.${key}" — using the default formatting` }
		);
		if (result.isOk && typeof result.value === 'string') text = result.value;
	}
	return text;
}
