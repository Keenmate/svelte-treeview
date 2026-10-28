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

/** ctx of `SortOptions.compareCallback`: two siblings. */
export interface SortCompareContext<T> {
	a: LTreeNode<T>;
	b: LTreeNode<T>;
}

/** Options of `sortNodes` / `sortAll`. */
export interface SortOptions<T = any> {
	/** Ascending comparator (negative = `a` first). Default: the tree's own rule — `sortCallback`
	 *  → `orderMember` → `Intl.Collator(numeric)` by display value. With `orderMember` set, a
	 *  custom compare rewrites the order values (10, 20, 30…) and fires `onNodesReorder`. */
	compareCallback?: (ctx: SortCompareContext<T>) => number;
	/** `'desc'` reverses whichever rule applies (with `orderMember`: values rewritten, like a
	 *  custom compare). Default `'asc'`. */
	direction?: 'asc' | 'desc';
	/** Suppress `onNodesReorder` only — the tree always re-renders. */
	isSilent?: boolean;
}

/** ctx of `onNodesReorder`: one parent whose children's `orderMember` values were rewritten. */
export interface NodesReorderContext<T> {
	/** The parent ('' = root). */
	parentPath: string;
	/** All its children, in the new order. */
	nodes: LTreeNode<T>[];
	/** Only the children whose order value changed. */
	changes: Array<{ path: string; oldOrder: number | undefined; newOrder: number }>;
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
 * - `wrap`: the label wraps onto multiple lines — the row grows taller.
 * - `ellipsis` (default): the label stays on one line and is clipped with an ellipsis (…) —
 *   fixed row heights (virtual scroll needs them).
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
	/** Suppress events / callbacks only — the tree ALWAYS re-renders. (svelte-treeview fires no
	 *  expand callbacks, so this is accepted for API parity with web-treeview.) */
	isSilent?: boolean;
}

export interface TreeMutationOptions {
	/** Update state without firing onNodeClick / onSelectionChange / onCheckedChange
	 *  (e.g. when restoring state from URL params or other external sources). */
	isSilent?: boolean;
}
export type DropZoneLayout = 'around' | 'before' | 'after' | 'wave' | 'wave2';
export type DropOperation = 'move' | 'copy';

// Incremental update types
export type TreeChange<T> =
	/** Add `data` as a child of `parentPath` ('' = root); sorted like any added node. */
	| { operation: 'add'; parentPath: string; data: T; pathSegment?: string }
	/** Insert `data` before / after `targetPath`, or as its child — positioned like `insertNode`. */
	| { operation: 'insert'; targetPath: string; position: InsertPosition; data: T }
	| { operation: 'update'; path: string; data: Partial<T> }
	| { operation: 'remove'; path: string };

/** Where `insertNode` / `insertBranch` place the new node(s) relative to the target. */
export type InsertPosition = 'before' | 'after' | 'child';

export interface ApplyChangesResult {
	successful: number;
	failed: Array<{ changeIndex: number; operation: string; path: string; error: string }>;
}

// ── Context Menu Types ──────────────────────────────────────────────────

// The context-menu model (TreeMenuContext / TreeMenuItem / TreeMenuEntry / TreeAction) lives in
// ../core/menu.ts: the same model as @keenmate/web-treeview (core /actions, vendored).

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
	/** The parent the branch went under (the root for ''); null when it wasn't found. */
	parentNode: LTreeNode<T> | null;
	/** Set when the whole call failed (e.g. the parent wasn't found). */
	error?: string;
}

/** Result of `replaceBranch`: the insert result plus `removed` descendants and `added` (= `count`). */
export interface ReplaceBranchResult<T> extends InsertBranchResult<T> {
	removed: number;
	added: number;
}

/** Result of `removeBranch`: `count` = nodes removed. Same as web-treeview. */
export interface RemoveBranchResult<T = any> {
	success: boolean;
	count: number;
	/** Set when nothing was removed (e.g. the path wasn't found). */
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
	/** `false` = never auto-sort: input order kept, added nodes appended, positioned inserts /
	 *  moves keep their exact position. Explicit `sortNodes` / `sortAll` / `refreshSiblings` still sort. */
	isSortingEnabled: boolean;
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
	_sortByLevel(items: LTreeNode<T>[]): LTreeNode<T>[];
	_sortSiblings(
		children: LTreeNode<T>[],
		options?: Pick<SortOptions<T>, 'compareCallback' | 'direction'>
	): LTreeNode<T>[];
	_sortChildrenOf(
		parent: LTreeNode<T>,
		options: SortOptions<T> | undefined,
		out: NodesReorderContext<T>[]
	): void;
	/** Sort the children of each node (one level; '' = root). Returns the orderMember rewrites. */
	sortNodes(paths: string | string[], options?: SortOptions<T>): NodesReorderContext<T>[];
	/** Sort whole subtrees (`null` / omitted = the whole tree). Returns the orderMember rewrites. */
	sortAll(paths?: string | string[] | null, options?: SortOptions<T>): NodesReorderContext<T>[];

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
	addBranch(parentPath: string, data: T[]): InsertBranchResult<T>;
	insertBranch(targetPath: string, data: T[], position: InsertPosition): InsertBranchResult<T>;
	insertNode(
		targetPath: string,
		data: T,
		position: InsertPosition
	): { success: boolean; node?: LTreeNode<T>; error?: string };
	replaceBranch(parentPath: string, data: T[]): ReplaceBranchResult<T>;
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
	/** @internal Flat array of every node's data — read the tree state via `nodes` instead. */
	_collectData(): T[];

	// Internal helpers
	_updateDescendantPaths(node: LTreeNode<T>, oldBasePath: string, newBasePath: string): void;
	_placeNextTo(nodes: LTreeNode<T>[], target: LTreeNode<T>, position: 'before' | 'after'): void;
}
