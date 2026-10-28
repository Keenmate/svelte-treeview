/**
 * UI strings of the tree. A partial object passed as the `labels` prop is merged per key over
 * these English defaults. `''` = deliberately empty (render nothing); `undefined` / missing =
 * the default. `{name}` placeholders are filled from `params`.
 *
 * `resolveLabel()` is the single label seam (a future page-wide locale source plugs in here).
 */
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
}

export const DEFAULT_TREE_LABELS: Readonly<TreeLabels> = Object.freeze({
	noData: 'No data',
	noResults: 'No results found',
	dropHere: 'Drop here',
	noDisplayValue: '[N/A]',
	loading: 'Loading…'
});

export function resolveLabel(
	labels: Partial<TreeLabels> | null | undefined,
	key: keyof TreeLabels,
	params?: Record<string, string | number>
): string {
	const own = labels?.[key];
	let text = own === undefined || own === null ? DEFAULT_TREE_LABELS[key] : String(own);
	if (params && text) {
		text = text.replace(/\{(\w+)\}/g, (m, name: string) =>
			name in params ? String(params[name]) : m
		);
	}
	return text;
}
