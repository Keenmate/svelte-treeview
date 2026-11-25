import type { Index, SearchOptions } from 'flexsearch';
import { type LTreeNode, VisualState } from '../ltree/ltree-node.svelte.js';
import { createLTree } from '../ltree/ltree.svelte.js';
import {
	type Ltree,
	type LTreeConfig,
	type InsertArrayResult,
	type InsertBranchResult,
	type RemoveBranchResult,
	type RemoveBranchOptions,
	type ReplaceBranchResult,
	type DropPosition,
	type DragDropMode,
	type DropOperation,
	type TreeChange,
	type ProcessChangesResult,
	type ToggleIconMode,
	type NodeTitleOverflow,
	type TooltipPlacement,
	type TooltipDelay,
	type ClickBehavior,
	type CheckboxMode,
	type CascadeCheckPolicy,
	type FilterScope,
	type IndexProgress,
	type SearchStatus,
	type SelectionMode,
	type SelectMode,
	type TreeMutationOptions,
	type ExpandOptions,
	type InsertPosition,
	type NodeContext,
	type SortContext,
	type SortOptions,
	type NodesSortContext,
	type NodeRenderContext,
	type RenderStats
} from '../ltree/types.js';
import { tick, untrack } from 'svelte';
import { uiLogger, dragLogger } from '../logger.js';
import { perfStart, perfEnd } from '../perf-logger.js';
import { createTreeLabels, LABELS_TAG, resolveLabel, type TranslateCallback, type TreeLabels, type TreeLabelsInput } from './labels.js';
import { observeLocale } from '../vendor/core/locale/page-locale.js';
import {
	type ClipboardEntry,
	type TreeClipboard,
	setClipboard,
	getClipboard,
	clearClipboard,
	hasClipboard,
	getClipboardOperation as getClipboardOp,
	registerClipboardTree,
	unregisterClipboardTree,
	getClipboardTree,
	setDragSet,
	getDragSet,
	clearDragSet
} from './clipboard.js';
import type { TreeNavigation, TreeNavigationOverrides } from './navigation.js';
import type { TreeMenuContext, TreeMenuEntry, TreeMenuItem, TreeAction, TreeActionEventDetail } from './menu.js';
import type { MenuItem, ResolvedActionItem } from '../vendor/actions/types.js';
import { runAction } from '../vendor/actions/resolve.js';
import { matchesShortcut, isTypingTarget } from '../vendor/actions/shortcut.js';
import { animateOut, readAnimationMs, type AnimateOutHandle } from '../vendor/core/dom/animate-out.js';
import { ICON_CSS, renderIcon, type IconRenderContext, type RenderIconCallback } from '../vendor/core/dom/render-icon.js';
import { adoptStyles } from '../vendor/core/dom/adopt-styles.js';
import { createPointerDrag, type PointerDrag } from '../vendor/core/dom/pointer-drag.js';
import { findScrollContainer } from '../vendor/core/dom/scroll-container.js';
import { announce } from '../vendor/core/dom/announce.js';
import { rowDomId } from '../helpers/string-helpers.js';

// Re-register global API (safe to import multiple times)
import {
	bumpRev,
	forEachDescendant,
	getAncestorPaths,
	getDescendantPaths,
	getParentPath,
	getPathChain,
	getTopLevelPaths,
	isSelfOrDescendant
} from '../helpers/ltree-helpers.js';
import '../global-api.js';
import { createTreeController, type TreeController } from './tree-controller.js';
export type { TreeController } from './tree-controller.js';
import {
	TREE_CHECKED_SEED_OPTIONS,
	TREE_EXPANSION_SEED_OPTIONS,
	TREE_INIT_ONLY_OPTIONS,
	TREE_LTREE_OPTIONS,
	TREE_OPTION_FIELDS,
	TREE_OPTION_KEYS,
	TREE_STATE_PROPS,
	resolveTreeOption,
	type TreeOptionKey
} from './tree-props.js';

// ─── Paste result type ────────────────────────────────────────────────────

/**
 * What a tree's `renderIconCallback` receives next to the icon name: core's icon-hook context
 * (`component: 'svelte-treeview'`, `element` = the tree container, `prefix: 'stv'`) + the node's
 * render state (`NodeRenderContext`) + `node` + `controller`. Same shape as web-treeview's.
 */
export type NodeIconRenderContext<T> = IconRenderContext &
	NodeRenderContext & { node: LTreeNode<T>; controller: TreeController<T> };

/**
 * A tree's icon hook (core renderIcon): map an icon name to markup, or `null` / `undefined` =
 * not mine (the page-wide `window.components.renderIconCallback`, then the icon-font / text
 * default decide). Never sees markup (`<…>`) or a core built-in name (`close`, `check`, …).
 */
export type TreeRenderIconCallback<T> = (
	name: string,
	ctx: NodeIconRenderContext<T>
) => string | null | undefined;

export interface PasteResult<T> {
	success: boolean;
	count: number;
	/** Entries skipped by the per-node transform (returned null) or the self-paste guard. */
	skipped: number;
	error?: string;
	/** Included when shouldAutoHandlePaste=false — clipboard data for consumer to handle */
	entries?: ClipboardEntry<T>[];
	operation?: 'copy' | 'cut';
	targetPath?: string;
	position?: 'child' | 'before' | 'after';
}

/**
 * A pointer to one node plus the relational context the tree already knows about it:
 * its live `parent` node and `siblings` (the children of that parent, which includes the
 * node itself). Shared shape across the clipboard callbacks (as `NodeTransformContext`'s
 * `source`/`target`) and the on* event contexts, so a consumer never has to re-resolve a
 * parent via `getNodeByPath(node.parentPath)`.
 *
 * `path` is always present. `node`/`parent`/`siblings` are live when the node is reachable
 * in this tree and null/[] when it isn't (cross-tree source, or a node removed by a cut).
 */
export interface NodeRef<T> {
	path: string;
	node: LTreeNode<T> | null;
	parent: LTreeNode<T> | null;
	/** Children of `parent` (includes `node` itself); top-level nodes when `parent` is null. */
	siblings: LTreeNode<T>[];
}

/**
 * Context passed per node to BOTH direction transforms — nodeOutputTransformationCallback
 * (egress: as a node LEAVES the source into a clipboard buffer or a drag) and
 * nodeInputTransformationCallback (ingress: as a duplicate LANDS in a destination). `phase`
 * says which direction is running; `target` is null during the 'output' phase (no destination
 * chosen yet) and populated during 'input'. `source` is the origin side — always carries the
 * path; node/parent/siblings are live when reachable (same-tree) and null/[] cross-tree or
 * once a cut source has been removed.
 *
 * These fire for BOTH clipboard and drag: 'output' on Ctrl+C/X + the capture side of a
 * copy-drop; 'input' on Ctrl+V paste + the insert side of a copy-drop. A plain MOVE fires
 * neither (nothing is duplicated).
 *
 * Symmetric by design: the same field means the same thing in both directions, so a naming/id
 * derivation reads identically whether you clean data on egress or derive it on ingress. Return
 * new data to derive ids/values/names; from the INPUT transform return null to skip a node
 * (skipping a root skips its whole subtree). Pure — reads the pristine snapshot, never mutates
 * it, so repeat inserts stay clean.
 */
/** ctx of `beforeCheckboxToggleCallback`. */
export interface BeforeCheckboxToggleContext<T> extends TreeCallbackContext<T> {
	node: LTreeNode<T>;
	/** The state the node is about to get (true = checking). */
	isChecked: boolean;
	/** Every path the toggle will change (the cascade included). */
	affectedPaths: string[];
}

/** ctx of the node transforms (`nodeOutputTransformationCallback` / `nodeInputTransformationCallback`
 *  and the `transform` argument of pasteNodes / duplicateNodes): the data to transform plus
 *  where it comes from / goes to. Return the (new) data; an input transform may return null to skip. */
export type NodeTransformCallbackContext<T> = NodeTransformContext<T> & TreeCallbackContext<T> & {
	/** The node data to transform (a snapshot — return a new object). */
	data: T;
};
/** A node transform taking one ctx. */
export type NodeTransformCallback<T> = (ctx: NodeTransformCallbackContext<T>) => T | null;

export interface NodeTransformContext<T> {
	operation: 'copy' | 'cut';
	/** Direction: 'output' as a node leaves the source (egress), 'input' as a duplicate lands
	 *  in the destination (ingress). */
	phase: 'output' | 'input';
	/** True for a top-level node, false for a descendant riding along inside it. */
	isRoot: boolean;
	/** Index of the root entry within this batch (descendants share their root's index). */
	rootIndex: number;
	/** How the roots land relative to `target.node` — null during the 'output' phase
	 * (no destination chosen yet). Mirrors the DropPosition vocabulary of onNodeDrop. */
	position: 'child' | 'before' | 'after' | null;
	/** The origin side. `path` is always present; node/parent/siblings are live when the
	 * source is reachable (same-tree) and null/[] cross-tree or after a cut removed it. */
	source: NodeRef<T>;
	/** The destination side, symmetric with `source` — null during the 'output' phase. `node`
	 * is the node you targeted (null when pasting at the tree root); `parent` is its parent;
	 * `siblings` are its neighbours (children of `parent`), LIVE and batch-aware (include
	 * nodes added earlier in THIS paste). The roots' actual landing neighbours depend on
	 * `position`: for 'before'/'after' they ARE `target.siblings`; for 'child' they are
	 * `target.node`'s children (top-level nodes = `target.siblings` when `node` is null).
	 *   const landing = position === 'child' && target.node
	 *     ? Object.values(target.node.children)
	 *     : (target?.siblings ?? []);
	 *   name = uniqueName(data.name, landing.map(s => s.data?.name)); */
	target: NodeRef<T> | null;
}

/**
 * Context for onNodeClick / onNodeDoubleClick. It IS a NodeRef: the clicked node plus its
 * live parent/siblings, so a click handler never has to reach back through the controller
 * for what the tree already resolved.
 */
export type NodeEventContext<T> = NodeRef<T> & TreeCallbackContext<T>;

/**
 * Context for onNodeDragStart / onNodeDragOver. A NodeRef (for dragStart the node that
 * started the drag; for dragOver the node currently hovered) plus the PointerEvent and
 * `dragged` — the FULL top-level set in flight. A drag is single-origin at the DOM level,
 * so the event fires once; `dragged` is the whole multi-selection (or just the one node for
 * a single drag) so a handler doesn't have to read `controller.selectedPaths` itself.
 */
export interface NodeDragContext<T> extends NodeRef<T>, TreeCallbackContext<T> {
	event: PointerEvent;
	/** The full top-level set being dragged (multi-selection; a single-item array otherwise). */
	dragged: NodeRef<T>[];
}

/**
 * Context for beforeDragStartCallback — the set-level pre-drag interceptor. Fires ONCE at
 * drag start (a drag is single-origin at the DOM level), BEFORE onNodeDragStart and before
 * anything is published cross-tree. `lead` is the node physically grabbed; `dragged` is the
 * tree's default top-level set (the isDraggable-filtered selection, or just `lead`).
 *
 * The callback returns the set the tree should ACTUALLY drag:
 *  - `string[]` — an authoritative REPLACEMENT list of top-level paths, in landing order. It
 *    may drop members of `dragged` AND add paths that weren't in it (even paths a
 *    getIsDraggableCallback would reject — forcing them in is the point). The tree normalizes
 *    the result (dedupe + drop any path that is a descendant of another path in the set) so an
 *    injected parent+child can't move the same node twice.
 *  - `false` — cancel the drag entirely.
 *  - `void`/`undefined` — keep the default `dragged` set.
 *
 * Synchronous only: it runs inside the native `dragstart`, so a returned Promise cannot veto
 * (the browser has already committed the drag by the next tick).
 */
export interface DragStartContext<T> extends TreeCallbackContext<T> {
	/** The node physically grabbed (the drag's lead / anchor). */
	lead: NodeRef<T>;
	/** The tree's default top-level dragged set before the callback (isDraggable-filtered). */
	dragged: NodeRef<T>[];
	/** The originating event — the pointer drag (mouse / pen / touch) is all PointerEvents. */
	event: PointerEvent;
}

/**
 * Context for beforeDropCallback — the drop interceptor. Symmetric with NodeDropContext:
 * `target` is the drop node (null on an empty-tree / tree-zone / root drop), `dragged` the FULL
 * top-level dragged set (the lead is `dragged[0]`-ish; use it to reason about the whole set),
 * `position`/`operation` the resolved drop intent, `event` the DOM event. Async-capable.
 */
export interface BeforeDropContext<T> extends TreeCallbackContext<T> {
	target: NodeRef<T> | null;
	dragged: NodeRef<T>[];
	position: DropPosition;
	operation: DropOperation;
	event: PointerEvent;
}

/**
 * One placement instruction returned by beforeDropCallback for content-addressed / "sort the
 * basket" routing: place every node in `paths` at `targetPath` with `position` (default
 * 'child'). Return an ARRAY of these to fan a single drop out to several destinations (e.g.
 * fruits → one node, vegetables → another). The library auto-executes groups for SAME-TREE
 * nodes (it moves them); cross-tree nodes can't be auto-moved (they don't live in this tree),
 * so for a cross-tree drop the consumer places them in the onNodeDrop event instead. Within a
 * group the first path lands at `targetPath`/`position` and the rest chain 'after' it, so group
 * order is preserved. A path omitted from every group is simply not placed (per-item reject).
 */
export interface DropGroup {
	targetPath: string;
	position?: DropPosition;
	paths: string[];
}

/**
 * Context for onNodeDrop, symmetric with NodeTransformContext: `source` is the dragged node
 * (with its parent/siblings), `target` is the drop node (null when dropped into empty space
 * or the tree root), `position`/`operation` describe how it landed, `event` is the original
 * DOM event.
 *
 * `dragged` is the full top-level dragged set (`source` is its lead node); a drop fires once
 * even for a multi-drag, so this is how you see the whole set. `dropped` is the resulting
 * placed nodes AFTER an auto-handled op (move: the moved nodes at their new home; copy: the
 * fresh copies) — it is null when the library did NOT place them (a cross-tree drop, or
 * shouldAutoHandleMove/Copy=false), because then the consumer owns insertion.
 */
export interface NodeDropContext<T> extends TreeCallbackContext<T> {
	source: NodeRef<T>;
	target: NodeRef<T> | null;
	/** The full top-level dragged set (includes `source`). */
	dragged: NodeRef<T>[];
	/** The placed nodes after an auto-handled move/copy; null when the library didn't place them. */
	dropped: NodeRef<T>[] | null;
	position: DropPosition;
	operation: DropOperation;
	event: PointerEvent;
}

/** ctx of `onNodeCopy` — fires after a copy; `nodes` are the live nodes of `paths`. */
export interface NodeCopyContext<T> extends TreeCallbackContext<T> {
	operation: 'copy';
	paths: string[];
	nodes: LTreeNode<T>[];
}

/** ctx of `onNodeCut` — fires after a cut; `nodes` are still live (a cut only dims until the paste). */
export interface NodeCutContext<T> extends TreeCallbackContext<T> {
	operation: 'cut';
	paths: string[];
	nodes: LTreeNode<T>[];
}

/** ctx of `onNodeDelete` — fires after the Delete command; `nodes` are PRE-REMOVAL snapshots
 *  (the tree no longer holds them by the time the event fires). */
export interface NodeDeleteContext<T> extends TreeCallbackContext<T> {
	paths: string[];
	nodes: LTreeNode<T>[];
}

/** ctx of `beforeKeydownCallback` — return `false` to suppress the built-in handling. Synchronous. */
export interface KeydownContext<T> {
	event: KeyboardEvent;
	focusedNode: LTreeNode<T> | null;
	selectedNodes: LTreeNode<T>[];
	controller: TreeController<T>;
}

/** ctx of `onSelectionChange` — the new click selection (`selectedPaths`) and its live nodes. */
export interface SelectionChangeContext<T> extends TreeCallbackContext<T> {
	paths: Set<string>;
	nodes: LTreeNode<T>[];
}

/** ctx of `onCheckedChange` — the new checked set as emitted (`checkedPaths`, projected through
 *  `cascadeCheckPolicy`) and its live nodes. */
export interface CheckedChangeContext<T> extends TreeCallbackContext<T> {
	paths: Set<string>;
	nodes: LTreeNode<T>[];
}

/** Options of `scrollToPath` (same as web-treeview). */
export interface ScrollToPathOptions {
	/** Expand the node's collapsed ancestors first so its row exists. Default `true`. */
	shouldExpandAncestors?: boolean;
	/** Flash `scrollHighlightClass` (for `scrollHighlightTimeout`) on the row. Default `false`. */
	shouldHighlight?: boolean;
	/** Native ScrollIntoViewOptions. Defaults `--stv-scroll-behavior` (smooth; auto under reduced motion) / `'center'` / `'nearest'`. */
	behavior?: ScrollBehavior;
	block?: ScrollLogicalPosition;
	inline?: ScrollLogicalPosition;
}

/** The `controller` every callback / event context carries (web-treeview parity: its
 *  details carry `controller` + `element`; svelte has no element). */
export interface TreeCallbackContext<T> {
	controller: TreeController<T>;
}

/** ctx of `onFocusChange` — the new focused node (null = focus cleared). */
export interface FocusChangeContext<T> extends TreeCallbackContext<T> {
	focusedNode: LTreeNode<T> | null;
}

/** ctx of `onNodesChange` — just the controller (read the new state from it). */
export type NodesChangeContext<T> = TreeCallbackContext<T>;

/** ctx of `onExpandedChange` — the whole new expanded set (same as `expandedPaths`). */
export interface ExpandedChangeContext<T> extends TreeCallbackContext<T> {
	paths: Set<string>;
}

/**
 * ctx of `beforeExpandCallback` — the node about to expand (`node`, `path`, `parent`,
 * `siblings`) + `controller`. Return `false` (or resolve `false`) to keep it collapsed;
 * return a Promise to load children first (e.g. `ctx.controller.addBranch(...)`) — the
 * node shows its loading state until it settles.
 */
export type BeforeExpandContext<T> = NodeRef<T> & TreeCallbackContext<T>;

/**
 * ctx of `beforeCopyCallback` — batch policy, runs before the snapshot is taken. Return a new
 * path list to rewrite the set, false to block, or nothing to proceed.
 */
export interface BeforeCopyContext<T> extends TreeCallbackContext<T> {
	operation: 'copy';
	/** The paths about to be copied (the selection, or the explicit paths arg). */
	paths: string[];
	/** The resolved live nodes for those paths (missing paths are dropped). */
	nodes: LTreeNode<T>[];
}

/** ctx of `beforeCutCallback` — same as `BeforeCopyContext`, for a cut. */
export interface BeforeCutContext<T> extends TreeCallbackContext<T> {
	operation: 'cut';
	/** The paths about to be cut (the selection, or the explicit paths arg). */
	paths: string[];
	/** The resolved live nodes for those paths (missing paths are dropped). */
	nodes: LTreeNode<T>[];
}

/**
 * Context for beforeDeleteCallback — batch policy before the built-in Delete removes nodes.
 * Return a narrowed path list to delete only those, false to block entirely, or nothing to
 * proceed. Same paths/nodes shape as BeforeCopyContext (delete has no copy/cut operation).
 */
export interface BeforeDeleteContext<T> extends TreeCallbackContext<T> {
	/** The top-level paths about to be deleted. */
	paths: string[];
	/** The resolved live nodes for those paths. */
	nodes: LTreeNode<T>[];
}

/**
 * Context for beforePasteCallback — batch policy run once before the insert loop.
 * Return { targetPath?, position? } to redirect, false to block, or nothing to proceed.
 */
export interface BeforePasteContext<T> extends TreeCallbackContext<T> {
	operation: 'copy' | 'cut';
	/** The destination side (proposed, pre-insert): `path` ('' = root, after the leaf-aware
	 * position redirect) and the node at that path (null at root). The hook may still
	 * redirect via its return value. */
	target: {
		path: string;
		node: LTreeNode<T> | null;
	};
	/** Immutable clipboard snapshots ({ sourceTreeId, sourcePath, data, descendants }) —
	 * NOT live tree nodes (sources may be cross-tree, or removed on a cut). */
	entries: readonly ClipboardEntry<T>[];
}

// ─── Shared interfaces (also used by Node.svelte) ────────────────────────

export interface SelectionModifiers {
	isCtrlPressed: boolean;
	isShiftPressed: boolean;
}

export interface NodeCallbacks<T> {
	/** A click on a row's content — {@link TreeEngine.handleNodeClick} (checkbox / clickBehavior routing). */
	handleNodeContentClick: (node: LTreeNode<T>, event?: MouseEvent) => void;
	handleNodeSelectClick: (node: LTreeNode<T>, modifiers?: SelectionModifiers) => void;
	handleCheckboxToggle: (node: LTreeNode<T>, options?: { skipFocus?: boolean }) => void;
	handleNodeContextMenu: (node: LTreeNode<T>, event: MouseEvent) => void;
	/** Unified pointer-driven drag entry (mouse/pen/touch). Replaces the native
	 *  draggable/dragstart + touchstart handlers on the node row. */
	/** The toggle glyph / click-to-expand: goes through `toggleNodeExpanded` (accordion,
	 *  `beforeExpandCallback`, expand events). */
	handleToggleClick: (node: LTreeNode<T>) => void;
}

export interface NodeConfig {
	clickBehavior: ClickBehavior;
	isCheckboxesShown: boolean;
	checkboxMode: CheckboxMode;
	shouldClickToggleCheckbox: boolean;
	leafIconClass: string;
	toggleIconMode: ToggleIconMode;
	nodeTitleOverflow: NodeTitleOverflow;
	/** Indent per level in flat rendering (CSS length). */
	flatIndentSize: string;
	// Hover/focus tooltip per node. The `tooltip` SNIPPET (rich content) travels via
	// the 'NodeTooltip' context, not here; these are the plain-config knobs. A string
	// from getNodeTooltipCallback is the fallback when no snippet is given.
	isNodeTooltipsShown: boolean;
	getNodeTooltipCallback: ((ctx: NodeContext<any>) => string | null | undefined) | undefined;
	tooltipPlacement: TooltipPlacement;
	tooltipDelay: TooltipDelay;
	tooltipOffset: number;
	shouldTooltipFollowCursor: boolean;
	// Per-node icon rendered as a dedicated .stv__node-icon element on ALL nodes (branch
	// + leaf), independent of nodeTemplate. VALUE from iconMember/getIconCallback; rendered by
	// core renderIcon (renderIconHtml: markup → built-in name → renderIconCallback → the
	// page-wide hook → icon-font `<i class="stv__icon …">` → text), overridable via the
	// `icon` snippet (travels on the 'NodeIcon' context). COLOR from iconColorMember/
	// getIconColorCallback (falls back to --stv-node-icon-color). shouldAlignNodeIcons
	// reserves the column so labels align even on rows with no icon.
	iconMember: string | null | undefined;
	getIconCallback: ((ctx: NodeContext<any>) => string | null | undefined) | undefined;
	renderIconHtml: (value: string, node: LTreeNode<any>, ctx: NodeRenderContext) => string;
	iconColorMember: string | null | undefined;
	getIconColorCallback: ((ctx: NodeContext<any>) => string | null | undefined) | undefined;
	shouldAlignNodeIcons: boolean;
	selectedNodeClass: string | null | undefined;
	focusedNodeClass: string | null | undefined;
	checkedNodeClass: string | null | undefined;
	dragOverNodeClass: string | null | undefined;
	draggedNodeClass: string | null | undefined;
	// Every traveling path in the active drag. Each Node tests its own membership so the
	// dragged visual dims the whole set in BOTH recursive and flat rendering (recursive
	// nodes can't inherit a single top-level flag, else nested files never dim).
	draggedPaths: Set<string>;
	/** Rows the last expand revealed (capped at maxAnimatedRowCount) — they render
	 *  `stv__node--opening`. Reassigned wholesale like draggedPaths. */
	revealedPaths: Set<string>;
	/** Rows a collapse is animating out (core animateOut) — they render
	 *  `stv__node--closing` + `inert`, so a _rev re-key mid-collapse keeps the state. */
	closingPaths: Set<string>;
	/** Nodes whose async `beforeExpandCallback` is in flight (the loading state). */
	expandPendingPaths: Set<string>;
	/** `[aria-posinset, aria-setsize]` per visible path (ARIA tree; built over every visible
	 *  node, not just the rendered virtual window). */
	ariaPositions: Map<string, [number, number]>;
	// Data-driven per-row class hooks. Applied to .stv__node (getNodeClassCallback) and
	// .stv__node-content (getNodeContentClassCallback). Typed LTreeNode<any> here because
	// NodeConfig is non-generic plumbing; the public Tree props are LTreeNode<T>.
	getNodeClassCallback: ((ctx: NodeContext<any>) => string | null | undefined) | undefined;
	getNodeContentClassCallback: ((ctx: NodeContext<any>) => string | null | undefined) | undefined;
	dropZoneMode: 'floating' | 'glow';
	dropZoneLayout: 'around' | 'before' | 'after' | 'wave' | 'wave2';
	dropZoneStart: number | string;
	dropZoneMaxWidth: number;
	isCopyAllowed: boolean;
	shouldExpandAsAccordion: boolean;
	showFullLabel: string;
}

// ─── Controller props ─────────────────────────────────────────────────────

export interface TreeEngineProps<T> {
	// MAPPINGS
	idMember: string;
	pathMember: string;
	parentPathMember?: string | null | undefined;
	levelMember?: string | null | undefined;
	isExpandedMember?: string | null | undefined;
	getIsExpandedCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => boolean;
	isSelectableMember?: string | null | undefined;
	getIsSelectableCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => boolean;
	isCheckedMember?: string | null | undefined;
	getIsCheckedCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => boolean;
	isDraggableMember?: string | null | undefined;
	getIsDraggableCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => boolean;
	isDropAllowedMember?: string | null | undefined;
	getIsDropAllowedCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => boolean;
	allowedDropPositionsMember?: string | null | undefined;
	getAllowedDropPositionsCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => DropPosition[] | null | undefined;
	isCollapsibleMember?: string | null | undefined;
	getIsCollapsibleCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => boolean;
	hasChildrenMember?: string | null | undefined;
	isSorted?: boolean | null | undefined;
	/** `false` = never auto-sort: input order kept, `addNode` appends, `insertNode` /
	 *  `insertBranch` / `moveNode` / drop keep the exact position (with `orderMember` the order
	 *  values are still computed between the neighbours). `sortNodes` / `sortAll` still sort.
	 *  Default `true`. */
	isSortingEnabled?: boolean;

	displayValueMember?: string | null | undefined;
	getDisplayValueCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string;
	/** UI strings — a partial object of flat `<elementType>.<name>` keys (short `messages.noData`
	 *  or full `svelte-treeview.messages.noData`), resolved per key by core `/locale`: this
	 *  `labels` → `translateCallback` → the page-wide `window.components.locale.translateCallback`
	 *  → the page-wide flat dictionary `window.components.locale.labels['svelte-treeview.<key>']`
	 *  → English (`''` = render nothing): `messages.noData` ("No data" — no nodes),
	 *  `messages.noResults` ("No results found" — the search filter left nothing),
	 *  `messages.dropHere` ("Drop here" — default drop placeholder), `labels.noDisplayValue`
	 *  ("[N/A]" — node without a display value; also the touch-drag ghost), `labels.dropBefore` /
	 *  `labels.dropAfter` / `labels.dropChild` ("Before" / "After" / "Child" — the floating drop
	 *  pads), `ariaLabels.loading` ("Loading…" — `isLoading` overlay aria-label),
	 *  `ariaLabels.showFullLabel` ("Show full label" — `nodeTitleOverflow: 'info'` button),
	 *  `menuItems.copy` … `menuItems.sortAll` (built-in context-menu items), `ariaLabels.tree`
	 *  ("Tree" — aria-label of the `role="tree"` container); screen-reader announcements (core
	 *  `announce()`, `''` silences one): `ariaLabels.searchResults` ("Results: {count}"),
	 *  `ariaLabels.searchNoResults`, `ariaLabels.movedInto|Before|After` /
	 *  `ariaLabels.copiedInto|Before|After` ("{name} moved into {target}" — a drop the tree placed),
	 *  `ariaLabels.dropItems` ("Items ({count})"), `ariaLabels.dropTreeRoot` ("the tree"),
	 *  `ariaLabels.dropDenied` ("Cannot drop here: {target} does not accept dropped items"). `{name}` placeholders.
	 *  The `noData` / `dropPlaceholder` snippets still replace the markup. */
	labels?: TreeLabelsInput;
	/** This tree's own translation seam (i18next / ICU / the app's lookup): gets
	 *  `{ component, key (full), template, params, locale }` for every key `labels` did NOT set and
	 *  returns the finished text, or `null` / `undefined` = not mine → the page-wide
	 *  `window.components.locale.translateCallback` → the page dictionary → English. */
	translateCallback?: TranslateCallback | null;

	searchValueMember?: string | null | undefined;
	getSearchValueCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string;

	orderMember?: string | null | undefined;

	treeId?: string | null | undefined;
	treePathSeparator?: string | null | undefined;
	sortCallback?: (ctx: SortContext<T> & TreeCallbackContext<T>) => LTreeNode<T>[];

	// DATA
	/** The tree's nodes (flat `T[]` with ltree paths). Input AND current state: after a
	 *  mutation (move / add / remove / paste / processChanges…) `bind:nodes` receives the
	 *  tree's current data. */
	nodes: T[];
	focusedNode?: LTreeNode<T> | null | undefined;
	selectedPaths?: Set<string>;
	checkedPaths?: Set<string>;
	/** Paths of the expanded nodes (bindable). Assigning replaces the expanded state
	 *  (silently — no onExpandedChange); given before the data, it applies after the
	 *  first non-empty load (overriding expandLevel / isExpandedMember). */
	expandedPaths?: Set<string>;

	// BEHAVIOUR
	expandLevel?: number | null | undefined;
	clickBehavior?: ClickBehavior | null | undefined;
	/**
	 * `'single'` (default): Ctrl/Shift+click act as plain click, Shift+Arrow is no-op.
	 * `'multiple'`: Ctrl-toggle, Shift-range, Shift+Arrow extends, Space toggles the focused
	 * node in the selection. Enter = expand / collapse in both (WAI-ARIA).
	 */
	selectionMode?: SelectionMode | null | undefined;
	isCheckboxesShown?: boolean | null | undefined;
	checkboxMode?: CheckboxMode | null | undefined;
	/**
	 * Which paths `checkedPaths` / `onCheckedChange` EMIT in cascade mode:
	 * `'rolled-up'` (default) collapses a fully-checked subtree to its root,
	 * `'leaves'` emits only checked leaves, `'all'` emits every fully-checked node.
	 * Orthogonal to `checkboxMode`; ignored in `'independent'` mode.
	 */
	cascadeCheckPolicy?: CascadeCheckPolicy | null | undefined;
	/**
	 * When true AND `isCheckboxesShown` is on, a plain click on a selectable node's label
	 * toggles the checkbox instead of running the normal click flow — `focusedNode` and
	 * `selectedPaths` are NOT updated. Expand-on-click still happens if `clickBehavior`
	 * is `'expand'` or `'expand-and-focus'`. Modified clicks (Ctrl/Shift) fall through to
	 * the normal multi-selection path.
	 */
	shouldClickToggleCheckbox?: boolean | null | undefined;
	/**
	 * Interceptor called before a checkbox toggle is applied. ctx = { node, isChecked (the
	 * state the node is about to get), affectedPaths (every path the toggle changes, the
	 * cascade included) }. Return `false` to cancel, a `string[]` to override the affected
	 * paths, nothing to proceed.
	 */
	beforeCheckboxToggleCallback?: (ctx: BeforeCheckboxToggleContext<T>) => string[] | false | void;
	/**
	 * How shift+click range selection works:
	 * - 'visual': selects all visible (expanded) nodes between the two clicks in display order (default)
	 * - 'logical': selects all nodes between the two clicks in tree order, including collapsed/hidden nodes
	 */
	rangeSelectionMode?: 'visual' | 'logical';
	initializeIndexCallback?: () => Index;
	searchTerm?: string | null | undefined;
	/** Which descendants of a filter match stay visible. See {@link FilterScope}. */
	filterScope?: FilterScope | null | undefined;
	/** The `x` for the depth-limited filterScopes (default 1). */
	filterDescendantDepth?: number | null | undefined;
	/** Expand the descendants a filterScope adds (default true). */
	shouldExpandFilterDescendants?: boolean | null | undefined;
	/** Max matches a search/filter returns (default 1000). FlexSearch's own silent
	 *  default was 100; check `isLimited` in onSearchStatusChange to surface truncation. */
	maxSearchResultCount?: number | null | undefined;
	isInternalSearchIndexEnabled?: boolean | null | undefined;
	indexerBatchSize?: number | null | undefined;
	indexerTimeout?: number | null | undefined;
	isLoading?: boolean;

	// Progressive rendering
	isProgressiveRenderEnabled?: boolean;
	initialBatchSize?: number;
	maxBatchSize?: number;
	// Row animation (opt-in; docs/PLAN-row-animation.md)
	/** Rows an expand reveals animate in (part of `motion` — `motion="none"`, reduced motion or
	 *  `--stv-row-animation-duration: 0s` make it instant). At most this many rows animate per
	 *  expand; the rest appear at once. Default 50; 0 = none. */
	maxAnimatedRowCount?: number;
	onRenderStart?: (ctx: TreeCallbackContext<T>) => void;
	onRenderProgress?: (stats: RenderStats & TreeCallbackContext<T>) => void;
	onRenderComplete?: (stats: RenderStats & TreeCallbackContext<T>) => void;
	/** Search-index fill progress: fires per idle batch and once with `isComplete: true`.
	 *  Search/filter results are partial until then. */
	onIndexProgress?: (ctx: IndexProgress & TreeCallbackContext<T>) => void;
	/** Fires whenever a filter is applied/cleared (incl. the automatic re-filter when
	 *  indexing completes): `{ searchTerm, matchCount, isLimited, limit, isIndexing }`.
	 *  Use it to tell users the result is truncated or still incomplete. */
	onSearchStatusChange?: (ctx: SearchStatus & TreeCallbackContext<T>) => void;

	// Virtual scrolling (flat mode only)
	/** Enable virtual scrolling in flat mode. Only visible nodes + overscan are rendered. */
	isVirtualScrollEnabled?: boolean;
	/** Explicit row height in px. Auto-measured from first row if not set. */
	virtualScrollItemHeight?: number;
	/** Extra rows above/below viewport (default: 5) */
	virtualScrollOverscan?: number;
	/** CSS height for scroll container. Auto-detected from parent if not set, fallback 400px. */
	virtualScrollContainerHeight?: string;

	// DRAG AND DROP
	dragDropMode?: DragDropMode;
	/** 'floating' = original floating zones, 'glow' = border glow indicators */
	dropZoneMode?: 'floating' | 'glow';
	dropZoneLayout?: 'around' | 'before' | 'after' | 'wave' | 'wave2';
	/** number = percentage (0-100), string = any CSS value ("33%", "50px", "3rem") */
	dropZoneStart?: number | string;
	/** max width in pixels for wave layouts */
	dropZoneMaxWidth?: number;
	/** Enable Ctrl+drag to copy instead of move (default: false) */
	isCopyAllowed?: boolean;
	/** Auto-handle same-tree copy operations (default: true). Set to false for external DB/API handling. */
	shouldAutoHandleCopy?: boolean;
	/** Auto-handle same-tree move operations (default: true). Set to false for database-first workflow. */
	shouldAutoHandleMove?: boolean;
	/** Auto-handle paste operations (default: true). Set to false for database-first workflow. */
	shouldAutoHandlePaste?: boolean;
	/** Expanding a node auto-collapses its siblings (default: false) */
	shouldExpandAsAccordion?: boolean;
	/**
	 * Render a single drop zone covering the WHOLE populated tree (default false). While a drag
	 * is in progress an overlay accepts a drop anywhere over the tree — the drop lands with
	 * `target = null` regardless of per-node `getIsDropAllowedCallback`, so you route each item
	 * from `beforeDropCallback` (return a `DropGroup[]`) instead of by where it was dropped. Use
	 * for "drop a basket, auto-sort into category nodes" flows.
	 */
	isTreeDropZoneEnabled?: boolean;

