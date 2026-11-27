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
	/** ArrowRight (navigationPreset 'classic') — move to the first child (expands if collapsed) */
	focusFirstChild(): void;
	/** ArrowLeft (navigationPreset 'classic') — move to the parent node (no collapse) */
	focusParent(): void;
	/** ArrowRight (navigationPreset 'wai-aria') — a closed node opens (focus stays), an open node
	 *  moves to its first child, a leaf does nothing */
	expandOrFocusFirstChild(): void;
	/** ArrowLeft (navigationPreset 'wai-aria') — an open node collapses (focus stays), a closed node
	 *  or a leaf moves to its parent */
	collapseOrFocusParent(): void;
	/** `*` (navigationPreset 'wai-aria') — expand every sibling of the focused node (focus stays;
	 *  nothing under shouldExpandAsAccordion) */
	expandSiblings(): void;
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

/**
 * Which navigation method the arrow keys call (= web-treeview):
 * - `'classic'` (default) — → enters a node (opening it first), ← goes to the parent without
 *   collapsing; Enter toggles, Backspace collapses the parent.
 * - `'wai-aria'` — the WAI-ARIA tree pattern: → opens a closed node, a second → enters it; ← collapses
 *   an open node, a second ← goes to the parent; `*` expands every sibling. Enter / Backspace as classic.
 * `navigationOverrides` still replace the methods either preset calls.
 */
export type NavigationPreset = 'classic' | 'wai-aria';
