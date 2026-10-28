import type { Index, SearchOptions } from 'flexsearch';
import type { LTreeNode, DropPosition } from './ltree-node.svelte.js';

// Re-export LTreeNode and DropPosition for convenience
export type { LTreeNode, DropPosition } from './ltree-node.svelte.js';

/** ctx of the per-node callbacks (`getIsDraggableCallback`, `getDisplayValueCallback`,
 *  `getIconCallback`, `getNodeClassCallback`, …) — one object, so fields can be added. */
export interface NodeContext<T> {
	node: LTreeNode<T>;
}

/** ctx of `sortCallback`: the children of ONE parent (siblings); return them in the new order. */
export interface SortContext<T> {
	nodes: LTreeNode<T>[];
}

export type DragDropMode = 'none' | 'self' | 'cross' | 'both';
export type ToggleIconMode = 'rotate' | 'swap';
/**
 * Selects which picture the ONE disclosure-glyph variable set draws. Not four
 * parallel CSS-class families — `iconSet` is a single knob that re-points
 * `--stv-icon-expand` / `--stv-icon-collapse` (+ rotation) via the
 * `.stv__container[data-icon-set=…]` blocks in `variables.css`. Each set chains
 * to a shared `--base-icon-*` token so a theme reskins every KeenMate
 * component's disclosure glyph at once.
 * - `chevron` (default): Lucide chevron → `--base-icon-chevron`; rotates.
 * - `triangle`: filled caret → `--base-icon-caret-down`; rotates.
 * - `plus-minus`: square-plus/minus → `--base-icon-expand`/`--base-icon-collapse`;
 *   inherently a swap set (a rotated +/− is meaningless), so it glyph-swaps
 *   regardless of `toggleIconMode`.
 * - `arrow`: Lucide arrow-right/down; rotates.
 */
export type IconSet = 'chevron' | 'triangle' | 'plus-minus' | 'arrow';
/**
 * How the built-in node label (`.stv__node-label`) behaves when it's wider than the
 * available row space:
 * - `wrap` (default): the label wraps onto multiple lines — the row grows taller.
 * - `ellipsis`: the label stays on one line and is clipped with an ellipsis (…).
 * - `info`: like `ellipsis`, but a trailing circled-ⓘ affordance appears ONLY on rows
 *   whose label is actually clipped; clicking it reveals the full label in a popover
 *   (the touch/no-hover substitute for the native `title` tooltip, which is also set).
 * Only affects the default label render path; a `nodeTemplate` snippet owns its own layout.
 */
export type NodeTitleOverflow = 'wrap' | 'ellipsis' | 'info';
/**
 * Placement of a node tooltip relative to its row (same 12 values as Floating UI).
 * Default `'top-start'` so the tooltip anchors to a full-width row's start edge
 * rather than centring on it.
 */
export type TooltipPlacement =
	| 'top' | 'top-start' | 'top-end'
	| 'right' | 'right-start' | 'right-end'
	| 'bottom' | 'bottom-start' | 'bottom-end'
	| 'left' | 'left-start' | 'left-end';
/** Tooltip show / hide delay, in ms. A single number sets both. */
export type TooltipDelay = number | { show?: number; hide?: number };
/**
 * Context passed as the LAST argument to the render snippets (`nodeTemplate`, `icon`,
 * `tooltip`) so they can branch on the current device / container space AND the node's
 * live render state — e.g. a compact icon on a phone, or a badge only when selected.
 * `deviceClass` and `container` come from the responsive signal; the rest mirror the
 * node's current state at render time.
 */
export interface NodeRenderContext {
	/** Device capability class ('mobile' | 'tablet' | 'desktop') from classifyDevice. */
	deviceClass: 'mobile' | 'tablet' | 'desktop';
	/** The tree's own container border-box, in px. */
	container: { width: number; height: number };
	isExpanded: boolean;
	isChecked: boolean;
	isSelected: boolean;
	isFocused: boolean;
	level: number;
	hasChildren: boolean;
}
export type ClickBehavior = 'select' | 'expand' | 'expand-and-focus';
export type CheckboxMode = 'independent' | 'cascade';
/**
 * Which paths the checkbox selection EMITS (via `checkedPaths` + `onCheckedChange`)
 * when `checkboxMode === 'cascade'`. Orthogonal to `checkboxMode` (which controls the
 * cascade BEHAVIOUR); this controls the projected OUTPUT. Ignored in `'independent'` mode
 * (there the emitted set is the raw toggled set).
 * - `'rolled-up'` (default): minimal cover — a fully-checked subtree collapses to its root;
 *   a partially-checked branch emits its individually-checked descendants.
 * - `'leaves'`: only the checked leaf nodes.
 * - `'all'`: every fully-checked node (branches + leaves).
 */
export type CascadeCheckPolicy = 'rolled-up' | 'leaves' | 'all';
export type SelectionMode = 'single' | 'multiple';
/** Gesture mode for selectNode(): replace = plain click, toggle = Ctrl+click, range = Shift+click. */
export type SelectMode = 'replace' | 'toggle' | 'range';
/** Options shared by every imperative selection/checked/focus mutator. */
/** Options of the expand / collapse methods (`expandNodes`, `collapseNodes`, `toggleNodeExpanded`,
 *  `expandAll`, `collapseAll`). */