	// EVENTS (on* = fire-and-forget notifications). Each carries a context object mirroring
	// the clipboard callbacks: single-node events get a NodeRef (node + live parent/siblings);
	// onNodeDrop gets symmetric source/target NodeRefs; the set events carry paths + nodes.
	onNodeClick?: (ctx: NodeEventContext<T>) => void;
	onNodeDoubleClick?: (ctx: NodeEventContext<T>) => void;
	onNodeDragStart?: (ctx: NodeDragContext<T>) => void;
	onNodeDragOver?: (ctx: NodeDragContext<T>) => void;
	onNodeDrop?: (ctx: NodeDropContext<T>) => void;
	/** Fired when a long-press (touch) engages on a NON-draggable node — the user tried to
	 *  move something locked. Fire-and-forget; carries the locked node's NodeRef. The source-side
	 *  twin of a drop rejection; use it for a toast/snackbar/custom haptic. */
	onNodeDragReject?: (ctx: NodeEventContext<T>) => void;
	/** Fired when a drop is REJECTED because the target node refuses it (`isDropAllowed` false /
	 *  getIsDropAllowedCallback). The target-side twin of onNodeDragReject; carries the refusing
	 *  node's NodeRef. Not fired when a tree-drop-zone catches the forwarded drop instead. */
	onNodeDropReject?: (ctx: NodeEventContext<T>) => void;
	onSelectionChange?: (ctx: SelectionChangeContext<T>) => void;
	onCheckedChange?: (ctx: CheckedChangeContext<T>) => void;
	/** A node expanded (toggle, keyboard, `expandNodes`, after any `beforeExpandCallback`
	 *  load; NOT `expandAll` / expand-level seeding). Skipped with `isSilent`. */
	onNodeExpand?: (ctx: NodeEventContext<T>) => void;
	/** A node collapsed (toggle, keyboard, `collapseNodes`, an accordion sibling; NOT
	 *  `collapseAll`). Skipped with `isSilent`. */
	onNodeCollapse?: (ctx: NodeEventContext<T>) => void;
	/** The expanded set changed (any cause: toggle, keyboard, expand/collapse methods,
	 *  expandAll / collapseAll, accordion, data changes) — `paths` = the whole new set.
	 *  Not fired for `isSilent` operations nor for assigning `expandedPaths`. */
	onExpandedChange?: (ctx: ExpandedChangeContext<T>) => void;
	/** Runs before a node expands (toggle, keyboard, `expandNodes` — not `expandAll` /
	 *  seeding / accordion): `false` keeps it collapsed; a Promise defers the expand and
	 *  shows the node's loading state (lazy loading: `addBranch` the children, then
	 *  resolve). A throw / rejection keeps it collapsed and is logged. */
	beforeExpandCallback?: (ctx: BeforeExpandContext<T>) => boolean | void | Promise<boolean | void>;
	/** The focused node changed (click, keyboard, `focusNode` / `clearFocus`, a removed focused
	 *  node). Not fired for `{ isSilent: true }` nor for assigning `focusedNode`. */
	onFocusChange?: (ctx: FocusChangeContext<T>) => void;
	/** The tree's data / structure changed through a mutation (add / insert / move / remove /
	 *  update / processChanges / paste / drop / sort) — once per batch, after `nodes` was
	 *  re-collected (microtask). Not fired for loading new `nodes`. */
	onNodesChange?: (ctx: NodesChangeContext<T>) => void;
	/** `sortNodes` / `sortAll` rewrote the `orderMember` values of one parent's children (custom
	 *  `compareCallback` or `direction: 'desc'` with `orderMember` set) — persist `changes`.
	 *  Once per affected parent; skipped with `isSilent`. */
	onNodesSort?: (ctx: NodesSortContext<T> & TreeCallbackContext<T>) => void;
	// Post-operation clipboard notifications (fired AFTER the op succeeds). Symmetric
	// with the before*Callback interceptors: onNodeCopy/onNodeCut/onNodeDelete carry the final paths
	// plus resolved nodes (pre-removal snapshots for cut/delete); onNodePaste the PasteResult.
	onNodeCopy?: (ctx: NodeCopyContext<T>) => void;
	onNodeCut?: (ctx: NodeCutContext<T>) => void;
	onNodePaste?: (result: PasteResult<T> & TreeCallbackContext<T>) => void;
	/** Fired after `deleteNodes` removes nodes (built-in Delete key or the public method),
	 *  with the top-level paths that were actually removed plus their pre-removal nodes. */
	onNodeDelete?: (ctx: NodeDeleteContext<T>) => void;

	/**
	 * Built-in keyboard shortcuts (default true; false = opt out): Ctrl/Cmd+C/X/V (copy/cut/paste),
	 * Delete (remove selection), Escape (cancel a pending cut), plus the classic CUA aliases
	 * Ctrl+Insert (copy) / Shift+Insert (paste) / Shift+Delete (cut). They only fire while focus is
	 * in the tree; a consumer `beforeKeydownCallback` still runs first and can override or
	 * suppress any of these. Paste targets the focused node (root when none) and uses
	 * `nodeInputTransformationCallback` for id/name derivation.
	 */
	isKeyboardShortcutsEnabled?: boolean;

	// INTERCEPTORS (before*Callback = can modify/block)
	/** Runs before the built-in Delete removes anything. Return a narrowed path[] to
	 *  restrict what's removed, or `false` to block entirely. `nodes` are the resolved
	 *  top-level nodes about to be removed (descendants ride along). */
	beforeDeleteCallback?: (ctx: BeforeDeleteContext<T>) => string[] | false | void;
	/**
	 * Drop interceptor. Fires just before placement with a BeforeDropContext (symmetric with
	 * NodeDropContext: `target`, full `dragged` set, `position`, `operation`, `event`). Return:
	 *  - `false` — block the whole drop;
	 *  - `{ position?, operation? }` — redirect where/how the single drop lands;
	 *  - `DropGroup[]` — content-addressed routing: fan the drop out to several destinations
	 *    (each group = `{ targetPath, position?, paths }`); the library auto-executes groups for
	 *    same-tree nodes, cross-tree nodes are left for the consumer's onNodeDrop;
	 *  - `void` — proceed normally. Async-capable (await a confirm dialog, etc.).
	 */
	beforeDropCallback?: (
		ctx: BeforeDropContext<T>
	) =>
		| boolean
		| { position?: DropPosition; operation?: DropOperation }
		| DropGroup[]
		| void
		| Promise<
				boolean | { position?: DropPosition; operation?: DropOperation } | DropGroup[] | void
		  >;
	/**
	 * Set-level pre-drag interceptor. Runs once at drag start, before onNodeDragStart. Return
	 * an authoritative `string[]` of top-level paths to REPLACE the dragged set (prune members
	 * and/or force-add nodes that can't be omitted), `false` to cancel the drag, or `void` to
	 * keep the default. Synchronous (native dragstart — a Promise cannot veto). See
	 * DragStartContext for the full contract.
	 */
	beforeDragStartCallback?: (ctx: DragStartContext<T>) => string[] | false | void;
	beforeCopyCallback?: (ctx: BeforeCopyContext<T>) => string[] | false | void;
	beforeCutCallback?: (ctx: BeforeCutContext<T>) => string[] | false | void;
	beforePasteCallback?: (
		ctx: BeforePasteContext<T>
	) => { targetPath?: string; position?: 'child' | 'before' | 'after' } | false | void;
	/** OUTPUT transform (egress) — per node as it LEAVES the source: Ctrl+C/X onto the
	 *  clipboard, or the capture side of a copy-drop. Use to strip transient/sensitive fields
	 *  before the data travels. Fires for copy, never for a move. */
	nodeOutputTransformationCallback?: (ctx: NodeTransformCallbackContext<T>) => T;
	/** INPUT transform (ingress) — per node as a DUPLICATE LANDS in a destination: Ctrl+V
	 *  paste, or the insert side of a copy-drop (same- or cross-tree). Return new data (fresh
	 *  ids/values/names) or null to skip the node (skipping a root skips its subtree). Pure:
	 *  reads the pristine snapshot, never mutates it. Fires for copy, never for a move. */
	nodeInputTransformationCallback?: NodeTransformCallback<T>;

	// DATA PROVIDERS (get*Callback = returns data the system uses)
	/** The context menu's entries for the node it opened on: action items (`{ id, text, icon,
	 *  isDisabled, isDanger, isToggled, isVisible, children, onClick(detail) }`), `createMenuDivider()`s
	 *  and built-in action names (`'copy'`, `'cut'`, `'paste'`, `'delete'`, `'expand'`,
	 *  `'collapse'`, `'expand-subtree'`, `'collapse-subtree'`, `'expand-all'`,
	 *  `'collapse-all'`, `'sort'`, `'sort-subtree'`, `'sort-all'`). `ctx = { node, path, parent,
	 *  siblings, controller }`. No menu when unset. */
	getContextMenuItemsCallback?: (ctx: TreeMenuContext<T>) => TreeMenuEntry<T>[];
	/** Runs before a menu item activates (`false` cancels — no `onClick`, built-in or `onAction`;
	 *  async OK). `detail` = the menu ctx + `{ action, id, item, source, sourceEvent, … }`. */
	beforeActionCallback?: (detail: TreeActionEventDetail<T>) => boolean | void | Promise<boolean | void>;
	/** A menu item ran (after its `onClick` and the built-in) — a notification after the fact. */
	onAction?: (detail: TreeActionEventDetail<T>) => void;

	/** @internal Whether a `contextMenu` snippet exists (set by `<Tree>`). */
	hasContextMenuSnippet?: boolean;
	/** Override individual navigation methods (e.g. for custom ArrowDown/Up behavior) */
	navigationOverrides?: TreeNavigationOverrides<T>;

	// VISUALS
	bodyClass?: string | null | undefined;
	selectedNodeClass?: string | null | undefined;
	focusedNodeClass?: string | null | undefined;
	/** CSS class applied to every checked (isChecked) node — opt-in extra styling;
	 *  the checkbox is the default signal. */
	checkedNodeClass?: string | null | undefined;
	/** Data-driven per-row class hook. Return extra class(es) for `.stv__node`. */
	getNodeClassCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string | null | undefined;
	/** Data-driven per-row class hook. Return extra class(es) for `.stv__node-content`. */
	getNodeContentClassCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string | null | undefined;
	dragOverNodeClass?: string | null | undefined;
	/** Class for the dragged source row (the dimmed node left in place while its ghost
	 *  follows the pointer). When set, REPLACES the built-in `.stv__node-content--dragged`
	 *  visual (opacity + left-anchored scale) so you own the drag feedback — mirrors
	 *  `selectedNodeClass` / `scrollHighlightClass`. Tune the default via
	 *  `--stv-dragged-opacity` / `--stv-dragged-scale` instead of replacing it. */
	draggedNodeClass?: string | null | undefined;
	leafIconClass?: string | null | undefined;
	toggleIconMode?: ToggleIconMode;
	/** How the built-in node label behaves when wider than the row: `wrap` (multi-line),
	 *  `ellipsis` (default — single-line clip; fixed row heights for virtual scroll), or `info` (ellipsis + a trailing ⓘ
	 *  on clipped rows that reveals the full label on click). See NodeTitleOverflow. */
	nodeTitleOverflow?: NodeTitleOverflow;
	/** Indent per level in flat rendering (a CSS length). Default `var(--stv-indent-size)`. */
	flatIndentSize?: string | null;
	/** Enable hover/focus tooltips on node rows. Content comes from the `tooltip`
	 *  snippet (preferred) or `getNodeTooltipCallback`; no content ⇒ no tooltip. */
	isNodeTooltipsShown?: boolean;
	/** Plain-text tooltip for a node (fallback when no `tooltip` snippet is given). */
	getNodeTooltipCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string | null | undefined;
	/** Tooltip placement relative to the row. Default `'top-start'`. */
	tooltipPlacement?: TooltipPlacement;
	/** Show/hide delay(s), ms. Default `{ show: 400, hide: 100 }`. */
	tooltipDelay?: TooltipDelay;
	/** Gap from the row (or cursor), px. Default `8`. */
	tooltipOffset?: number;
	/** Anchor the tooltip to the pointer instead of the row. Default `false`. */
	shouldTooltipFollowCursor?: boolean;
	/** Per-node icon VALUE from a data key — rendered into a dedicated `.stv__node-icon` wrapper
	 *  on every node by core renderIcon: markup (`<svg…>`) as is → a core built-in name (`close`, `check`, `user`… see
	 *  BUILT_IN_ICON_NAMES; masked from `--base-icon-<name>`) → `renderIconCallback` → the page-wide
	 *  `window.components.renderIconCallback` → CSS class names as an icon font
	 *  (`<i class="stv__icon fa-solid fa-folder">`) → anything else as text (an emoji). */
	iconMember?: string | null | undefined;
	/** Per-node icon VALUE from a callback (overrides iconMember); may return markup. */
	getIconCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string | null | undefined;
	/** This tree's icon hook `(name, ctx) => markup | null`: asked for every icon value that is
	 *  neither markup nor a core built-in name, before the page-wide
	 *  `window.components.renderIconCallback`; `null` / `undefined` = not mine. `ctx` = `{ component,
	 *  element, prefix, node, controller, …render state }`. The `icon` snippet still wins. */
	renderIconCallback?: TreeRenderIconCallback<T> | null;
	/** Per-node icon COLOR from a data key (applied to the icon element). */
	iconColorMember?: string | null | undefined;
	/** Per-node icon COLOR from a callback (overrides iconColorMember). */
	getIconColorCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string | null | undefined;
	/** Reserve the icon column so labels align even on rows with no icon. Default `true`. */
	shouldAlignNodeIcons?: boolean;
	scrollHighlightTimeout?: number | null | undefined;
	scrollHighlightClass?: string | null | undefined;
	contextMenuXOffset?: number | null | undefined;
	contextMenuYOffset?: number | null | undefined;
	/** Milliseconds to hold a touch before a touch-drag engages (long-press). Default 300. */
	touchDragDelay?: number | null | undefined;
	/** Show the built-in blocked-action indicator (haptic buzz + no-entry icon) — held while a
	 *  locked node is long-pressed, and flashed on a target that refuses a drop. Default true.
	 *  The onNodeDragReject / onNodeDropReject events fire regardless. */
	shouldIndicateUndraggable?: boolean;
}

// ─── TreeEngine ───────────────────────────────────────────────────────

/** A collapse animating out: core's handle, the real collapse to run, the nodes it closes. */
interface ClosingEntry {
	handle: AnimateOutHandle;
	apply: () => void;
	targets: string[];
}

/**
 * The tree's engine: state, behaviour and the wiring a renderer needs (`<Tree>`, `TreeProvider`,
 * svelte-treeview-canvas, a custom layout via `createTreeEngine`). Callbacks never see it — their
 * ctx carries {@link TreeEngine.controller}, the public facade (core/tree-controller.ts).
 */
/**
 * The built-in context-menu actions (REVIEW §3.8 — one table instead of four switches): the
 * `menuItems.<label>` text, whether it also runs on a menu over empty space (`isNodeFree`; the
 * others are disabled there), `isDanger`, when it is disabled on a node (`branches` = the
 * targets that have children) and what it does (`paths` = the targets: the whole selection when
 * the menu's node is in it, else the node; null on a menu over empty space).
 */
const BUILT_IN_ACTIONS: Record<
	TreeAction,
	{
		label: string;
		isNodeFree?: boolean;
		isDanger?: boolean;
		isDisabled?: (engine: TreeEngine<any>, branches: () => LTreeNode<any>[]) => boolean;
		run: (engine: TreeEngine<any>, paths: string[] | null, node: LTreeNode<any> | null) => unknown;
	}
> = {
	copy: { label: 'copy', run: (e, paths) => e.copyNodes(paths!) },
	cut: { label: 'cut', run: (e, paths) => e.cutNodes(paths!) },
	paste: {
		label: 'paste',
		isNodeFree: true,
		isDisabled: (e) => !e.hasClipboardContent(),
		run: (e, _paths, node) => e.pasteNodes(node?.path ?? '')
	},
	delete: { label: 'delete', isDanger: true, run: (e, paths) => e.deleteNodes(paths!) },
	expand: {
		label: 'expand',
		isDisabled: (_e, branches) => !branches().some((n) => !n.isExpanded),
		run: (e, paths) => e.expandNodes(paths!)
	},
	collapse: {
		label: 'collapse',
		isDisabled: (_e, branches) => !branches().some((n) => n.isExpanded),
		run: (e, paths) => e.collapseNodes(paths!)
	},
	'expand-subtree': {
		label: 'expandSubtree',
		isDisabled: (_e, branches) => branches().length === 0,
		run: (e, paths) => e.expandAll(paths!)
	},
	'collapse-subtree': {
		label: 'collapseSubtree',
		isDisabled: (_e, branches) => branches().length === 0,
		run: (e, paths) => e.collapseAll(paths!)
	},
	'expand-all': { label: 'expandAll', isNodeFree: true, run: (e) => e.expandAll(null) },
	'collapse-all': { label: 'collapseAll', isNodeFree: true, run: (e) => e.collapseAll(null) },
	sort: {
		label: 'sort',
		isDisabled: (_e, branches) => branches().length === 0,
		run: (e, paths) => e.sortNodes(paths!)
	},
	'sort-subtree': {
		label: 'sortSubtree',
		isDisabled: (_e, branches) => branches().length === 0,
		run: (e, paths) => e.sortAll(paths!)
	},
	'sort-all': { label: 'sortAll', isNodeFree: true, run: (e) => e.sortAll(null) }
};

/** The built-in action behind a menu item's `action`, if it names one. */
function getBuiltInAction(action: string | undefined) {
	return action && Object.prototype.hasOwnProperty.call(BUILT_IN_ACTIONS, action)
		? BUILT_IN_ACTIONS[action as TreeAction]
		: undefined;
}

export class TreeEngine<T> {
	/** The public controller (frozen facade, core SPEC §12.34) — what every ctx carries. */
	readonly controller: TreeController<T> = createTreeController(this);

	// ── LTree instance ──────────────────────────────────────────────────
	tree!: Ltree<T>;

	// ── Render coordinator ──────────────────────────────────────────────

	// ── Stable callback & config objects for Node context ───────────────
	/** @internal */
	nodeCallbacks!: NodeCallbacks<T>;
	/** @internal */
	nodeConfig = $state<NodeConfig>({
		clickBehavior: 'expand-and-focus',
		isCheckboxesShown: false,
		checkboxMode: 'independent',
		shouldClickToggleCheckbox: false,
		leafIconClass: 'stv__toggle-icon--leaf',
		selectedNodeClass: undefined,
		focusedNodeClass: undefined,
		checkedNodeClass: undefined,
		getNodeClassCallback: undefined,
		getNodeContentClassCallback: undefined,
		dragOverNodeClass: undefined,
		draggedNodeClass: undefined,
		draggedPaths: new Set(),
		revealedPaths: new Set(),
		closingPaths: new Set(),
		expandPendingPaths: new Set(),
		ariaPositions: new Map(),
		dropZoneMode: 'glow',
		dropZoneLayout: 'around',
		dropZoneStart: 33,
		toggleIconMode: 'rotate',
		nodeTitleOverflow: 'ellipsis',
		flatIndentSize: 'var(--stv-indent-size)',
		isNodeTooltipsShown: false,
		getNodeTooltipCallback: undefined,
		tooltipPlacement: 'top-start',
		tooltipDelay: { show: 400, hide: 100 },
		tooltipOffset: 8,
		shouldTooltipFollowCursor: false,
		iconMember: undefined,
		getIconCallback: undefined,
		renderIconHtml: () => '',
		iconColorMember: undefined,
		getIconColorCallback: undefined,
		shouldAlignNodeIcons: true,
		dropZoneMaxWidth: 120,
		isCopyAllowed: false,
		shouldExpandAsAccordion: false,
		showFullLabel: 'Show full label'
	});

	// ── Props stored as reactive state ──────────────────────────────────
	/** Every option as last applied — raw, before defaults (constructor / `updateProps`). */
	#options = {} as Record<TreeOptionKey, unknown>;
	treeId = $state<string>('');
	treePathSeparator = $state<string>('.');

