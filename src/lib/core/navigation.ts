/**
 * Navigation interface — each renderer provides its own implementation.
 * The HTML tree uses flat-list traversal; canvas renderers use spatial logic.
 * Users can override individual methods via TreeNavigationOverrides.
 */
export interface TreeNavigation<T> {
	/** Select a node and scroll it into view (core navigation primitive) */
	navTo(path: string): void;
	/** Move to the next visible node (flat order; the first one when nothing is focused) */
	navNext(): void;
	/** Move to the previous visible node (flat order; the last one when nothing is focused) */
	navPrev(): void;
	/** Move to next visible node at the same level */
	navNextSibling(): void;
	/** Move to previous visible node at the same level */
	navPrevSibling(): void;
	/** Move to first child (expands if collapsed) */
	navInto(): void;
	/** Move to parent node (no collapse) */
	navOut(): void;
	/** Collapse parent and select it (Backspace behavior) */
	navBackOut(): void;
	/** Toggle expand/collapse of current node */
	navToggle(): void;
	/** Select first visible node */
	navFirst(): void;
	/** Select last visible node */
	navLast(): void;
	/** PageDown — jump forward ~10 visible nodes */
	navPageDown(): void;
	/** PageUp — jump back ~10 visible nodes */
	navPageUp(): void;

	// ── Shift+navigation: extend highlight range ────────────────────
	/** Shift+ArrowDown — extend highlight to next visible node */
	navSelectNext(): void;
	/** Shift+ArrowUp — extend highlight to previous visible node */
	navSelectPrev(): void;
	/** Shift+Home — extend highlight to first visible node */
	navSelectFirst(): void;
	/** Shift+End — extend highlight to last visible node */
	navSelectLast(): void;
	/** Shift+PageDown — extend highlight forward ~10 visible nodes */
	navSelectPageDown(): void;
	/** Shift+PageUp — extend highlight back ~10 visible nodes */
	navSelectPageUp(): void;
}

export type TreeNavigationOverrides<T> = Partial<TreeNavigation<T>>;
