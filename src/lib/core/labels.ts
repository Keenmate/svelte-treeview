/**
 * UI strings of the tree (SPEC §12.24, rulebook D-NC-24). Keys are flat `<elementType>.<name>`
 * (`messages.noData`, `menuItems.copy`) — the same keys as web-treeview's. Per key, resolved by the
 * vendored core `/locale` `createLabels`: the `labels` prop (short `messages.noData` or full
 * `svelte-treeview.messages.noData`; a string — `''` included — wins) → the tree's own
 * `translateCallback` → the page-wide `window.components.locale.translateCallback` → the page-wide flat
 * dictionary `window.components.locale.labels['svelte-treeview.<key>']` → these English defaults.
 * `''` = deliberately empty (render nothing). Placeholders use `{name}`; a dynamic text reads its context as
 * `{ctx.count}` (`ctx.count` = the number the noun agrees with — a `translateCallback` gets it as `params.ctx`).
 * Every label renders as text.
 */
import { createLabels, type Labels, type OwnLabels } from '../vendor/core/locale/labels.js';
import type { TranslateCallback } from '../vendor/core/locale/page-locale.js';

export type { LabelTranslateContext, TranslateCallback } from '../vendor/core/locale/page-locale.js';

/** The component name — the prefix of the full keys (`svelte-treeview.messages.noData`). */
export const LABELS_TAG = 'svelte-treeview';

/** Every UI string of the tree. */
export interface TreeLabels {
	/** Empty state when the tree has no nodes at all. */
	'messages.noData': string;
	/** Empty state when nodes exist but the search filter matched none. */
	'messages.noResults': string;
	/** Default drop-placeholder text (when no `dropPlaceholder` snippet is given). */
	'messages.dropHere': string;
	/** The loading row of a lazy context submenu (`getChildrenCallback` still resolving). */
	'messages.loading': string;
	/** Shown for a node that has no display value. */
	'labels.noDisplayValue': string;
	/** Floating drop pads over a hovered node (`dropZoneMode: 'floating'`): drop before the node. */
	'labels.dropBefore': string;
	/** Drop pad: drop after the node. */
	'labels.dropAfter': string;
	/** Drop pad: drop as the node's child. */
	'labels.dropChild': string;
	/** Accessible name (`aria-label`) of the tree (`role="tree"` on `.stv__container`). */
	'ariaLabels.tree': string;
	/** Accessible label (`aria-label`) of the `isLoading` overlay (also the page loader hook's `label`). */
	'ariaLabels.loading': string;
	/** Accessible label of the trailing info button on a clipped node label (`nodeTitleOverflow: 'info'`). */
	'ariaLabels.showFullLabel': string;
	/** Accessible label of the context menu sheet / drawer close button (`menuPresentation`). */
	'ariaLabels.closeSheet': string;
	/** Built-in context-menu items (texts of the built-in action names). */
	'menuItems.copy': string;
	'menuItems.cut': string;
	'menuItems.paste': string;
	'menuItems.delete': string;
	'menuItems.expand': string;
	'menuItems.collapse': string;
	'menuItems.expandSubtree': string;
	'menuItems.collapseSubtree': string;
	'menuItems.expandAll': string;
	'menuItems.collapseAll': string;
	'menuItems.sort': string;
	'menuItems.sortSubtree': string;
	'menuItems.sortAll': string;
	/** The row on top of a drilled-in submenu in the context menu sheet / drawer (goes up one level). */
	'menuItems.back': string;

	/**
	 * Screen-reader announcements (core `announce()`, the page's one polite live region). `''` silences
	 * one. A search settled with matches: `{ctx.count}` = the matches, `{ctx.searchTerm}`. Same keys and
	 * placeholders as web-treeview (a `translateCallback` reads `params.ctx`).
	 */
	'ariaLabels.searchResults': string;
	/** A search settled with no matches. */
	'ariaLabels.searchNoResults': string;
	/** The tree placed dropped nodes: `{ctx.name}` = the node (or `ariaLabels.dropItems` for several),
	 *  `{ctx.target}` = the drop target, `{ctx.count}` = the dropped nodes. */
	'ariaLabels.movedInto': string;
	'ariaLabels.movedBefore': string;
	'ariaLabels.movedAfter': string;
	'ariaLabels.copiedInto': string;
	'ariaLabels.copiedBefore': string;
	'ariaLabels.copiedAfter': string;
	/** The `{ctx.name}` of a drop that placed several nodes (`{ctx.count}` = the nodes). */
	'ariaLabels.dropItems': string;
	/** The `{ctx.target}` of a drop onto the empty tree / the top level. */
	'ariaLabels.dropTreeRoot': string;
	/** A refused drop: `{ctx.target}` = the node that doesn't accept it. */
	'ariaLabels.dropDenied': string;
}