	// DATA (bidirectional / output)
	/** Input array last assigned (or written back after a mutation). */
	#nodes = $state.raw<T[]>([]);
	/** The array this controller wrote back itself — the insertArray effect must not re-insert it. */
	#selfWrittenNodes: T[] | null = null;
	#nodesDirty = false;
	#nodesChangePending = false;
	/** The tree's nodes. Assign to (re)load the tree; read for the CURRENT state — after a
	 *  mutation (move / add / remove / paste / processChanges…) this is the tree's data,
	 *  re-collected (and written back on a microtask, which updates `bind:nodes`). */
	get nodes(): T[] {
		return this.#nodesDirty ? (this.tree?._collectData() ?? []) : this.#nodes;
	}
	set nodes(value: T[]) {
		this.#nodes = value;
	}
	/** @internal A mutation changed the tree's data — re-collect `nodes` (coalesced, microtask)
	 *  and fire `onNodesChange`. `shouldNotify: false` = the post-tick re-collect of a mutation
	 *  already announced (no second onNodesChange). */
	_reconcileNodesProp(shouldNotify = true) {
		if (shouldNotify) this.#nodesChangePending = true;
		if (this.#nodesDirty) return;
		this.#nodesDirty = true;
		queueMicrotask(() => {
			if (!this.#nodesDirty) return;
			this.#nodesDirty = false;
			const current = this.tree?._collectData() ?? [];
			this.#selfWrittenNodes = current;
			this.#nodes = current;
			if (this.#nodesChangePending) {
				this.#nodesChangePending = false;
				this.onNodesChangeHandler?.(this._ctx({}));
			}
		});
	}
	/** Nesting depth of `_mutate` — the state reconcile runs once, after the outermost. */
	#mutationDepth = 0;
	/**
	 * @internal THE bracket around every change to the tree's structure or data (move / add /
	 * remove / paste / sort / processChanges…): announces it (`onNodesChange` + the `nodes`
	 * write-back, coalesced on a microtask) and, after the outermost one, brings the path-keyed
	 * state back in line with the tree (_reconcileAfterMutation). Nested calls (moveNodes →
	 * moveNode, a cross-tree cut-paste removing its sources) reconcile once.
	 */
	_mutate<R>(run: () => R): R {
		this._reconcileNodesProp();
		this.#mutationDepth++;
		try {
			return run();
		} finally {
			if (--this.#mutationDepth === 0) this._reconcileAfterMutation();
		}
	}
	focusedNode = $state.raw<LTreeNode<T> | null | undefined>(null);
	selectedPaths = $state.raw<Set<string>>(new Set());
	/** Paths of the expanded nodes (kept in sync with the tree; `bind:expandedPaths`). */
	expandedPaths = $state.raw<Set<string>>(new Set());
	/** @internal Nodes whose async `beforeExpandCallback` is in flight (loading state). */
	expandPendingPaths = $state.raw<Set<string>>(new Set());
	/** The last announced (or silently re-baselined) expanded set, joined. */
	#lastExpandedKey: string | undefined = undefined;
	/** `expandedPaths` given before the data — applied after the first non-empty insert. */
	#pendingExpanded: Set<string> | null = null;
	/** Hidden internal cursor used by Shift+Arrow / Shift+click to extend ranges
	 *  from the focused node. Set on first Shift action, advances on subsequent
	 *  Shift actions, cleared on any plain navigation. Not exposed via props. */
	private _shiftCursor: string | null = null;
	/** Public accessor for the Shift-range anchor (`_shiftCursor`). Lets alternative
	 *  renderers (e.g. the canvas package) read the current anchor to build their own
	 *  range selection (2D bounding-box hit-test) and write it back so subsequent
	 *  logical Shift+click ranges stay in sync. Mirrors `focusedNode` as public state. */
	get selectionAnchor(): string | null {
		return this._shiftCursor;
	}
	set selectionAnchor(path: string | null) {
		this._shiftCursor = path;
	}
	/** Manual double-click detection state. We can't rely on the browser's native
	 *  dblclick event because the first click triggers focus → _setFocusedNode bumps
	 *  node._rev → flat-mode {#each} destroys and recreates the row, so the second
	 *  click lands on a different DOM element and the browser refuses to synthesize a
	 *  dblclick. Tracking the click on the controller (which survives the re-render)
	 *  sidesteps that. Drives both the public onNodeDoubleClick event (all
	 *  clickBehaviors) and the built-in expand/collapse-on-double for 'select' mode. */
	private _lastClickPath: string | null = null;
	private _lastClickTime: number = 0;
	/**
	 * Every node that shows a tick (leaves + fully-checked branches; never an indeterminate
	 * branch) — never folded. Every internal mutation reads / writes this set.
	 */
	#allCheckedPaths = $state.raw<Set<string>>(new Set());
	/** `#allCheckedPaths` folded by `cascadeCheckPolicy` (rolled-up | leaves | all). Kept in
	 *  sync by the `allCheckedPaths` setter and the `cascadeCheckPolicy` / `checkboxMode` setters. */
	#checkedPaths = $state.raw<Set<string>>(new Set());
	/** Every node that shows a tick, folders AND their children — never folded by
	 *  `cascadeCheckPolicy`. Assigning sets the state (and re-folds `checkedPaths`). */
	get allCheckedPaths(): Set<string> {
		return this.#allCheckedPaths;
	}
	set allCheckedPaths(value: Set<string>) {
		this.#allCheckedPaths = value;
		this.#checkedPaths = this._computeEmittedCheckedPaths(value);
	}
	/** The checked set as the tree reports it — folded by `cascadeCheckPolicy` (in cascade mode
	 *  `'rolled-up'` gives a fully-checked folder instead of its children). What `bind:checkedPaths`
	 *  and `onCheckedChange` carry. Equals `allCheckedPaths` in independent mode or under `'all'`. */
	get checkedPaths(): Set<string> {
		return this.#checkedPaths;
	}
	insertResult = $state.raw<InsertArrayResult<T> | null | undefined>(null);
	searchTerm = $state<string | null | undefined>(undefined);
	filterScope = $state<FilterScope>('matches');
	filterDescendantDepth = $state(1);
	shouldExpandFilterDescendants = $state(true);
	maxSearchResultCount = $state<number | undefined>(undefined);
	isRendering = $state(false);

	// BEHAVIOUR
	rangeSelectionMode = $state<'visual' | 'logical'>('visual');
	isLoading = $state(false);
	isProgressiveRenderEnabled = $state(true);
	initialBatchSize = $state(20);
	maxBatchSize = $state(500);
	// ROW ANIMATION (docs/PLAN-row-animation.md): rows an expand reveals get
	// stv__node--opening (CSS @keyframes, timed by the motion tokens) — at most
	// maxAnimatedRowCount of them. No on/off property: core `motion` is the one switch
	// (SPEC §12.16 / C-NC-15); --stv-row-animation-duration: 0s turns off just rows.
	// The reveal set gates it: rows re-key on _rev, so "animate on mount" alone would
	// replay on every focus / select click.
	maxAnimatedRowCount = $state(50);
	revealedPaths = $state.raw<Set<string>>(new Set());
	// Collapse half: the rows a collapse hides animate out first (core animateOut, the
	// closing class + inert + --km-exit-height), THEN the node really collapses. The handle
	// is kept per collapsing node: a re-expand cancels it, a second collapse awaits it.
	closingPaths = $state.raw<Set<string>>(new Set());
	#closingHandles = new Map<string, ClosingEntry>();
	#revealGeneration = 0;
	#revealDepth = 0;
	bodyClass = $state<string | null | undefined>(undefined);

	// DRAG AND DROP
	dragDropMode = $state<DragDropMode>('none');
	isCopyAllowed = $state(false);
	shouldExpandAsAccordion = $state(false);
	shouldAutoHandleCopy = $state(true);
	shouldAutoHandleMove = $state(true);
	shouldAutoHandlePaste = $state(true);
	isKeyboardShortcutsEnabled = $state(true);

	// Event handlers (on* = fire-and-forget)
	/** @internal */
	onNodeClickHandler: TreeEngineProps<T>['onNodeClick'];
	/** @internal */
	onNodeDoubleClickHandler: TreeEngineProps<T>['onNodeDoubleClick'];
	/** @internal */
	onSelectionChangeHandler: TreeEngineProps<T>['onSelectionChange'];
	/** @internal */
	onCheckedChangeHandler: TreeEngineProps<T>['onCheckedChange'];
	/** @internal */
	onNodesSortHandler: TreeEngineProps<T>['onNodesSort'];
	/** @internal */
	onNodeExpandHandler: TreeEngineProps<T>['onNodeExpand'];
	/** @internal */
	onNodeCollapseHandler: TreeEngineProps<T>['onNodeCollapse'];
	/** @internal */
	onExpandedChangeHandler: TreeEngineProps<T>['onExpandedChange'];
	/** @internal */
	beforeExpandHandler: TreeEngineProps<T>['beforeExpandCallback'];
	/** @internal */
	onFocusChangeHandler: TreeEngineProps<T>['onFocusChange'];
	/** @internal */
	beforeActionHandler: TreeEngineProps<T>['beforeActionCallback'];
	/** @internal */
	onActionHandler: TreeEngineProps<T>['onAction'];
	/** @internal */
	onNodesChangeHandler: TreeEngineProps<T>['onNodesChange'];
	/** @internal */
	onNodeDragStartHandler: TreeEngineProps<T>['onNodeDragStart'];
	/** @internal */
	onNodeDragOverHandler: TreeEngineProps<T>['onNodeDragOver'];
	/** @internal */
	onNodeDropHandler: TreeEngineProps<T>['onNodeDrop'];
	/** @internal */
	onNodeDragRejectHandler: TreeEngineProps<T>['onNodeDragReject'];
	/** @internal */
	onNodeDropRejectHandler: TreeEngineProps<T>['onNodeDropReject'];
	/** @internal */
	onNodeCopyHandler: TreeEngineProps<T>['onNodeCopy'];
	/** @internal */
	onNodeCutHandler: TreeEngineProps<T>['onNodeCut'];
	/** @internal */
	onNodePasteHandler: TreeEngineProps<T>['onNodePaste'];
	/** @internal */
	onNodeDeleteHandler: TreeEngineProps<T>['onNodeDelete'];
	/** @internal */
	onRenderStartHandler: TreeEngineProps<T>['onRenderStart'];
	/** @internal */
	onRenderProgressHandler: TreeEngineProps<T>['onRenderProgress'];
	/** @internal */
	onRenderCompleteHandler: TreeEngineProps<T>['onRenderComplete'];
	onIndexProgressHandler: TreeEngineProps<T>['onIndexProgress'];
	onSearchStatusChangeHandler: TreeEngineProps<T>['onSearchStatusChange'];
	/** Status of the last applied/cleared filter (reactive); null before the first filter. */
	searchStatus = $state.raw<SearchStatus | null>(null);
	/** Latest search-index progress (reactive); null until a load queues indexing. */
	indexProgress = $state.raw<IndexProgress | null>(null);

	// Interceptor handlers (before*Callback)
	/** @internal */
	beforeDragStartHandler: TreeEngineProps<T>['beforeDragStartCallback'];
	/** @internal */
	beforeDropHandler: TreeEngineProps<T>['beforeDropCallback'];
	/** @internal */
	beforeCopyHandler: TreeEngineProps<T>['beforeCopyCallback'];
	/** @internal */
	beforeCutHandler: TreeEngineProps<T>['beforeCutCallback'];
	/** @internal */
	beforePasteHandler: TreeEngineProps<T>['beforePasteCallback'];
	/** @internal */
	beforeDeleteHandler: TreeEngineProps<T>['beforeDeleteCallback'];
	/** @internal */
	outputTransformHandler: TreeEngineProps<T>['nodeOutputTransformationCallback'];
	/** @internal */
	inputTransformHandler: TreeEngineProps<T>['nodeInputTransformationCallback'];
	/** @internal */
	beforeCheckboxToggleHandler: TreeEngineProps<T>['beforeCheckboxToggleCallback'];

	// Data provider handlers (get*Callback)
	getContextMenuItemsHandler = $state.raw<TreeEngineProps<T>['getContextMenuItemsCallback']>(undefined);

	// Visual config (for nodeConfig updates)
	clickBehavior = $state<ClickBehavior>('expand-and-focus');
	selectionMode = $state<SelectionMode>('single');
	isCheckboxesShown = $state(false);
	#checkboxMode = $state<CheckboxMode>('independent');
	get checkboxMode(): CheckboxMode {
		return this.#checkboxMode;
	}
	set checkboxMode(value: CheckboxMode) {
		if (this.#checkboxMode === value) return;
		this.#checkboxMode = value;
		this._reconcileVisualStatesForMode();
		// Switching independent⇄cascade changes whether the policy applies, so the
		// folded set can change even when allCheckedPaths is untouched.
		this.#checkedPaths = this._computeEmittedCheckedPaths(this.#allCheckedPaths);
	}
	#cascadeCheckPolicy = $state<CascadeCheckPolicy>('rolled-up');
	get cascadeCheckPolicy(): CascadeCheckPolicy {
		return this.#cascadeCheckPolicy;
	}
	set cascadeCheckPolicy(value: CascadeCheckPolicy) {
		if (this.#cascadeCheckPolicy === value) return;
		this.#cascadeCheckPolicy = value;
		// Re-fold the (unchanged) allCheckedPaths through the new policy and notify.
		this.#checkedPaths = this._computeEmittedCheckedPaths(this.#allCheckedPaths);
		this._dispatchCheckedChange();
	}
	shouldClickToggleCheckbox = $state(false);
	leafIconClass = $state('stv__toggle-icon--leaf');
	toggleIconMode = $state<ToggleIconMode>('rotate');
	nodeTitleOverflow = $state<NodeTitleOverflow>('ellipsis');
	flatIndentSize = $state<string>('var(--stv-indent-size)');
	isNodeTooltipsShown = $state<boolean>(false);
	getNodeTooltipCallback = $state<TreeEngineProps<T>['getNodeTooltipCallback']>(
		undefined
	);
	tooltipPlacement = $state<TooltipPlacement>('top-start');
	tooltipDelay = $state<TooltipDelay>({ show: 400, hide: 100 });
	tooltipOffset = $state<number>(8);
	shouldTooltipFollowCursor = $state<boolean>(false);
	iconMember = $state<string | null | undefined>(undefined);
	getIconCallback = $state<TreeEngineProps<T>['getIconCallback']>(
		undefined
	);
	/** This tree's icon hook — see `renderNodeIconHtml`. */
	renderIconCallback = $state.raw<TreeRenderIconCallback<T> | null | undefined>(undefined);
	iconColorMember = $state<string | null | undefined>(undefined);
	getIconColorCallback = $state<TreeEngineProps<T>['getIconColorCallback']>(
		undefined
	);
	shouldAlignNodeIcons = $state<boolean>(true);
	selectedNodeClass = $state<string | null | undefined>(undefined);
	focusedNodeClass = $state<string | null | undefined>(undefined);
	checkedNodeClass = $state<string | null | undefined>(undefined);
	getNodeClassCallback = $state<TreeEngineProps<T>['getNodeClassCallback']>(undefined);
	getNodeContentClassCallback = $state<TreeEngineProps<T>['getNodeContentClassCallback']>(
		undefined
	);
	dragOverNodeClass = $state<string | null | undefined>(undefined);
	draggedNodeClass = $state<string | null | undefined>(undefined);
	dropZoneMode = $state<'floating' | 'glow'>('glow');
	dropZoneLayout = $state<'around' | 'before' | 'after' | 'wave' | 'wave2'>('around');
	dropZoneStart = $state<number | string>(33);
	dropZoneMaxWidth = $state(120);
	scrollHighlightTimeout = $state(4000);
	scrollHighlightClass = $state<string | null | undefined>('stv__node-content--scroll-highlight');
	contextMenuXOffset = $state(8);
	contextMenuYOffset = $state(0);

	/** Milliseconds to hold a touch before a touch-drag engages (long-press). */
	touchDragDelay = $state(300);

	/** Show the built-in blocked-action indicator (haptic buzz + no-entry icon) — held while a
	 *  locked node is long-pressed, and flashed on a target that refuses a drop. The
	 *  onNodeDragReject / onNodeDropReject events fire regardless of this flag. */
	shouldIndicateUndraggable = $state(true);

	/** @internal */
	hasContextMenuSnippet = $state(false);

	// Virtual scrolling
	isVirtualScrollEnabled = $state(false);
	virtualScrollItemHeight = $state<number | undefined>(undefined);
	virtualScrollOverscan = $state(5);
	virtualScrollContainerHeight = $state<string | undefined>(undefined);

	// ── Navigation strategy ────────────────────────────────────────────
	navigation!: TreeNavigation<T>;

	// ── Internal mutable state ──────────────────────────────────────────

	// Context menu
	isContextMenuOpen = $state(false);
	contextMenuX = $state(0);
	contextMenuY = $state(0);
	contextMenuNode: LTreeNode<T> | null = $state.raw(null);
	/** Close the open context menu on an outside click / contextmenu, a scroll or a wheel — for a
	 *  renderer drawing its own menu (canvas). Tree.svelte sets it `false`: core's menu dismisses itself. */
	shouldAutoCloseContextMenu = true;

	// Scroll highlight
	currentSelection: {
		element: HTMLElement;
		timeoutId: ReturnType<typeof setTimeout>;
	} | null = null;

	// Drag and drop
	/** @internal */
	draggedNode: LTreeNode<any> | null = $state.raw(null);
	// Every TRAVELING path in the active drag — the complete placement manifest (lead +
	// multi-drag members + their descendants, minus any leave-behind holes) — so the dragged
	// visual dims the whole set in both recursive and flat rendering, not just the roots.
	// Reassigned wholesale (never mutated) so the Set read stays reactive. Empty when idle.
	draggedPaths = $state.raw<Set<string>>(new Set());
	/** @internal */
	isDragInProgress = $state(false);
	// Snapshot of selectedPaths taken when the OS-convention selection sync
	// in _startPointerDrag replaces the selection with the dragged node. Restored
	// when the drag is cancelled (Esc) or lands nowhere; cleared otherwise. Null
	// when no replacement happened (e.g. dragging a node that was already selected).
	private _preDragSelectionSnapshot: Set<string> | null = null;
	// Authoritative top-level dragged path list when beforeDragStartCallback rewrote the set
	// (prune and/or force-add). Normalized (deduped, no path that descends from another in the
	// set), ordered = landing order. Consulted by _draggedRefs and the multi-drag move loop so
	// the consumer's decision drives ctx.dragged, the cross-tree publish, AND the actual move.
	// Null when no callback ran or it returned void. Cleared on drag end.
	private _dragSetOverride: string[] | null = null;
	/** @internal */
	hoveredNodeForDrop = $state.raw<LTreeNode<any> | null>(null);
	/** @internal */
	activeDropPosition = $state<DropPosition | null>(null);
	/** @internal */
	currentDropOperation = $state<DropOperation>('move');

	// Floating drop zones (rendered at Tree level with position:fixed)
	/** @internal */
	floatingZoneRect = $state<{ top: number; left: number; width: number; height: number } | null>(
		null
	);
	/** @internal */
	floatingHoveredZone = $state<'before' | 'after' | 'child' | null>(null);

	// Touch drag
	/** @internal */
	touchDragState = $state.raw<{
		node: LTreeNode<any> | null;
		startX: number;
		startY: number;
		isDragging: boolean;
		isDenied: boolean;
		ghostElement: HTMLElement | null;
		currentDropTarget: LTreeNode<any> | null;
		/** Pointer-drag metadata (unified mouse/pen/touch path). */
		pointerType?: string;
		pointerId?: number;
	}>({
		node: null,
		startX: 0,
		startY: 0,
		isDragging: false,
		isDenied: false,
		ghostElement: null,
		currentDropTarget: null
	});

	// Held "can't move this" indicator: shown while a locked node stays pressed, torn down on release.
	private _deniedBadgeEl: HTMLElement | null = null;
	private _deniedRowEl: HTMLElement | null = null;

	// Progressive flat rendering
	/** @internal */
	flatRenderedIds = $state.raw<Set<string>>(new Set());
	/** @internal */
	flatRenderQueue = $state.raw<string[]>([]);
	/** @internal */
	flatRenderAnimationFrame: number | null = null;
	/** @internal */
	currentBatchSize: number = 0;

	// Virtual scrolling state
	/** @internal */
	vsScrollTop = $state(0);
	/** @internal */
	vsMeasuredRowHeight = $state<number | null>(null);
	/** @internal */
	vsContainerRef = $state<HTMLDivElement | undefined>();
	/** @internal */
	vsDetectedHeight = $state<string | null>(null);
	private vsRafPending = false;

	// Drop placeholder
	/** @internal */
	isDropPlaceholderActive = $state(false);

	// Whole-tree drop zone (Tree.svelte `isTreeDropZoneEnabled`). When on, a node that
	// REJECTS a drop must NOT tear down the drag — the same drop event bubbles up to the
	// container's tree-zone handler, which needs `draggedNode` still live to route it.
	isTreeDropZoneEnabled = $state(false);

	// Clipboard — paths dimmed during cut operation
	cutPaths = $state.raw<Set<string>>(new Set());

	// Progressive flat rendering tracker
	private lastFlatNodesTracker: Symbol | undefined | null = null;

	// Container element (set by the host component for scrollToPath / debug menu)
	/** @internal */
	// Reactive: the node / menu icons re-render once it is attached (see _renderIconHtml).
	containerElement = $state.raw<HTMLElement | null>(null);

	// ── Derived ─────────────────────────────────────────────────────────

	// Virtual scroll derived computations
	/** @internal */
	vsRowHeight = $derived(this.virtualScrollItemHeight ?? this.vsMeasuredRowHeight ?? 32);
	/** @internal */
	vsActive = $derived(this.isVirtualScrollEnabled);
	/** @internal */
	vsContainerStyle = $derived(this.virtualScrollContainerHeight ?? this.vsDetectedHeight ?? '400px');
	allFlatNodes = $derived(this.tree?.visibleFlatNodes ?? []);
	/**
	 * ARIA tree: `[posinset, setsize]` per visible path — siblings are the visible children of the
	 * same parent (search-filter aware), over every visible node (not just the rendered virtual
	 * window). Same as web-treeview's renderer `_ariaPositionMap`.
	 * @internal
	 */
	ariaPositions = $derived.by(() => {
		const counts = new Map<string, number>();
		const map = new Map<string, [number, number]>();
		for (const n of this.allFlatNodes) {
			const parent = n.parentPath ?? '';
			const pos = (counts.get(parent) ?? 0) + 1;
			counts.set(parent, pos);
			map.set(n.path, [pos, 0]);
		}
		for (const n of this.allFlatNodes) {
			const entry = map.get(n.path)!;
			entry[1] = counts.get(n.parentPath ?? '') ?? entry[0];
		}
		return map;
	});
	/** @internal */
	vsTotalCount = $derived(this.allFlatNodes.length);
	/** @internal */
	vsTotalHeight = $derived(this.vsTotalCount * this.vsRowHeight);
	/** @internal */
	vsStartIndex = $derived(
		this.vsActive
			? Math.max(0, Math.floor(this.vsScrollTop / this.vsRowHeight) - this.virtualScrollOverscan)
			: 0
	);
	/** @internal */
	vsEndIndex = $derived(
		this.vsActive
			? Math.min(
					this.vsTotalCount,
					Math.ceil(
						(this.vsScrollTop + (this.vsContainerRef?.clientHeight ?? 0)) / this.vsRowHeight
					) + this.virtualScrollOverscan
				)
			: this.vsTotalCount
	);
	/** @internal */
	vsOffsetY = $derived(this.vsStartIndex * this.vsRowHeight);

	/** @internal */
	flatNodesToRender = $derived(
		this.vsActive
			? this.allFlatNodes.slice(this.vsStartIndex, this.vsEndIndex)
			: this.isProgressiveRenderEnabled
				? (this.tree?.visibleFlatNodes?.filter((n) => this.flatRenderedIds.has(String(n.id))) ?? [])
				: (this.tree?.visibleFlatNodes ?? [])
	);

	get statistics() {
		return this.tree?.statistics;
	}

	/** UI strings (partial, flat `<elementType>.<name>` keys) — see `TreeLabels`. Resolve one with `getLabel()`. */
	labels = $state.raw<TreeLabelsInput>(undefined);

	/** This tree's own translation seam — asked before `window.components.locale.translateCallback`. */
	translateCallback = $state.raw<TranslateCallback | null | undefined>(undefined);

	/** Bumped on every page-wide locale change (`window.components.locale` / `.security` assigned). */
	#localeRevision = $state(0);

	/** Core `/locale` labels of this tree (reads `labels` / `translateCallback` on every call). */
	#labels = createTreeLabels(
		() => this.labels,
		() => this.translateCallback
	);

	/**
	 * The resolved UI string for `key`: `labels` → this tree's `translateCallback` → the page-wide
	 * `window.components.locale.translateCallback` → `window.components.locale.labels['svelte-treeview.<key>']`
	 * → the English defaults (`''` = nothing). Reactive to the props and the page-wide object.
	 */
	getLabel(key: keyof TreeLabels, params?: Record<string, unknown>): string {
		void this.#localeRevision;
		return this.#labels.text(key, params);
	}

	/** The root the core ICON_CSS (`.km-icon`, the built-in masked glyphs) was adopted into. */
	#iconCssRoot: Node | null = null;

	/**
	 * A node icon's markup — core `renderIcon` (SPEC §12.33): markup → built-in name (masked from
	 * `--base-icon-<name>`) → this tree's `renderIconCallback(name, ctx)` → the page-wide
	 * `window.components.renderIconCallback` → icon-font `<i class="stv__icon …">` → escaped text.
	 * `ctx` = core's `{ component: 'svelte-treeview', element, prefix: 'stv' }` + the render state +
	 * `node` + `controller`. Reads `renderIconCallback`, so a changed hook re-renders the icons.
	 */
	renderNodeIconHtml = (value: string, node: LTreeNode<T>, ctx: NodeRenderContext): string =>
		this._renderIconHtml(value, { ...ctx, node, controller: this.controller });

	/**
	 * The icon hook core's `/menu` reads off its host (`host.renderIconCallback` — Tree.svelte puts
	 * it on `.stv__container`): this tree's `renderIconCallback` with `ctx.item` (no `node`) +
	 * `component: 'svelte-treeview'`, `prefix: 'stv'`, `controller`. `null` → the page-wide hook.
	 */
	readonly menuRenderIconCallback: RenderIconCallback = (name, ctx) => {
		const hook = this.renderIconCallback as RenderIconCallback | null | undefined;
		return hook ? hook(name, { ...ctx, component: LABELS_TAG, prefix: 'stv', controller: this.controller } as IconRenderContext) : null;
	};

	/**
	 * A `contextMenu`-snippet item's icon markup (`ContextMenuItem`) — exactly what core's `/menu`
	 * renders for a callback item: `renderIcon(value, { host, context: { item } })` through
	 * {@link menuRenderIconCallback} (no `prefix`: icon-font classes render as given).
	 */
	renderMenuIconHtml = (value: string, item: unknown): string => {
		if (typeof window !== 'undefined' && !this.containerElement) return '';
		return renderIcon(value, {
			host: this.containerElement,
			renderIconCallback: this.menuRenderIconCallback,
			context: { item }
		});
	};

	private _renderIconHtml(value: string, context: Record<string, unknown>): string {
		// SSR renders without hooks (no window). Svelte never repairs an {@html} mismatch while
		// hydrating, so the client answers '' until the container is attached, then the real
		// markup: the value changes once and the hook-aware markup replaces the server's.
		if (typeof window !== 'undefined' && !this.containerElement) return '';
		const root = this.containerElement?.getRootNode();
		if (root && root !== this.#iconCssRoot && (root instanceof Document || root instanceof ShadowRoot)) {
			adoptStyles(root, ICON_CSS);
			this.#iconCssRoot = root;
		}
		return renderIcon(value, {
			prefix: 'stv',
			host: this.containerElement,
			component: LABELS_TAG,
			renderIconCallback: (this.renderIconCallback ?? null) as RenderIconCallback | null,
			context
		});
	}

	/** Whether the tree holds any node (an empty render with nodes = the search filtered them all). */
	get hasNodes(): boolean {
		return (this.tree?.statistics?.nodeCount ?? 0) > 0;
	}

	// ── Constructor ─────────────────────────────────────────────────────

	constructor(props: TreeEngineProps<T>) {
		// Every option as given (tree-props.ts holds the defaults); updateProps compares against it.
		for (const key of TREE_OPTION_KEYS) this.#options[key] = props[key];
		this.treeId = props.treeId || this.generateTreeId();
		this.treePathSeparator = resolveTreeOption('treePathSeparator', props.treePathSeparator) as string;

		// Register in the cross-tree clipboard registry so a cut pasted into ANOTHER
		// tree can remove the originals from here (same-tree cut removes them directly).
		registerClipboardTree(this.treeId, this);

		// ── Create LTree ────────────────────────────────────────────────
		const config = this._ltreeConfig();
		// svelte-ignore non_reactive_update
		this.tree = createLTree<T>(
			{ ...config, treeId: this.treeId },
			{ displayValueFallback: resolveLabel(props.labels, 'labels.noDisplayValue') }
		);

		// Every live option (after the tree: isSortingEnabled lives on it).
		for (const key of TREE_OPTION_KEYS) {
			if (!TREE_LTREE_OPTIONS.has(key) && !TREE_INIT_ONLY_OPTIONS.has(key))
				this._setOption(key, props[key]);
		}

		// State
		this.#nodes = props.nodes;
		this.focusedNode = props.focusedNode ?? null;
		this.selectedPaths = props.selectedPaths ?? new Set();
		this.allCheckedPaths = props.checkedPaths ?? new Set();
		if (props.expandedPaths?.size) {
			this.expandedPaths = props.expandedPaths;
			this.#pendingExpanded = props.expandedPaths;
		}
		// Both can fire synchronously inside the searchTerm/filter $effect (filterNodes →
		// status). untrack() so whatever the consumer's handler READS doesn't become a
		// dependency of that effect (a handler doing `count++` would loop forever).
		this.tree.onIndexProgress = (progress) =>
			untrack(() => {
				this.indexProgress = progress;
				this.onIndexProgressHandler?.(this._ctx(progress));
			});
		this.tree.onSearchStatus = (status) =>
			untrack(() => {
				this.searchStatus = status;
				// A settled search is announced (not while the index still fills — a fresh status
				// follows when it completes; a cleared search is silent).
				if (status.searchTerm && !status.isIndexing) {
					this._announce(status.matchCount === 0 ? 'ariaLabels.searchNoResults' : 'ariaLabels.searchResults', {
						count: status.matchCount,
						searchTerm: status.searchTerm
					});
				}
				this.onSearchStatusChangeHandler?.(this._ctx(status));
			});

		// ── Create stable nodeCallbacks ─────────────────────────────────
		this.nodeCallbacks = {
			handleNodeContentClick: (node: LTreeNode<T>, event?: MouseEvent) => this.handleNodeClick(node, event),
			handleNodeSelectClick: (node: LTreeNode<T>, modifiers?: SelectionModifiers) =>
				this._handleNodeSelectClick(node, modifiers, { uiClick: true }),
			handleCheckboxToggle: (node: LTreeNode<T>, options?: { skipFocus?: boolean }) =>
				this._handleCheckboxToggle(node, options),
			handleNodeContextMenu: this._handleNodeContextMenu.bind(this),
			handleToggleClick: (node: LTreeNode<T>) => {
				void this.toggleNodeExpanded(node.path);
			}
		};

		// ── Initial nodeConfig ──────────────────────────────────────────
		this.nodeConfig = {
			clickBehavior: this.clickBehavior,
			isCheckboxesShown: this.isCheckboxesShown,
			checkboxMode: this.checkboxMode,
			shouldClickToggleCheckbox: this.shouldClickToggleCheckbox,
			leafIconClass: this.leafIconClass,
			toggleIconMode: this.toggleIconMode,
			nodeTitleOverflow: this.nodeTitleOverflow,
			flatIndentSize: this.flatIndentSize,
			isNodeTooltipsShown: this.isNodeTooltipsShown,
			getNodeTooltipCallback: this._withController(this.getNodeTooltipCallback),
			tooltipPlacement: this.tooltipPlacement,
			tooltipDelay: this.tooltipDelay,
			tooltipOffset: this.tooltipOffset,
			shouldTooltipFollowCursor: this.shouldTooltipFollowCursor,
			iconMember: this.iconMember,
			getIconCallback: this._withController(this.getIconCallback),
			renderIconHtml: this.renderNodeIconHtml,
			iconColorMember: this.iconColorMember,
			getIconColorCallback: this._withController(this.getIconColorCallback),
			shouldAlignNodeIcons: this.shouldAlignNodeIcons,
			selectedNodeClass: this.selectedNodeClass,
			focusedNodeClass: this.focusedNodeClass,
			checkedNodeClass: this.checkedNodeClass,
			getNodeClassCallback: this._withController(this.getNodeClassCallback),
			getNodeContentClassCallback: this._withController(this.getNodeContentClassCallback),
			dragOverNodeClass: this.dragOverNodeClass,
			draggedNodeClass: this.draggedNodeClass,
			draggedPaths: this.draggedPaths,
			revealedPaths: this.revealedPaths,
			closingPaths: this.closingPaths,
			expandPendingPaths: this.expandPendingPaths,
			ariaPositions: this.ariaPositions,
			dropZoneMode: this.dropZoneMode,
			dropZoneLayout: this.dropZoneLayout,
			dropZoneStart: this.dropZoneStart,
			dropZoneMaxWidth: this.dropZoneMaxWidth,
			isCopyAllowed: this.isCopyAllowed,
			shouldExpandAsAccordion: this.shouldExpandAsAccordion,
			showFullLabel: this.getLabel('ariaLabels.showFullLabel')
		};

		// ── Effects ─────────────────────────────────────────────────────
		// IMPORTANT: These $effect() calls bind to the lifecycle of whichever
		// component instantiates this class. Must be created during component init.

		// Page-wide locale (window.components.locale) changed → every getLabel() reader re-runs.
		$effect(() =>
			observeLocale(() => {
				uiLogger.debug('page-wide locale changed — re-resolving labels');
				this.#localeRevision++;
			})
		);

		// Sync labels.noDisplayValue → LTree (the display fallback of a node without a value)
		$effect(() => {
			this.tree.displayValueFallback = this.getLabel('labels.noDisplayValue');
		});

		// Mutate (don't replace) nodeConfig so the context reference stays the same.
		// Using $state() (not .raw()) so the proxy makes property reads reactive in Node.svelte.
		$effect(() => {
			Object.assign(this.nodeConfig, {
				clickBehavior: this.clickBehavior,
				isCheckboxesShown: this.isCheckboxesShown,
				checkboxMode: this.checkboxMode,
				shouldClickToggleCheckbox: this.shouldClickToggleCheckbox,
				leafIconClass: this.leafIconClass,
				toggleIconMode: this.toggleIconMode,
				nodeTitleOverflow: this.nodeTitleOverflow,
				flatIndentSize: this.flatIndentSize,
				isNodeTooltipsShown: this.isNodeTooltipsShown,
				getNodeTooltipCallback: this._withController(this.getNodeTooltipCallback),
				tooltipPlacement: this.tooltipPlacement,
				tooltipDelay: this.tooltipDelay,
				tooltipOffset: this.tooltipOffset,
				shouldTooltipFollowCursor: this.shouldTooltipFollowCursor,
				iconMember: this.iconMember,
				getIconCallback: this._withController(this.getIconCallback),
				renderIconHtml: this.renderNodeIconHtml,
				iconColorMember: this.iconColorMember,
				getIconColorCallback: this._withController(this.getIconColorCallback),
				shouldAlignNodeIcons: this.shouldAlignNodeIcons,
				selectedNodeClass: this.selectedNodeClass,
				focusedNodeClass: this.focusedNodeClass,
				checkedNodeClass: this.checkedNodeClass,
				getNodeClassCallback: this._withController(this.getNodeClassCallback),
				getNodeContentClassCallback: this._withController(this.getNodeContentClassCallback),
				dragOverNodeClass: this.dragOverNodeClass,
			draggedNodeClass: this.draggedNodeClass,
			draggedPaths: this.draggedPaths,
			revealedPaths: this.revealedPaths,
			closingPaths: this.closingPaths,
			expandPendingPaths: this.expandPendingPaths,
			ariaPositions: this.ariaPositions,
				dropZoneMode: this.dropZoneMode,
				dropZoneLayout: this.dropZoneLayout,
				dropZoneStart: this.dropZoneStart,
				dropZoneMaxWidth: this.dropZoneMaxWidth,
				isCopyAllowed: this.isCopyAllowed,
				shouldExpandAsAccordion: this.shouldExpandAsAccordion,
			showFullLabel: this.getLabel('ariaLabels.showFullLabel')
			});
		});

		// Filter when searchTerm (or filterScope / depth) changes
		$effect(() => {
			this.tree.filterScope = this.filterScope;
			this.tree.filterDescendantDepth = this.filterDescendantDepth;
			this.tree.shouldExpandFilterDescendants = this.shouldExpandFilterDescendants;
			this.tree.maxSearchResultCount = this.maxSearchResultCount;
			this.tree.filterNodes(this.searchTerm as string);
		});

		// InsertArray when data changes
		$effect(() => this._insertNodesInput());

		// Expanded set: any tree change (data load, toggles, mutations) re-derives it and
		// announces a change through onExpandedChange (the first sync is the baseline).
		$effect(() => {
			void this.tree?.changeTracker;
			untrack(() => this._reconcileExpanded());
		});

		// Progressive rendering for flat mode
		$effect(() => this._reconcileProgressiveRender());

		// Virtual scroll: auto-measure row height from the first rendered node.
		// Virtual scroll assumes UNIFORM row heights: the spacer is count * rowHeight,
		// so if the measured height is smaller than the real row stride the spacer
		// under-estimates total content and the last rows fall outside the scroll
		// range (can't reach the bottom + near-bottom jitter). Flat rows carry no
		// inter-row margin, so getBoundingClientRect().height is the exact, sub-pixel-accurate stride.
		$effect(() => {
			if (!this.vsActive || this.virtualScrollItemHeight || this.vsMeasuredRowHeight) return;
			if (this.allFlatNodes.length === 0) return;
			tick().then(() => {
				if (this.vsContainerRef) {
					const firstNode = this.vsContainerRef.querySelector('.stv__node');
					if (firstNode) {
						const height = firstNode.getBoundingClientRect().height;
						if (height > 0) this.vsMeasuredRowHeight = height;
					}
				}
			});
		});

		// Virtual scroll: auto-detect container height from parent element
		$effect(() => {
			if (!this.vsActive || this.virtualScrollContainerHeight || this.vsDetectedHeight) return;
			tick().then(() => {
				if (this.vsContainerRef?.parentElement) {
					const parentHeight = this.vsContainerRef.parentElement.clientHeight;
					if (parentHeight > 100) {
						this.vsDetectedHeight = parentHeight + 'px';
					}
				}
			});
		});

		// Virtual scroll: clamp scroll position when content shrinks (e.g. after filter)
		// Without this, vsScrollTop stays at its old (large) value while vsTotalHeight
		// drops, so vsStartIndex falls out of range and the rendered slice is empty —
		// the scroll appears stuck because the browser silently clamps the container's
		// actual scrollTop but our derived state never re-reads it.
		$effect(() => {
			if (!this.vsActive || !this.vsContainerRef) return;
			const maxScrollTop = Math.max(0, this.vsTotalHeight - this.vsContainerRef.clientHeight);
			if (this.vsScrollTop > maxScrollTop) {
				this.vsScrollTop = maxScrollTop;
				if (this.vsContainerRef.scrollTop > maxScrollTop) {
					this.vsContainerRef.scrollTop = maxScrollTop;
				}
			}
		});

		// Context menu global event listeners — for a headless renderer (canvas) drawing its own
		// menu. Tree.svelte turns them off: its menu is core openMenu(), which dismisses itself.
		$effect(() => {
			if (this.isContextMenuOpen && this.shouldAutoCloseContextMenu) {
				const handleGlobalClick = (event: MouseEvent) => {
					const target = event.target as Element;
					if (!target.closest('.stv__context-menu')) {
						this.closeContextMenu();
					}
				};

				const handleGlobalScroll = () => {
					this.closeContextMenu();
				};

				// Attach on the next task: the event that opened the menu (a click calling
				// openContextMenu(), the right-click) is still bubbling and must not close it.
				const attach = setTimeout(() => {
					document.addEventListener('click', handleGlobalClick);
					document.addEventListener('contextmenu', handleGlobalClick);
					window.addEventListener('scroll', handleGlobalScroll, true);
					document.addEventListener('scroll', handleGlobalScroll, true);
					window.addEventListener('wheel', handleGlobalScroll, { passive: true });
				});

				return () => {
					clearTimeout(attach);
					document.removeEventListener('click', handleGlobalClick);
					document.removeEventListener('contextmenu', handleGlobalClick);
					window.removeEventListener('scroll', handleGlobalScroll, true);
					document.removeEventListener('scroll', handleGlobalScroll, true);
					window.removeEventListener('wheel', handleGlobalScroll);
				};
			}
		});

		// Mirror hoveredNodeForDrop → dragOverNodeClass on a single DOM element.
		// Direct classList mutation (same approach as the touch path's updateDropTarget) so
		// the cost is O(1) per node-crossing — no per-Node prop propagation across the tree.
		let prevHoveredDragPath: string | null = null;
		let prevDragOverClass: string | null = null;
		$effect(() => {
			const current = this.hoveredNodeForDrop?.path ?? null;
			const cls = this.dragOverNodeClass ?? null;
			if (current === prevHoveredDragPath && cls === prevDragOverClass) return;

			if (prevHoveredDragPath && prevDragOverClass) {
				this._rowContentEl(prevHoveredDragPath)?.classList.remove(prevDragOverClass);
			}
			if (current && cls) this._rowContentEl(current)?.classList.add(cls);
			prevHoveredDragPath = current;
			prevDragOverClass = cls;
		});
	}

	/**
	 * Body of the constructor's nodes effect: (re)insert the `nodes` input. A method, not inline —
	 * see `_reconcileProgressiveRender`.
	 */
	private _insertNodesInput() {
		const nodes = this.#nodes;
		if (this.tree && nodes) {
			// Our own write-back of the current state (after a mutation) — already in the tree.
			if (nodes === this.#selfWrittenNodes) return;
			this._loadNodes(nodes);
		}
	}

	/** Insert `nodes` into the tree from scratch (render pass, virtual scroll and checked seed reset). */
	private _loadNodes(nodes: T[]) {
		this.flatRenderedIds = new Set();
		this.flatRenderQueue = [];
		untrack(() => this._completeRenderPass());
		this.currentBatchSize = 0;
		// Reset virtual scroll measurements
		this.vsMeasuredRowHeight = null;
		this.vsDetectedHeight = null;
		this.insertResult = this.tree.insertArray(nodes);

		// Seed checkedPaths from node.isChecked flags written by insertArray
		if (this.tree.isCheckedMember || this.tree.getIsCheckedCallback) {
			const seeded = new Set<string>();
			forEachDescendant(this.tree.root, (node) => {
				if (node.isChecked) seeded.add(node.path);
			});
			this.allCheckedPaths = seeded;
		}
		if (this.#pendingExpanded && nodes.length) {
			this.tree.setExpandedPaths([...this.#pendingExpanded]);
			this.#pendingExpanded = null;
		}
	}

	/**
	 * Body of the constructor's progressive-render effect (reads tracked as if inline). Kept out of
	 * the constructor: the SSR build drops `$effect` calls but keeps esbuild's @__PURE__ marks
	 * on their `new Set(…)`, and Rollup warns about the stranded comments.
	 */
	private _reconcileProgressiveRender() {
		if (!this.isProgressiveRenderEnabled || !this.tree?.visibleFlatNodes)
			return;

		const tracker = this.tree.changeTracker;
		if (tracker === this.lastFlatNodesTracker) return;
		this.lastFlatNodesTracker = tracker;

		const allNodes = this.tree.visibleFlatNodes;
		const currentIds = new Set(allNodes.map((n) => String(n.id)));

		const renderedSnapshot = new Set(this.flatRenderedIds);
		const queueSnapshot = new Set(this.flatRenderQueue);

		const newIds: string[] = [];
		for (const node of allNodes) {
			const id = String(node.id);
			if (!renderedSnapshot.has(id) && !queueSnapshot.has(id)) {
				newIds.push(id);
			}
		}

		const removedIds: string[] = [];
		for (const id of renderedSnapshot) {
			if (!currentIds.has(id)) {
				removedIds.push(id);
			}
		}

		if (removedIds.length > 0) {
			const newRendered = new Set(renderedSnapshot);
			for (const id of removedIds) {
				newRendered.delete(id);
			}
			this.flatRenderedIds = newRendered;
		}

		if (newIds.length > 0) {
			const alreadyHasManyNodes = renderedSnapshot.size > 1000;
			const addingFewNodes = newIds.length < 200;

			if (alreadyHasManyNodes && addingFewNodes) {
				this.flatRenderedIds = new Set([...this.flatRenderedIds, ...newIds]);
			} else {
				this.currentBatchSize = this.initialBatchSize;
				const immediateBatch = newIds.slice(0, this.currentBatchSize);
				const remaining = newIds.slice(this.currentBatchSize);

				if (immediateBatch.length > 0) {
					this.flatRenderedIds = new Set([...this.flatRenderedIds, ...immediateBatch]);
				}

				this.currentBatchSize = Math.min(this.currentBatchSize * 2, this.maxBatchSize);

				if (remaining.length > 0) {
					this.flatRenderQueue = [...remaining];
					untrack(() => this._startRenderPass(immediateBatch.length));
					this.scheduleFlatRenderBatch();
				}
			}
		}
	}

	// ── Virtual scroll handler ──────────────────────────────────────────

	/** @internal */
	handleVirtualScroll = (event: Event) => {
		if (this.vsRafPending) return;
		this.vsRafPending = true;
		requestAnimationFrame(() => {
			this.vsScrollTop = (event.target as HTMLElement).scrollTop;
			this.vsRafPending = false;
		});
	};

	// ── Public API methods ──────────────────────────────────────────────

	/**
	 * Expand the nodes one level (their collapsed ancestors are opened too). A collapsed
	 * target with children goes through `beforeExpandCallback` first (`false` keeps it
	 * collapsed; an async hook defers it and shows the loading state — the returned
	 * Promise settles after it). Fires `onNodeExpand` for every node that actually
	 * expanded unless `isSilent`.
	 */
	async expandNodes(paths: string | string[], options?: ExpandOptions): Promise<void> {
		const list = Array.isArray(paths) ? paths : [paths];
		this._commitPendingCollapses(list);
		if (!this.beforeExpandHandler) {
			this._expandWithEvents(list, options);
			return;
		}
		const now: string[] = [];
		const pending: Promise<boolean>[] = [];
		for (const p of list) {
			const node = this.tree?.getNodeByPath(p);
			if (!node || node.isExpanded || !node.hasChildren) {
				now.push(p);
				continue;
			}
			const result = this._checkBeforeExpand(node, () => this._expandWithEvents([p], options));
			if (result === true) now.push(p);
			else if (result !== false) pending.push(result);
		}
		if (now.length) this._expandWithEvents(now, options);
		if (pending.length) await Promise.all(pending);
	}

	/** Collapse the nodes (one level — descendants keep their own state). A non-collapsible
	 *  node (`getNodeIsCollapsible`) stays open. Fires `onNodeCollapse` for every node that
	 *  actually collapsed unless `isSilent`. */
	async collapseNodes(paths: string | string[], options?: ExpandOptions): Promise<void> {
		const list = Array.isArray(paths) ? paths : [paths];
		const wereExpanded = list
			.map((p) => this.tree?.getNodeByPath(p))
			.filter(
				(n): n is LTreeNode<T> =>
					!!n && !!n.isExpanded && !!n.hasChildren && this.tree.getNodeIsCollapsible(n)
			);
		// Already animating out (a second collapse) → wait for that one.
		const running = wereExpanded.filter((n) => this.#closingHandles.has(n.path));
		const fresh = wereExpanded.filter((n) => !this.#closingHandles.has(n.path));
		const waits: Promise<unknown>[] = running.map((n) => this.#closingHandles.get(n.path)!.handle.finished);
		if (fresh.length || !running.length)
			waits.push(
				this._animateCollapse(fresh.map((n) => n.path), () => {
					this.tree.collapseNodes(fresh.length ? fresh.map((n) => n.path) : list, options);
					if (!options?.isSilent)
						for (const n of fresh) if (!n.isExpanded) this._dispatchExpandEvent('collapse', n);
					this._reconcileExpanded(options?.isSilent);
				})
			);
		await Promise.all(waits);
	}

	/**
	 * Expand a collapsed node / collapse an expanded one (the toggle UI, keyboard). A leaf,
	 * a non-collapsible node, or a node whose async `beforeExpandCallback` is in flight is
	 * ignored. Expanding honours `shouldExpandAsAccordion` (expanded siblings collapse
	 * first; `isExclusive` replaces it with the exclusive expand of `expandNodes`).
	 */
	async toggleNodeExpanded(path: string, options?: ExpandOptions): Promise<void> {
		const node = this.tree?.getNodeByPath(path);
		if (!node || !node.hasChildren) return;
		if (!this.tree.getNodeIsCollapsible(node)) return;
		if (this.expandPendingPaths.has(path)) return;
		// Toggled again while its rows animate out = re-expand: cancel, it stays open.
		if (this._commitPendingCollapses([path])) {
			uiLogger.debug(`Node re-expanded mid-collapse (animation cancelled): ${path}`);
			return;
		}
		if (node.isExpanded) {
			await this.collapseNodes(path, options);
			return;
		}
		uiLogger.debug(`Expanding node: ${path}`, { accordion: this.shouldExpandAsAccordion });
		const result = this._checkBeforeExpand(node, () => this._expandFromToggle(path, options));
		if (result === true) this._expandFromToggle(path, options);
		else if (result !== false) await result;
	}

	/** Expand the whole tree (`null` / omitted), or the given nodes + all their descendants.
	 *  No `beforeExpandCallback`, no `onNodeExpand` — only `onExpandedChange`. */
	expandAll(paths?: string | string[] | null, options?: ExpandOptions) {
		this._commitPendingCollapses(paths == null ? null : Array.isArray(paths) ? paths : [paths]);
		this._animateExpand(() => this.tree?.expandAll(paths, options));
		this._reconcileExpanded(options?.isSilent);
	}

	/** Collapse the whole tree (`null` / omitted), or the given nodes + all their descendants.
	 *  No `onNodeCollapse` — only `onExpandedChange`. The rows animate out first (motion);
	 *  the Promise settles once the tree is collapsed. */
	collapseAll(paths?: string | string[] | null, options?: ExpandOptions): Promise<void> {
		const apply = () => {
			this.tree?.collapseAll(paths, options);
			this._reconcileExpanded(options?.isSilent);
		};
		if (!this.tree) return Promise.resolve();
		// The nodes whose rows disappear: from every root (whole tree) or the given nodes, the
		// topmost expanded nodes that really collapse — a non-collapsible one stays open, so
		// its rows stay and the search goes on below it (B11).
		const starts = (paths == null
			? this.tree.visibleFlatNodes.filter((n) => !n.parentPath)
			: (Array.isArray(paths) ? paths : [paths]).map((p) => this.tree.getNodeByPath(p))
		).filter((n): n is LTreeNode<T> => !!n);
		const targets: string[] = [];
		const collectCollapsing = (node: LTreeNode<T>) => {
			if (!node.isExpanded || !node.hasChildren) return;
			if (this.tree.getNodeIsCollapsible(node)) targets.push(node.path);
			else for (const key in node.children) collectCollapsing(node.children[key]);
		};
		for (const node of starts) collectCollapsing(node);
		return this._animateCollapse(targets, apply);
	}

	/**
	 * Row animation, collapse half: animate out the visible rows under `targets` (the first
	 * `maxAnimatedRowCount`; the rest go with the collapse), then `apply()` the real collapse —
	 * core `animateOut` (closing class + inert + --km-exit-height, waits for the CSS
	 * animation; 0s → at once). Nothing to animate → `apply()` now.
	 */
	private _animateCollapse(targets: string[], apply: () => void): Promise<void> {
		const container = this.containerElement;
		if (!targets.length || !container || !this._isRowAnimationEnabled()) {
			apply();
			return Promise.resolve();
		}
		const sep = this.treePathSeparator || '.';
		const targetSet = new Set(targets);
		const isUnderTarget = (path: string): boolean =>
			getAncestorPaths(path, sep).some((a) => targetSet.has(a));
		const limit = Math.max(0, this.maxAnimatedRowCount ?? 50);
		const hiding: string[] = [];
		for (const n of this.tree.visibleFlatNodes) {
			if (hiding.length >= limit) break;
			if (isUnderTarget(n.path)) hiding.push(n.path);
		}
		const rowByPath = new Map<string, Element>();
		for (const el of container.querySelectorAll('.stv__node[data-tree-path]'))
			rowByPath.set(el.getAttribute('data-tree-path')!, el);
		const rows = hiding.map((p) => rowByPath.get(p)).filter((el): el is Element => !!el);
		if (!rows.length) {
			apply();
			return Promise.resolve();
		}
		const animated = new Set(hiding.filter((p) => rowByPath.has(p)));
		const cleanup = () => {
			for (const t of targets) if (this.#closingHandles.get(t)?.handle === handle) this.#closingHandles.delete(t);
			const next = new Set(this.closingPaths);
			for (const p of animated) next.delete(p);
			this.closingPaths = next;
		};
		this.closingPaths = new Set([...this.closingPaths, ...animated]);
		uiLogger.debug('Row animation: closing', { targets, rows: rows.length });
		const handle: AnimateOutHandle = animateOut(rows, {
			className: 'stv__node--closing',
			shouldSetInert: true,
			shouldSetHeightVar: true,
			// Collapse first, then drop the closing state — same flush, so a row never
			// snaps back to full height before it unmounts.
			onDone: () => {
				apply();
				cleanup();
			}
		});
		const entry = { handle, apply, targets };
		for (const t of targets) this.#closingHandles.set(t, entry);
		return handle.finished.then((isDone) => {
			if (!isDone) cleanup();
		});
	}

	/**
	 * Before an expand: settle the pending collapses that involve `paths` (the same node, an
	 * ancestor or a descendant; `null` = all). A pending collapse of exactly ONE of these nodes
	 * is cancelled — a re-expand mid-animation, it simply stays open. Any other one (e.g. a
	 * collapseAll in flight) is applied NOW, so calls keep their order: `collapseAll();
	 * expandNodes(x)` ends exactly as it does without motion. Returns whether one was cancelled.
	 */
	private _commitPendingCollapses(paths: readonly string[] | null): boolean {
		const sep = this.treePathSeparator || '.';
		const isRelated = (t: string) =>
			paths == null || paths.some((p) => isSelfOrDescendant(p, t, sep) || isSelfOrDescendant(t, p, sep));
		const entries = new Set(this.#closingHandles.values());
		let isCancelled = false;
		for (const entry of entries) {
			if (!entry.targets.some(isRelated)) continue;
			const isReExpand = paths != null && entry.targets.length === 1 && paths.includes(entry.targets[0]);
			entry.handle.cancel(); // class + inert off; core's onDone never runs
			for (const t of entry.targets) if (this.#closingHandles.get(t) === entry) this.#closingHandles.delete(t);
			if (isReExpand) isCancelled = true;
			else entry.apply();
		}
		return isCancelled;
	}

	/** The visible nodes in display order (expanded + search filter applied) — a snapshot. */
	getVisibleFlatNodes(): LTreeNode<T>[] {
		return [...this.allFlatNodes];
	}

	/** The underlying LTree (advanced use). */
	getTree(): Ltree<T> {
		return this.tree;
	}

	/** Every ancestor of `node` is expanded (its row can be rendered). */
	private _isAncestryExpanded(node: LTreeNode<T>): boolean {
		let parentPath = node.parentPath;
		while (parentPath) {
			const p = this.tree?.getNodeByPath(parentPath);
			if (!p) return false;
			if (!p.isExpanded) return false;
			parentPath = p.parentPath;
		}
		return true;
	}

	/** Whether `path` has an async `beforeExpandCallback` in flight (it shows the loading state). */
	isExpandPending(path: string): boolean {
		return this.expandPendingPaths.has(path);
	}

	private _dispatchExpandEvent(kind: 'expand' | 'collapse', node: LTreeNode<T>): void {
		const handler = kind === 'expand' ? this.onNodeExpandHandler : this.onNodeCollapseHandler;
		handler?.(this._ctx(this.getNodeRef(node)));
	}

	/** Expand `paths` (no gate) and fire `onNodeExpand` for each node that changed. */
	private _expandWithEvents(paths: string[], options?: ExpandOptions): void {
		const sep = this.treePathSeparator || '.';
		const changing = new Map<string, LTreeNode<T>>();
		for (const p of paths) {
			for (const prefix of getPathChain(p, sep)) {
				if (changing.has(prefix)) continue;
				const n = this.tree?.getNodeByPath(prefix);
				if (!n) break;
				if (!n.isExpanded && n.hasChildren) changing.set(prefix, n);
			}
		}
		this._animateExpand(() => this.tree.expandNodes(paths, options));
		if (!options?.isSilent)
			for (const n of changing.values()) if (n.isExpanded) this._dispatchExpandEvent('expand', n);
		this._reconcileExpanded(options?.isSilent);
	}

	/**
	 * Row animation: run an expand and record the rows it made visible (the first
	 * `maxAnimatedRowCount` in visible order) as the reveal. Nested calls (the accordion
	 * toggle → _expandWithEvents) record once, around the outermost. Nothing to animate
	 * (duration 0s — motion "none", reduced motion, the token — or a limit of 0) → just
	 * `apply()`, so a motion-off tree never builds the before-set.
	 */
	private _animateExpand(apply: () => void): void {
		if (this.#revealDepth > 0 || !this.tree || !this._isRowAnimationEnabled()) {
			apply();
			return;
		}
		const before = new Set<string>();
		for (const n of this.tree.visibleFlatNodes) before.add(n.path);
		this.#revealDepth++;
		try {
			apply();
		} finally {
			this.#revealDepth--;
		}
		const limit = Math.max(0, this.maxAnimatedRowCount ?? 50);
		const revealed = new Set<string>();
		if (limit > 0)
			for (const n of this.tree.visibleFlatNodes) {
				if (before.has(n.path)) continue;
				revealed.add(n.path);
				if (revealed.size >= limit) break;
			}
		if (revealed.size === 0) return;
		this.revealedPaths = revealed;
		const generation = ++this.#revealGeneration;
		// Clear the reveal once the rows played (a row re-mounted later — re-key, scroll
		// back — must not replay). The duration is read back from CSS (core
		// readAnimationMs): 0 under motion="none" / reduced motion → cleared at once.
		void tick().then(() => {
			if (generation !== this.#revealGeneration) return;
			const row = this.containerElement?.querySelector('.stv__node--opening');
			const ms = row ? readAnimationMs(row) : 0;
			uiLogger.debug('Row animation: reveal', { rows: revealed.size, ms });
			setTimeout(() => {
				if (generation !== this.#revealGeneration) return;
				this.revealedPaths = new Set();
			}, ms + 50);
		});
	}

	/** Rows animate: a limit above 0 and a resolved `--stv-row-animation-duration` above 0s. */
	private _isRowAnimationEnabled(): boolean {
		if ((this.maxAnimatedRowCount ?? 50) <= 0) return false;
		const el = this.containerElement;
		if (!el || typeof getComputedStyle !== 'function') return false;
		const raw = getComputedStyle(el).getPropertyValue('--stv-row-animation-duration').trim();
		const value = parseFloat(raw);
		return Number.isFinite(value) && value > 0;
	}

	/** The expand half of a UI toggle, after the gate: accordion side-effect + expand + events. */
	private _expandFromToggle(path: string, options?: ExpandOptions): void {
		const node = this.tree?.getNodeByPath(path);
		if (!node || node.isExpanded) return;
		if (options?.isExclusive) {
			this._expandWithEvents([path], options);
			return;
		}
		const collapsedSiblings: LTreeNode<T>[] = [];
		this._animateExpand(() => {
			if (this.shouldExpandAsAccordion) {
				for (const sibling of this.tree.getSiblings(path)) {
					if (sibling.path !== path && sibling.isExpanded && this.tree.getNodeIsCollapsible(sibling)) {
						sibling.isExpanded = false;
						bumpRev(sibling);
						collapsedSiblings.push(sibling);
					}
				}
			}
			node.isExpanded = true;
			bumpRev(node);
			this.tree.refresh();
		});
		if (!options?.isSilent) {
			for (const s of collapsedSiblings) this._dispatchExpandEvent('collapse', s);
			this._dispatchExpandEvent('expand', node);
		}
		this._reconcileExpanded(options?.isSilent);
	}

	/**
	 * Run `beforeExpandCallback` for `node`. Sync answer: `true` (the caller applies) /
	 * `false` (cancelled; a throw counts as false). Async: marks the node pending (loading
	 * state) and returns a Promise; on settle the mark clears and `applyLater()` runs unless
	 * the hook resolved `false` (a rejection counts as false). A pending node answers `false`.
	 */
	private _checkBeforeExpand(node: LTreeNode<T>, applyLater: () => void): boolean | Promise<boolean> {
		const path = node.path;
		if (this.expandPendingPaths.has(path)) return false;
		const cb = this.beforeExpandHandler;
		if (!cb) return true;
		let result: unknown;
		try {
			result = cb(this._ctx(this.getNodeRef(node)));
		} catch (err) {
			uiLogger.error(`[Tree ${this.treeId}] beforeExpandCallback threw — the node stays collapsed`, err);
			return false;
		}
		if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
			this.expandPendingPaths = new Set([...this.expandPendingPaths, path]);
			bumpRev(node);
			this.tree.refresh();
			return Promise.resolve(result as PromiseLike<unknown>)
				.then(
					(v) => v !== false,
					(err) => {
						uiLogger.error(`[Tree ${this.treeId}] beforeExpandCallback rejected — the node stays collapsed`, err);
						return false;
					}
				)
				.then((isAllowed) => {
					const next = new Set(this.expandPendingPaths);
					next.delete(path);
					this.expandPendingPaths = next;
					const live = this.tree?.getNodeByPath(path) ?? null;
					if (live) bumpRev(live);
					if (isAllowed && live) applyLater();
					this.tree?.refresh();
					return isAllowed && !!live;
				});
		}
		return result !== false;
	}

	/**
	 * Re-derive `expandedPaths` from the tree. When the set changed: update it and fire
	 * `onExpandedChange` — unless `isSilent` (re-baseline only) or this is the first sync
	 * (the baseline).
	 */
	private _reconcileExpanded(isSilent?: boolean): void {
		if (!this.tree) return;
		const paths = this.tree.getExpandedPaths();
		const key = paths.join('\u0000');
		if (key === this.#lastExpandedKey) return;
		const isFirst = this.#lastExpandedKey === undefined;
		this.#lastExpandedKey = key;
		const set = new Set(paths);
		this.expandedPaths = set;
		if (isFirst || isSilent) return;
		this.onExpandedChangeHandler?.(this._ctx({ paths: set }));
	}

	/** @internal Replace the expanded state with `paths` (assigning `expandedPaths`) — silent. */
	_replaceExpandedPaths(paths: Iterable<string>): void {
		if (!this.tree) return;
		this.tree.setExpandedPaths([...paths]);
		this._reconcileExpanded(true);
	}

	/** Attach the `controller` to a callback / event context — non-enumerable (like web-treeview's
	 *  component context): destructuring works, JSON / Object.keys / a spread see only the data.
	 *  A spread therefore drops it — re-attach with `_ctx` after spreading. */
	private _ctx<C extends object>(ctx: C): C & TreeCallbackContext<T> {
		const out = { ...ctx } as C & TreeCallbackContext<T>;
		Object.defineProperty(out, 'controller', { value: this.controller, enumerable: false, configurable: true, writable: true });
		return out;
	}

	/** @internal Wrap a per-node / data callback so its ctx carries `controller` (memoized per fn). */
	_withController<C extends object, R>(
		fn: ((ctx: C & TreeCallbackContext<T>) => R) | null | undefined
	): ((ctx: C) => R) | undefined {
		if (typeof fn !== 'function') return undefined;
		let wrapped = this.#ctrlWrapped.get(fn);
		if (!wrapped) {
			const proto = this.#ctxProto;
			wrapped = (ctx: object) => fn(Object.assign(Object.create(proto), ctx));
			this.#ctrlWrapped.set(fn, wrapped);
		}
		return wrapped as (ctx: C) => R;
	}
	#ctrlWrapped = new WeakMap<Function, (ctx: object) => unknown>();
	/** Prototype of the per-node ctx: `controller` inherited (cheap, non-enumerable). */
	#ctxProto: object = Object.defineProperty({}, 'controller', { get: () => this.controller });

	filterNodes(term: string, searchOptions?: SearchOptions): void {
		this.tree?.filterNodes(term, searchOptions);
	}

	searchNodes(
		term: string | null | undefined,
		searchOptions?: SearchOptions
	): LTreeNode<T>[] {
		return this.tree?.searchNodes(term, searchOptions) || [];
	}

	getChildren(parentPath: string): LTreeNode<T>[] {
		return this.tree?.getChildren(parentPath) || [];
	}

	getSiblings(path: string): LTreeNode<T>[] {
		return this.tree?.getSiblings(path) || [];
	}

	/**
	 * Build the shared { path, node, parent, siblings } pointer for a node the tree already
	 * holds — used to give on* events and the clipboard callbacks the same relational context.
	 * Pass the live node (preferred) or just a path (e.g. a pre-removal snapshot, where the
	 * node is gone and only the path is known). Missing parent/siblings resolve to null/[].
	 */
	getNodeRef(nodeOrPath: LTreeNode<T> | string | null): NodeRef<T> {
		const node =
			typeof nodeOrPath === 'string' ? (this.tree?.getNodeByPath(nodeOrPath) ?? null) : nodeOrPath;
		if (!node) {
			return {
				path: typeof nodeOrPath === 'string' ? nodeOrPath : '',
				node: null,
				parent: null,
				siblings: []
			};
		}
		const parentPath = node.parentPath;
		return {
			path: node.path,
			node,
			parent: parentPath ? (this.tree?.getNodeByPath(parentPath) ?? null) : null,
			siblings: this.getChildren(parentPath ?? '')
		};
	}

	/**
	 * The effective top-level set being dragged: when the grabbed node is part of a
	 * same-tree multi-selection, the draggable top-level selected subtrees (the same set
	 * the multi-drag move loop uses); otherwise just the grabbed node. Used to populate
	 * `dragged` on the drag/drop event contexts. Call BEFORE a move mutates the selection.
	 */
	private _draggedTopLevel(draggedNode: LTreeNode<T>): LTreeNode<T>[] {
		const isSameTree = draggedNode.treeId === this.treeId;
		if (
			isSameTree &&
			this.selectedPaths.has(draggedNode.path) &&
			this.selectedPaths.size > 1
		) {
			const set = this._getTopLevelSelectedPaths()
				.map((p) => this.tree?.getNodeByPath(p) ?? null)
				.filter((n): n is LTreeNode<T> => !!n && this.getNodeIsDraggable(n));
			if (set.length) return set;
		}
		return [draggedNode];
	}

	/**
	 * The full top-level dragged set as NodeRefs, correct for BOTH same-tree and
	 * cross-tree drags — the single source of `ctx.dragged` on drag start/over/drop.
	 * Same-tree reads the live selection (nodes resolve). Cross-tree can't see the
	 * source's selection, so it reads the paths the source published on drag start
	 * (getDragSet) and builds path-only refs (node/parent null cross-tree, as documented);
	 * falls back to the lead node alone when no set was published (e.g. touch). Call
	 * BEFORE a move mutates the selection.
	 */
	private _draggedRefs(draggedNode: LTreeNode<T> | null): NodeRef<T>[] {
		if (!draggedNode) return [];
		if (draggedNode.treeId === this.treeId) {
			// A beforeDragStartCallback override is authoritative: resolve its paths directly
			// (bypassing the selection-derived set AND the per-node isDraggable gate, since a
			// forced-in node is the whole point). Skips paths that no longer resolve.
			if (this._dragSetOverride) {
				return this._dragSetOverride
					.map((p) => this.tree?.getNodeByPath(p) ?? null)
					.filter((n): n is LTreeNode<T> => !!n)
					.map((n) => this.getNodeRef(n));
			}
			return this._draggedTopLevel(draggedNode).map((n) => this.getNodeRef(n));
		}
		const set = getDragSet();
		const paths = set && set.sourceTreeId === draggedNode.treeId ? set.paths : [draggedNode.path];
		return paths.map((p) => this.getNodeRef(p));
	}

	/**
	 * Normalize a consumer-supplied drag manifest (from beforeDragStartCallback): dedupe and
	 * guarantee `leadPath` is present (you can prune siblings but not the node under the cursor).
	 * Descendants are KEPT — the manifest is handed straight to moveNodes, which resolves refs up
	 * front (no stale paths, so the old descendant-drop is unnecessary) and treats a descendant
	 * ABSENT from the manifest as a hole (left behind). Order is preserved (= landing order); the
	 * lead is appended only if the callback dropped it.
	 */
	private _validateDragManifest(paths: string[], leadPath: string): string[] {
		const seen = new Set<string>();
		const deduped: string[] = [];
		for (const p of paths) {
			if (!seen.has(p)) {
				seen.add(p);
				deduped.push(p);
			}
		}
		if (!seen.has(leadPath)) deduped.push(leadPath);
		return deduped;
	}

	/**
	 * Execute a beforeDropCallback `DropGroup[]` (content-addressed routing). For each group,
	 * move every same-tree path to `group.targetPath` at `group.position` (default 'child'); the
	 * first path lands at the target and the rest chain 'after' the previously moved node so group
	 * order is preserved (mirrors the multi-drag move loop). Cross-tree paths (not in this tree)
	 * can't be auto-moved and are skipped — the consumer places those in onNodeDrop. Fires
	 * onNodeDrop once with all placed nodes. Returns true when every attempted move succeeded.
	 */
	private _processDropGroups(
		groups: DropGroup[],
		dispatchDrop: (dropped: LTreeNode<T>[] | null) => void
	): boolean {
		// Resolve every target + source to a LIVE node reference BEFORE moving anything: each
		// moveNode reassigns sibling paths, so a path string captured for a not-yet-processed
		// group would go stale. Nodes mutate their .path in place, so a held reference stays valid.
		const resolved = groups
			.filter((g) => g?.targetPath && g.paths?.length)
			.map((g) => ({
				targetNode: this.tree?.getNodeByPath(g.targetPath) ?? null,
				targetPath: g.targetPath,
				position: g.position ?? ('child' as DropPosition),
				nodes: g.paths
					.map((p) => this.tree?.getNodeByPath(p) ?? null)
					.filter((n): n is LTreeNode<T> => !!n)
			}));

		// Each group's paths are whole-subtree roots, so complete the manifest (no holes) and
		// hand it to moveNodes. Reading held refs' live .path keeps cross-group moves correct.
		const movedNodes: LTreeNode<T>[] = [];
		let allOk = true;
		this._mutate(() => {
			for (const group of resolved) {
				if (!group.nodes.length) continue;
				const manifest = this._getPathsWithDescendants(group.nodes.map((n) => n.path));
				const r = this.moveNodes(
					manifest,
					group.targetNode?.path ?? group.targetPath,
					group.position
				);
				movedNodes.push(...r.movedNodes);
				if (!r.success) allOk = false;
			}
		});
		dispatchDrop(movedNodes.length ? movedNodes : null);
		return allOk;
	}

	refreshSiblings(parentPath: string): void {
		this.tree?.refreshSiblings(parentPath);
	}

	/** Auto-sort on/off (see the `isSortingEnabled` prop). Lives on the tree engine. */
	get isSortingEnabled(): boolean {
		return this.tree?.isSortingEnabled ?? true;
	}
	set isSortingEnabled(value: boolean) {
		if (this.tree) this.tree.isSortingEnabled = value;
	}

	/** Sort the children of each node — one level (`''` = the root level). Default rule = the
	 *  tree's own (`sortCallback` → `orderMember` → `Intl.Collator(numeric)` by display value);
	 *  `compareCallback` / `direction` override it. Runs even with `isSortingEnabled = false`. */
	sortNodes(paths: string | string[], options?: SortOptions<T>): void {
		this._processSort(() => this.tree?.sortNodes(paths, options) ?? [], options);
	}

	/** Sort whole subtrees — the given nodes' children at every depth; `null` / omitted = the
	 *  whole tree. Same rule / options as `sortNodes`. */
	sortAll(paths?: string | string[] | null, options?: SortOptions<T>): void {
		this._processSort(() => this.tree?.sortAll(paths, options) ?? [], options);
	}

	private _processSort(run: () => NodesSortContext<T>[], options?: SortOptions<T>): void {
		const reorders = this._mutate(run);
		if (options?.isSilent || !this.onNodesSortHandler) return;
		for (const ctx of reorders) this.onNodesSortHandler(this._ctx(ctx));
	}

	refreshNode(path: string): void {
		this.tree?.refreshNode(path);
	}

	getNodeByPath(path: string): LTreeNode<T> | null {
		return this.tree?.getNodeByPath(path) || null;
	}

	// ── Tree editor mutation methods ────────────────────────────────────

	moveNode(
		sourcePath: string,
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; error?: string } {
		return this._mutate(() => this._moveNode(sourcePath, targetPath, position));
	}

	private _moveNode(
		sourcePath: string,
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; error?: string } {
		// Capture the affected path set BEFORE the move: any selected /
		// selected path that is the source itself or a descendant of it needs
		// to be remapped onto the new location. Without this the path Sets
		// keep stale strings after a multi-drag, so subsequent operations work
		// on dangling paths and `_setSelection` can't find the moved
		// nodes to reset their isSelected flag. Mirrors web-treeview's fix.
		const sourceNode = this.tree?.getNodeByPath(sourcePath);
		const sep = this.treePathSeparator;
		const collect = (paths: Set<string>): Map<string, string> => {
			const m = new Map<string, string>();
			for (const p of paths) {
				if (isSelfOrDescendant(p, sourcePath, sep)) {
					m.set(p, p.substring(sourcePath.length));
				}
			}
			return m;
		};
		const selectionAffected = collect(this.selectedPaths);
		const checkedAffected = collect(this.allCheckedPaths);
		const shiftCursorSuffix =
			this._shiftCursor && selectionAffected.has(this._shiftCursor)
				? selectionAffected.get(this._shiftCursor)
				: undefined;
		// Capture the focused node's relative offset too. We can't rely on the held
		// LTreeNode reference "auto-recovering" via in-place .path mutation: a tree
		// rebuild between selection and move orphans focusedNode (a stale object the
		// move never touches), so its .path stays at the old location and the focus
		// styling vanishes. Remap by path like the selection, re-fetching the
		// live node afterwards.
		const focusedSuffix =
			this.focusedNode &&
			isSelfOrDescendant(this.focusedNode.path, sourcePath, sep)
				? this.focusedNode.path.substring(sourcePath.length)
				: undefined;

		const result = this.tree?.moveNode(sourcePath, targetPath, position) || {
			success: false,
			error: 'Tree not initialized'
		};

		if (result.success && sourceNode) {
			const newPath = sourceNode.path; // tree.moveNode mutates this in place
			if (selectionAffected.size > 0) {
				const next = new Set(this.selectedPaths);
				for (const [oldP, suffix] of selectionAffected) {
					next.delete(oldP);
					next.add(newPath + suffix);
				}
				this.selectedPaths = next; // reassign for $state.raw reactivity
			}
			if (checkedAffected.size > 0) {
				const next = new Set(this.allCheckedPaths);
				for (const [oldP, suffix] of checkedAffected) {
					next.delete(oldP);
					next.add(newPath + suffix);
				}
				this.allCheckedPaths = next;
			}
			if (shiftCursorSuffix !== undefined) {
				this._shiftCursor = newPath + shiftCursorSuffix;
			}
			// Re-point focus at the live node now sitting at the new path. Reassigning
			// (rather than trusting in-place mutation) both refreshes a stale orphan
			// reference and triggers $state.raw reactivity so the focus styling and
			// bound focusedNode follow the move.
			if (focusedSuffix !== undefined) {
				const liveFocused = this.tree?.getNodeByPath(newPath + focusedSuffix);
				if (liveFocused) {
					// Usually the SAME object (tree.moveNode rewrites its path in place), and
					// $state.raw ignores a same-reference write — clear first so bind:focusedNode
					// re-emits with the new path.
					this.focusedNode = null;
					this.focusedNode = liveFocused;
				}
			}
		}
		return result;
	}

	/**
	 * Expand a set of paths into a COMPLETE manifest: every descendant of every member is
	 * added. moveNodes treats a manifest as authoritative — a descendant that is present
	 * rides along, one that is ABSENT is a hole — so callers that just want to move whole
	 * subtrees (multi-drag, DropGroup routing) must complete their set first, otherwise every
	 * unlisted descendant would be read as a hole and left behind.
	 */
	private _getPathsWithDescendants(paths: string[]): string[] {
		if (!this.tree) return paths;
		const set = new Set<string>(paths);
		for (const p of paths) {
			const n = this.tree.getNodeByPath(p);
			if (n) for (const dp of getDescendantPaths(n)) set.add(dp);
		}
		return [...set];
	}

	/**
	 * Complete a set of top-level dragged refs into the flattened manifest of live NodeRefs —
	 * every descendant included — for beforeDragStartCallback's ctx.dragged. The consumer filters
	 * this set and returns the kept manifest; whatever it drops from a moved subtree becomes a
	 * hole (left behind by moveNodes). Same-tree only (nodes are live at drag start).
	 */
	private _getDraggedRefsWithDescendants(refs: NodeRef<T>[]): NodeRef<T>[] {
		return this._getPathsWithDescendants(refs.map((r) => r.path)).map((p) => this.getNodeRef(p));
	}

	/**
	 * Batch-move a COMPLETE manifest of nodes under a target, honoring "holes".
	 *
	 * `paths` is a complete manifest (see _getPathsWithDescendants): every descendant of every moved
	 * node is expected to be present. Any real descendant of a moved subtree that is ABSENT
	 * from the manifest is a hole — it is LEFT BEHIND by re-homing it to its moved root's OLD
	 * parent (option ii: it physically stays where the subtree used to be) instead of
	 * travelling with the subtree. A complete (unfiltered) manifest has no holes → whole
	 * subtrees move, exactly as before.
	 *
	 * Every source + target is resolved to a live LTreeNode ref up front, so intermediate path
	 * reassignment (moveNode mutates .path in place) can't stale later items — no dedup needed.
	 * Cross-tree nodes (treeId mismatch) are skipped for the consumer to place. Roots (manifest
	 * entries whose parent is not itself in the manifest) are the subtrees physically moved:
	 * the first lands at target/position, the rest chain 'after' to preserve source order.
	 * Selection / checked / focus remap happens per-move inside moveNode().
	 */
	moveNodes(
		paths: string[],
		targetPath: string,
		position: DropPosition
	): { success: boolean; movedNodes: LTreeNode<T>[]; leftBehind: LTreeNode<T>[]; error?: string } {
		return this._mutate(() => this._moveNodes(paths, targetPath, position));
	}

	private _moveNodes(
		paths: string[],
		targetPath: string,
		position: DropPosition
	): { success: boolean; movedNodes: LTreeNode<T>[]; leftBehind: LTreeNode<T>[]; error?: string } {
		const tree = this.tree;
		if (!tree)
			return { success: false, movedNodes: [], leftBehind: [], error: 'Tree not initialized' };

		const manifest = new Set(paths);

		// Resolve up front; skip unresolved / cross-tree nodes (consumer owns those).
		const resolved = paths
			.map((p) => tree.getNodeByPath(p))
			.filter((n): n is LTreeNode<T> => !!n && n.treeId === this.treeId);
		let allOk = resolved.length === paths.length;

		// Roots = manifest nodes whose parent path is not itself in the manifest.
		const roots = resolved.filter((n) => !n.parentPath || !manifest.has(n.parentPath));

		// Holes: a descendant whose PARENT is in the manifest (kept) but which is itself ABSENT
		// is a boundary hole — it would ride along unless extracted. Resolve to live refs up
		// front and remember its moved root's OLD parent, so we can re-home it there (option ii).
		// Its own descendants follow it, so only the boundary is recorded.
		const holes: { node: LTreeNode<T>; toParent: string }[] = [];
		for (const root of roots) {
			const oldParent = root.parentPath ?? '';
			for (const dp of getDescendantPaths(root)) {
				if (manifest.has(dp)) continue;
				const parent = getParentPath(dp, this.treePathSeparator) ?? '';
				if (!manifest.has(parent)) continue; // parent is also a hole → rides along inside it
				const node = tree.getNodeByPath(dp);
				if (node) holes.push({ node, toParent: oldParent });
			}
		}

		// Re-home the holes BEFORE moving the roots, so the subtree moves no longer carry them.
		const leftBehind: LTreeNode<T>[] = [];
		for (const hole of holes) {
			const r = this.moveNode(hole.node.path, hole.toParent, 'child');
			if (r.success) leftBehind.push(hole.node);
			else allOk = false;
		}

		// Move the roots: first at target/position, the rest chain 'after' the previous one.
		const movedNodes: LTreeNode<T>[] = [];
		let prevMovedNode: LTreeNode<T> | null = null;
		for (const root of roots) {
			const tp = prevMovedNode ? prevMovedNode.path : targetPath;
			const pos: DropPosition = prevMovedNode ? 'after' : position;
			const r = this.moveNode(root.path, tp, pos);
			if (r.success) {
				prevMovedNode = root; // moveNode mutates in place → root.path is the new path
				movedNodes.push(root);
			} else {
				allOk = false;
			}
		}

		return { success: allOk, movedNodes, leftBehind };
	}

	/**
	 * Batch-DUPLICATE a COMPLETE manifest of nodes under a target — the copy-side twin of
	 * moveNodes. (Named `duplicateNodes`, not `copyNodes`: the latter is the clipboard
	 * "copy to clipboard" op; this one duplicates a subtree straight into a destination.)
	 *
	 * `paths` is a complete manifest (see _getPathsWithDescendants): every descendant of every copied
	 * root is expected to be present. A descendant that is ABSENT from the manifest is a hole —
	 * but unlike a move (which re-homes the omitted node so it physically stays), a copy has
	 * nothing to re-home: the source never leaves, so the hole is simply NOT copied. Omission =
	 * "don't duplicate this node (and its subtree)".
	 *
	 * Roots (manifest entries whose parent is not itself in the manifest) are the subtrees
	 * duplicated: the first lands at target/position, the rest chain 'after' the previous copy to
	 * preserve source order. Each node's data flows through `transform` (the INPUT transform) with
	 * a full NodeTransformContext — return new data (fresh ids/names) or null to skip that node.
	 *
	 * `sourceTree` defaults to this tree (same-tree copy); pass another tree's Ltree to copy its
	 * live nodes into this one (cross-tree). Source refs are read live off `sourceTree`, so the
	 * manifest paths are resolved in the source tree's path space.
	 */
	duplicateNodes(
		paths: string[],
		targetPath: string,
		position: DropPosition,
		transform?: NodeTransformCallback<T> | null,
		sourceTree?: Ltree<T>
	): { success: boolean; copiedNodes: LTreeNode<T>[]; skipped: number; error?: string } {
		const tree = this.tree;
		if (!tree)
			return { success: false, copiedNodes: [], skipped: 0, error: 'Tree not initialized' };
		const src = sourceTree ?? tree;
		const manifest = new Set(paths);

		// Resolve source nodes up front from the source tree; roots = manifest entries whose
		// parent isn't itself in the manifest (the subtrees we physically duplicate).
		const resolved = paths.map((p) => src.getNodeByPath(p)).filter((n): n is LTreeNode<T> => !!n);
		const roots = resolved.filter((n) => !n.parentPath || !manifest.has(n.parentPath));
		if (!roots.length)
			return { success: false, copiedNodes: [], skipped: 0, error: 'No source roots resolved' };

		const result = this._mutate(() =>
			this._duplicateSubtrees(
				roots.map((node, index) => ({ node, rootIndex: index })),
				this._leafAwareTarget(targetPath, position),
				position,
				{
					operation: 'copy',
					// An absent descendant is a hole → NOT copied (node + subtree).
					isIncluded: (n) => manifest.has(n.path),
					sourceRef: (n) => this._nodeRefIn(src, n),
					transform: transform ?? null
				}
			)
		);
		const copiedNodes = result.copied.filter((n): n is LTreeNode<T> => !!n);
		return {
			success: copiedNodes.length > 0,
			copiedNodes,
			skipped: result.skipped,
			error: copiedNodes.length === 0 ? (result.lastError ?? 'No nodes copied') : undefined
		};
	}

	/** Default INPUT transform for a copy-drop when the consumer supplies no
	 *  nodeInputTransformationCallback: uniquify the id so the duplicate doesn't collide with
	 *  the original. Consumers override to derive real ids/names (or return null to skip). */
	private _defaultCopyTransform = ({ data }: { data: T }): T => {
		const idKey = this.tree?.idMember || 'id';
		const raw = data as Record<string, unknown>;
		return { ...raw, [idKey]: `${raw[idKey]}_copy_${Date.now()}` } as T;
	};

	/** NodeRef of `node` read off `tree` (another tree for a cross-tree copy); `getNodeRef` for
	 *  this one. A null node (not reachable — cross-tree paste, a cut source) = a path-only ref. */
	private _nodeRefIn(tree: Ltree<T> | null | undefined, node: LTreeNode<T> | null, path?: string): NodeRef<T> {
		if (!node || !tree) return { path: node?.path ?? path ?? '', node: null, parent: null, siblings: [] };
		if (tree === this.tree) return this.getNodeRef(node);
		const parentPath = node.parentPath;
		return {
			path: node.path,
			node,
			parent: parentPath ? (tree.getNodeByPath(parentPath) ?? null) : null,
			siblings: tree.getChildren(parentPath ?? '')
		};
	}

	/** NodeRef of a landing anchor in this tree; `''` = the tree root (node null, siblings = the
	 *  top-level nodes). */
	private _anchorRef(path: string): NodeRef<T> {
		if (!path) return { path: '', node: null, parent: null, siblings: this.getChildren('') };
		return this.getNodeRef(path);
	}

	/**
	 * Leaf-aware landing: a 'child' landing on a node that does not allow 'child' drops
	 * (getNodeAllowedDropPositions — e.g. a file) lands beside it, inside its parent. One
	 * allowed-positions config governs drag-drop, copy-drop and paste. No restriction = child.
	 */
	private _leafAwareTarget(targetPath: string, position: DropPosition): string {
		if (position !== 'child' || targetPath === '') return targetPath;
		const target = this.tree?.getNodeByPath(targetPath);
		if (!target) return targetPath;
		return this.tree.isDropPositionAllowed(target, 'child') ? targetPath : (target.parentPath ?? '');
	}

	/**
	 * THE subtree insert behind duplicateNodes and pasteNodes (call inside `_mutate`).
	 * Duplicates each root with its descendants: the first lands at `targetPath` / `position`
	 * ('child' = appended under it; 'before' / 'after' = next to it), the rest chain 'after'
	 * the previous copy, so the source order is kept. Each node's data runs through the INPUT
	 * transform with a NodeTransformContext: a root sees the anchor + `position`, a descendant
	 * its new parent + 'child' (so `target` is always where THIS node lands — batch-aware, it
	 * includes nodes added earlier in the same call). `isIncluded` false or a transform
	 * returning null skips that node and its subtree.
	 * `skipped` counts the nodes refused (transform null, add failed) — not the descendants
	 * that go with them, nor a node `isIncluded` leaves out (a hole is not a failure).
	 */
	private _duplicateSubtrees(
		roots: { node: LTreeNode<T>; rootIndex: number }[],
		targetPath: string,
		position: DropPosition,
		options: {
			operation: 'copy' | 'cut';
			isIncluded?: (node: LTreeNode<T>) => boolean;
			sourceRef: (node: LTreeNode<T>) => NodeRef<T>;
			transform: NodeTransformCallback<T> | null;
		}
	): { copied: (LTreeNode<T> | null)[]; count: number; skipped: number; lastError?: string } {
		const tree = this.tree;
		const parentPath =
			position === 'child' ? targetPath : (tree.getNodeByPath(targetPath)?.parentPath ?? '');
		const copied: (LTreeNode<T> | null)[] = [];
		let count = 0;
		let skipped = 0;
		let lastError: string | undefined;
		let prevRootPath: string | null = null;

		for (const { node: root, rootIndex } of roots) {
			const siblingPath = prevRootPath ?? (position !== 'child' ? targetPath : undefined);
			const rootPosition: 'before' | 'after' | undefined =
				prevRootPath !== null ? 'after' : position !== 'child' ? position : undefined;
			let accepted = 0;
			const wrapped = ({
				data,
				node,
				targetParentPath
			}: {
				data: T;
				node: LTreeNode<T>;
				targetParentPath: string;
			}): T | null => {
				const isRoot = node === root;
				if (options.isIncluded && !options.isIncluded(node)) return null; // a hole: left out on purpose
				const result = options.transform
					? options.transform(
							this._ctx({
								data,
								operation: options.operation,
								phase: 'input',
								isRoot,
								rootIndex,
								position: isRoot ? position : 'child',
								source: options.sourceRef(node),
								target: this._anchorRef(isRoot ? targetPath : targetParentPath)
							})
						)
					: data;
				if (result === null || result === undefined) skipped++;
				else accepted++;
				return result;
			};
			const result = tree.duplicateNode(root, parentPath, wrapped, siblingPath, rootPosition);
			count += result.count;
			skipped += accepted - result.count; // accepted by the transform, but the add failed
			if (result.success && result.rootNode) {
				copied.push(result.rootNode);
				prevRootPath = result.rootNode.path;
			} else {
				copied.push(null);
				lastError = result.error;
			}
		}
		return { copied, count, skipped, lastError };
	}

	removeNode(path: string): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return this._mutate(() => {
			const result = this.tree?.removeNode(path) || {
				success: false,
				error: 'Tree not initialized'
			};
			return result;
		});
	}

	addNode(
		parentPath: string,
		nodeData: T,
		pathSegment?: string
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return this._mutate(() => {
			const result = this.tree?.addNode(parentPath, nodeData, pathSegment) || {
				success: false,
				error: 'Tree not initialized'
			};
			return result;
		});
	}

	updateNode(
		path: string,
		dataUpdates: Partial<T>
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return this._mutate(() => {
			const result = this.tree?.updateNode(path, dataUpdates) || {
				success: false,
				error: 'Tree not initialized'
			};
			return result;
		});
	}

	processChanges(changes: TreeChange<T>[]): ProcessChangesResult {
		return this._mutate(() => {
			const result = this.tree?.processChanges(changes) || { successful: 0, failed: [] };
			return result;
		});
	}

	duplicateNode(
		sourceNode: LTreeNode<T>,
		targetParentPath: string,
		transformData: (ctx: { data: T; node: LTreeNode<T>; targetParentPath: string }) => T | null,
		siblingPath?: string,
		position?: 'before' | 'after'
	): { success: boolean; rootNode?: LTreeNode<T>; count: number; error?: string } {
		return this._mutate(() => {
			const result = this.tree?.duplicateNode(
				sourceNode,
				targetParentPath,
				transformData,
				siblingPath,
				position
			) || { success: false, count: 0, error: 'Tree not initialized' };
			return result;
		});
	}

	// ── Bulk subtree operations ─────────────────────────────────────────

	/** Insert one node before / after `targetPath`, or as its child (`orderMember`: an order value
	 *  between the neighbours; otherwise placed directly next to the target). */
	insertNode(
		targetPath: string,
		nodeData: T,
		position: InsertPosition
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return this._mutate(() => {
			const result = this.tree?.insertNode(targetPath, nodeData, position) || {
				success: false,
				error: 'Tree not initialized'
			};
			return result;
		});
	}

	/** Insert a branch (flat rows with ltree paths) before / after `targetPath`, or under it.
	 *  The block keeps its internal order. */
	insertBranch(targetPath: string, data: T[], position: InsertPosition): InsertBranchResult<T> {
		return this._mutate(() => {
			const result = this.tree?.insertBranch(targetPath, data, position) || {
				success: false,
				count: 0,
				failed: [],
				parentNode: null
			};
			return result;
		});
	}

	/** Add a branch (flat rows with ltree paths) under `parentPath` ('' = root), sorted. */
	addBranch(parentPath: string, data: T[]): InsertBranchResult<T> {
		return this._mutate(() => {
			const result = this.tree?.addBranch(parentPath, data) || {
				success: false,
				count: 0,
				failed: [],
				parentNode: null
			};
			return result;
		});
	}

	replaceBranch(parentPath: string, data: T[]): ReplaceBranchResult<T> {
		return this._mutate(() => {
			const result: ReplaceBranchResult<T> = this.tree?.replaceBranch(parentPath, data) || {
				success: false,
				count: 0,
				failed: [],
				parentNode: null,
				removed: 0,
				added: 0,
				error: 'Tree not initialized'
			};
			return result;
		});
	}

	removeBranch(path: string, options?: RemoveBranchOptions): RemoveBranchResult<T> {
		return this._mutate(() => {
			const result = this.tree?.removeBranch(path, options) || {
				success: false,
				count: 0,
				error: 'Tree not initialized'
			};
			return result;
		});
	}

	// ── Clipboard operations ───────────────────────────────────────────

	/**
	 * Collect a node and all its descendants into a ClipboardEntry.
	 * Descendants are ordered parent-first with paths relative to the source node.
	 */
	private _collectClipboardEntry(
		node: LTreeNode<T>,
		operation: 'copy' | 'cut',
		rootIndex = 0
	): ClipboardEntry<T> {
		const descendants: ClipboardEntry<T>['descendants'] = [];

		// $state.snapshot deproxies Svelte reactive state into a plain deep clone.
		// structuredClone alone throws ("could not be cloned") when node.data is a
		// $state proxy — which it is for any consumer passing default $state data.
		// The optional OUTPUT transform then cleans the snapshot before it's stored, so
		// transient/sensitive fields never travel on the shared clipboard. The context is
		// the SAME NodeTransformContext the input transform sees (phase: 'output'), with the
		// real per-node source (path/node/parent/siblings) and target: null (no destination
		// chosen yet).
		const snapshot = (n: LTreeNode<T>, isRoot: boolean): T => {
			const snap = $state.snapshot(n.data) as T;
			if (!this.outputTransformHandler) return snap;
			return this.outputTransformHandler(this._ctx({
				data: snap,
				operation,
				phase: 'output',
				isRoot,
				rootIndex,
				position: null,
				source: this.getNodeRef(n),
				target: null
			}));
		};

		const walk = (n: LTreeNode<T>) => {
			for (const child of Object.values(n.children)) {
				// relativePath = everything after sourcePath + separator
				const rel = child.path.substring(node.path.length);
				descendants.push({
					relativePath: rel,
					data: snapshot(child, false)
				});
				walk(child);
			}
		};
		walk(node);

		return {
			sourceTreeId: this.treeId,
			sourcePath: node.path,
			data: snapshot(node, true),
			descendants
		};
	}

	/** A clipboard entry as a detached node tree for `_duplicateSubtrees` (paths = the original
	 *  paths; children in snapshot order — parent-first, so every parent exists first). */
	private _snapshotTree(entry: ClipboardEntry<T>): LTreeNode<T> {
		const sep = this.treePathSeparator;
		const make = (path: string, data: T) => ({ path, data, children: {} }) as unknown as LTreeNode<T>;
		const root = make(entry.sourcePath, entry.data);
		const byRel = new Map<string, LTreeNode<T>>([['', root]]);
		entry.descendants.forEach((desc, i) => {
			const parent = byRel.get(desc.relativePath.substring(0, desc.relativePath.lastIndexOf(sep)));
			if (!parent) return; // malformed entry — no parent to hang it on
			const node = make(entry.sourcePath + desc.relativePath, desc.data);
			parent.children[`k${i}`] = node;
			byRel.set(desc.relativePath, node);
		});
		return root;
	}

	/**
	 * Copy nodes to the shared clipboard.
	 * @param paths Specific paths to copy, or uses selectedPaths if omitted.
	 */
	copyNodes(paths?: string[]): void {
		this._captureToClipboard('copy', paths);
	}

	/**
	 * Cut nodes to the shared clipboard. Nodes are dimmed but NOT removed until paste.
	 * @param paths Specific paths to cut, or uses selectedPaths if omitted.
	 */
	cutNodes(paths?: string[]): void {
		this._captureToClipboard('cut', paths);
	}

	/** copyNodes / cutNodes: before-hook (rewrite the set or block) → snapshot onto the shared
	 *  clipboard → the cut dims the nodes + their subtrees (a copy clears the dimming) → event. */
	private _captureToClipboard(operation: 'copy' | 'cut', paths?: string[]): void {
		let pathsToUse = paths ?? [...this.selectedPaths];
		if (pathsToUse.length === 0) return;
		const nodesOf = (list: string[]) =>
			list.map((p) => this.tree.getNodeByPath(p)).filter((n): n is LTreeNode<T> => n !== null);

		// Interceptor: can modify paths or block
		const result =
			operation === 'copy'
				? this.beforeCopyHandler?.(this._ctx({ operation, paths: pathsToUse, nodes: nodesOf(pathsToUse) }))
				: this.beforeCutHandler?.(this._ctx({ operation, paths: pathsToUse, nodes: nodesOf(pathsToUse) }));
		if (result === false) return;
		if (Array.isArray(result)) pathsToUse = result;

		const entries: ClipboardEntry<T>[] = [];
		const cutSet = new Set<string>();
		pathsToUse.forEach((p, i) => {
			const node = this.tree.getNodeByPath(p);
			if (!node) return;
			entries.push(this._collectClipboardEntry(node, operation, i));
			if (operation === 'cut') {
				cutSet.add(p);
				for (const dp of getDescendantPaths(node)) cutSet.add(dp);
			}
		});
		if (entries.length === 0) return;

		setClipboard<T>({ operation, entries, sourceTreeId: this.treeId });
		this.cutPaths = cutSet;
		if (operation === 'copy') uiLogger.debug(`[clipboard] Copied ${entries.length} node(s)`);
		else uiLogger.debug(`[clipboard] Cut ${entries.length} node(s), dimming ${cutSet.size} paths`);
		// Cut only dims — nodes aren't removed until paste — so they're still live here.
		if (operation === 'copy') this.onNodeCopyHandler?.(this._ctx({ operation, paths: pathsToUse, nodes: nodesOf(pathsToUse) }));
		else this.onNodeCutHandler?.(this._ctx({ operation, paths: pathsToUse, nodes: nodesOf(pathsToUse) }));
	}

	/**
	 * Paste clipboard content under (or beside) the target node.
	 * @param targetPath Where to paste
	 * @param transformData Consumer callback to generate new IDs/paths for pasted data
	 * @param position 'child' (default), 'before', or 'after'
	 */
	pasteNodes(
		targetPath: string,
		transformData?: NodeTransformCallback<T> | null,
		position: 'child' | 'before' | 'after' = 'child'
	): PasteResult<T> {
		const clip = getClipboard<T>();
		if (!clip || clip.entries.length === 0) {
			return { success: false, count: 0, skipped: 0, error: 'Clipboard is empty' };
		}
		const operation = clip.operation;
		const sep = this.treePathSeparator;

		// Per-paste working copy: the clipboard is a persistent singleton (a copy can be
		// pasted again), so we never hand out or mutate its entries. Everything below —
		// beforePaste inspection, the per-node transform — operates on this deep copy.
		const workEntries: ClipboardEntry<T>[] = clip.entries.map((e) => ({
			sourceTreeId: e.sourceTreeId,
			sourcePath: e.sourcePath,
			data: $state.snapshot(e.data) as T,
			descendants: e.descendants.map((d) => ({
				relativePath: d.relativePath,
				data: $state.snapshot(d.data) as T
			}))
		}));

		// Leaf-aware: a 'child' paste onto a node that disallows children lands beside it.
		targetPath = this._leafAwareTarget(targetPath, position);

		// Interceptor: batch policy only — redirect target/position or block. It gets the
		// resolved target node + readonly entries (no per-node data rewriting; that's the
		// transform's job).
		if (this.beforePasteHandler) {
			const result = this.beforePasteHandler(this._ctx({
				operation,
				target: {
					path: targetPath,
					node: targetPath ? (this.tree.getNodeByPath(targetPath) ?? null) : null
				},
				entries: workEntries
			}));
			if (result === false) {
				const blocked: PasteResult<T> = {
					success: false,
					count: 0,
					skipped: 0,
					error: 'Paste blocked by beforePasteCallback'
				};
				this.onNodePasteHandler?.(this._ctx(blocked));
				return blocked;
			}
			if (result && typeof result === 'object') {
				if (result.targetPath !== undefined) targetPath = result.targetPath;
				if (result.position !== undefined) position = result.position;
			}
		}

		// Re-evaluate after possible interceptor override
		const isRootPasteAfter = targetPath === '';
		const targetNodeAfter = isRootPasteAfter ? null : this.tree.getNodeByPath(targetPath);
		if (!isRootPasteAfter && !targetNodeAfter) {
			const notFound: PasteResult<T> = {
				success: false,
				count: 0,
				skipped: 0,
				error: `Target node not found: ${targetPath}`
			};
			this.onNodePasteHandler?.(this._ctx(notFound));
			return notFound;
		}

		// Resolve the actual parent the roots land in (children of it = the siblings).
		const destParentPath = isRootPasteAfter
			? ''
			: position === 'child'
				? targetPath
				: (targetNodeAfter!.parentPath ?? '');

		const transform = transformData ?? this.inputTransformHandler ?? null;
		const sameTree = clip.sourceTreeId === this.treeId;

		// When shouldAutoHandlePaste=false, don't modify the tree — just forward the
		// working-copy entries (already cleaned via copy transform) to the consumer.
		if (!this.shouldAutoHandlePaste) {
			const result: PasteResult<T> = {
				success: true,
				count: workEntries.length,
				skipped: 0,
				entries: workEntries,
				operation,
				targetPath,
				position
			};
			this.cutPaths = new Set();
			if (operation === 'cut') clearClipboard();
			uiLogger.debug(
				`[clipboard] shouldAutoHandlePaste=false — forwarding ${workEntries.length} entries to consumer`
			);
			this.onNodePasteHandler?.(this._ctx(result));
			return result;
		}

		// The snapshot entries as detached node trees (path = the ORIGINAL path, so a same-tree
		// paste's ctx.source resolves the live origin), then the one subtree insert duplicateNodes
		// uses: roots land at target / position and chain in order (before / after used to be
		// ignored — every root was appended to the parent).
		const roots: { node: LTreeNode<T>; rootIndex: number }[] = [];
		let skipped = 0;
		workEntries.forEach((entry, index) => {
			// Per-entry self-paste guard: skip (don't abort the batch) an entry whose
			// destination is itself or its own descendant. Skipping one no longer drops
			// the rest — selecting a folder + its child still pastes the valid nodes.
			if (sameTree && !isRootPasteAfter && isSelfOrDescendant(destParentPath, entry.sourcePath, sep)) {
				skipped++;
				return;
			}
			roots.push({ node: this._snapshotTree(entry), rootIndex: index });
		});

		const pastedSourcePaths: string[] = [];
		let pasted: { copied: (LTreeNode<T> | null)[]; count: number; skipped: number; lastError?: string } = {
			copied: [],
			count: 0,
			skipped: 0
		};
		this._mutate(() => {
			pasted = this._duplicateSubtrees(roots, targetPath, position, {
				operation,
				sourceRef: (n) => this._nodeRefIn(sameTree ? this.tree : null, sameTree ? this.tree.getNodeByPath(n.path) : null, n.path),
				transform
			});
			pasted.copied.forEach((n, i) => {
				if (n) pastedSourcePaths.push(roots[i].node.path);
			});

			// Cut = move: remove only the sources we actually pasted (skipped cuts stay put).
			// Same-tree removes directly; cross-tree reaches back to the source tree via the
			// registry so a cut-and-paste into another tree also removes the originals (was
			// previously the consumer's job). Sources are top-level roots (their descendants
			// ride along), so includeDescendants=true.
			if (operation === 'cut') {
				if (sameTree) {
					for (const src of pastedSourcePaths) this.tree.removeNode(src);
				} else {
					const source = getClipboardTree(clip.sourceTreeId);
					if (source && source !== this) {
						for (const src of pastedSourcePaths) source.removeNode(src);
					}
				}
			}
		});
		const totalCount = pasted.count;
		skipped += pasted.skipped;
		const lastError = pasted.lastError;
		const firstPasted = pasted.copied.find((n): n is LTreeNode<T> => !!n);

		// Clear cut-dimming. A CUT is a one-shot move, so clear the clipboard; a COPY
		// stays on the clipboard so it can be pasted again (Finder / Explorer convention).
		this.cutPaths = new Set();
		if (operation === 'cut') clearClipboard();

		const result: PasteResult<T> = {
			success: totalCount > 0,
			count: totalCount,
			skipped,
			error:
				totalCount === 0
					? (lastError ?? (skipped > 0 ? 'All nodes skipped' : 'No nodes pasted'))
					: undefined
		};
		uiLogger.debug(`[clipboard] Pasted ${totalCount} node(s), skipped ${skipped}`);

		// A paste INTO a node: open it and bring the first pasted node into view (a programmatic
		// jump — the --stv-scroll-behavior token), so the result isn't hidden under a collapsed
		// parent. 'before' / 'after' land beside a visible node — nothing to open (= web-treeview).
		if (position === 'child' && !isRootPasteAfter && firstPasted) {
			const target = targetNodeAfter!;
			const pasted = firstPasted;
			void (async () => {
				if (!target.isExpanded) await this.expandNodes(target.path);
				await tick();
				await this._scrollToPath(pasted.path, { block: 'nearest' }, false);
			})();
		}

		this.onNodePasteHandler?.(this._ctx(result));
		return result;
	}

	/** Cancel a cut operation — clears dimming and clipboard. */
	cancelCut(): void {
		if (getClipboardOp() === 'cut') {
			clearClipboard();
		}
		this.cutPaths = new Set();
		uiLogger.debug('[clipboard] Cut cancelled');
	}

	/** Check if the shared clipboard has content. */
	hasClipboardContent(): boolean {
		return hasClipboard();
	}

	/** Get the current clipboard operation type. */
	getClipboardOperation(): 'copy' | 'cut' | null {
		return getClipboardOp();
	}

	/** Paths a keyboard shortcut should act on: the selection if any, else the
	 *  focused node, else empty. Shared by the built-in copy/cut/delete handling. */
	private _shortcutSelectionPaths(): string[] {
		if (this.selectedPaths.size > 0) return [...this.selectedPaths];
		return this.focusedNode ? [this.focusedNode.path] : [];
	}

	/**
	 * Programmatic removal of nodes (and their descendants): top-level subtrees only,
	 * selection + focus are cleared when anything was removed. No `beforeDeleteCallback`,
	 * no `onNodeDelete` — that is the user Delete command, {@link deleteNodes}.
	 */
	removeNodes(paths: string[]): { removed: number; failed: number } {
		const targets = getTopLevelPaths(paths ?? [], this.treePathSeparator);
		let removed = 0;
		let failed = 0;
		// One bracket: the clear runs before the reconcile, so the selection event fires once.
		this._mutate(() => {
			for (const p of targets) {
				if (this.removeNode(p).success) removed++;
				else failed++;
			}
			if (removed > 0) {
				this.clearSelection();
				this.clearFocus();
			}
		});
		return { removed, failed };
	}

	/**
	 * The user **Delete command** (built-in Delete key, a menu "Delete" item): defaults to
	 * the current selection (selected set, else focused node). Runs `beforeDeleteCallback`
	 * first (narrow or block), removes only top-level subtrees, clears selection + focus of
	 * anything removed, and fires `onNodeDelete` with pre-removal node snapshots.
	 * Programmatic removal is {@link removeNodes} (no veto, no event).
	 */
	deleteNodes(paths?: string[]): { removed: number; blocked: number } {
		let targets = getTopLevelPaths(paths ?? this._shortcutSelectionPaths(), this.treePathSeparator);
		if (targets.length === 0) return { removed: 0, blocked: 0 };

		if (this.beforeDeleteHandler) {
			const nodes = targets
				.map((p) => this.tree.getNodeByPath(p))
				.filter((n): n is LTreeNode<T> => n !== null);
			const result = this.beforeDeleteHandler(this._ctx({ paths: targets, nodes }));
			if (result === false) return { removed: 0, blocked: targets.length };
			if (Array.isArray(result)) targets = getTopLevelPaths(result, this.treePathSeparator);
		}

		// Snapshot the target nodes BEFORE removal so onNodeDelete can hand back resolved nodes
		// (the tree no longer holds them once removeNode runs).
		const preRemoval = new Map(targets.map((p) => [p, this.tree.getNodeByPath(p)]));

		// Collect the paths that were actually removed — a failure in the middle used to shift
		// `targets.slice(0, removed)` onto the wrong paths.
		const removedPaths: string[] = [];
		this._mutate(() => {
			for (const p of targets) {
				if (this.removeNode(p).success) removedPaths.push(p);
			}
			if (removedPaths.length > 0) {
				this.clearSelection();
				this.clearFocus();
			}
		});
		const removed = removedPaths.length;
		const blocked = targets.length - removed;
		if (removed > 0) {
			this.onNodeDeleteHandler?.(this._ctx({
				paths: removedPaths,
				nodes: removedPaths
					.map((p) => preRemoval.get(p))
					.filter((n): n is LTreeNode<T> => n != null)
			}));
			uiLogger.debug(`[delete] Removed ${removed} node(s), ${blocked} failed`);
		}
		return { removed, blocked };
	}

	/**
	 * The tree's keydown (WAI-ARIA tree navigation + the built-in shortcuts) for the renderer's
	 * container — `<Tree>` calls it; a custom renderer can. Order: `beforeKeydownCallback`
	 * (`false` suppresses everything + preventDefault) → keys typed into a field inside a row are
	 * left alone → Shift+F10 / the ContextMenu key → `openContextMenu()` (the renderer knows where
	 * the row is; omitted = not handled) → `handleShortcutKeydown` (before the empty-tree return,
	 * so paste works into an empty tree) → navigation. preventDefaults a key it handled.
	 */
	handleKeydown(
		event: KeyboardEvent,
		options: { beforeKeydownCallback?: (ctx: KeydownContext<T>) => false | void; openContextMenu?: () => boolean } = {}
	): void {
		// Ignore modifier-only key presses (Ctrl, Shift, Alt, Meta)
		if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

		// Don't interfere with context menu keyboard handling
		if (this.isContextMenuOpen) return;

		// Call custom handler first — return false to suppress default handling. Resolve the
		// focus + selection sets up front so the consumer gets nodes, not raw paths.
		if (options.beforeKeydownCallback) {
			const result: unknown = options.beforeKeydownCallback({
				event,
				focusedNode: this.focusedNode ?? null,
				selectedNodes: this.getSelectedNodes(),
				controller: this.controller
			});
			if (result instanceof Promise) {
				uiLogger.warn('beforeKeydownCallback is synchronous — a returned Promise is ignored');
			} else if (result === false) {
				event.preventDefault();
				return;
			}
		}

		// A key typed into a field inside a row (an <input> in a nodeTemplate) belongs to that
		// field — no built-in shortcut (Delete, Ctrl+C/V) and no navigation (arrows, Backspace).
		if (isTypingTarget(event)) return;

		// Shift+F10 / the ContextMenu key open the focused node's context menu.
		if (matchesShortcut(event, 'ContextMenu') || matchesShortcut(event, 'Shift+F10')) {
			if (options.openContextMenu?.()) event.preventDefault();
			return;
		}

		// Built-in shortcuts (copy/cut/paste/delete/esc): after the consumer hook (so it can
		// override), before the empty-tree return (so paste works into an empty tree).
		if (this.handleShortcutKeydown(event)) {
			event.preventDefault();
			return;
		}

		if (this.allFlatNodes.length === 0) return;

		let isHandled = true;
		// Shift+nav extends the selection range (a no-op in single mode — see _extendSelectionTo).
		switch (event.key) {
			case 'ArrowDown':
				if (event.shiftKey) this.extendSelectionNext();
				else this.focusNextAtLevel();
				break;
			case 'ArrowUp':
				if (event.shiftKey) this.extendSelectionPrevious();
				else this.focusPreviousAtLevel();
				break;
			case 'ArrowRight':
				this.focusFirstChild();
				break;
			case 'ArrowLeft':
				this.focusParent();
				break;
			case 'Backspace':
				this.collapseParent();
				break;
			case 'Home':
				if (event.shiftKey) this.extendSelectionToFirst();
				else this.focusFirst();
				break;
			case 'End':
				if (event.shiftKey) this.extendSelectionToLast();
				else this.focusLast();
				break;
			case 'PageDown':
				if (event.shiftKey) this.extendSelectionNextPage();
				else this.focusNextPage();
				break;
			case 'PageUp':
				if (event.shiftKey) this.extendSelectionPreviousPage();
				else this.focusPreviousPage();
				break;
			case 'Enter':
				// WAI-ARIA tree: Enter = the node's default action (expand / collapse).
				this.toggleFocusedNodeExpanded();
				break;
			case ' ':
				// WAI-ARIA tree: Space toggles selection. With checkboxes: the focused node's
				// checkbox; multiple mode: the focused node in the selection; single mode:
				// selects the focused node (Enter expands / collapses).
				if (this.isCheckboxesShown && this.focusedNode?.isSelectable) {
					this.nodeCallbacks.handleCheckboxToggle(this.focusedNode);
				} else if (this.selectionMode === 'multiple') {
					this.toggleFocusedSelect();
				} else if (this.focusedNode?.isSelectable) {
					this.selectNode(this.focusedNode.path);
				}
				break;
			case 'Escape':
				// Priority: pending cut → selection set → leave alone for surrounding UI
				// (File Explorer / Finder convention).
				if (this.hasClipboardContent() && this.getClipboardOperation() === 'cut') {
					this.cancelCut();
				} else if (this.selectedPaths.size > 0) {
					this.clearSelection();
				} else {
					isHandled = false;
				}
				break;
			default:
				isHandled = false;
		}
		if (isHandled) event.preventDefault();
	}

	/**
	 * Built-in keyboard shortcuts, opt-in via `isKeyboardShortcutsEnabled`. Returns
	 * true when it consumed the event (caller should preventDefault + stop). A consumer
	 * `beforeKeydownCallback` runs BEFORE this in Tree.svelte, so it can override or suppress any
	 * of these. Shared by Tree.svelte and the canvas renderer.
	 *   Ctrl/Cmd+C copy · Ctrl/Cmd+X cut · Ctrl/Cmd+V paste (into focused node / root,
	 *   via nodeInputTransformationCallback) · Delete remove selection · Escape cancel cut.
	 *   Classic CUA aliases too: Ctrl+Insert copy · Shift+Insert paste · Shift+Delete cut.
	 * @internal
	 */
	handleShortcutKeydown(event: KeyboardEvent): boolean {
		if (!this.isKeyboardShortcutsEnabled) return false;
		const mod = event.ctrlKey || event.metaKey;
		const key = event.key.toLowerCase();
		// Classic CUA (old-school) aliases alongside the modern C/X/V:
		//   Ctrl+Insert = copy · Shift+Insert = paste · Shift+Delete = cut.
		const isInsert = event.key === 'Insert';

		// Each branch returns false (not consumed) when there's nothing to act on, so an
		// empty selection lets the browser's native Ctrl+C/V (text copy/paste) through.
		if ((mod && key === 'c') || (event.ctrlKey && isInsert)) {
			const p = this._shortcutSelectionPaths();
			if (!p.length) return false;
			this.copyNodes(p);
			return true;
		}
		// Cut — Ctrl/Cmd+X or Shift+Delete. Checked before the plain-Delete branch below
		// so Shift+Delete cuts rather than deletes.
		if ((mod && key === 'x') || (event.shiftKey && event.key === 'Delete')) {
			const p = this._shortcutSelectionPaths();
			if (!p.length) return false;
			this.cutNodes(p);
			return true;
		}
		if ((mod && key === 'v') || (event.shiftKey && isInsert)) {
			if (!hasClipboard()) return false;
			this.pasteNodes(this.focusedNode?.path ?? '', this.inputTransformHandler ?? null, 'child');
			return true;
		}
		// Delete selection — plain Delete only (Shift+Delete was cut, handled above).
		if (event.key === 'Delete' && !event.shiftKey) {
			if (!this._shortcutSelectionPaths().length) return false;
			this.deleteNodes();
			return true;
		}
		if (event.key === 'Escape' && getClipboardOp() === 'cut') {
			this.cancelCut();
			return true;
		}
		return false;
	}

	/** Open the context menu for the node at `path` at the given viewport coordinates (the
	 *  `contextMenuXOffset` / `contextMenuYOffset` are applied). No-op for an unknown path. */
	openContextMenu(path: string, screenX: number, screenY: number) {
		const node = this.tree?.getNodeByPath(path);
		if (!node) return;
		this.contextMenuNode = node;
		this.contextMenuX = screenX + this.contextMenuXOffset;
		this.contextMenuY = screenY + this.contextMenuYOffset;
		this.isContextMenuOpen = true;
	}

	/**
	 * The context menu's surface ctx for `node`: `{ node, path, parent, siblings }` (live) +
	 * non-enumerable `controller`. Public for custom menu renderers — pass it to
	 * `getContextMenuItemsCallback`, `resolveMenuEntries` and `activateMenuItem`.
	 */
	menuContext(node: LTreeNode<T>): TreeMenuContext<T>;
	/** A menu over empty space: `{ node: null }` + non-enumerable `controller`. */
	menuContext(node: null): TreeCallbackContext<T> & { node: null };
	menuContext(node: LTreeNode<T> | null): TreeMenuContext<T> | (TreeCallbackContext<T> & { node: null }) {
		if (!node) return this._ctx({ node: null }) as TreeCallbackContext<T> & { node: null };
		return this._ctx({ ...this.getNodeRef(node), node }) as TreeMenuContext<T>;
	}

	/**
	 * The built-in state of a built-in action item (`'copy'`, `'expand'`, …): text from `labels`,
	 * `isDisabled` (e.g. `paste` with an empty clipboard), `isDanger` (`delete`); `undefined` for a
	 * consumer item. Public for custom menu renderers — the `defaults` argument of
	 * `resolveMenuEntries(entries, ctx, (item) => controller.menuItemDefaults(item, ctx))`.
	 */
	menuItemDefaults(
		item: TreeMenuItem<T>,
		ctx: TreeMenuContext<T>
	): Partial<ResolvedActionItem<TreeAction>> | undefined;
	/** A menu over empty space (`ctx` without a `node`): the node-bound built-ins are disabled. */
	menuItemDefaults(
		item: MenuItem<any, string>,
		ctx: TreeCallbackContext<T> & { node?: null }
	): Partial<ResolvedActionItem<TreeAction>> | undefined;
	menuItemDefaults(
		item: MenuItem<any, string>,
		ctx: TreeCallbackContext<T> & { node?: LTreeNode<T> | null }
	): Partial<ResolvedActionItem<TreeAction>> | undefined {
		const builtIn = getBuiltInAction(item.action);
		if (!builtIn) return undefined;
		// Built-in item texts are the `menuItems.<name>` labels.
		const text = this.getLabel(`menuItems.${builtIn.label}` as keyof TreeLabels);
		const node = ctx.node;
		const branches = () =>
			node
				? this._actionTargets(node)
						.map((p) => this.tree?.getNodeByPath(p))
						.filter((n): n is LTreeNode<T> => !!n && !!n.hasChildren)
				: [];
		// A menu over empty space: only the node-free built-ins are enabled.
		if (!node && !builtIn.isNodeFree) return { text, isDisabled: true };
		const defaults: Partial<ResolvedActionItem<TreeAction>> = { text };
		if (builtIn.isDisabled) defaults.isDisabled = builtIn.isDisabled(this, branches);
		if (builtIn.isDanger && node) defaults.isDanger = true;
		return defaults;
	}

	/**
	 * Activate a menu item exactly like the built-in menu (core `runAction`):
	 * `beforeActionCallback` (`false` cancels — nothing else runs) → item `onClick(detail)` →
	 * the built-in action (on the selection when `ctx.node` is in it, else on `ctx.node`) →
	 * `onAction(detail)`. `detail.source` is `'context-menu'`; `trigger` gets `aria-busy` while it
	 * runs (a second activation of the same item meanwhile is ignored). Resolves `false` when
	 * cancelled or ignored. Public for custom menu renderers — closing the menu is the caller's
	 * job (honour `item.shouldCloseOnClick !== false`).
	 */
	activateMenuItem(
		item: TreeMenuItem<T>,
		ctx: TreeMenuContext<T>,
		trigger?: HTMLElement,
		event?: Event
	): Promise<boolean>;
	/**
	 * A menu over empty space — `ctx` without a `node` (`{ node: null }` or just
	 * `{ controller }`): the same order; of the built-ins only the node-free ones run
	 * (`paste` into the root, `expand-all`, `collapse-all`, `sort-all`), node-bound ones are
	 * skipped (debug log).
	 */
	activateMenuItem<Ctx extends TreeCallbackContext<T>>(
		item: MenuItem<Ctx, string>,
		ctx: Ctx & { node?: null },
		trigger?: HTMLElement,
		event?: Event
	): Promise<boolean>;
	activateMenuItem(
		item: MenuItem<any, string>,
		ctx: TreeCallbackContext<T> & { node?: LTreeNode<T> | null },
		trigger?: HTMLElement,
		event?: Event
	): Promise<boolean> {
		const detail = this._ctx({
			...ctx,
			action: item.action ?? 'custom',
			...(item.id !== undefined ? { id: item.id } : {}),
			item,
			source: 'context-menu',
			sourceEvent: event,
			triggerElement: trigger,
			dataset: {}
		}) as TreeActionEventDetail<T>;
		return runAction({
			detail,
			beforeActionCallback: this.beforeActionHandler,
			emitAction: (d) => this.onActionHandler?.(d),
			runBuiltIn: (d) => this._runBuiltInAction(d.action, ctx.node ?? null)
		});
	}

	/** Targets of a built-in menu action: the whole selection when `node` is in it, else just `node`. */
	private _actionTargets(node: LTreeNode<T>): string[] {
		return this.selectedPaths.has(node.path) ? [...this.selectedPaths] : [node.path];
	}

	/** The built-in menu actions act on the node — or on the whole selection when the node is in it. */
	private async _runBuiltInAction(action: string, node: LTreeNode<T> | null): Promise<void> {
		const builtIn = getBuiltInAction(action);
		if (!builtIn) return;
		if (!node && !builtIn.isNodeFree) {
			// A menu over empty space: only the node-free built-ins apply.
			uiLogger.debug(`[menu] built-in '${action}' needs a node — skipped (menu without a node)`);
			return;
		}
		await builtIn.run(this, node ? this._actionTargets(node) : null, node);
	}

	// svelte-ignore non_reactive_update
	closeContextMenu() {
		this.isContextMenuOpen = false;
		this.contextMenuNode = null;
	}

	// ── Public Drag-and-Drop API for custom renderers ────────────────

	/**
	 * Make the nodes inside `container` draggable — for a custom renderer (TreeProvider /
	 * createTreeEngine); `<Tree>` attaches its own container. Returns the detach. In Svelte:
	 * `<div {@attach (el) => controller.attachPointerDrag(el)}>`.
	 *
	 * The drag is the built-in one — core createPointerDrag: mouse / pen engage after a 5px move,
	 * touch after a long press (`touchDragDelay`); ghost, auto-scroll, Escape, the swallowed
	 * trailing click, beforeDragStart / beforeDrop, multi-drag, cross-tree. A press on (or inside)
	 * an element with `data-tree-path` drags that node. Drop targets are found under the pointer:
	 * the nearest `[data-tree-path]` element is the target node; a `[data-drop-position=
	 * "before|after|child"]` pad inside it fixes the position (a position the node disallows is
	 * not a target), otherwise it comes from where the pointer sits on the element. Read
	 * `draggedNode` / `hoveredNodeForDrop` / `activeDropPosition` for the visuals.
	 */
	attachPointerDrag(container: HTMLElement): () => void {
		return this._attachPointerDrag(container, false);
	}

	/** Cancel current drag and reset all state. */
	cancelDrag(): void {
		dragLogger.debug('Drag cancelled via public API');
		for (const drag of this.#pointerDrags) drag.cancel(); // core: onCancel → _handlePointerCancel
		this._handlePointerCancel();
	}

	/** @internal Get allowed drop positions for a node (proxies LTree method). */
	getNodeAllowedDropPositions(node: LTreeNode<T>): DropPosition[] | null {
		return this.tree?.getNodeAllowedDropPositions(node) ?? null;
	}

	/** Get whether a node is draggable (proxies LTree resolution: callback > member > node property). */
	getNodeIsDraggable(node: LTreeNode<T>): boolean {
		return this.tree?.getNodeIsDraggable(node) ?? false;
	}

	/** Whether the node at `path` accepts drops (`getIsDropAllowedCallback` > `isDropAllowedMember`
	 *  > the node's flag). `false` for an unknown path. */
	isNodeDropAllowed(path: string): boolean {
		const node = this.tree?.getNodeByPath(path);
		return node ? this.tree.getNodeIsDropAllowed(node) : false;
	}

	/** Get whether a node is collapsible (proxies LTree resolution: callback > member > node property). */
	getNodeIsCollapsible(node: LTreeNode<T>): boolean {
		return this.tree?.getNodeIsCollapsible(node) ?? true;
	}

	/** Calculate drop position from cursor location within an element (before/after/child).
	 * @internal
	 *  Same logic as Node.svelte's calculateGlowPosition, respecting allowed positions. */
	computeDropPositionFromEvent(
		event: MouseEvent,
		element: HTMLElement,
		allowedPositions?: DropPosition[] | null
	): DropPosition {
		const rect = element.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const width = rect.width;
		const height = rect.height;

		// Calculate the ideal position based on mouse position
		let idealPosition: DropPosition;
		if (x > width / 2) {
			idealPosition = 'child';
		} else if (y < height / 2) {
			idealPosition = 'before';
		} else {
			idealPosition = 'after';
		}

		// If no restrictions, return the ideal position
		if (!allowedPositions || allowedPositions.length === 0) {
			return idealPosition;
		}

		// If the ideal position is allowed, use it
		if (allowedPositions.includes(idealPosition)) {
			return idealPosition;
		}

		// Otherwise, snap to the nearest allowed position
		if (allowedPositions.length === 1) {
			return allowedPositions[0];
		}

		// Multiple positions allowed but not the ideal one
		if (allowedPositions.includes('before') && allowedPositions.includes('after')) {
			return y < height / 2 ? 'before' : 'after';
		}

		return allowedPositions[0];
	}

	/**
	 * Scroll the node at `path` into view. Resolves `true` when it was found and scrolled.
	 * `shouldExpandAncestors` (default true) opens its collapsed ancestors first;
	 * `shouldHighlight` (default false) flashes `scrollHighlightClass`; `behavior` / `block` /
	 * `inline` = native ScrollIntoViewOptions (defaults `--stv-scroll-behavior` — smooth, auto under reduced motion — / `'center'` / `'nearest'`).
	 */
	async scrollToPath(path: string, options?: ScrollToPathOptions): Promise<boolean> {
		return this._scrollToPath(path, options, false);
	}

	/** The default scroll behaviour of programmatic jumps — scrollToPath with no `behavior` passed:
	 *  the `--stv-scroll-behavior` token (→ `--base-scroll-behavior`; `auto` under reduced motion).
	 *  Keyboard moves (focusAndSelectNode, range moves) never read it — they always scroll instantly (`'auto'`). */
	private resolveScrollBehavior(): ScrollBehavior {
		const el = this.containerElement;
		if (!el || typeof getComputedStyle === 'undefined') return 'smooth';
		return (getComputedStyle(el).getPropertyValue('--stv-scroll-behavior').trim() || 'smooth') as ScrollBehavior;
	}

	/** scrollToPath + `isContainerScroll` (keyboard nav: scroll only the tree's scroll container,
	 *  never the page). */
	private async _scrollToPath(
		path: string,
		options: ScrollToPathOptions | undefined,
		isContainerScroll: boolean
	): Promise<boolean> {
		perfStart(`[${this.treeId}] scrollToPath`);
		const {
			shouldExpandAncestors: expand = true,
			shouldHighlight: highlight = false,
			behavior = this.resolveScrollBehavior(),
			block = 'center',
			inline = 'nearest'
		} = options || {};
		const scrollOptions: ScrollIntoViewOptions = { behavior, block, inline };
		const containerScroll = isContainerScroll;

		const node = this.tree.getNodeByPath(path);
		if (!node || !node.id) {
			console.warn(`[Tree ${this.treeId}] Node not found for path: ${path}`);
			perfEnd(`[${this.treeId}] scrollToPath`);
			return false;
		}

		const parent = node.parentPath ? this.tree.getNodeByPath(node.parentPath) : null;
		if (expand && parent && !this._isAncestryExpanded(node)) {
			await this.expandNodes(node.parentPath!);
			await tick();
		}

		// Virtual scroll: index-based scrolling instead of DOM query
		if (this.vsActive && this.vsContainerRef) {
			const nodeIndex = this.allFlatNodes.findIndex((n) => n.path === path);
			if (nodeIndex === -1) {
				console.warn(`[Tree ${this.treeId}] Node not found in flat nodes for path: ${path}`);
				perfEnd(`[${this.treeId}] scrollToPath`);
				return false;
			}

			// Scroll the virtual container: centre the node, or with block 'nearest' (keyboard
			// moves) only as far as needed to bring it in (stays put while it is visible)
			const rowTop = nodeIndex * this.vsRowHeight;
			const viewHeight = this.vsContainerRef.clientHeight;
			const currentTop = this.vsContainerRef.scrollTop;
			const targetScroll =
				block === 'nearest'
					? rowTop < currentTop
						? rowTop
						: rowTop + this.vsRowHeight > currentTop + viewHeight
							? rowTop + this.vsRowHeight - viewHeight
							: currentTop
					: rowTop - viewHeight / 2 + this.vsRowHeight / 2;
			this.vsContainerRef.scrollTo({
				top: Math.max(0, targetScroll),
				behavior: scrollOptions.behavior
			});

			// Wait for scroll + re-render — need multiple frames for
			// rAF-throttled scroll handler → reactive update → DOM render
			await tick();
			await new Promise((r) => requestAnimationFrame(r));
			await tick();
			await new Promise((r) => requestAnimationFrame(r));

			if (highlight && this.scrollHighlightClass) {
				const elementId = rowDomId(this.treeId, node.path);
				if (!this._highlightRow(elementId)) {
					// Element might not be rendered yet — retry after another frame
					await tick();
					await new Promise((r) => requestAnimationFrame(r));
					this._highlightRow(elementId);
				}
			}

			perfEnd(`[${this.treeId}] scrollToPath`);
			return true;
		}

		const elementId = rowDomId(this.treeId, node.path);
		const rootEl = this.containerElement;
		const findContent = (): HTMLElement | null => {
			const el = rootEl
				? rootEl.querySelector(`#${CSS.escape(elementId)}`)
				: document.getElementById(elementId);
			return (el?.querySelector('.stv__node-content') as HTMLElement | null) ?? null;
		};
		// Progressive flat rendering adds newly-revealed rows in rAF-deferred
		// batches (initialBatchSize, doubling each step). After expandNodes +
		// tick() the immediate batch is in DOM but rows past that batch arrive
		// over subsequent frames. Retry across up to ~6 frames before giving up.
		let contentDiv = findContent();
		if (!contentDiv) {
			for (let i = 0; i < 6 && !contentDiv; i++) {
				await new Promise((r) => requestAnimationFrame(r));
				await tick();
				contentDiv = findContent();
			}
		}

		if (!contentDiv) {
			console.warn(`[Tree ${this.treeId}] DOM element not found for node ID: ${elementId}`);
			perfEnd(`[${this.treeId}] scrollToPath`);
			return false;
		}

		if (containerScroll) {
			const container = findScrollContainer(contentDiv);
			if (container) {
				const containerRect = container.getBoundingClientRect();
				const elementRect = contentDiv.getBoundingClientRect();
				// the visible client box (inside the borders, above a horizontal scrollbar)
				const viewTop = containerRect.top + container.clientTop;
				const viewBottom = viewTop + container.clientHeight;
				let scrollTop: number;
				if (block === 'nearest') {
					// keyboard moves: scroll only as far as needed; a visible row stays put
					// (the call still runs — same top = no-op)
					scrollTop = container.scrollTop;
					if (elementRect.top < viewTop) scrollTop += elementRect.top - viewTop;
					else if (elementRect.bottom > viewBottom) scrollTop += elementRect.bottom - viewBottom;
				} else {
					scrollTop =
						container.scrollTop +
						(elementRect.top - viewTop) -
						container.clientHeight / 2 +
						elementRect.height / 2;
				}
				container.scrollTo({
					top: scrollTop,
					behavior: scrollOptions.behavior
				});
			}
		} else {
			contentDiv.scrollIntoView(scrollOptions);
		}

		if (highlight && this.scrollHighlightClass) {
			this._highlightRow(elementId);
		}

		perfEnd(`[${this.treeId}] scrollToPath`);
		return true;
	}

	/**
	 * Apply scroll highlight to a node element by ID.
	 * Returns true if the element was found and highlighted, false otherwise.
	 */
	private _highlightRow(elementId: string): boolean {
		const rootEl = this.containerElement;
		const element = rootEl
			? rootEl.querySelector(`#${CSS.escape(elementId)}`)
			: document.getElementById(elementId);
		const contentDiv = element?.querySelector('.stv__node-content') as HTMLElement | null;

		if (!contentDiv || !this.scrollHighlightClass) return false;

		if (this.currentSelection) {
			this.currentSelection.element.classList.remove(this.scrollHighlightClass);
			clearTimeout(this.currentSelection.timeoutId);
			this.currentSelection = null;
		}

		contentDiv.classList.add(this.scrollHighlightClass);
		const highlightClass = this.scrollHighlightClass;
		const timeoutId = setTimeout(() => {
			contentDiv.classList.remove(highlightClass);
			this.currentSelection = null;
		}, this.scrollHighlightTimeout);

		this.currentSelection = { element: contentDiv, timeoutId };
		return true;
	}

	// ── updateProps (the one way props change after construction) ────────

	/**
	 * Apply changed props — Tree.svelte's prop effects, `update()` and vanilla callers all come
	 * through here (REVIEW §3.1, the table in tree-props.ts). A key that is present applies; an
	 * `undefined` option means its default. Unchanged options are skipped, so re-sending the same
	 * value is free. An option built into the ltree (a `*Member`, a `get*Callback` mapping, the
	 * sort, the search index, `expandLevel`, `treePathSeparator`) reconfigures the ltree and
	 * re-inserts the current data (_rebuildTree); `treeId` is init-only and only warns.
	 * State props (`nodes`, `focusedNode`, `selectedPaths`, `checkedPaths`, `expandedPaths`) go
	 * through their writers; `undefined` leaves them alone.
	 */
	updateProps(updates: Partial<TreeEngineProps<T>>) {
		const changedLtreeOptions: TreeOptionKey[] = [];
		for (const key of Object.keys(updates) as (keyof TreeEngineProps<T>)[]) {
			if ((TREE_STATE_PROPS as readonly string[]).includes(key)) continue;
			const option = key as TreeOptionKey;
			const value = updates[option];
			if (value === this.#options[option]) continue;
			if (TREE_INIT_ONLY_OPTIONS.has(option)) {
				if (value != null && value !== this.treeId)
					uiLogger.warn(
						`[${this.treeId}] ${option} is init-only — the change to ${JSON.stringify(value)} is ignored (re-create the tree, e.g. {#key ${option}})`
					);
				continue;
			}
			this.#options[option] = value;
			if (TREE_LTREE_OPTIONS.has(option)) changedLtreeOptions.push(option);
			else this._setOption(option, value);
		}

		// State, after the options (a new checkboxMode / policy shapes how checkedPaths applies).
		if (updates.nodes !== undefined) this.nodes = updates.nodes;
		if (changedLtreeOptions.length > 0) this._rebuildTree(changedLtreeOptions);
		if (updates.focusedNode !== undefined) this._replaceFocusedNode(updates.focusedNode);
		if (updates.selectedPaths !== undefined)
			this._replaceSelectedPaths(updates.selectedPaths ?? []);
		if (updates.expandedPaths !== undefined) {
			// With new nodes in the same update the tree re-inserts later — apply after it.
			if (updates.nodes === undefined || changedLtreeOptions.length > 0)
				this._replaceExpandedPaths(updates.expandedPaths ?? []);
			else this.#pendingExpanded = new Set(updates.expandedPaths ?? []);
		}
		if (updates.checkedPaths !== undefined)
			// Incoming set is a projection intent — expand it (cascade-down) into the
			// canonical checked state rather than storing it raw.
			this._replaceCheckedPaths(updates.checkedPaths ?? []);
	}

	/** The value of a prop as last applied (constructor / `updateProps`); `undefined` = default. */
	getOption<K extends TreeOptionKey>(key: K): TreeEngineProps<T>[K] {
		return this.#options[key] as TreeEngineProps<T>[K];
	}

	/** Set one live option (not built into the ltree) — default resolved, field per tree-props.ts. */
	private _setOption(key: TreeOptionKey, raw: unknown) {
		const value = resolveTreeOption(key, raw);
		if (key === 'navigationOverrides') {
			this.navigation = value
				? { ...this.createDefaultNavigation(), ...(value as TreeNavigationOverrides<T>) }
				: this.createDefaultNavigation();
			return;
		}
		const field = TREE_OPTION_FIELDS[key] ?? key;
		(this as unknown as Record<string, unknown>)[field] = value;
	}

	/** The ltree's configuration from the current options (callbacks get `ctx.controller`). */
	private _ltreeConfig(): LTreeConfig<T> {
		const o = this.#options as Partial<TreeEngineProps<T>>;
		const resolved = <K extends TreeOptionKey>(key: K) =>
			resolveTreeOption(key, o[key]) as TreeEngineProps<T>[K];
		return {
			idMember: o.idMember,
			pathMember: o.pathMember,
			parentPathMember: o.parentPathMember,
			levelMember: o.levelMember,
			hasChildrenMember: o.hasChildrenMember,
			isExpandedMember: o.isExpandedMember,
			getIsExpandedCallback: this._withController(o.getIsExpandedCallback),
			isSelectableMember: o.isSelectableMember,
			getIsSelectableCallback: this._withController(o.getIsSelectableCallback),
			isCheckedMember: o.isCheckedMember,
			getIsCheckedCallback: this._withController(o.getIsCheckedCallback),
			isDraggableMember: o.isDraggableMember,
			getIsDraggableCallback: this._withController(o.getIsDraggableCallback),
			isDropAllowedMember: o.isDropAllowedMember,
			getIsDropAllowedCallback: this._withController(o.getIsDropAllowedCallback),
			allowedDropPositionsMember: o.allowedDropPositionsMember,
			getAllowedDropPositionsCallback: this._withController(o.getAllowedDropPositionsCallback),
			isCollapsibleMember: o.isCollapsibleMember,
			getIsCollapsibleCallback: this._withController(o.getIsCollapsibleCallback),
			displayValueMember: o.displayValueMember,
			getDisplayValueCallback: this._withController(o.getDisplayValueCallback),
			searchValueMember: o.searchValueMember,
			getSearchValueCallback: this._withController(o.getSearchValueCallback),
			orderMember: o.orderMember,
			isSorted: o.isSorted,
			sortCallback: this._withController(o.sortCallback),
			treePathSeparator: resolved('treePathSeparator'),
			expandLevel: resolved('expandLevel'),
			isInternalSearchIndexEnabled: resolved('isInternalSearchIndexEnabled'),
			initializeIndexCallback: o.initializeIndexCallback,
			indexerBatchSize: resolved('indexerBatchSize'),
			indexerTimeout: resolved('indexerTimeout')
		};
	}

	/**
	 * An option built into the ltree changed (B17): reconfigure it and re-insert the current data.
	 * Expansion, selection, checks and focus follow by path — except the expanded set is re-seeded
	 * when `expandLevel` / `isExpandedMember` / `getIsExpandedCallback` changed, and the checked set
	 * when `isCheckedMember` / `getIsCheckedCallback` changed (the new seed is what was asked for).
	 * Paths that no longer exist (e.g. a new `pathMember`) leave the state, with the usual events.
	 */
	private _rebuildTree(changed: TreeOptionKey[]) {
		if (!this.tree) return;
		const isExpansionReseeded = changed.some((key) => TREE_EXPANSION_SEED_OPTIONS.has(key));
		const isCheckedReseeded = changed.some((key) => TREE_CHECKED_SEED_OPTIONS.has(key));
		const expanded = isExpansionReseeded ? null : this.tree.getExpandedPaths();
		const checked = this.#allCheckedPaths;
		const data = this.nodes;
		uiLogger.debug(`[${this.treeId}] ltree options changed — re-inserting the data`, {
			changed,
			nodes: data?.length ?? 0,
			isExpansionReseeded,
			isCheckedReseeded
		});
		this.treePathSeparator = resolveTreeOption('treePathSeparator', this.#options.treePathSeparator) as string;
		this.tree.reconfigure(this._ltreeConfig());
		if (!data) return;
		this._loadNodes(data);
		// The data is in the tree already — the nodes effect must not insert it again.
		this.#selfWrittenNodes = data;
		if (expanded) this.tree.setExpandedPaths(expanded);
		if (!isCheckedReseeded && !this.tree.isCheckedMember && !this.tree.getIsCheckedCallback)
			this._replaceCheckedPaths(checked);
		// Fresh node objects: put the selection / focus flags back on them, then drop what is gone.
		this._setSelection(this.selectedPaths);
		const focusedPath = this.focusedNode?.path;
		if (focusedPath) this._setNodeFlag(focusedPath, 'isFocused', true);
		this._reconcileAfterMutation();
		if (this.searchTerm) this.tree.filterNodes(this.searchTerm);
		this.tree.refresh();
	}

	// ── Internal event handlers ─────────────────────────────────────────

	/**
	 * A click on a node row's content, routed like `<Tree>` does (a custom renderer can call it):
	 * with `shouldClickToggleCheckbox` + checkboxes, a plain click on a selectable node toggles its
	 * checkbox (no focus / selection; still expands unless `clickBehavior` is 'select'); else
	 * `clickBehavior` — 'expand' only expands, 'expand-and-focus' selects + expands, 'select' only
	 * selects. Ctrl/Shift(+Cmd) clicks manage the selection and never expand (OS file explorers).
	 */
	handleNodeClick(node: LTreeNode<T>, event?: MouseEvent): void {
		uiLogger.debug(`Node clicked: ${node.path}`, { id: node.id, hasChildren: node.hasChildren });
		const modifiers = event ? { isCtrlPressed: event.ctrlKey || event.metaKey, isShiftPressed: event.shiftKey } : undefined;
		const hasModifiers = !!(modifiers?.isCtrlPressed || modifiers?.isShiftPressed);
		const toggleExpanded = () => {
			if (node.hasChildren && this.tree.getNodeIsCollapsible(node)) void this.toggleNodeExpanded(node.path);
		};

		if (this.shouldClickToggleCheckbox && this.isCheckboxesShown && node.isSelectable && !hasModifiers) {
			this._handleCheckboxToggle(node, { skipFocus: true });
			if (this.clickBehavior !== 'select') toggleExpanded();
			return;
		}
		// 'expand': no selection, so Ctrl/Shift mean nothing — and don't expand either.
		if (this.clickBehavior === 'expand') {
			if (!hasModifiers) toggleExpanded();
			return;
		}
		this._handleNodeSelectClick(node, modifiers, { uiClick: true });
		if (this.clickBehavior === 'expand-and-focus' && !hasModifiers) toggleExpanded();
	}

	private async _handleNodeSelectClick(
		node: LTreeNode<T>,
		modifiers?: SelectionModifiers,
		options?: { isSilent?: boolean; forceMultiSemantics?: boolean; uiClick?: boolean }
	) {
		if (this.isContextMenuOpen) {
			this.closeContextMenu();
		}

		// Manual double-click detection — see the comment on _lastClickPath for why the
		// browser's native dblclick can't be trusted (focus bumps node._rev → flat-mode
		// row is recreated → the 2nd click lands on a fresh element). Runs for every
		// clickBehavior so onNodeDoubleClick fires consistently; the built-in
		// expand/collapse-on-double-click only applies to clickBehavior='select' (the
		// other modes already toggle on single click). On a detected double we consume
		// the 2nd click (return early) so the gesture is a single open, not a re-toggle.
		// Threshold = 400ms, a touch tighter than Windows' 500ms default to avoid
		// coupling unrelated clicks. Gated on uiClick so programmatic selection
		// API calls never get mistaken for a double-click.
		if (options?.uiClick && !modifiers?.isCtrlPressed && !modifiers?.isShiftPressed) {
			const now = Date.now();
			const isDouble = this._lastClickPath === node.path && now - this._lastClickTime < 400;
			if (isDouble) {
				this._lastClickPath = null;
				this._lastClickTime = 0;
				this.onNodeDoubleClickHandler?.(this._ctx(this.getNodeRef(node)));
				// Same path as the toggle glyph: accordion, the pending beforeExpand guard,
				// getNodeIsCollapsible and a mid-collapse cancel all apply.
				if (this.clickBehavior === 'select') void this.toggleNodeExpanded(node.path);
				return;
			}
			this._lastClickPath = node.path;
			this._lastClickTime = now;
		}

		// In single mode, mouse Ctrl/Shift+click degrade to plain click. Programmatic
		// callers (selectNode with mode='toggle'/'range') pass forceMultiSemantics
		// to opt out of the gate — the API contract should not depend on selectionMode.
		const isMulti = options?.forceMultiSemantics || this.selectionMode === 'multiple';
		const ctrl = isMulti && (modifiers?.isCtrlPressed ?? false);
		const shift = isMulti && (modifiers?.isShiftPressed ?? false);
		const silent = options?.isSilent ?? false;

		uiLogger.debug(`[select] Click on ${node.path}`, {
			ctrl,
			shift,
			mode: this.selectionMode,
			shiftCursor: this._shiftCursor,
			prevCount: this.selectedPaths.size
		});

		// !isSelectable blocks selection (and therefore the mirror in no-checkbox mode).
		// Focus still moves so consumers can show detail panels for unselectable rows.
		const canSelect = node.isSelectable;

		if (ctrl && canSelect) {
			// Toggle this node in/out of the selection
			const newPaths = new Set(this.selectedPaths);
			if (newPaths.has(node.path)) newPaths.delete(node.path);
			else newPaths.add(node.path);
			this._setSelection(newPaths, node.path);
		} else if (shift && canSelect && (this._shiftCursor || this.focusedNode)) {
			// Range from the shift cursor (or focused node if no cursor yet) to this node.
			// The anchor stays put on shift+click.
			const anchor = this._shiftCursor ?? this.focusedNode!.path;
			const rangePaths = this._getNodesBetween(anchor, node.path).filter(
				(path) => this.tree.getNodeByPath(path)?.isSelectable
			);
			this._setSelection(rangePaths);
		} else if (canSelect) {
			// Plain click (or Ctrl/Shift+click in single mode → treated as plain):
			// select only this node.
			this._setSelection([node.path], node.path);
		} else {
			// Not selectable: clear any prior selection but don't select this row.
			this._setSelection([], null);
		}

		// Update focus (always — focus is independent of selectability; silent = no onFocusChange)
		this._setFocusedNode(node, silent);

		if (!silent) {
			this.onNodeClickHandler?.(this._ctx(this.getNodeRef(node)));
			this._dispatchSelectionChange();
		}
		this.tree.refresh();

		// Focus the tree container so keyboard navigation works after clicking a node.
		// Skip in silent mode — programmatic selection (e.g. from URL params) shouldn't
		// steal focus from whatever the user is currently interacting with.
		if (!silent) {
			this.containerElement?.focus();
		}
	}

	/**
	 * Top-level paths within `selectedPaths` — paths whose nearest selected
	 * ancestor is NOT in the selected set. Used by multi-drag to figure out
	 * which subtrees actually need to move (descendants ride along inside).
	 */
	private _getTopLevelSelectedPaths(): string[] {
		return getTopLevelPaths(this.selectedPaths, this.treePathSeparator);
	}

	/**
	 * Resolve a path against the REAL (unfiltered) tree. While a filter is active,
	 * `tree.getNodeByPath()` returns the filtered COPY, whose `children` hold only the
	 * matching subset — checkbox state must live on (and cascade math must see every
	 * child of) the real node, or a parent with one visible match reads as fully checked
	 * and checks made while filtered are lost when the filter clears.
	 */
	private _getRealNode(path: string): LTreeNode<T> | null {
		return this.tree.getNodeByPath(path, this.tree.root);
	}

	/**
	 * The row content element of `path` in THIS tree. Scoped to the container (two trees on
	 * a page share paths — a page-wide lookup badged the other tree's row) and CSS-escaped.
	 */
	private _rowContentEl(path: string): HTMLElement | null {
		if (!this.containerElement) return null;
		return this.containerElement.querySelector<HTMLElement>(
			`[data-tree-path="${CSS.escape(path)}"] .stv__node-content`
		);
	}

	/** Mirror isChecked/visualState from the real nodes onto the filtered copies
	 *  (bumping `_rev` so they re-render). No-op when no filter is active. */
	private _reconcileFilteredCheckState() {
		if (!this.tree?.isFiltered) return;
		const visit = (copy: LTreeNode<T>) => {
			const real = this._getRealNode(copy.path);
			if (real && real !== copy && (copy.isChecked !== real.isChecked || copy.visualState !== real.visualState)) {
				copy.isChecked = real.isChecked;
				copy.visualState = real.visualState;
				bumpRev(copy);
			}
			for (const key in copy.children) visit(copy.children[key]!);
		};
		for (const node of this.tree.tree) visit(node);
	}

	/** Handle checkbox toggle with cascade and interceptor support */
	private _handleCheckboxToggle(node: LTreeNode<T>, options?: { skipFocus?: boolean }) {
		// While a filter is active, a cascade click acts on the VISIBLE matches only
		// (the filtered copy's children), not the hidden real descendants. The parent's
		// own box still reflects ALL its real children, so it can stay [-] after the
		// click — hence the toggle direction comes from the visible set: all visible
		// descendants checked → uncheck them, otherwise check them.
		const isFilteredCascade = this.checkboxMode === 'cascade' && !!this.tree.isFiltered;
		const visibleDescendants = (path: string): string[] => {
			const copy = this.tree.getNodeByPath(path);
			return copy ? getDescendantPaths(copy) : [];
		};

		let newChecked: boolean;
		const clickedVisible = isFilteredCascade ? visibleDescendants(node.path) : [];
		if (clickedVisible.length > 0) {
			newChecked = !clickedVisible.every((p) => this._getRealNode(p)?.isChecked);
		} else {
			// In cascade mode, indeterminate → check all (not fully selected yet)
			newChecked =
				this.checkboxMode === 'cascade' && node.visualState === VisualState.indeterminate
					? true
					: !node.isChecked;
		}

		// If the clicked node is part of a multi-selection, toggle every selected node
		const isMultiSelected =
			this.selectedPaths.size > 1 && this.selectedPaths.has(node.path);
		let affectedPaths = isMultiSelected ? [...this.selectedPaths] : [node.path];

		// In cascade mode, also include descendants of each affected node
		if (this.checkboxMode === 'cascade') {
			affectedPaths = this._withCascadeDescendants(affectedPaths, isFilteredCascade);
		}

		// Call interceptor if provided
		if (this.beforeCheckboxToggleHandler) {
			const result = this.beforeCheckboxToggleHandler(this._ctx({
				node,
				isChecked: newChecked,
				affectedPaths
			}));
			if (result === false) return;
			if (Array.isArray(result)) {
				affectedPaths = result;
			}
		}

		// A filtered click checked only the visible part of each branch it touched, so those
		// branches may still have hidden unchecked children — re-derive their isChecked from
		// the REAL children too, so a partial branch lands at [-] and never sits in the
		// canonical checked set.
		this._setChecked(affectedPaths, newChecked, isFilteredCascade);
		if (!options?.skipFocus) this._setFocusedNode(node);

		this.onNodeClickHandler?.(this._ctx(this.getNodeRef(node)));
		this._dispatchCheckedChange();
		this.tree.refresh();
		if (!options?.skipFocus) this.containerElement?.focus();
	}

	/** `paths` plus every descendant (the cascade set of a check / uncheck). `isVisibleOnly`
	 *  (a cascade click while filtered) takes the descendants of the filtered COPY — the
	 *  visible matches — instead of the whole real subtree. */
	private _withCascadeDescendants(paths: string[], isVisibleOnly = false): string[] {
		const expanded = new Set(paths);
		for (const path of paths) {
			const n = isVisibleOnly ? this.tree.getNodeByPath(path) : this._getRealNode(path);
			if (n) for (const dp of getDescendantPaths(n)) expanded.add(dp);
		}
		return [...expanded];
	}

	/**
	 * THE writer of a check / uncheck (checkbox click, checkNode(s), uncheckNode(s), an
	 * assigned checkedPaths): sets isChecked on the REAL nodes of `paths` (the caller has
	 * already added the cascade descendants), re-derives the cascade states, assigns the
	 * canonical set ONCE (one policy projection, however many paths) and mirrors onto the
	 * filtered copies. Returns whether the canonical set changed. No event, no refresh.
	 */
	private _setChecked(paths: string[], isChecked: boolean, isAffectedSynced = false): boolean {
		const prev = this.#allCheckedPaths;
		const next = new Set(prev);
		for (const path of paths) {
			const n = this._getRealNode(path);
			if (!n) continue;
			if (isChecked) next.add(path);
			else next.delete(path);
			n.isChecked = isChecked;
			bumpRev(n);
		}
		// Only in cascade mode — in independent mode, checkboxes are standalone and parents
		// must not be auto-checked just because their descendants are.
		if (this.checkboxMode === 'cascade') this._reconcileCascadeStates(paths, next, isAffectedSynced);
		const isChanged = next.size !== prev.size || [...next].some((p) => !prev.has(p));
		this.allCheckedPaths = next;
		this._reconcileFilteredCheckState();
		return isChanged;
	}

	/**
	 * Re-derive visualState for every node a cascade check / uncheck touched AND all their
	 * ancestors, deepest first, writing membership changes into `checked`.
	 * - The touched nodes themselves: not just the clicked one — a branch BELOW it that was
	 *   [-] (root → region → country, one country checked, then the root) gets all its
	 *   children checked by the cascade and must flip to checked too.
	 * - Ancestors of EVERY touched path, not just of the clicked node: a
	 *   beforeCheckboxToggleCallback may add paths elsewhere in the tree, whose parents
	 *   must follow too. Each ancestor also syncs isChecked (all children checked → checked).
	 * `isAffectedSynced` also syncs isChecked on the touched branches (a filtered click).
	 */
	private _reconcileCascadeStates(paths: string[], checked: Set<string>, isAffectedSynced: boolean) {
		const affected = new Set(paths);
		const nodes = new Map<string, LTreeNode<T>>();
		for (const path of affected) {
			let n = this._getRealNode(path);
			// A collected node's ancestors are collected already — stop climbing there.
			while (n && !nodes.has(n.path)) {
				nodes.set(n.path, n);
				n = n.parentPath ? this._getRealNode(n.parentPath) : null;
			}
		}
		const ordered = [...nodes.values()].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
		for (const n of ordered) {
			const vs = this._computeVisualState(n);
			let isTouched = n.visualState !== vs;
			n.visualState = vs;
			if (isAffectedSynced || !affected.has(n.path)) {
				const shouldBeChecked = vs === VisualState.checked;
				if (n.isChecked !== shouldBeChecked) {
					n.isChecked = shouldBeChecked;
					isTouched = true;
				}
				if (shouldBeChecked) checked.add(n.path);
				else checked.delete(n.path);
			}
			if (isTouched) bumpRev(n);
		}
	}

	/**
	 * Re-derive every node's visualState (and keep isChecked/checkedPaths in sync)
	 * for the current checkboxMode, then re-render the nodes that changed. Called
	 * whenever checkboxMode flips so the switch is immediately consistent.
	 *
	 * - `cascade`: recompute each parent's indeterminate/selected from its descendants,
	 *   and sync isChecked for the definitive states (all children selected → parent
	 *   selected; none → unselected).
	 * - `independent`: there is no inherited indeterminate, so a node sitting at [-]
	 *   is promoted to fully CHECKED (isChecked = true) rather than dropped to
	 *   unchecked; every other node's visualState collapses to its own isChecked.
	 *
	 * Bumping `_rev` on changed nodes re-creates their row, which is what actually
	 * rewrites the checkbox's `indeterminate` DOM property — it's set imperatively, so
	 * without a re-render a stale cascade dash would stick at [-] even after the mode
	 * no longer wants it.
	 */
	private _reconcileVisualStatesForMode() {
		if (!this.tree?.root) return;
		const cascade = this.#checkboxMode === 'cascade';
		const newPaths = new Set<string>(this.allCheckedPaths);
		let anyChanged = false;
		let checkedChanged = false;
		const visit = (node: LTreeNode<T>) => {
			let vs: VisualState;
			let checkedTouched = false;
			if (cascade) {
				vs = this._computeVisualState(node);
				// Sync isChecked with a definitive computed state (leave indeterminate as-is).
				if (vs !== VisualState.indeterminate) {
					const shouldBeChecked = vs === VisualState.checked;
					if (node.isChecked !== shouldBeChecked) {
						node.isChecked = shouldBeChecked;
						if (shouldBeChecked) newPaths.add(node.path);
						else newPaths.delete(node.path);
						checkedTouched = true;
					}
				}
			} else if (node.visualState === VisualState.indeterminate) {
				// Independent mode has no partial state: promote [-] to fully checked.
				if (!node.isChecked) {
					node.isChecked = true;
					checkedTouched = true;
				}
				newPaths.add(node.path);
				vs = VisualState.checked;
			} else {
				vs = node.isChecked ? VisualState.checked : VisualState.unchecked;
			}
			if (node.visualState !== vs || checkedTouched) {
				node.visualState = vs;
				bumpRev(node);
				anyChanged = true;
				if (checkedTouched) checkedChanged = true;
			}
			for (const key in node.children) visit(node.children[key]!);
		};
		for (const key in this.tree.root.children) visit(this.tree.root.children[key]!);
		if (checkedChanged) this.allCheckedPaths = newPaths;
		if (anyChanged) {
			this._reconcileFilteredCheckState();
			this.tree.refresh();
			if (checkedChanged) this._dispatchCheckedChange();
		}
	}

	/** Compute visual state for a node based on its descendants' isChecked */
	private _computeVisualState(node: LTreeNode<T>): VisualState {
		const children = Object.values(node.children);
		if (children.length === 0) {
			return node.isChecked ? VisualState.checked : VisualState.unchecked;
		}
		let allChecked = true;
		let noneChecked = true;
		const check = (n: LTreeNode<T>) => {
			if (!allChecked && !noneChecked) return; // indeterminate already
			if (n.isChecked) noneChecked = false;
			else allChecked = false;
			for (const child of Object.values(n.children)) {
				if (!allChecked && !noneChecked) return;
				check(child);
			}
		};
		for (const child of children) {
			check(child);
			if (!allChecked && !noneChecked) break;
		}
		if (allChecked) return VisualState.checked;
		if (noneChecked) return VisualState.unchecked;
		return VisualState.indeterminate;
	}

	/**
	 * Project the canonical checked set through the active `cascadeCheckPolicy`
	 * to produce the EMITTED selection (what the bindable `checkedPaths` prop and
	 * `onCheckedChange` expose). Pure — reads `node.isChecked` off the live tree,
	 * never mutates. See {@link CascadeCheckPolicy}.
	 *
	 * - independent mode OR `'all'` policy → the canonical set as-is (every
	 *   fully-checked node; canonical never contains an indeterminate branch).
	 * - `'leaves'` → only checked leaf nodes.
	 * - `'rolled-up'` → a fully-checked selectable branch collapses to its root
	 *   (stop descending); indeterminate branches descend to emit their checked bits.
	 */
	private _computeEmittedCheckedPaths(canonical: Set<string>): Set<string> {
		if (this.#checkboxMode !== 'cascade' || this.#cascadeCheckPolicy === 'all' || !this.tree) {
			return canonical;
		}
		const policy = this.#cascadeCheckPolicy;
		const out = new Set<string>();
		const walk = (node: LTreeNode<T>) => {
			const vs = this._computeVisualState(node);
			if (vs === VisualState.unchecked) return;
			const children = Object.values(node.children);
			const selectable = node.isSelectable !== false;
			if (policy === 'leaves') {
				if (children.length === 0 && node.isChecked && selectable) out.add(node.path);
				for (const child of children) walk(child);
				return;
			}
			// rolled-up: a fully-checked selectable node covers its whole subtree.
			if (vs === VisualState.checked && selectable) {
				out.add(node.path);
				return;
			}
			for (const child of children) walk(child);
		};
		for (const key in this.tree.root.children) walk(this.tree.root.children[key]!);
		return out;
	}

	/** @internal Replace the focused node silently — the path behind an assigned
	 *  `focusedNode` (bindable prop / `updateProps`). Moves the isFocused flag off the old
	 *  row and onto the new one; a no-op when the path didn't change (the prop echo). */
	_replaceFocusedNode(node: LTreeNode<T> | null | undefined) {
		if ((node?.path ?? null) === (this.focusedNode?.path ?? null)) return;
		this._setFocusedNode(node ?? null, true);
		this.tree?.refresh();
	}

	/** Set focused node, clearing previous focus flag. Fires `onFocusChange` when the focused
	 *  path changed, unless `isSilent`. */
	private _setFocusedNode(node: LTreeNode<T> | null, isSilent?: boolean) {
		// IMPORTANT: bidirectional bind on `focusedNode` can route the value through
		// the parent's `$state`, which deep-clones the node into a reactive proxy.
		// That clone shares the path but is a different object from the tree's
		// canonical node. We MUST mutate the tree's actual node — otherwise
		// `node.isFocused = false` writes to the clone and the rendered row
		// (which reads the canonical node's flag) never updates. Same applies to
		// the incoming `node`: prefer the tree's canonical ref.
		// While filtered the flag goes to BOTH the real node and its filtered copy (_setNodeFlag),
		// and focusedNode keeps the REAL node — the copy is thrown away when the filter clears.
		const prevPath = this.focusedNode?.path;
		if (prevPath && prevPath !== node?.path) this._setNodeFlag(prevPath, 'isFocused', false);
		const canonical = node
			? (this._getRealNode(node.path) ?? this.tree.getNodeByPath(node.path) ?? node)
			: null;
		if (canonical) this._setNodeFlag(canonical.path, 'isFocused', true);
		this.focusedNode = canonical;
		if (!isSilent && prevPath !== canonical?.path && (prevPath !== undefined || canonical))
			this.onFocusChangeHandler?.(this._ctx({ focusedNode: canonical }));
	}

	/**
	 * Mirror selectedPaths → checkedPaths when checkboxes are off.
	 * Decision 1 + 10 from selection-highlight-model.md: in no-checkbox mode the
	 * click selection IS the checked set, so writes to selectedPaths cascade
	 * to checkedPaths and fire onCheckedChange alongside onSelectionChange.
	 */
	private _reconcileCheckedFromSelection() {
		if (this.isCheckboxesShown) return;
		// Take a snapshot to avoid identity-loop on parent rebinding
		const next = new Set(this.selectedPaths);
		// Sync the per-node isChecked flag with the mirrored set.
		// First clear isChecked on anything currently in checkedPaths but not in next.
		for (const path of this.allCheckedPaths) {
			if (!next.has(path)) {
				const n = this._getRealNode(path);
				if (n) {
					n.isChecked = false;
					bumpRev(n);
				}
			}
		}
		// Then set isChecked on the new set.
		for (const path of next) {
			const n = this._getRealNode(path);
			if (n && !n.isChecked) {
				n.isChecked = true;
				bumpRev(n);
			}
		}
		this.allCheckedPaths = next;
		this._reconcileFilteredCheckState();
		this._dispatchCheckedChange();
	}

	/**
	 * THE writer of the UI selection: `selectedPaths` plus every row's isSelected flag (real
	 * node + filtered copy, see _setNodeFlag). Diffs against the current set, so only rows
	 * whose membership changed re-render. `anchor` moves the Shift-range anchor (undefined =
	 * leave it). No event, no refresh — follow with _dispatchSelectionChange() when not silent.
	 */
	private _setSelection(paths: Iterable<string>, anchor?: string | null) {
		const prev = this.selectedPaths;
		const next = new Set(paths);
		for (const path of prev) {
			if (!next.has(path)) this._setNodeFlag(path, 'isSelected', false);
		}
		for (const path of next) {
			if (!prev.has(path) || !this._getRealNode(path)?.isSelected) {
				this._setNodeFlag(path, 'isSelected', true);
			}
		}
		if (next.size !== prev.size || [...next].some((p) => !prev.has(p))) {
			this.selectedPaths = next;
		}
		if (anchor !== undefined) this._shiftCursor = anchor;
	}

	/** onSelectionChange + the no-checkbox mirror into checkedPaths (onCheckedChange). */
	private _dispatchSelectionChange() {
		if (this.onSelectionChangeHandler) {
			const nodes = this.getSelectedNodes();
			this.onSelectionChangeHandler(this._ctx({ paths: this.selectedPaths, nodes }));
		}
		this._reconcileCheckedFromSelection();
	}

	/**
	 * After a mutation (see _mutate): the path-keyed state follows the tree (B2).
	 * - Paths of nodes no longer in the tree leave the selection (+ range anchor), the checked
	 *   set and the cut set — removeNode / removeBranch / a cut-paste source used to leave them
	 *   behind, so `checkedPaths` kept reporting deleted nodes.
	 * - A removed focused node is unfocused (bind:focusedNode no longer points at a detached
	 *   node); when a different node now sits at its path (replaceBranch) focus moves onto it.
	 * - Cascade mode re-derives the branch states: a removed / moved / added child changes its
	 *   parent's [✓] / [-] (_rederiveCascadeStates).
	 * Fires onSelectionChange / onFocusChange / onCheckedChange only for what changed.
	 */
	private _reconcileAfterMutation() {
		if (!this.tree?.root) return;
		const isLive = (path: string) => this._getRealNode(path) !== null;

		const selected = [...this.selectedPaths].filter(isLive);
		const cursor = this._shiftCursor;
		const isSelectionChanged = selected.length !== this.selectedPaths.size;
		if (isSelectionChanged) this._setSelection(selected, cursor && !isLive(cursor) ? null : undefined);
		else if (cursor && !isLive(cursor)) this._shiftCursor = null;

		const focused = this.focusedNode;
		const liveFocused = focused ? this._getRealNode(focused.path) : null;
		if (focused && liveFocused !== focused) this._setFocusedNode(liveFocused);

		if (this.cutPaths.size > 0) {
			const cut = [...this.cutPaths].filter(isLive);
			if (cut.length !== this.cutPaths.size) this.cutPaths = new Set(cut);
		}

		const prevChecked = this.#allCheckedPaths;
		const checked = new Set([...prevChecked].filter(isLive));
		// No checkboxes = the checked set is the selection mirror (_reconcileCheckedFromSelection),
		// which has no cascade.
		const isCascade = this.checkboxMode === 'cascade' && this.isCheckboxesShown;
		if (isCascade && prevChecked.size > 0) this._rederiveCascadeStates(checked);
		const isCheckedChanged =
			checked.size !== prevChecked.size || [...checked].some((p) => !prevChecked.has(p));
		if (isCheckedChanged) {
			this.allCheckedPaths = checked;
			this._reconcileFilteredCheckState();
		}

		if (isSelectionChanged) this._dispatchSelectionChange();
		if (isCheckedChanged) this._dispatchCheckedChange();
		if (isSelectionChanged || isCheckedChanged || (focused && liveFocused !== focused))
			this.tree.refresh();
		if (isSelectionChanged || isCheckedChanged || liveFocused !== focused)
			uiLogger.debug('[mutate] State reconciled', {
				selected: selected.length,
				checked: checked.size,
				focused: liveFocused?.path ?? null
			});
	}

	/**
	 * Cascade mode: re-derive every branch's visualState + isChecked from its descendants in
	 * ONE bottom-up pass over the real tree (O(n) — _computeVisualState per node would re-walk
	 * each subtree), writing membership changes into `checked`. Same rule as
	 * _reconcileCascadeStates: all descendants checked → checked, none → unchecked, else [-]
	 * (not in the canonical set). Leaves keep their own isChecked.
	 */
	private _rederiveCascadeStates(checked: Set<string>) {
		// Returns whether the node's whole subtree (itself included) is checked / unchecked.
		const visit = (n: LTreeNode<T>): { isAll: boolean; isNone: boolean } => {
			let isAll = true;
			let isNone = true;
			let hasChildren = false;
			for (const key in n.children) {
				hasChildren = true;
				const sub = visit(n.children[key]!);
				isAll &&= sub.isAll;
				isNone &&= sub.isNone;
			}
			let vs: VisualState;
			if (!hasChildren) {
				vs = n.isChecked ? VisualState.checked : VisualState.unchecked;
			} else {
				vs = isAll ? VisualState.checked : isNone ? VisualState.unchecked : VisualState.indeterminate;
				const shouldBeChecked = vs === VisualState.checked;
				if (n.isChecked !== shouldBeChecked) {
					n.isChecked = shouldBeChecked;
					bumpRev(n);
				}
				if (shouldBeChecked) checked.add(n.path);
				else checked.delete(n.path);
			}
			if (n.visualState !== vs) {
				n.visualState = vs;
				bumpRev(n);
			}
			return { isAll: isAll && n.isChecked, isNone: isNone && !n.isChecked };
		};
		for (const key in this.tree.root.children) visit(this.tree.root.children[key]!);
	}

	/**
	 * Reset checkbox state on the whole REAL tree: isChecked AND visualState. Walking only
	 * the checked set missed indeterminate branches (a [-] branch is never in the canonical
	 * set), so `uncheckAll()` / assigning `checkedPaths` left their dash behind.
	 */
	private _clearAllCheckedFlags() {
		forEachDescendant(this.tree.root, (n) => {
			if (n.isChecked || n.visualState !== VisualState.unchecked) {
				n.isChecked = false;
				n.visualState = VisualState.unchecked;
				bumpRev(n);
			}
		});
	}

	/**
	 * Set a UI flag (isSelected / isFocused) on the REAL node and, while a filter is active,
	 * on its filtered copy too — Node.svelte renders the copy, the real node survives the
	 * filter. Writing only `getNodeByPath()` (= the copy while filtered) lost selections made
	 * while filtered and left stale flags on hidden nodes.
	 */
	private _setNodeFlag(path: string, key: 'isSelected' | 'isFocused', value: boolean) {
		const real = this._getRealNode(path);
		const copy = this.tree.isFiltered ? this.tree.getNodeByPath(path) : null;
		for (const n of copy && copy !== real ? [real, copy] : [real]) {
			if (!n) continue;
			n[key] = value;
			bumpRev(n);
		}
	}

	/** Fire `onCheckedChange` with the folded set (`checkedPaths`, as the bindable prop exposes). */
	private _dispatchCheckedChange() {
		if (this.onCheckedChangeHandler) {
			const nodes: LTreeNode<T>[] = [];
			for (const path of this.#checkedPaths) {
				const node = this.tree.getNodeByPath(path);
				if (node) nodes.push(node);
			}
			this.onCheckedChangeHandler(this._ctx({ paths: this.#checkedPaths, nodes }));
		}
	}

	/** Get nodes between two paths for range selection, respecting rangeSelectionMode */
	private _getNodesBetween(pathA: string, pathB: string): string[] {
		uiLogger.debug(
			`[multi-select] _getNodesBetween: ${pathA} → ${pathB}, mode=${this.rangeSelectionMode}`
		);
		if (this.rangeSelectionMode === 'logical') {
			return this._getAllNodesBetween(pathA, pathB);
		}
		return this._getVisibleNodesBetween(pathA, pathB);
	}

	/** Get visible nodes between two paths (inclusive), in display order.
	 *  Only includes expanded/visible nodes. */
	private _getVisibleNodesBetween(pathA: string, pathB: string): string[] {
		const flatNodes = this.tree.visibleFlatNodes;
		let indexA = -1;
		let indexB = -1;
		for (let i = 0; i < flatNodes.length; i++) {
			if (flatNodes[i].path === pathA) indexA = i;
			if (flatNodes[i].path === pathB) indexB = i;
			if (indexA !== -1 && indexB !== -1) break;
		}
		uiLogger.debug(
			`[multi-select] _getVisibleNodesBetween: indexA=${indexA}, indexB=${indexB}, totalVisible=${flatNodes.length}`
		);
		if (indexA === -1 || indexB === -1) {
			uiLogger.debug(
				`[multi-select] _getVisibleNodesBetween: path not found in visible nodes, falling back to [${pathB}]`
			);
			return [pathB];
		}
		const start = Math.min(indexA, indexB);
		const end = Math.max(indexA, indexB);
		const result = flatNodes.slice(start, end + 1).map((n) => n.path);
		uiLogger.debug(
			`[multi-select] _getVisibleNodesBetween: selected ${result.length} visible nodes [${start}..${end}]`
		);
		return result;
	}

	/** Get ALL nodes between two paths (inclusive), in depth-first tree order.
	 *  Includes collapsed/hidden nodes — "logical" range selection. */
	private _getAllNodesBetween(pathA: string, pathB: string): string[] {
		// Walk entire tree depth-first and collect paths between A and B
		const allPaths: string[] = [];
		const traverse = (node: LTreeNode<T>) => {
			if (node.path) allPaths.push(node.path);
			for (const child of Object.values(node.children)) {
				traverse(child);
			}
		};
		for (const rootChild of this.tree.tree) {
			traverse(rootChild);
		}

		let indexA = -1;
		let indexB = -1;
		for (let i = 0; i < allPaths.length; i++) {
			if (allPaths[i] === pathA) indexA = i;
			if (allPaths[i] === pathB) indexB = i;
			if (indexA !== -1 && indexB !== -1) break;
		}
		uiLogger.debug(
			`[multi-select] _getAllNodesBetween: indexA=${indexA}, indexB=${indexB}, totalNodes=${allPaths.length}`
		);
		if (indexA === -1 || indexB === -1) {
			uiLogger.debug(
				`[multi-select] _getAllNodesBetween: path not found in tree, falling back to [${pathB}]`
			);
			return [pathB];
		}
		const start = Math.min(indexA, indexB);
		const end = Math.max(indexA, indexB);
		const result = allPaths.slice(start, end + 1);
		uiLogger.debug(
			`[multi-select] _getAllNodesBetween: selected ${result.length} nodes [${start}..${end}]`
		);
		return result;
	}

	// ── Public selection methods (the UI click selection) ──────────────────

	/** Select a single node. `mode` mirrors the click gestures:
	 *  'replace' (plain click) replaces the set, 'toggle' (Ctrl+click) adds/removes
	 *  just this node, 'range' (Shift+click) selects from the shift-cursor to here.
	 *  Pass `{ isSilent: true }` to update state without firing `onNodeClick` / `onSelectionChange`. */
	selectNode(path: string, mode: SelectMode = 'replace', options?: TreeMutationOptions) {
		const node = this.tree.getNodeByPath(path);
		if (!node) return;

		if (mode === 'toggle') {
			this._handleNodeSelectClick(
				node,
				{ isCtrlPressed: true, isShiftPressed: false },
				{ ...options, forceMultiSemantics: true }
			);
		} else if (mode === 'range') {
			this._handleNodeSelectClick(
				node,
				{ isCtrlPressed: false, isShiftPressed: true },
				{ ...options, forceMultiSemantics: true }
			);
		} else {
			this._handleNodeSelectClick(node, undefined, options);
		}
	}

	/** Add nodes to the selection (additive — the existing selection is kept).
	 *  To replace the whole set, assign `selectedPaths` (the bindable prop / `updateProps`).
	 *  Pass `{ isSilent: true }` to skip `onSelectionChange`. */
	selectNodes(paths: string[], options?: TreeMutationOptions) {
		const selectable = this._selectablePaths(paths);
		this._selectAndFocusLast([...this.selectedPaths, ...selectable], selectable, options);
	}

	/** @internal Replace the entire selection set (node flags included), silently — the
	 *  path behind an assigned `selectedPaths` (bindable prop / `updateProps`). No event. */
	_replaceSelectedPaths(paths: Iterable<string>) {
		const selectable = this._selectablePaths(paths);
		if (selectable.length === 0) this._shiftCursor = null;
		this._selectAndFocusLast(selectable, selectable, { isSilent: true });
	}

	/** Select every visible node. Pass `{ isSilent: true }` to skip `onSelectionChange`. */
	selectAll(options?: TreeMutationOptions) {
		const selectable = this.tree.visibleFlatNodes.filter((n) => n.isSelectable).map((n) => n.path);
		this._selectAndFocusLast(selectable, selectable, options);
	}

	/** The paths of `paths` that resolve to a selectable node. */
	private _selectablePaths(paths: Iterable<string>): string[] {
		const result: string[] = [];
		for (const path of paths) {
			if (this.tree.getNodeByPath(path)?.isSelectable) result.push(path);
		}
		return result;
	}

	/** selectNodes / selectAll / an assigned selectedPaths: set the selection to `paths`;
	 *  the last of `added` becomes the focused node + range anchor. */
	private _selectAndFocusLast(paths: string[], added: string[], options?: TreeMutationOptions) {
		const lastPath = added.at(-1);
		this._setSelection(paths, lastPath);
		const lastNode = lastPath ? this.tree.getNodeByPath(lastPath) : null;
		if (lastNode) this._setFocusedNode(lastNode, options?.isSilent);
		if (!options?.isSilent) this._dispatchSelectionChange();
		this.tree.refresh();
	}

	/** Clear the selection. Pass `paths` to clear only those nodes, or omit to clear all.
	 *  Pass `{ isSilent: true }` to skip `onSelectionChange`. */
	clearSelection(paths?: string[], options?: TreeMutationOptions) {
		if (paths && paths.length > 0) {
			const removed = new Set(paths);
			const next = [...this.selectedPaths].filter((p) => !removed.has(p));
			const cursor = this._shiftCursor;
			this._setSelection(next, cursor && !next.includes(cursor) ? null : undefined);
		} else {
			this._setSelection([], null);
		}
		if (!options?.isSilent) this._dispatchSelectionChange();
		this.tree.refresh();
	}

	/** Get all selected nodes */
	getSelectedNodes(): LTreeNode<T>[] {
		const nodes: LTreeNode<T>[] = [];
		for (const path of this.selectedPaths) {
			const node = this.tree.getNodeByPath(path);
			if (node) nodes.push(node);
		}
		return nodes;
	}

	/** Check if a specific node path is selected */
	isNodeSelected(path: string): boolean {
		return this.selectedPaths.has(path);
	}

	/** Toggle the focused node in / out of the selection. Multi-mode only. */
	toggleFocusedSelect(): void {
		if (this.selectionMode !== 'multiple') return;
		// The bound focusedNode can be a $state clone — toggle the tree's canonical node.
		const focused = this.focusedNode;
		const node = focused ? (this.tree?.getNodeByPath(focused.path) ?? null) : null;
		if (!node || !node.isSelectable) return;
		this._handleNodeSelectClick(node, { isCtrlPressed: true, isShiftPressed: false }, { forceMultiSemantics: true });
	}

	// ── Public selection methods (checkbox data state) ───────────────

	/** The nodes of `checkedPaths` — the checked set as reported, folded by `cascadeCheckPolicy`. */
	getCheckedNodes(): LTreeNode<T>[] {
		return this._getNodesOf(this.#checkedPaths);
	}

	/** The nodes of `allCheckedPaths` — every node that shows a tick, never folded. */
	getAllCheckedNodes(): LTreeNode<T>[] {
		return this._getNodesOf(this.#allCheckedPaths);
	}

	private _getNodesOf(paths: Iterable<string>): LTreeNode<T>[] {
		const nodes: LTreeNode<T>[] = [];
		for (const path of paths) {
			const node = this.tree.getNodeByPath(path);
			if (node) nodes.push(node);
		}
		return nodes;
	}

	/** Whether the node shows a tick (fully checked; an indeterminate branch is not). */
	isNodeChecked(path: string): boolean {
		return this.#allCheckedPaths.has(path);
	}

	/** checkNode(s) / uncheckNode(s) / an assigned checkedPaths: `paths` plus (cascade
	 *  mode) their whole real subtrees, through _setChecked. */
	private _setCheckedWithCascade(paths: string[], isChecked: boolean): boolean {
		const affected = this.checkboxMode === 'cascade' ? this._withCascadeDescendants(paths) : paths;
		return this._setChecked(affected, isChecked);
	}

	/** Check a single node (cascades to descendants in cascade mode).
	 *  Pass `{ isSilent: true }` to skip `onCheckedChange`. */
	checkNode(path: string, options?: TreeMutationOptions) {
		const changed = this._setCheckedWithCascade([path], true);
		if (changed && !options?.isSilent) this._dispatchCheckedChange();
		this.tree.refresh();
	}

	/** Check multiple nodes (additive — existing checks are kept).
	 *  To replace the whole set, assign `checkedPaths` (the bindable prop / `updateProps`).
	 *  Pass `{ isSilent: true }` to skip `onCheckedChange`. */
	checkNodes(paths: string[], options?: TreeMutationOptions) {
		const changed = this._setCheckedWithCascade(paths, true);
		if (changed && !options?.isSilent) this._dispatchCheckedChange();
		this.tree.refresh();
	}

	/** @internal Replace the entire checked set silently — the path behind an assigned
	 *  `checkedPaths` (bindable prop / `updateProps`). The incoming set is a projection
	 *  intent; it is expanded (cascade-down) into the canonical checked state. No event. */
	_replaceCheckedPaths(paths: Iterable<string>) {
		this._clearAllCheckedFlags();
		this.#allCheckedPaths = new Set(); // _setChecked assigns (and projects) once
		this._setCheckedWithCascade([...paths], true);
		this.tree.refresh();
	}

	/** Check every selectable node. Pass `{ isSilent: true }` to skip `onCheckedChange`. */
	checkAll(options?: TreeMutationOptions) {
		// While filtered only the visible matches are checked — keep hidden checks.
		const isFiltered = !!this.tree.isFiltered;
		const newPaths = isFiltered ? new Set(this.allCheckedPaths) : new Set<string>();
		const traverse = (node: LTreeNode<T>) => {
			if (node.path && node.isSelectable) {
				const real = this._getRealNode(node.path) ?? node;
				real.isChecked = true;
				if (real.visualState !== VisualState.checked) real.visualState = VisualState.checked;
				bumpRev(real);
				newPaths.add(node.path);
			}
			for (const child of Object.values(node.children)) traverse(child);
		};
		for (const root of this.tree.tree) traverse(root);
		this.allCheckedPaths = newPaths;
		// Branches with hidden unchecked children must fall back to [-] in cascade.
		if (isFiltered && this.checkboxMode === 'cascade') this._reconcileVisualStatesForMode();
		this._reconcileFilteredCheckState();
		if (!options?.isSilent) this._dispatchCheckedChange();
		this.tree.refresh();
	}

	/** Uncheck a single node (cascades to descendants in cascade mode).
	 *  Pass `{ isSilent: true }` to skip `onCheckedChange`. */
	uncheckNode(path: string, options?: TreeMutationOptions) {
		const changed = this._setCheckedWithCascade([path], false);
		if (changed && !options?.isSilent) this._dispatchCheckedChange();
		this.tree.refresh();
	}

	/** Uncheck multiple nodes (cascades in cascade mode); other checks are kept.
	 *  Pass `{ isSilent: true }` to skip `onCheckedChange`. */
	uncheckNodes(paths: string[], options?: TreeMutationOptions) {
		const changed = this._setCheckedWithCascade(paths, false);
		if (changed && !options?.isSilent) this._dispatchCheckedChange();
		this.tree.refresh();
	}

	/** Uncheck every node (empties the checkbox set).
	 *  Pass `{ isSilent: true }` to skip `onCheckedChange`. */
	uncheckAll(options?: TreeMutationOptions) {
		this._clearAllCheckedFlags();
		this.allCheckedPaths = new Set();
		this._reconcileFilteredCheckState();
		if (!options?.isSilent) this._dispatchCheckedChange();
		this.tree.refresh();
	}

	// ── Public focus methods (single cursor) ─────────────────────────

	/** Move focus to a node. Fires `onFocusChange` unless `{ isSilent: true }`. */
	focusNode(path: string, options?: TreeMutationOptions) {
		const node = this.tree.getNodeByPath(path);
		if (!node) return;
		this._setFocusedNode(node, options?.isSilent);
		this.tree.refresh();
	}

	/**
	 * The top-level selected paths a multi-drag carries (move AND copy): minus the drop target,
	 * minus locked nodes (getIsDraggableCallback false). The single-drag path is gated at drag
	 * start, but a multi-drag reads straight from selectedPaths, so a locked node that merely
	 * sits in the selection must not ride along — the copy branch used to skip this gate.
	 */
	private _getDraggableTopLevelSelection(dropPath: string): string[] {
		return this._getTopLevelSelectedPaths().filter((p) => {
			if (p === dropPath) return false;
			const n = this.tree.getNodeByPath(p);
			return n ? this.getNodeIsDraggable(n) : false;
		});
	}

	/** Clear the focused node. Fires `onFocusChange` unless `{ isSilent: true }`. */
	clearFocus(options?: TreeMutationOptions) {
		this._setFocusedNode(null, options?.isSilent);
		this.tree.refresh();
	}

	private _handleNodeContextMenu(node: LTreeNode<T>, event: MouseEvent) {
		if (!this.hasContextMenuSnippet && !this.getContextMenuItemsHandler) {
			return;
		}

		// Decision 12: right-click does NOT move focus or the selection. It only opens
		// the context menu at the right-clicked node. If the consumer needs the
		// menu to act on something other than the selection, they can read
		// the node passed to their getContextMenuItemsCallback.
		uiLogger.debug(`Context menu opened: ${node.path}`);
		event.preventDefault();
		this.openContextMenu(node.path, event.clientX, event.clientY);
	}

	// ── Drag and drop ───────────────────────────────────────────────────

	/** `dragDropMode` lets a node from tree `draggedNodeTreeId` drop here (asked of the TARGET tree). */
	private isDropAllowedByMode(draggedNodeTreeId: string | undefined): boolean {
		if (this.dragDropMode === 'none') return false;
		const isSameTree = draggedNodeTreeId === this.treeId;
		if (this.dragDropMode === 'self' && !isSameTree) return false;
		if (this.dragDropMode === 'cross' && isSameTree) return false;
		return true;
	}

	/**
	 * What a same-tree drop places (move AND copy). A beforeDragStartCallback override IS the
	 * manifest — its omitted descendants are deliberate holes; it skips the draggability gate (the
	 * consumer forced those paths in) and ALWAYS counts as a set: ['folder'] without its only child
	 * is a manifest with a hole, which the single-node moveNode would carry along. Else the
	 * draggable top-level selection when the lead is part of a multi-selection (Decision 6 in
	 * selection-highlight-model.md), else just the lead — both completed to whole subtrees. The
	 * drop target never moves onto itself. `isSet` = more than the plain lead.
	 */
	private _dropManifest(lead: LTreeNode<T>, dropPath: string): { paths: string[]; isSet: boolean } {
		if (this._dragSetOverride) {
			const paths = this._dragSetOverride.filter((p) => p !== dropPath && !!this.tree.getNodeByPath(p));
			return { paths, isSet: paths.length > 0 };
		}
		if (this.selectedPaths.has(lead.path) && this.selectedPaths.size > 1)
			return { paths: this._getPathsWithDescendants(this._getDraggableTopLevelSelection(dropPath)), isSet: true };
		return { paths: this._getPathsWithDescendants([lead.path]), isSet: false };
	}

	private async _handleDrop(
		dropNode: LTreeNode<T> | null,
		draggedNodeRef: LTreeNode<T>,
		position: DropPosition,
		event: PointerEvent
	): Promise<boolean> {
		let operation: DropOperation = 'move';
		const ctrlKey = event?.ctrlKey === true;

		if (this.isCopyAllowed && ctrlKey) {
			operation = 'copy';
		}

		dragLogger.info(`Drop: ${draggedNodeRef.path} -> ${dropNode?.path ?? 'empty tree'}`, {
			position,
			operation,
			isCrossTree: draggedNodeRef.treeId !== this.treeId
		});

		const isSameTreeDrag = draggedNodeRef.treeId === this.treeId;

		// Capture the full dragged set BEFORE any move mutates the selection, so the
		// event's `dragged` reflects what the user picked up (not the post-move remap).
		// _draggedRefs is cross-tree-aware: same-tree resolves live nodes, cross-tree pulls
		// the top-level paths the source published on drag start (getDragSet).
		const draggedRefs = this._draggedRefs(draggedNodeRef);
		// One fire path for every branch: `dropped` = the nodes the library actually placed
		// (null when it didn't — cross-tree or shouldAutoHandle*=false). NodeRefs are built
		// at fire time so parent/siblings reflect the final tree.
		const dispatchDrop = (dropped: LTreeNode<T>[] | null) => {
			// The tree placed the nodes itself → say where (a consumer-owned drop — dropped null —
			// is the consumer's to announce).
			if (dropped?.length) this._announceDrop(dropped, draggedRefs.length, dropNode, position, operation);
			this.onNodeDropHandler?.(this._ctx({
				source: this.getNodeRef(draggedNodeRef),
				target: dropNode ? this.getNodeRef(dropNode) : null,
				dragged: draggedRefs,
				dropped: dropped ? dropped.map((n) => this.getNodeRef(n)) : null,
				position,
				operation,
				event
			}));
		};

		if (this.beforeDropHandler) {
			const result = await this.beforeDropHandler(this._ctx({
				target: dropNode ? this.getNodeRef(dropNode) : null,
				dragged: draggedRefs,
				position,
				operation,
				event
			}));
			if (result === false) return false;
			if (Array.isArray(result)) {
				// Content-addressed routing: fan the drop out to the returned groups. Same-tree
				// nodes are moved by the library; cross-tree nodes can't be (not in this tree),
				// so they're left for the consumer's onNodeDrop. Paths in no group aren't placed.
				return this._processDropGroups(result, dispatchDrop);
			}
			if (result && typeof result === 'object') {
				if ('position' in result && result.position) position = result.position;
				if ('operation' in result && result.operation) operation = result.operation;
			}
		}

		// Multi-drag (Decision 6 in selection-highlight-model.md):
		// When the dragged node is part of a multi-selection, move the whole selection
		// as top-level-selected subtrees. Descendants whose nearest selected
		// ancestor is in the set are absorbed (ride along inside the subtree).
		// A beforeDragStartCallback override takes over as the authoritative set and ALWAYS
		// goes through moveNodes — even a ONE-entry override: ['folder'] with the folder's only
		// child omitted is a manifest with a hole, and the single-node moveNode below would
		// carry that child along. (It also turns a single grab into a multi-move when the
		// callback force-adds companions.)
		if (isSameTreeDrag && operation === 'move' && dropNode) {
			// shouldAutoHandleMove=false: library placed nothing → dropped is null.
			if (!this.shouldAutoHandleMove) {
				dispatchDrop(null);
				return true;
			}
			const { paths, isSet } = this._dropManifest(draggedNodeRef, dropNode.path);
			if (!isSet) {
				const result = this.moveNode(draggedNodeRef.path, dropNode.path, position);
				// moveNode mutates in place, so draggedNodeRef IS the landed node.
				dispatchDrop([draggedNodeRef]);
				return result.success;
			}
			// moveNodes resolves refs up front (no stale paths), picks the roots and chains them in
			// source order under dropNode: 'after D' → [D, A, B, C], 'before D' → [A, B, C, D],
			// 'child of D' → [A, B, C]; descendants a curated manifest omits are holes left behind.
			dragLogger.info(`Multi-drag: moving ${paths.length} path(s)`, {
				paths,
				totalSelected: this.selectedPaths.size,
				dropTarget: dropNode.path,
				position
			});
			const result = this.moveNodes(paths, dropNode.path, position);
			dispatchDrop(result.movedNodes);
			return result.success;
		}

		if (isSameTreeDrag && operation === 'copy' && dropNode && this.shouldAutoHandleCopy) {
			// Copy twin of the move branch: the same manifest, then duplicateNodes runs the INPUT
			// transform per node — the consumer's nodeInputTransformationCallback, else a default
			// id-uniquifier. Omitted descendants of a curated manifest are simply not copied.
			const transform = this.inputTransformHandler ?? this._defaultCopyTransform;
			const { paths } = this._dropManifest(draggedNodeRef, dropNode.path);
			const result = this.duplicateNodes(paths, dropNode.path, position, transform);
			dispatchDrop(result.copiedNodes);
			return result.success;
		}

		if (!isSameTreeDrag && operation === 'copy' && this.shouldAutoHandleCopy) {
			// Cross-tree AUTO-copy: reach the SOURCE tree via the registry, read its published
			// PLACEMENT manifest (a curated beforeDragStart override keeps its holes; a plain drag
			// was completed to whole subtrees), and duplicate it into THIS tree. The source stays
			// put — a copy re-homes nothing. Falls through to the consumer if the source tree isn't
			// reachable (e.g. dropped from a foreign page).
			// The module-level dragSet (same page, the drag is still live), else just the lead path.
			let sourceTreeId = draggedNodeRef.treeId;
			let manifest: string[] | null = null;
			if (!manifest) {
				const drag = getDragSet();
				if (drag) {
					sourceTreeId = drag.sourceTreeId;
					manifest = drag.manifest;
				}
			}
			if (!manifest) manifest = [draggedNodeRef.path];
			const sourceCtrl = getClipboardTree(sourceTreeId);
			const sourceTree = sourceCtrl ? (sourceCtrl.tree as Ltree<T> | undefined) : undefined;
			if (sourceTree) {
				const transform = this.inputTransformHandler ?? this._defaultCopyTransform;
				const result = this.duplicateNodes(
					manifest,
					dropNode ? dropNode.path : '',
					dropNode ? position : 'child',
					transform,
					sourceTree
				);
				dispatchDrop(result.copiedNodes);
				return result.success;
			}
		}

		// Cross-tree without a reachable source (or copy without shouldAutoHandleCopy): the
		// consumer performs the insertion, so the library placed nothing → dropped is null.
		dispatchDrop(null);
		return true;
	}

	// Floating drop zone: overlay before/after/child buttons rendered at Tree level (position:fixed
	// over the hovered row). Pointer drops on them are handled in _handlePointerDrop; this predicate just
	// gates which buttons render for the hovered node.
	/** @internal Whether the floating drop zone may offer `position` for the hovered target. */
	_isFloatingPositionAllowed(position: DropPosition): boolean {
		return !!this.hoveredNodeForDrop && this.tree.isDropPositionAllowed(this.hoveredNodeForDrop, position);
	}

	// ── Pointer drag (mouse / pen / touch) — core createPointerDrag ──────
	//
	// Replaces native HTML5 drag-and-drop. The gesture — the 5px threshold / the touch long press,
	// the scroll lock, the hit test (shadow roots pierced), edge auto-scroll, Escape /
	// pointercancel, the swallowed trailing click — is core createPointerDrag (SPEC §12.28), the
	// same as web-treeview's renderer. There is NO browser drag session, so re-rendering or moving
	// the dragged row mid-drag can't freeze the page (the failure mode native DnD hits). Commit
	// happens on release (the element under the pointer → target row / tree). Cross-tree drops are
	// routed to the target tree's controller via the clipboard registry + dragSet — no dataTransfer.

	/** The controller whose hover state we last lit up (may be another tree for a cross-tree drag). */
	private _hoverCtrl: TreeEngine<any> | null = null;
	/** The last pointer event of the drag — core's auto-scroll frames have none of their own. */
	private _lastPointerEvent: PointerEvent | null = null;
	/** The press that may become a drag, and its node (core hands `onStart` no event on a touch long press). */
	private _pressEvent: PointerEvent | null = null;
	private _pressNode: LTreeNode<any> | null = null;
	/** Every attached core drag (the tree's own container + custom renderers' containers). */
	#pointerDrags = new Set<PointerDrag>();

	/**
	 * @internal Wire core createPointerDrag on `container`. `isBuiltIn` = the `<Tree>` container:
	 * the grab handle is a row's `.stv__node-content`; otherwise any `[data-tree-path]` element.
	 * Mouse / pen only drag a draggable node; a touch long press on a locked one plays the
	 * "can't move this" reaction (the gesture is kept, auto-scroll is off for it).
	 */
	_attachPointerDrag(container: HTMLElement, isBuiltIn: boolean): () => void {
		if (typeof window === 'undefined') return () => {};
		const drag = createPointerDrag(container, {
			longPressMs: () => this.touchDragDelay,
			// A finger moving > 10px before the long press = a scroll; a mouse / pen drags after 5px.
			threshold: () => (this._pressEvent?.pointerType === 'touch' ? 10 : 5),
			autoScroll: { isEnabled: () => !this.touchDragState.isDenied },
			getSource: (target, event) => {
				this._pressEvent = null;
				this._pressNode = null;
				if (this.dragDropMode === 'none' || this.touchDragState.node) return null;
				// A drop pad / an editable control keeps its own press.
				if (target.closest('[data-drop-position], input, textarea, select, [contenteditable="true"]')) return null;
				const source = (
					isBuiltIn ? target.closest('.stv__node-content')?.closest('.stv__node') : target.closest('[data-tree-path]')
				) as HTMLElement | null;
				if (!source || !container.contains(source)) return null;
				const node = this.tree?.getNodeByPath(source.getAttribute('data-tree-path') ?? '');
				if (!node) return null;
				// Mouse / pen on a locked node: nothing to do (the denied reaction is a touch long-press affordance).
				if (event.pointerType !== 'touch' && !this.getNodeIsDraggable(node)) return null;
				this._pressEvent = event;
				this._pressNode = node;
				return source;
			},
			onStart: ({ x, y }) => {
				const node = this._pressNode;
				const press = this._pressEvent;
				if (!node || !press) return false;
				this.touchDragState = {
					node,
					startX: x,
					startY: y,
					isDragging: false,
					isDenied: false,
					ghostElement: null,
					currentDropTarget: null,
					pointerType: press.pointerType,
					pointerId: press.pointerId
				};
				if (!this.getNodeIsDraggable(node)) {
					this.touchDragState = { ...this.touchDragState, isDenied: true };
					this._showDragBlockedIndicator(node);
					return;
				}
				this._lastPointerEvent = press;
				this._startPointerDrag(node, press, x, y);
				if (!this.touchDragState.isDragging) return false; // beforeDragStartCallback vetoed it
			},
			onMove: ({ target, x, y, event }) => {
				if (!this.touchDragState.isDragging) return; // a denied hold: nothing moves
				if (event instanceof PointerEvent) this._lastPointerEvent = event;
				const ghost = this.touchDragState.ghostElement;
				if (ghost) {
					ghost.style.left = `${x}px`;
					ghost.style.top = `${y}px`;
				}
				if (this._lastPointerEvent) this._updatePointerHover(target, this._lastPointerEvent);
			},
			onDrop: ({ target, event }) => {
				void this._handlePointerDrop(target, event as PointerEvent);
			},
			onCancel: () => this._handlePointerCancel()
		});
		this.#pointerDrags.add(drag);
		return () => {
			this.#pointerDrags.delete(drag);
			drag.destroy();
		};
	}

	private _startPointerDrag(node: LTreeNode<any>, event: PointerEvent, x: number, y: number) {
		this.draggedNode = node;
		this.isDragInProgress = true;

		// Set-level pre-drag interceptor (same contract as the legacy paths). There's no native
		// drag to preventDefault here, so `false` simply aborts before the ghost appears.
		this._dragSetOverride = null;
		let draggedRefs = this._draggedRefs(node);
		if (this.beforeDragStartHandler) {
			const decision = this.beforeDragStartHandler(this._ctx({
				lead: this.getNodeRef(node),
				dragged: this._getDraggedRefsWithDescendants(draggedRefs),
				event
			}));
			if (decision === false) {
				this._resetPointerState();
				return;
			}
			if (Array.isArray(decision)) {
				this._dragSetOverride = this._validateDragManifest(decision, node.path);
				draggedRefs = this._draggedRefs(node);
			}
		}

		this.touchDragState = { ...this.touchDragState, isDragging: true };
		// The dragged visual dims EVERY traveling node, so use the complete placement
		// manifest (roots + descendants, minus any leave-behind holes), not just the
		// top-level roots — otherwise a folder's children or a nested file wouldn't dim.
		const placementManifest =
			this._dragSetOverride ?? this._getPathsWithDescendants(draggedRefs.map((r) => r.path));
		this.draggedPaths = new Set(placementManifest);
		setDragSet(this.treeId, draggedRefs.map((r) => r.path), placementManifest);
		this.createGhostElement(node, x, y);
		this.onNodeDragStartHandler?.(this._ctx({ ...this.getNodeRef(node), event, dragged: draggedRefs }));

		// OS-convention selection sync: grabbing a node OUTSIDE the current selection replaces
		// the selection with just it (Explorer/Finder mousedown-selects). Done synchronously —
		// unlike the native path (which had to defer to rAF so re-rendering the source row
		// wouldn't abort the browser drag image), the pointer drag has no drag image to lose.
		if (node.isSelectable && !this.selectedPaths.has(node.path)) {
			this._preDragSelectionSnapshot = new Set(this.selectedPaths);
			this._setSelection([node.path], node.path);
			this._dispatchSelectionChange();
			this.tree.refresh();
		}

		if (event.pointerType === 'touch') {
			try {
				navigator.vibrate?.(50);
			} catch {
				/* blocked by browser policy */
			}
		}
	}

	/** Restore the selection captured at drag start (Esc-cancel / invalid drop). */
	private _restorePreDragSelection() {
		const prior = this._preDragSelectionSnapshot;
		if (!prior) return;
		this._setSelection(prior);
		this._dispatchSelectionChange();
		this.tree.refresh();
	}

	/** Resolve the row + owning controller under the pointer and light up its drop visuals. */
	private _updatePointerHover(el: Element | null, event: PointerEvent) {
		const ctx = this._resolveDropContext(el);
		const targetCtrl = ctx?.controller ?? this;
		const operation: DropOperation = this.isCopyAllowed && event.ctrlKey ? 'copy' : 'move';
		this.currentDropOperation = operation;

		// Cursor over a floating overlay button (floating dropZoneMode): the buttons sit OFF the
		// row, so elementFromPoint no longer resolves a node. Keep the existing hover alive (so the
		// buttons stay mounted) and just track which one is active for its highlight.
		const floatingZone = el?.closest('.stv__drop-zone') as HTMLElement | null;
		if (floatingZone && this._hoverCtrl) {
			this._hoverCtrl.floatingHoveredZone = floatingZone.classList.contains('stv__drop-zone--before')
				? 'before'
				: floatingZone.classList.contains('stv__drop-zone--after')
					? 'after'
					: 'child';
			return;
		}
		if (this._hoverCtrl) this._hoverCtrl.floatingHoveredZone = null;

		const modeOk = targetCtrl.isDropAllowedByMode(this.draggedNode?.treeId);

		const position =
			ctx?.node && ctx.node !== this.draggedNode && ctx.node.isDropAllowed && modeOk
				? this._pointerDropPosition(ctx, el as Element, event)
				: null;
		if (ctx?.node && position) {
			this._updateDropHover(targetCtrl, ctx.node, position, operation);
			// Floating dropZoneMode renders overlay buttons (position:fixed) sized to the row.
			if (targetCtrl.dropZoneMode === 'floating') {
				const rowEl = (el as Element).closest('.stv__node-content') as HTMLElement | null;
				const row = (rowEl?.closest('.stv__node-row') ?? rowEl) as Element | null;
				if (row) {
					const r = row.getBoundingClientRect();
					targetCtrl.floatingZoneRect = { top: r.top, left: r.left, width: r.width, height: r.height };
				}
			}
			this.onNodeDragOverHandler?.(this._ctx({
				...targetCtrl.getNodeRef(ctx.node),
				event,
				dragged: this._draggedRefs(this.draggedNode)
			}));
		} else {
			this._clearHover();
			targetCtrl.isDropPlaceholderActive = !!el?.closest('.stv__empty-state');
		}
	}

	private _updateDropHover(
		ctrl: TreeEngine<any>,
		node: LTreeNode<any>,
		position: DropPosition,
		operation: DropOperation
	) {
		if (this._hoverCtrl && this._hoverCtrl !== ctrl) this._clearHoverCtrl(this._hoverCtrl);
		// A cross-tree target needs isDragInProgress on so its own Node.svelte renders the glow.
		if (ctrl !== this) ctrl.isDragInProgress = true;
		ctrl.hoveredNodeForDrop = node;
		ctrl.activeDropPosition = position;
		ctrl.currentDropOperation = operation;
		this._hoverCtrl = ctrl;
	}

	private _clearHoverCtrl(ctrl: TreeEngine<any>) {
		ctrl.hoveredNodeForDrop = null;
		ctrl.activeDropPosition = null;
		ctrl.isDropPlaceholderActive = false;
		ctrl.floatingZoneRect = null;
		ctrl.floatingHoveredZone = null;
		if (ctrl !== this) ctrl.isDragInProgress = false;
	}

	private _clearHover() {
		if (this._hoverCtrl) {
			this._clearHoverCtrl(this._hoverCtrl);
			this._hoverCtrl = null;
		}
		this.hoveredNodeForDrop = null;
		this.activeDropPosition = null;
	}

	/** The pointer was released over `dropEl` (core onDrop; core has already let go of the gesture,
	 *  so an async beforeDropCallback can't see a second release / Escape re-enter the drop). */
	private async _handlePointerDrop(dropEl: Element | null, event: PointerEvent) {
		const st = this.touchDragState;

		if (st.isDragging && this.draggedNode) {
			if (st.ghostElement) st.ghostElement.style.display = 'none';
			// Nothing landed (no valid target, denied, or vetoed) → restore the selection the
			// grab replaced, like an Esc-cancel.
			let isDropped = false;

			const ctx = this._resolveDropContext(dropEl);
			const targetCtrl = ctx?.controller ?? this;
			const dropNode = ctx?.node ?? null;
			const dragged = this.draggedNode;

			const emptyZone = dropEl?.closest('.stv__empty-state');
			const rootZone = dropEl?.closest('.stv__root-drop-zone');
			const inTargetContainer = !!dropEl?.closest('.stv__container');
			// Floating dropZoneMode: the before/after/child overlay buttons sit over the hovered
			// row (position:fixed). A drop on one uses the owning tree's hovered node as target
			// and the button's position class.
			const floatingZone = dropEl?.closest('.stv__drop-zone') as HTMLElement | null;

			const modeOk = targetCtrl.isDropAllowedByMode(dragged.treeId);

			if (floatingZone && targetCtrl.hoveredNodeForDrop && modeOk) {
				const pos: DropPosition = floatingZone.classList.contains('stv__drop-zone--before')
					? 'before'
					: floatingZone.classList.contains('stv__drop-zone--after')
						? 'after'
						: 'child';
				isDropped = await targetCtrl._handleDrop(targetCtrl.hoveredNodeForDrop, dragged, pos, event);
			} else if (
				dropNode &&
				dropNode !== dragged &&
				dropNode.isDropAllowed &&
				modeOk &&
				this._pointerDropPosition(ctx!, dropEl as Element, event)
			) {
				const position = this._pointerDropPosition(ctx!, dropEl as Element, event)!;
				isDropped = await targetCtrl._handleDrop(dropNode, dragged, position, event);
			} else if (targetCtrl.isTreeDropZoneEnabled && inTargetContainer && modeOk) {
				// Whole-tree drop zone: ANY release inside the container that didn't land as a valid
				// node drop — empty area, or a node whose getIsDropAllowedCallback rejected it —
				// lands with target=null so beforeDrop can fan it out via DropGroup[].
				isDropped = await targetCtrl._handleDrop(null, dragged, 'child', event);
			} else if ((emptyZone || rootZone) && !dropNode && modeOk) {
				isDropped = await targetCtrl._handleDrop(null, dragged, 'child', event);
			} else if (dropNode && dropNode !== dragged) {
				targetCtrl._showDropBlockedIndicator(dropNode);
			}
			if (!isDropped) this._restorePreDragSelection();
		}

		this.removeGhostElement();
		this._resetPointerState();
	}

	private _handlePointerCancel() {
		// Esc / pointercancel while dragging = abort. Nothing was mutated (commit-on-drop),
		// so just restore the selection the grab replaced and tear down.
		if (this.touchDragState.isDragging) this._restorePreDragSelection();
		this.removeGhostElement();
		this._resetPointerState();
	}

	/**
	 * Map an element under the pointer to its owning tree's controller + the node it belongs to:
	 * the nearest `[data-tree-path]` element (a built-in row, or any element of a custom
	 * renderer — see attachPointerDrag). `nodeEl` is that element; `position` is set when the
	 * pointer is on a drop pad (`[data-drop-position]`) inside it.
	 */
	private _resolveDropContext(el: Element | null): {
		controller: TreeEngine<any>;
		node: LTreeNode<any> | null;
		nodeEl: HTMLElement | null;
		position: DropPosition | null;
	} | null {
		if (!el) return null;
		const container = el.closest('.stv__container') as HTMLElement | null;
		const treeId = container?.getAttribute('data-tree-id') ?? null;
		const registered =
			treeId && treeId !== this.treeId
				? (getClipboardTree(treeId) as unknown as TreeEngine<any> | undefined)
				: undefined;
		const controller = registered ?? this;
		const nodeEl = el.closest('[data-tree-path]') as HTMLElement | null;
		const path = nodeEl?.getAttribute('data-tree-path') ?? null;
		const node = path ? controller.tree.getNodeByPath(path) : null;
		const pad = nodeEl ? (el.closest('[data-drop-position]') as HTMLElement | null) : null;
		const padPosition = pad && nodeEl!.contains(pad) ? pad.getAttribute('data-drop-position') : null;
		const position =
			padPosition === 'before' || padPosition === 'after' || padPosition === 'child' ? padPosition : null;
		return { controller, node, nodeEl, position };
	}

	/** The drop position for a pointer over `ctx.node`: the drop pad's, else computed from where
	 *  the pointer sits on the row content (built-in) or the `[data-tree-path]` element (custom).
	 *  null = the pad's position isn't allowed on this node. */
	private _pointerDropPosition(
		ctx: { controller: TreeEngine<any>; node: LTreeNode<any> | null; nodeEl: HTMLElement | null; position: DropPosition | null },
		el: Element,
		event: PointerEvent
	): DropPosition | null {
		if (ctx.position) return ctx.controller.tree.isDropPositionAllowed(ctx.node!, ctx.position) ? ctx.position : null;
		const positions = ctx.controller.getNodeAllowedDropPositions(ctx.node!);
		const rowEl = (el.closest('.stv__node-content') as HTMLElement | null) ?? ctx.nodeEl;
		return rowEl ? ctx.controller.computeDropPositionFromEvent(event, rowEl, positions) : 'child';
	}

	private _resetPointerState() {
		this._clearDragDenied();
		this._clearHover();
		this._lastPointerEvent = null;
		this._pressEvent = null;
		this._pressNode = null;
		this.touchDragState = {
			node: null,
			startX: 0,
			startY: 0,
			isDragging: false,
			isDenied: false,
			ghostElement: null,
			currentDropTarget: null
		};
		this.draggedNode = null;
		this.draggedPaths = new Set();
		this.isDragInProgress = false;
		this.isDropPlaceholderActive = false;
		this.hoveredNodeForDrop = null;
		this.activeDropPosition = null;
		this._dragSetOverride = null;
		this._preDragSelectionSnapshot = null;
		clearDragSet();
	}

	/**
	 * "Can't move this" feedback for a long-press on a NON-draggable node. Fires the
	 * onNodeDragReject consumer hook always; the built-in indicator (haptic double-buzz +
	 * a no-entry icon that STAYS on the row while the finger is held) only when
	 * shouldIndicateUndraggable is on. Purely imperative DOM (mirrors the touch drop-target
	 * highlight) — no per-node render state. Torn down by _clearDragDenied on release.
	 */
	private _showDragBlockedIndicator(node: LTreeNode<any>) {
		dragLogger.debug('[drag-denied] locked node long-pressed', { path: node?.path });

		this.onNodeDragRejectHandler?.(this._ctx(this.getNodeRef(node)));

		if (!this.shouldIndicateUndraggable) return;

		// Distinct double-buzz (a real drag start is a single 50ms buzz).
		try {
			navigator.vibrate?.([30, 25, 30]);
		} catch {
			/* blocked by browser policy */
		}

		const el = this._rowContentEl(node.path);
		if (!el) return;

		// Clear any previous indicator, then show one that persists until release.
		this._clearDragDenied();

		el.classList.add('stv__node-content--drag-denied');
		this._deniedRowEl = el;

		const badge = document.createElement('span');
		badge.className = 'stv__drag-denied-badge';
		// Glyph is the Lucide "ban" icon, drawn via CSS mask on .stv__drag-denied-badge
		// (was a 🚫 emoji — inconsistent across platforms and not recolorable).
		badge.setAttribute('aria-hidden', 'true');
		el.appendChild(badge);
		this._deniedBadgeEl = badge;
	}

	/** Remove the held "can't move this" indicator (badge + row class). Idempotent. */
	private _clearDragDenied() {
		if (this._deniedBadgeEl) {
			this._deniedBadgeEl.remove();
			this._deniedBadgeEl = null;
		}
		if (this._deniedRowEl) {
			this._deniedRowEl.classList.remove('stv__node-content--drag-denied');
			this._deniedRowEl = null;
		}
	}

	// ── Screen-reader announcements (core `announce()`) ─────────────────

	/** Announce a label through the page's polite live region; a label set to `''` stays silent.
	 *  The params also travel as `{ ctx }` — a `translateCallback` reads `params.ctx`, as in web-treeview. */
	private _announce(key: keyof TreeLabels, params: Record<string, unknown>): void {
		const text = this.getLabel(key, { ...params, ctx: params });
		uiLogger.debug('[announce]', { key, text });
		if (text) announce(text, { document: this.containerElement?.ownerDocument });
	}

	/** A node's display text for an announcement. */
	private _getAnnouncedName(node: LTreeNode<any> | null | undefined): string {
		return node ? (this.tree?.getNodeDisplayValue(node) || String(node.id)) : '';
	}

	/** "Item moved into Folder" — the outcome of a drop the tree placed itself. */
	private _announceDrop(
		dropped: LTreeNode<T>[],
		count: number,
		target: LTreeNode<T> | null,
		position: DropPosition,
		operation: DropOperation
	): void {
		const name = count > 1 ? this.getLabel('ariaLabels.dropItems', { count, ctx: { count } }) : this._getAnnouncedName(dropped[0]);
		const targetName = target ? this._getAnnouncedName(target) : this.getLabel('ariaLabels.dropTreeRoot');
		const where = !target || position === 'child' ? 'Into' : position === 'before' ? 'Before' : 'After';
		this._announce(`ariaLabels.${operation === 'copy' ? 'copied' : 'moved'}${where}` as keyof TreeLabels, {
			name,
			target: targetName,
			count
		});
	}

	/**
	 * "Can't drop here" feedback — the target-side twin of _showDragBlockedIndicator. Fires the
	 * onNodeDropReject consumer hook always; the built-in indicator (haptic + a brief no-entry
	 * flash on the refusing target) only when shouldIndicateUndraggable is on. Transient (a drop
	 * is a discrete moment, not a held gesture), so it auto-clears after a short beat.
	 */
	private _showDropBlockedIndicator(node: LTreeNode<any>) {
		dragLogger.debug('[drop-denied] target refused drop', { path: node?.path });

		this._announce('ariaLabels.dropDenied', { target: this._getAnnouncedName(node) });
		this.onNodeDropRejectHandler?.(this._ctx(this.getNodeRef(node)));

		if (!this.shouldIndicateUndraggable) return;

		try {
			navigator.vibrate?.([30, 25, 30]);
		} catch {
			/* blocked by browser policy */
		}

		const el = this._rowContentEl(node.path);
		if (!el) return;

		el.classList.add('stv__node-content--drag-denied');
		const badge = document.createElement('span');
		badge.className = 'stv__drag-denied-badge';
		// Glyph is the Lucide "ban" icon, drawn via CSS mask on .stv__drag-denied-badge
		// (was a 🚫 emoji — inconsistent across platforms and not recolorable).
		badge.setAttribute('aria-hidden', 'true');
		el.appendChild(badge);

		setTimeout(() => {
			el.classList.remove('stv__node-content--drag-denied');
			badge.remove();
		}, 700);
	}

	private createGhostElement(node: LTreeNode<any>, x: number, y: number) {
		// Remove any stale ghost elements (e.g. from interrupted drags)
		this.removeGhostElement();
		this._removeOrphanGhosts();

		const ghost = document.createElement('div');
		ghost.className = 'stv__touch-ghost';
		ghost.textContent = this.tree.getNodeDisplayValue(node);
		ghost.style.left = `${x}px`;
		ghost.style.top = `${y}px`;
		// Inside the tree's own container (position: fixed still escapes its overflow), like
		// the tooltips: every --stv-touch-ghost-* / z-index token and the theme are declared on
		// .stv__container — under <body> the ghost rendered unstyled.
		(this.containerElement ?? document.body).appendChild(ghost);
		this.touchDragState.ghostElement = ghost;
	}

	private removeGhostElement() {
		if (this.touchDragState.ghostElement) {
			this.touchDragState.ghostElement.remove();
			this.touchDragState.ghostElement = null;
		}
	}

	/** Clean up document-level listeners and ghost elements. Called on component destroy. */
	destroy() {
		unregisterClipboardTree(this.treeId, this);
		if (typeof document === 'undefined') return;
		// A drag / long-press in flight: core lets go of it (listeners, long-press timer, auto-scroll);
		// the reset also clears the shared drag set — only when THIS tree is dragging.
		const isDragging = !!this.touchDragState.node;
		for (const drag of this.#pointerDrags) drag.destroy();
		this.#pointerDrags.clear();
		if (isDragging) this._resetPointerState();
		if (this.flatRenderAnimationFrame) {
			cancelAnimationFrame(this.flatRenderAnimationFrame);
			this.flatRenderAnimationFrame = null;
		}
		if (this.currentSelection) {
			clearTimeout(this.currentSelection.timeoutId);
			this.currentSelection = null;
		}
		this.removeGhostElement();
		this._removeOrphanGhosts();
	}

	/** Ghosts left behind by an interrupted drag — this tree's only (another tree may be dragging). */
	private _removeOrphanGhosts() {
		(this.containerElement ?? document.body)
			.querySelectorAll('.stv__touch-ghost')
			.forEach((el) => el.remove());
	}

	// ── Helpers ──────────────────────────────────────────────────────────

	/** @internal */
	scheduleFlatRenderBatch() {
		if (this.flatRenderAnimationFrame) return;

		this.flatRenderAnimationFrame = requestAnimationFrame(() => {
			this.flatRenderAnimationFrame = null;
			if (this.flatRenderQueue.length === 0) {
				this._completeRenderPass();
				return;
			}

			const batchSize = this.currentBatchSize || this.initialBatchSize;
			const batch = this.flatRenderQueue.slice(0, batchSize);
			const remaining = this.flatRenderQueue.slice(batchSize);

			this.flatRenderedIds = new Set([...this.flatRenderedIds, ...batch]);
			this.flatRenderQueue = remaining;
			this.currentBatchSize = Math.min(batchSize * 2, this.maxBatchSize);

			if (remaining.length > 0) {
				this.scheduleFlatRenderBatch();
			}

			if (this.#isRenderPassActive) {
				this.#renderPassProcessed += batch.length;
				const pending = remaining.length;
				const processed = this.#renderPassProcessed;
				// After the DOM flush, so the batch is on screen when the handler runs.
				tick().then(() => {
					if (!this.#isRenderPassActive) return;
					this.onRenderProgressHandler?.(this._ctx({ pending, processed }));
					if (pending === 0 && this.flatRenderQueue.length === 0) this._completeRenderPass();
				});
			}
		});
	}

	#isRenderPassActive = false;
	#renderPassProcessed = 0;

	/** A progressive (rAF-batched) render pass began: `isRendering` + `onRenderStart`. */
	private _startRenderPass(processed: number) {
		if (this.#isRenderPassActive) return;
		this.#isRenderPassActive = true;
		this.#renderPassProcessed = processed;
		this.isRendering = true;
		this.onRenderStartHandler?.(this._ctx({}));
	}

	/** The progressive pass ended (queue drained or reset): `onRenderComplete`. */
	private _completeRenderPass() {
		if (!this.#isRenderPassActive) return;
		this.#isRenderPassActive = false;
		this.isRendering = false;
		this.onRenderCompleteHandler?.(this._ctx({ pending: 0, processed: this.#renderPassProcessed }));
	}

	private generateTreeId(): string {
		return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
	}

	// ── Keyboard navigation (delegates to this.navigation strategy) ─────

	/** Select a node and scroll it into view (core navigation primitive) */
	focusAndSelectNode(path: string): void {
		this.navigation.focusAndSelectNode(path);
	}
	/** Move to next visible node at the same level */
	/** Move to the next visible node (flat order). */
	focusNext(): void {
		this.navigation.focusNext();
	}

	/** Move to the previous visible node (flat order). */
	focusPrevious(): void {
		this.navigation.focusPrevious();
	}

	focusNextAtLevel(): void {
		this.navigation.focusNextAtLevel();
	}
	/** Move to previous visible node at the same level */
	focusPreviousAtLevel(): void {
		this.navigation.focusPreviousAtLevel();
	}
	/** Move to first child (expands if collapsed) */
	focusFirstChild(): void {
		this.navigation.focusFirstChild();
	}
	/** Move to parent node (no collapse) */
	focusParent(): void {
		this.navigation.focusParent();
	}
	/** Collapse parent and select it (Backspace behavior) */
	collapseParent(): void {
		this.navigation.collapseParent();
	}
	/** Toggle expand/collapse of current node */
	toggleFocusedNodeExpanded(): void {
		this.navigation.toggleFocusedNodeExpanded();
	}
	/** Select first visible node */
	focusFirst(): void {
		this.navigation.focusFirst();
	}
	/** Select last visible node */
	focusLast(): void {
		this.navigation.focusLast();
	}
	/** PageDown — jump forward ~10 visible nodes */
	focusNextPage(): void {
		this.navigation.focusNextPage();
	}
	/** PageUp — jump back ~10 visible nodes */
	focusPreviousPage(): void {
		this.navigation.focusPreviousPage();
	}

	// ── Shift+navigation: extend the selection range ────────────────────
	/** Shift+ArrowDown — extend the selection to next visible node */
	extendSelectionNext(): void {
		this.navigation.extendSelectionNext();
	}
	/** Shift+ArrowUp — extend the selection to previous visible node */
	extendSelectionPrevious(): void {
		this.navigation.extendSelectionPrevious();
	}
	/** Shift+Home — extend the selection to first visible node */
	extendSelectionToFirst(): void {
		this.navigation.extendSelectionToFirst();
	}
	/** Shift+End — extend the selection to last visible node */
	extendSelectionToLast(): void {
		this.navigation.extendSelectionToLast();
	}
	/** Shift+PageDown — extend the selection forward ~10 visible nodes */
	extendSelectionNextPage(): void {
		this.navigation.extendSelectionNextPage();
	}
	/** Shift+PageUp — extend the selection back ~10 visible nodes */
	extendSelectionPreviousPage(): void {
		this.navigation.extendSelectionPreviousPage();
	}

	/** @internal Create the default flat-list navigation strategy (used by the HTML tree renderer) */
	createDefaultNavigation(): TreeNavigation<T> {
		/** The visible rows and the focused node's index among them (-1 = none / not visible). */
		const cursor = () => {
			const nodes = this.allFlatNodes;
			const path = this.focusedNode?.path;
			return { nodes, index: path ? nodes.findIndex((n) => n.path === path) : -1 };
		};
		/** The next row (`step` 1 / -1) at the same level as row `index`; -1 when none. */
		const sameLevel = (nodes: LTreeNode<T>[], index: number, step: 1 | -1) => {
			const level = nodes[index].level;
			for (let i = index + step; i >= 0 && i < nodes.length; i += step) if (nodes[i].level === level) return i;
			return -1;
		};
		const go = (path: string) => this.navigation.focusAndSelectNode(path);
		const PAGE = 10;

		return {
			focusAndSelectNode: (path: string) => {
				const node = this.getNodeByPath(path);
				if (!node) return;
				this.selectNode(path, 'replace');
				this._scrollToPath(path, { shouldExpandAncestors: false, block: 'nearest', behavior: 'auto' }, true);
			},

			// Plain navigation: with nothing focused, Down / Next start at the first row, Up / Previous at the last.
			focusNext: () => {
				const { nodes, index } = cursor();
				if (nodes.length === 0) return;
				if (index === -1) go(nodes[0].path);
				else if (index < nodes.length - 1) go(nodes[index + 1].path);
			},

			focusPrevious: () => {
				const { nodes, index } = cursor();
				if (nodes.length === 0) return;
				if (index === -1) go(nodes[nodes.length - 1].path);
				else if (index > 0) go(nodes[index - 1].path);
			},

			focusNextAtLevel: () => {
				const { nodes, index } = cursor();
				if (nodes.length === 0) return;
				if (index === -1) return go(nodes[0].path);
				const next = sameLevel(nodes, index, 1);
				if (next !== -1) go(nodes[next].path);
			},

			focusPreviousAtLevel: () => {
				const { nodes, index } = cursor();
				if (nodes.length === 0) return;
				if (index === -1) return go(nodes[nodes.length - 1].path);
				const previous = sameLevel(nodes, index, -1);
				if (previous !== -1) go(nodes[previous].path);
			},

			focusFirstChild: () => {
				const currentPath = this.focusedNode?.path;
				if (!currentPath) return;
				const node = this.getNodeByPath(currentPath);
				if (!node) return;

				if (node.hasChildren && !node.isExpanded && node.isCollapsible !== false) {
					// After any async beforeExpandCallback (lazy load) settles.
					this.expandNodes(currentPath).then(() => tick()).then(() => {
						const { nodes, index } = cursor();
						if (index >= 0 && index + 1 < nodes.length) go(nodes[index + 1].path);
					});
				} else if (node.hasChildren && node.isExpanded) {
					const { nodes, index } = cursor();
					if (index + 1 < nodes.length) go(nodes[index + 1].path);
				}
			},

			focusParent: () => {
				const currentPath = this.focusedNode?.path;
				if (!currentPath) return;
				const node = this.getNodeByPath(currentPath);
				if (!node?.parentPath) return;
				go(node.parentPath);
			},

			collapseParent: () => {
				const currentPath = this.focusedNode?.path;
				if (!currentPath) return;
				const node = this.getNodeByPath(currentPath);
				if (!node?.parentPath) return;
				const parent = this.getNodeByPath(node.parentPath);
				if (!parent) return;
				if (parent.hasChildren && parent.isExpanded && this.tree.getNodeIsCollapsible(parent)) {
					this.collapseNodes(parent.path);
				}
				tick().then(() => go(parent.path));
			},

			toggleFocusedNodeExpanded: () => {
				const currentPath = this.focusedNode?.path;
				if (!currentPath) return;
				// Enter / Space = the toggle glyph (accordion, pending beforeExpand, collapsible).
				void this.toggleNodeExpanded(currentPath);
			},

			focusFirst: () => {
				const { nodes } = cursor();
				if (nodes.length > 0) go(nodes[0].path);
			},

			focusLast: () => {
				const { nodes } = cursor();
				if (nodes.length > 0) go(nodes[nodes.length - 1].path);
			},

			focusNextPage: () => {
				const { nodes, index } = cursor();
				if (nodes.length === 0) return;
				go(nodes[Math.min((index === -1 ? 0 : index) + PAGE, nodes.length - 1)].path);
			},

			focusPreviousPage: () => {
				const { nodes, index } = cursor();
				if (nodes.length === 0) return;
				go(nodes[Math.max((index === -1 ? nodes.length : index) - PAGE, 0)].path);
			},

			// ── Shift+navigation: extend the selection range (no-op without a focused row) ──
			extendSelectionNext: () => {
				const { nodes, index } = cursor();
				if (index === -1) return;
				const next = sameLevel(nodes, index, 1);
				if (next !== -1) this._extendSelectionTo(nodes[next].path);
			},

			extendSelectionPrevious: () => {
				const { nodes, index } = cursor();
				if (index === -1) return;
				const previous = sameLevel(nodes, index, -1);
				if (previous !== -1) this._extendSelectionTo(nodes[previous].path);
			},

			extendSelectionToFirst: () => {
				const { nodes } = cursor();
				if (nodes.length > 0) this._extendSelectionTo(nodes[0].path);
			},

			extendSelectionToLast: () => {
				const { nodes } = cursor();
				if (nodes.length > 0) this._extendSelectionTo(nodes[nodes.length - 1].path);
			},

			extendSelectionNextPage: () => {
				const { nodes, index } = cursor();
				if (index === -1) return;
				this._extendSelectionTo(nodes[Math.min(index + PAGE, nodes.length - 1)].path);
			},

			extendSelectionPreviousPage: () => {
				const { nodes, index } = cursor();
				if (index === -1) return;
				this._extendSelectionTo(nodes[Math.max(index - PAGE, 0)].path);
			}
		};
	}

	/** Extend the selection to target path (Shift+nav) — uses range from the shift cursor
	 *  (or current focus if no cursor yet), moves focus. No-op in single mode. */
	private _extendSelectionTo(path: string) {
		if (this.selectionMode !== 'multiple') return;
		// Seed the shift cursor from the focused node on the first Shift+Arrow
		if (!this._shiftCursor && this.focusedNode) {
			const anchorNode = this.focusedNode;
			this._shiftCursor = anchorNode.path;
			// Ensure the anchor is selected so range computation has a starting point visible
			if (anchorNode.isSelectable && !anchorNode.isSelected) {
				this._setSelection([anchorNode.path]);
			}
		}
		this.selectNode(path, 'range');
		// Move focus to the target without clearing the selection
		const node = this.tree.getNodeByPath(path);
		if (node) this._setFocusedNode(node);
		this._scrollToPath(path, { shouldExpandAncestors: false, block: 'nearest', behavior: 'auto' }, true);
		this.tree.refresh();
	}
}