export interface ExpandOptions {
	/** Expand only: collapse every expanded branch that isn't an ancestor of (or, for
	 *  `expandAll`, inside) the targets — focus the tree on them. Default `false`. */
	isExclusive?: boolean;
	/** Skip the tree-changed notification (no re-render) — batch several calls, then refresh. */
	silent?: boolean;
}

export interface TreeMutationOptions {
	/** Update state without firing onNodeClick / onSelectionChange / onCheckedChange
	 *  (e.g. when restoring state from URL params or other external sources). */
	silent?: boolean;
}
export type DropZoneLayout = 'around' | 'before' | 'after' | 'wave' | 'wave2';
export type DropOperation = 'move' | 'copy';

// Incremental update types
export type TreeChange<T> =
	| { operation: 'create'; parentPath: string; data: T; pathSegment?: string }
	| { operation: 'update'; path: string; data: Partial<T> }
	| { operation: 'delete'; path: string };

export interface ApplyChangesResult {
	successful: number;
	failed: Array<{ changeIndex: number; operation: string; path: string; error: string }>;
}

// ── Context Menu Types ──────────────────────────────────────────────────

// Field names follow @keenmate/web-components-core's ActionItem / MenuItem
// ({ text, onClick, cssClass, isDanger, isToggled, … }) so a menu definition reads the same
// in svelte-treeview and the web components.

export interface ContextMenuDivider {
	divider: true;
	text?: string; // named divider: ──── [text] ────
}

/** ctx of `getContextMenuItemsCallback` and of every item's `onClick`. */
export interface ContextMenuContext<T = any> {
	/** The node the menu opened on. */
	node: LTreeNode<T>;
	/** The click selection (selectedPaths) when the menu opened. */
	selectedNodes: LTreeNode<T>[];
	/** The checkbox set (checkedPaths) when the menu opened. */
	checkedNodes: LTreeNode<T>[];
	/** Close the menu (for items with `shouldCloseOnClick: false`). */
	closeMenu: () => void;
}

export interface ContextMenuItem<T = any> {
	id?: string;
	text: string;
	icon?: string;
	tooltip?: string;
	shortcut?: string;
	isDisabled?: boolean;
	isVisible?: boolean; // false = skip rendering (callback approach)
	/** Destructive styling (`stv__context-menu-item--danger`). */
	isDanger?: boolean;
	/** Toggle state — renders as `role="menuitemcheckbox"` + `aria-checked`. */
	isToggled?: boolean;
	cssClass?: string; // extra classes on the item
	onClick?: (ctx: ContextMenuContext<T>) => void | Promise<void>;
	/**
	 * Whether activating this item auto-closes the menu. Default `true` —
	 * selecting an entry dismisses the menu like every native/desktop menu.
	 * Set `false` for items that act incrementally (toggle a flag, run a
	 * multi-step action) and want the menu to stay open; the handler is then
	 * responsible for dismissing it via the `close` callback passed to
	 * getContextMenuItemsCallback (or the snippet's close prop).
	 */
	shouldCloseOnClick?: boolean;
	children?: ContextMenuEntry<T>[]; // nested submenus
}

export type ContextMenuEntry<T = any> = ContextMenuItem<T> | ContextMenuDivider;

export interface InsertArrayResult<T> {
	successful: number;
	failed: Array<{
		node: LTreeNode<T>;
		originalData: T;
		error: string;
	}>;
	total: number;
}

export interface InsertBranchResult<T> {
	success: boolean;
	count: number;
	failed: Array<{ data: T; error: string }>;
	parentNode: LTreeNode<T> | null;
}

export interface RemoveBranchResult<T> {
	success: boolean;
	removedCount: number;
	error?: string;
}

export interface Ltree<T> {
	// Properties (readonly getters)
	treePathSeparator: string;

	root: LTreeNode<T>;
	filteredRoot: LTreeNode<T>;

	changeTracker: Symbol | undefined;

	idMember: string | null | undefined;
	pathMember: string | null | undefined;
	parentPathMember: string | null | undefined;
	levelMember: string | null | undefined;

	hasChildrenMember: string | null | undefined;
	isExpandedMember: string | null | undefined;
	getIsExpandedCallback?: (ctx: NodeContext<T>) => boolean;

	displayValueMember?: string | null | undefined;
	getDisplayValueCallback?: (ctx: NodeContext<T>) => string;
	/** Text returned by getNodeDisplayValue when neither displayValueMember nor
	 *  getDisplayValueCallback resolves a value (default '[N/A]'). */
	displayValueFallback?: string;

	searchValueMember?: string | null | undefined;
	getSearchValueCallback?: (ctx: NodeContext<T>) => string;

	// For sibling ordering in drag-drop (before/after positioning)
	orderMember?: string | null | undefined;