/** Built-in English strings. */
export const DEFAULT_LABELS: Readonly<TreeLabels> = Object.freeze({
	'messages.noData': 'No data',
	'messages.noResults': 'No results found',
	'messages.dropHere': 'Drop here',
	'messages.loading': 'Loading…',
	'labels.noDisplayValue': '[N/A]',
	'labels.dropBefore': 'Before',
	'labels.dropAfter': 'After',
	'labels.dropChild': 'Child',
	'ariaLabels.tree': 'Tree',
	'ariaLabels.loading': 'Loading…',
	'ariaLabels.showFullLabel': 'Show full label',
	'ariaLabels.closeSheet': 'Close',
	'menuItems.copy': 'Copy',
	'menuItems.cut': 'Cut',
	'menuItems.paste': 'Paste',
	'menuItems.delete': 'Delete',
	'menuItems.expand': 'Expand',
	'menuItems.collapse': 'Collapse',
	'menuItems.expandSubtree': 'Expand subtree',
	'menuItems.collapseSubtree': 'Collapse subtree',
	'menuItems.expandAll': 'Expand all',
	'menuItems.collapseAll': 'Collapse all',
	'menuItems.sort': 'Sort',
	'menuItems.sortSubtree': 'Sort subtree',
	'menuItems.sortAll': 'Sort all',
	'menuItems.back': 'Back',
	'ariaLabels.searchResults': 'Results: {ctx.count}',
	'ariaLabels.searchNoResults': 'No results found',
	'ariaLabels.movedInto': '{ctx.name} moved into {ctx.target}',
	'ariaLabels.movedBefore': '{ctx.name} moved before {ctx.target}',
	'ariaLabels.movedAfter': '{ctx.name} moved after {ctx.target}',
	'ariaLabels.copiedInto': '{ctx.name} copied into {ctx.target}',
	'ariaLabels.copiedBefore': '{ctx.name} copied before {ctx.target}',
	'ariaLabels.copiedAfter': '{ctx.name} copied after {ctx.target}',
	'ariaLabels.dropItems': 'Items ({ctx.count})',
	'ariaLabels.dropTreeRoot': 'the tree',
	'ariaLabels.dropDenied': 'Cannot drop here: {ctx.target} does not accept dropped items'
});

/** A tree's `labels` prop: short keys (`messages.noData`) and / or full keys (`svelte-treeview.messages.noData`). */
export type TreeLabelsInput = OwnLabels<TreeLabels>;

/**
 * The labels of one tree: `getOwn` / `getTranslateCallback` are read on every call, so a changed
 * prop or page-wide object is picked up by the next render. No host element: core uses it only for
 * the tag (passed) and to attribute a throwing callback in the log (→ the plain core logger).
 */
export function createTreeLabels(
	getOwn: () => TreeLabelsInput,
	getTranslateCallback: () => TranslateCallback | null | undefined
): Labels<TreeLabels> {
	return createLabels(null as unknown as Element, DEFAULT_LABELS as TreeLabels, getOwn, {
		tag: LABELS_TAG,
		getTranslateCallback
	});
}

/**
 * One label outside a tree instance: the `labels` object → the page-wide translateCallback /
 * dictionary → English. Inside a tree use `controller.getLabel(key)` (it also asks the tree's own
 * `translateCallback`).
 */
export function resolveLabel(
	labels: TreeLabelsInput,
	key: keyof TreeLabels,
	params?: Record<string, unknown>
): string {
	return createTreeLabels(() => labels, () => null).text(key, params);
}
