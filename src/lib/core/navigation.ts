/**
 * Navigation interface — each renderer provides its own implementation.
 * The HTML tree uses flat-list traversal; canvas renderers use spatial logic.
 * Users can override individual methods via TreeNavigationOverrides.
 */
export interface TreeNavigation<T> {
	/** Select a node and scroll it into view (core navigation primitive) */
	focusAndSelectNode(path: string): void;
	/** Move to the next visible node (flat order; the first one when nothing is focused) */
	focusNext(): void;
	/** Move to the previous visible node (flat order; the last one when nothing is focused) */
	focusPrevious(): void;
	/** Move to next visible node at the same level */
	focusNextAtLevel(): void;
	/** Move to previous visible node at the same level */
	focusPreviousAtLevel(): void;
	/** Move to first child (expands if collapsed) */
	focusFirstChild(): void;
	/** Move to parent node (no collapse) */
	focusParent(): void;
	/** Collapse parent and select it (Backspace behavior) */
	collapseParent(): void;
	/** Toggle expand/collapse of current node */
	toggleFocusedNodeExpanded(): void;
	/** Select first visible node */
	focusFirst(): void;
	/** Select last visible node */
	focusLast(): void;
	/** PageDown — jump forward ~10 visible nodes */
	focusNextPage(): void;
	/** PageUp — jump back ~10 visible nodes */
	focusPreviousPage(): void;

	// ── Shift+navigation: extend the selection range ────────────────────
	/** Shift+ArrowDown — extend the selection to next visible node */
	extendSelectionNext(): void;
	/** Shift+ArrowUp — extend the selection to previous visible node */
	extendSelectionPrevious(): void;
	/** Shift+Home — extend the selection to first visible node */
	extendSelectionToFirst(): void;
	/** Shift+End — extend the selection to last visible node */
	extendSelectionToLast(): void;
	/** Shift+PageDown — extend the selection forward ~10 visible nodes */
	extendSelectionNextPage(): void;
	/** Shift+PageUp — extend the selection back ~10 visible nodes */
	extendSelectionPreviousPage(): void;
}

export type TreeNavigationOverrides<T> = Partial<TreeNavigation<T>>;