	isSorted: boolean | null | undefined;
	sortCallback?: (ctx: SortContext<T>) => LTreeNode<T>[];

	// Filtering properties
	filteredTree: LTreeNode<T>[] | null;
	isFiltered: boolean;

	isSelectableMember: string | null | undefined;
	getIsSelectableCallback?: (ctx: NodeContext<T>) => boolean;
	isCheckedMember: string | null | undefined;
	getIsCheckedCallback?: (ctx: NodeContext<T>) => boolean;
	isDraggableMember: string | null | undefined;
	getIsDraggableCallback?: (ctx: NodeContext<T>) => boolean;
	isDropAllowedMember: string | null | undefined;
	getIsDropAllowedCallback?: (ctx: NodeContext<T>) => boolean;
	allowedDropPositionsMember: string | null | undefined;
	getAllowedDropPositionsCallback?: (ctx: NodeContext<T>) => DropPosition[] | null | undefined;
	isCollapsibleMember: string | null | undefined;
	getIsCollapsibleCallback?: (ctx: NodeContext<T>) => boolean;

	// Method to get allowed drop positions (uses callback or member)
	getNodeAllowedDropPositions(node: LTreeNode<T>): DropPosition[] | null | undefined;
	getNodeIsDraggable(node: LTreeNode<T>): boolean;
	getNodeIsDropAllowed(node: LTreeNode<T>): boolean;
	getNodeIsCollapsible(node: LTreeNode<T>): boolean;

	// Methods
	get tree(): LTreeNode<T>[];
	/** Flat array of all visible nodes in render order (depth-first, respects isExpanded) */
	get visibleFlatNodes(): LTreeNode<T>[];
	get statistics(): {
		nodeCount: number;
		maxLevel: number;
		filteredNodeCount: number;
		isIndexing: boolean;
		pendingIndexCount: number;
	};

	insertArray(data: T[]): InsertArrayResult<T>;

	insertTreeNode(parentPath: string, newNode: LTreeNode<T>, noEmitChanges?: boolean): string | null;

	filterNodes(_searchTerm: string, _searchOptions?: SearchOptions): void;

	searchNodes(
		_searchTerm: string | null | undefined,
		_searchOptions?: SearchOptions
	): LTreeNode<T>[];

	createFilteredTree(targetPaths: string[]): void;

	clearFilter(): void;

	expandAll(
		paths?: string | string[] | null | undefined,
		options?: ExpandOptions
	): void;
	collapseAll(
		paths?: string | string[] | null | undefined,
		options?: ExpandOptions
	): void;

	insert(path: string, data: T, noEmitChanges?: boolean): void;

	getNodeByPath(path: string, _root?: LTreeNode<T> | null | undefined): LTreeNode<T> | null;

	expandNodes(
		paths: string | string[],
		options?: ExpandOptions
	): Ltree<T>;

	collapseNodes(paths: string | string[], options?: ExpandOptions): Ltree<T>;

	getNodeDisplayValue(node: LTreeNode<T>): string;

	getNodeSearchValue(node: LTreeNode<T>): string;

	_defaultSort(self: Ltree<T>, items: LTreeNode<T>[]): LTreeNode<T>[];

	_emitTreeChanged(): void;

	refresh(): void;

	// Partial refresh methods for tree editor support
	getChildren(parentPath: string): LTreeNode<T>[];
	getSiblings(path: string): LTreeNode<T>[];
	refreshSiblings(parentPath: string): void;
	refreshNode(path: string): void;

	// Tree editor mutation methods
	moveNode(
		sourcePath: string,
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; error?: string };
	removeNode(
		path: string,
		includeDescendants?: boolean
	): { success: boolean; node?: LTreeNode<T>; error?: string };
	addNode(
		parentPath: string,
		data: T,
		pathSegment?: string
	): { success: boolean; node?: LTreeNode<T>; error?: string };
	updateNode(
		path: string,
		dataUpdates: Partial<T>
	): { success: boolean; node?: LTreeNode<T>; error?: string };
	applyChanges(changes: TreeChange<T>[]): ApplyChangesResult;

	// Bulk subtree operations (single emission)
	insertBranch(parentPath: string, data: T[]): InsertBranchResult<T>;
	replaceBranch(parentPath: string, data: T[]): InsertBranchResult<T>;
	removeBranch(path: string, keepParent?: boolean): RemoveBranchResult<T>;

	// Cross-tree copy method
	copyNodeWithDescendants(
		sourceNode: LTreeNode<T>,
		targetParentPath: string,
		transformData: (ctx: { data: T; node: LTreeNode<T> }) => T | null,
		siblingPath?: string,
		position?: 'before' | 'after'
	): { success: boolean; rootNode?: LTreeNode<T>; count: number; error?: string };

	// State persistence methods
	getExpandedPaths(): string[];
	setExpandedPaths(paths: string[]): void;
	getAllData(): T[];

	// Internal helpers
	_updateDescendantPaths(node: LTreeNode<T>, oldBasePath: string, newBasePath: string): void;
}
