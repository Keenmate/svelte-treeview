<script lang="ts" generics="T">
	import type { Index, SearchOptions } from 'flexsearch';
	import Node from './Node.svelte';
	import ContextMenuLevel from './ContextMenuLevel.svelte';
	import { computePosition, autoUpdate, offset, flip, shift } from '@floating-ui/dom';
	import { type LTreeNode } from '../ltree/ltree-node.svelte.js';
	import {
		type InsertArrayResult,
		type InsertBranchResult,
		type RemoveBranchResult,
		type ContextMenuEntry,
		type ContextMenuContext,
		type DropPosition,
		type DragDropMode,
		type DropOperation,
		type ClickBehavior,
		type NodeTitleOverflow,
		type TooltipPlacement,
		type TooltipDelay,
		type NodeRenderContext,
		type CheckboxMode,
		type CascadeCheckPolicy,
		type SelectionMode,
		type SelectMode,
		type TreeMutationOptions,
		type NodeContext,
		type SortContext,
		type TreeChange,
		type ApplyChangesResult
	} from '../ltree/types.js';
	import { setContext, onDestroy, type Snippet } from 'svelte';
	import type { RenderStats } from './RenderCoordinator.svelte.js';
	import { TreeController } from '../core/TreeController.svelte.js';
	import type { TreeLabels } from '../core/labels.js';
	import type {
		NodeEventContext,
		NodeDragContext,
		NodeDropContext,
		ClipboardEventContext,
		SelectionChangeContext,
		BeforeCheckboxToggleContext,
		NodeTransformCallbackContext,
		NodeTransformCallback,
		KeydownContext
	} from '../core/TreeController.svelte.js';
	import { uiLogger } from '../logger.js';
	import { createTreeController } from '../core/createTreeController.js';
	import type { TreeNavigationOverrides } from '../core/navigation.js';
	import { containerSize as trackContainerSize, environmentState } from '../core/responsive.svelte.js';
	import { classifyDevice, getEnvironment } from '../vendor/environment/environment.js';
	import type { ElementSize } from '../vendor/environment/element-size.js';
	import type { DeviceClass } from '../vendor/environment/environment.js';

	// NodeCallbacks and NodeConfig are now defined in ../core/TreeController.svelte.ts
	// and re-exported from index.ts for public consumption.

	interface Props {
		// MAPPINGS
		idMember: string;
		pathMember: string;
		parentPathMember?: string | null | undefined;
		levelMember?: string | null | undefined;
		isExpandedMember?: string | null | undefined;
		getIsExpandedCallback?: (ctx: NodeContext<T>) => boolean;
		isSelectableMember?: string | null | undefined;
		getIsSelectableCallback?: (ctx: NodeContext<T>) => boolean;
		isCheckedMember?: string | null | undefined;
		getIsCheckedCallback?: (ctx: NodeContext<T>) => boolean;
		isDraggableMember?: string | null | undefined;
		getIsDraggableCallback?: (ctx: NodeContext<T>) => boolean;
		isDropAllowedMember?: string | null | undefined;
		getIsDropAllowedCallback?: (ctx: NodeContext<T>) => boolean;
		allowedDropPositionsMember?: string | null | undefined;
		getAllowedDropPositionsCallback?: (ctx: NodeContext<T>) => DropPosition[] | null | undefined;
		isCollapsibleMember?: string | null | undefined;
		getIsCollapsibleCallback?: (ctx: NodeContext<T>) => boolean;
		hasChildrenMember?: string | null | undefined;
		isSorted?: boolean | null | undefined;

		displayValueMember?: string | null | undefined;
		getDisplayValueCallback?: (ctx: NodeContext<T>) => string;

		searchValueMember?: string | null | undefined;
		getSearchValueCallback?: (ctx: NodeContext<T>) => string;

		// For sibling ordering in drag-drop (before/after positioning)
		orderMember?: string | null | undefined;

		treeId?: string | null | undefined;
		treePathSeparator?: string | null | undefined;
		sortCallback?: (ctx: SortContext<T>) => LTreeNode<T>[];

		// DATA
		data: T[];
		focusedNode?: LTreeNode<T> | null | undefined;
		selectedPaths?: Set<string>;
		checkedPaths?: Set<string>;
		insertResult?: InsertArrayResult<T> | null | undefined;

		// SLOTS
		/** Custom row content. Receives (node, ctx) — ctx is the NodeRenderContext
		 *  (device + container + live node state) so the template can adapt to device. */
		nodeTemplate?: Snippet<[LTreeNode<T>, NodeRenderContext]>;
		/** Rich tooltip content for a node's row. Receives (node, ctx); wins over
		 *  getNodeTooltipCallback when both are given. Shown only if isNodeTooltipsShown. */
		tooltip?: Snippet<[LTreeNode<T>, NodeRenderContext]>;
		/** Custom icon render for a node. Receives (node, value, ctx) where value is the resolved
		 *  icon from iconMember/getIconCallback. Wins over the default `<i class={value}>`. */
		icon?: Snippet<[LTreeNode<T>, string | null | undefined, NodeRenderContext]>;
		treeHeader?: any;
		treeBody?: any;
		treeFooter?: any;
		noData?: any;
		contextMenu?: any;
		dropPlaceholder?: any;
		loadingPlaceholder?: any;

		/** UI strings — a partial object merged per key over the English defaults (`''` = render
		 *  nothing): `noData` ("No data" — no nodes), `noResults` ("No results found" — the search
		 *  filter left nothing), `dropHere` ("Drop here" — default drop placeholder),
		 *  `noDisplayValue` ("[N/A]" — node without a display value; also the touch-drag ghost),
		 *  `loading` ("Loading…" — `isLoading` overlay aria-label, progressive "more" row).
		 *  The `noData` / `dropPlaceholder` snippets still replace the markup. */
		labels?: Partial<TreeLabels> | null;

		// BEHAVIOUR
		expandLevel?: number | null | undefined;
		clickBehavior?: ClickBehavior | null | undefined;
		/**
		 * `'single'` (default): plain click selects one node; Ctrl/Shift+click
		 * degrade to plain click; Shift+Arrow / Enter are no-ops.
		 * `'multiple'`: Ctrl-toggle, Shift-range, Shift+Arrow extend, Enter toggles
		 * selection on the focused node.
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
		shouldClickToggleCheckbox?: boolean | null | undefined;
		beforeCheckboxToggleCallback?: (ctx: BeforeCheckboxToggleContext<T>) => string[] | false | void;
		rangeSelectionMode?: 'visual' | 'logical';
		initializeIndexCallback?: () => Index;
		searchTerm?: string | null | undefined;
		shouldUseInternalSearchIndex?: boolean | null | undefined;
		indexerBatchSize?: number | null | undefined;
		indexerTimeout?: number | null | undefined;
		isLoading?: boolean;

		// Progressive rendering (exponential batching: 20 → 40 → 80 → 160...)
		isProgressiveRenderEnabled?: boolean;
		initialBatchSize?: number;
		maxBatchSize?: number;
		isRendering?: boolean; // Bindable: true while progressive rendering is active
		onRenderStart?: () => void;
		onRenderProgress?: (stats: RenderStats) => void;
		onRenderComplete?: (stats: RenderStats) => void;

		/**
		 * Use flat/centralized rendering instead of recursive node rendering.
		 * This significantly improves performance for large trees by:
		 * - Removing the {#key changeTracker} block that destroys all nodes on any change
		 * - Using a single flat loop instead of recursive component instantiation
		 * - Allowing Svelte's keyed {#each} to efficiently diff only changed nodes
		 */
		isFlatRenderingEnabled?: boolean;

		// VIRTUAL SCROLLING (flat mode only)
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
		dropZoneMode?: 'floating' | 'glow'; // 'floating' = original floating zones, 'glow' = border glow indicators
		dropZoneLayout?: 'around' | 'before' | 'after' | 'wave' | 'wave2';
		dropZoneStart?: number | string; // number = percentage (0-100), string = any CSS value ("33%", "50px", "3rem")
		dropZoneMaxWidth?: number; // max width in pixels for wave layouts
		/**
		 * Keep the `dropPlaceholder` (or `labels.dropHere`, default "Drop here") visible whenever the tree
		 * is empty — not just mid-drag. Also makes the empty drop zone grab keyboard
		 * focus on hover, so a clipboard paste (Ctrl/Cmd+V routed through `beforeKeydownCallback`)
		 * lands on this tree without needing a node to click first. Default: false.
		 */
		isEmptyDropPlaceholderShown?: boolean;
		/**
		 * Render a single drop zone covering the WHOLE populated tree (default false). While a drag
		 * is in progress an overlay accepts a drop anywhere over the tree — the drop lands with
		 * `target = null` regardless of per-node `getIsDropAllowedCallback`, so you route each item
		 * from `beforeDropCallback` (return a `DropGroup[]`) instead of by where it was dropped. Use
		 * for "drop a basket, auto-sort into category nodes" flows.
		 */
		isTreeDropZoneEnabled?: boolean;
		isCopyAllowed?: boolean; // Enable Ctrl+drag to copy instead of move (default: false)
		shouldAutoHandleCopy?: boolean; // Auto-handle same-tree copy operations (default: true). Set to false for external DB/API handling.
		shouldAutoHandleMove?: boolean; // Auto-handle same-tree move operations (default: true). Set to false for database-first workflow.
		shouldAutoHandlePaste?: boolean; // Auto-handle paste operations (default: true). Set to false for database-first workflow.
		/** Opt into built-in keyboard shortcuts (default false): Ctrl/Cmd+C/X/V (copy/cut/paste),
		 *  Delete (remove selection), Escape (cancel cut), plus classic CUA aliases Ctrl+Insert
		 *  (copy) / Shift+Insert (paste) / Shift+Delete (cut). A consumer `beforeKeydownCallback` still runs
		 *  first and can override or suppress any of these. Paste targets the focused node (root
		 *  when none) and uses `nodeInputTransformationCallback`. */
		shouldHandleKeyboardShortcuts?: boolean;
		shouldExpandAsAccordion?: boolean; // Expanding a node auto-collapses its siblings (default: false)

		// EVENTS (on* = fire-and-forget notifications). Each carries a context object mirroring
		// the clipboard callbacks: single-node events get a NodeRef (node + live parent/siblings),
		// onNodeDrop gets symmetric source/target NodeRefs, the set events carry paths + nodes.
		onNodeClick?: (ctx: NodeEventContext<T>) => void;
		onNodeDoubleClick?: (ctx: NodeEventContext<T>) => void;
		onSelectionChange?: (ctx: SelectionChangeContext<T>) => void;
		onCheckedChange?: (ctx: SelectionChangeContext<T>) => void;
		onNodeDragStart?: (ctx: NodeDragContext<T>) => void;
		onNodeDragOver?: (ctx: NodeDragContext<T>) => void;
		onNodeDrop?: (ctx: NodeDropContext<T>) => void;
		/** Fired when a long-press engages on a non-draggable node (touch). Fire-and-forget. */
		onNodeDragReject?: (ctx: NodeEventContext<T>) => void;
		/** Fired when a drop is rejected because the target node refuses it. Fire-and-forget. */
		onNodeDropReject?: (ctx: NodeEventContext<T>) => void;
		// Post-operation clipboard notifications (fired AFTER the op). onNodeCopy/onNodeCut/onNodeDelete
		// carry paths + resolved nodes (pre-removal snapshots for delete); onNodePaste the PasteResult.
		onNodeCopy?: (ctx: ClipboardEventContext<T>) => void;
		onNodeCut?: (ctx: ClipboardEventContext<T>) => void;
		onNodePaste?: (result: import('../core/TreeController.svelte.js').PasteResult<T>) => void;
		/** Fired after the built-in Delete (or `runDeleteCommand`) removes nodes, with the removed
		 *  top-level paths plus their pre-removal nodes. */
		onNodeDelete?: (ctx: ClipboardEventContext<T>) => void;

		// RESPONSIVE (signal only — the tree renders inline, it does not change its own
		// behaviour; these surface the container-box signal so a consumer adapts settings
		// to the space, AB10-style). Backed by the shared ResizeObserver in
		// vendor/environment; see core/responsive.svelte.ts.
		/** Fire-and-forget: the tree's own border-box changed (immediate on mount, then on
		 *  resize, throttled ~30ms). `deviceClass` is the capability+size class of the WINDOW
		 *  (`classifyDevice`), handy alongside the box for AB10-style adaptation. */
		onContainerResize?: (ctx: { size: ElementSize; deviceClass: DeviceClass }) => void;
		/** Bindable: the tree's live border-box size in CSS px. Read it in your own `$derived`
		 *  to switch settings by space. Updated from the same signal as `onContainerResize`. */
		containerSize?: ElementSize;

		// INTERCEPTORS (before*Callback = can modify/block)
		/**
		 * Called before a drop is processed with a BeforeDropContext ({ target, dragged, position,
		 * operation, event }). Return `false` to cancel the drop, `{ position, operation }` to
		 * redirect it, or a `DropGroup[]` ({ targetPath, position?, paths }) to fan the drop out to
		 * several destinations (content-addressed routing — same-tree nodes are auto-moved,
		 * cross-tree nodes are left for onNodeDrop). Return `void` to proceed. Async-capable.
		 */
		beforeDropCallback?: (
			ctx: import('../core/TreeController.svelte').BeforeDropContext<T>
		) =>
			| boolean
			| { position?: DropPosition; operation?: DropOperation }
			| import('../core/TreeController.svelte').DropGroup[]
			| void
			| Promise<
					| boolean
					| { position?: DropPosition; operation?: DropOperation }
					| import('../core/TreeController.svelte').DropGroup[]
					| void
			  >;
		/** Set-level pre-drag interceptor. Return a `string[]` of top-level paths to REPLACE the
		 *  dragged set (prune and/or force-add nodes that can't be omitted), `false` to cancel the
		 *  drag, or `void` to keep the default. Synchronous. See DragStartContext. */
		beforeDragStartCallback?: (
			ctx: import('../core/TreeController.svelte').DragStartContext<T>
		) => string[] | false | void;
		beforeCopyCallback?: (
			ctx: import('../core/TreeController.svelte').BeforeCopyContext<T>
		) => string[] | false | void;
		beforeCutCallback?: (
			ctx: import('../core/TreeController.svelte').BeforeCopyContext<T>
		) => string[] | false | void;
		beforePasteCallback?: (
			ctx: import('../core/TreeController.svelte').BeforePasteContext<T>
		) => { targetPath?: string; position?: 'child' | 'before' | 'after' } | false | void;
		/** Runs before the built-in Delete removes anything. Return a narrowed path[] to restrict, or false to block. */
		beforeDeleteCallback?: (
			ctx: import('../core/TreeController.svelte').BeforeDeleteContext<T>
		) => string[] | false | void;
		/** OUTPUT transform (egress) — per node as it LEAVES the source: Ctrl+C/X, or the capture
		 *  side of a copy-drop. Strip transient/sensitive fields. Fires for copy, never a move. */
		nodeOutputTransformationCallback?: (ctx: NodeTransformCallbackContext<T>) => T;
		/** INPUT transform (ingress) — per node as a DUPLICATE LANDS in a destination: Ctrl+V
		 *  paste, or the insert side of a copy-drop (same- or cross-tree). Return new data
		 *  (fresh ids/names) or null to skip the node. Fires for copy, never a move. */
		nodeInputTransformationCallback?: NodeTransformCallback<T>;

		// DATA PROVIDERS (get*Callback = returns data the system uses)
		getContextMenuItemsCallback?: (ctx: ContextMenuContext<T>) => ContextMenuEntry<T>[];

		// VISUALS
		/** Per-instance theme override. Forwarded to the root `.stv__container`
		 *  as `data-theme="dark"|"light"`, which the stylesheet uses to flip the
		 *  tree's colors independently of the surrounding page. Leave undefined to
		 *  inherit from the page (OS preference, framework classes, etc.). */
		theme?: 'dark' | 'light' | null | undefined;
		bodyClass?: string | null | undefined;
		selectedNodeClass?: string | null | undefined;
		focusedNodeClass?: string | null | undefined;
		/** CSS class applied to every checked (isChecked) node — opt-in extra styling;
		 *  the checkbox is the default signal. */
		checkedNodeClass?: string | null | undefined;
		/** Data-driven per-row class hook. Return extra class(es) for `.stv__node`. */
		getNodeClassCallback?: (ctx: NodeContext<T>) => string | null | undefined;
		/** Data-driven per-row class hook. Return extra class(es) for `.stv__node-content`. */
		getNodeContentClassCallback?: (ctx: NodeContext<T>) => string | null | undefined;
		dragOverNodeClass?: string | null | undefined;
		/** Class for the dragged source row (the dimmed node left in place while its ghost
		 *  follows the pointer). When set, REPLACES the built-in `.stv__node-content--dragged`
		 *  visual (opacity + left-anchored scale) so you own the drag feedback — mirrors
		 *  `selectedNodeClass` / `scrollHighlightClass`. Tune the default via
		 *  `--stv-dragged-opacity` / `--stv-dragged-scale` instead of replacing it. */
		draggedNodeClass?: string | null | undefined;
		/** Pick the disclosure glyph as a single knob (default `'chevron'`). Re-points
		 *  the ONE `--stv-icon-*` variable set via `data-icon-set` on `.stv__container`
		 *  — it does not switch between separate CSS classes. `'plus-minus'` is a swap
		 *  set (glyph-swaps regardless of `toggleIconMode`). Each set chains to a shared
		 *  `--base-icon-*` token, so a theme reskins every KeenMate component at once. */
		iconSet?: 'chevron' | 'triangle' | 'plus-minus' | 'arrow';
		/** @deprecated Use `iconSet` instead. Escape hatch to override the expand
		 *  glyph's CSS class; the canonical class is `stv__toggle-icon--expand`. */
		expandIconClass?: string | null | undefined;
		/** @deprecated No longer consumed at render time — swap between expand/collapse
		 *  is CSS-driven (see `iconSet` / `toggleIconMode`). Retained for back-compat. */
		collapseIconClass?: string | null | undefined;
		leafIconClass?: string | null | undefined;
		toggleIconMode?: 'rotate' | 'swap';
		/** How the built-in node label behaves when wider than the row: `wrap` (default,
		 *  multi-line), `ellipsis` (single-line clip), or `info` (ellipsis + a trailing ⓘ
		 *  on clipped rows that reveals the full label on click). See NodeTitleOverflow. */
		nodeTitleOverflow?: NodeTitleOverflow;
		/** Enable hover/focus tooltips on node rows. Content comes from the `tooltip`
		 *  snippet (preferred) or `getNodeTooltipCallback`; no content ⇒ no tooltip. */
		isNodeTooltipsShown?: boolean;
		/** Plain-text tooltip for a node (fallback when no `tooltip` snippet is given). */
		getNodeTooltipCallback?: (ctx: NodeContext<T>) => string | null | undefined;
		/** Tooltip placement relative to the row. Default `'top-start'`. */
		tooltipPlacement?: TooltipPlacement;
		/** Show/hide delay(s), ms. Default `{ show: 400, hide: 100 }`. */
		tooltipDelay?: TooltipDelay;
		/** Gap from the row (or cursor), px. Default `8`. */
		tooltipOffset?: number;
		/** Anchor the tooltip to the pointer instead of the row. Default `false`. */
		shouldTooltipFollowCursor?: boolean;
		/** Per-node icon VALUE from a data key — rendered as a dedicated `.stv__node-icon`
		 *  element on every node (default `<i class="stv__node-icon {value}">`, FA-friendly). */
		iconMember?: string | null | undefined;
		/** Per-node icon VALUE from a callback (overrides iconMember). */
		getIconCallback?: (ctx: NodeContext<T>) => string | null | undefined;
		/** Per-node icon COLOR from a data key (applied to the icon element). */
		iconColorMember?: string | null | undefined;
		/** Per-node icon COLOR from a callback (overrides iconColorMember). */
		getIconColorCallback?: (ctx: NodeContext<T>) => string | null | undefined;
		/** Reserve the icon column so labels align even on rows with no icon. Default `false`. */
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

		/** Keydown interceptor (SYNCHRONOUS — a key's default can only be prevented in the
		 *  handler). Return `false` to suppress the tree's keyboard handling (navigation and the
		 *  built-in shortcuts) and preventDefault the key; return nothing to continue. Gets a context object mirroring the other
		 *  callback families: the resolved `focusedNode` (single) and `selectedNodes`
		 *  (multi) so you don't reach through the controller for the common case; `controller`
		 *  remains for imperative actions (addNode, copyNodes, …). A keydown is a tree-level
		 *  event, so there's no single "the node" — that's why it carries both selections. */
		beforeKeydownCallback?: (ctx: KeydownContext<T>) => false | void;

		/** Override individual navigation methods (e.g. for custom ArrowDown/Up behavior) */
		navigationOverrides?: TreeNavigationOverrides<T>;
	}

	let {
		treeId,
		treePathSeparator = '.',

		// MAPPINGS
		idMember,
		pathMember,
		parentPathMember,
		levelMember,
		hasChildrenMember,

		isExpandedMember,
		getIsExpandedCallback,
		isSelectableMember,
		getIsSelectableCallback,
		isCheckedMember,
		getIsCheckedCallback,
		isDraggableMember,
		getIsDraggableCallback,
		isDropAllowedMember,
		getIsDropAllowedCallback,
		allowedDropPositionsMember,
		getAllowedDropPositionsCallback,
		isCollapsibleMember,
		getIsCollapsibleCallback,

		displayValueMember,
		getDisplayValueCallback,
		searchValueMember,
		getSearchValueCallback,
		orderMember,
		isSorted,
		sortCallback,

		// DATA
		data = $bindable(),
		focusedNode = $bindable(),
		selectedPaths = $bindable(new Set<string>()),
		checkedPaths = $bindable(new Set<string>()),
		insertResult = $bindable(),

		// SLOTS
		nodeTemplate = undefined,
		treeHeader = undefined,
		treeFooter = undefined,
		noData = undefined,
		contextMenu = undefined,
		dropPlaceholder = undefined,
		loadingPlaceholder = undefined,
		labels = undefined,

		// BEHAVIOUR
		expandLevel = 2,

		clickBehavior = 'expand-and-focus',
		selectionMode = 'single',
		isCheckboxesShown = false,
		checkboxMode = 'independent',
		cascadeCheckPolicy = 'rolled-up',
		shouldClickToggleCheckbox = false,
		beforeCheckboxToggleCallback,
		rangeSelectionMode = 'visual',
		shouldUseInternalSearchIndex = true,
		initializeIndexCallback,
		searchTerm = $bindable(),
		indexerBatchSize = 25,
		indexerTimeout = 50,
		isLoading = false,

		// Progressive rendering (exponential batching: 20 → 40 → 80 → 160...)
		isProgressiveRenderEnabled = true,
		initialBatchSize = 20,
		maxBatchSize = 500,
		isRendering = $bindable(false),
		onRenderStart,
		onRenderProgress,
		onRenderComplete,

		// Flat rendering mode
		isFlatRenderingEnabled = true,

		// Virtual scrolling (flat mode only)
		isVirtualScrollEnabled = false,
		virtualScrollItemHeight = undefined,
		virtualScrollOverscan = 5,
		virtualScrollContainerHeight = undefined,

		// DRAG AND DROP
		dragDropMode = 'none',
		dropZoneMode = 'glow',
		dropZoneLayout = 'around',
		dropZoneStart = 33,
		dropZoneMaxWidth = 120,
		isEmptyDropPlaceholderShown = false,
		isTreeDropZoneEnabled = false,
		isCopyAllowed = false,
		shouldAutoHandleCopy = true,
		shouldAutoHandleMove = true,
		shouldAutoHandlePaste = true,
		shouldHandleKeyboardShortcuts = false,
		shouldExpandAsAccordion = false,

		// EVENTS
		onNodeClick,
		onNodeDoubleClick,
		onSelectionChange,
		onCheckedChange,
		onNodeDragStart,
		onNodeDragOver,
		onNodeDrop,
		onNodeDragReject,
		onNodeDropReject,
		onNodeCopy,
		onNodeCut,
		onNodePaste,
		onNodeDelete,
		onContainerResize,
		containerSize = $bindable(),
		// INTERCEPTORS
		beforeDragStartCallback,
		beforeDropCallback,
		beforeCopyCallback,
		beforeCutCallback,
		beforePasteCallback,
		beforeDeleteCallback,
		nodeOutputTransformationCallback,
		nodeInputTransformationCallback,
		// DATA PROVIDERS
		getContextMenuItemsCallback,

		// VISUALS
		theme,
		bodyClass,
		iconSet = 'chevron',
		expandIconClass = 'stv__toggle-icon--expand',
		collapseIconClass = 'stv__toggle-icon--collapse',
		leafIconClass = 'stv__toggle-icon--leaf',
		toggleIconMode = 'rotate',
		nodeTitleOverflow = 'wrap',
		isNodeTooltipsShown = false,
		getNodeTooltipCallback,
		tooltipPlacement = 'top-start',
		tooltipDelay,
		tooltipOffset = 8,
		shouldTooltipFollowCursor = false,
		tooltip,
		iconMember,
		getIconCallback,
		iconColorMember,
		getIconColorCallback,
		shouldAlignNodeIcons = false,
		icon,
		selectedNodeClass,
		focusedNodeClass,
		checkedNodeClass,
		getNodeClassCallback,
		getNodeContentClassCallback,
		dragOverNodeClass,
		draggedNodeClass,
		scrollHighlightTimeout = 4000,
		scrollHighlightClass = 'stv__node-content--scroll-highlight',
		contextMenuXOffset = 8,
		contextMenuYOffset = 0,
		touchDragDelay = 300,
		shouldIndicateUndraggable = true,
		beforeKeydownCallback,
		navigationOverrides
	}: Props = $props();

	// ── Create controller ───────────────────────────────────────────────
	// Each prop here captures its INITIAL value only — that's intentional. Every
	// reactive prop is re-synced into the controller via $effect blocks below
	// (search for "Sync props → controller"), so the controller stays in step
	// with parent changes. The svelte-ignore suppresses the 80+ warnings the
	// compiler would otherwise fire for each non-closure prop reference here.
	// svelte-ignore state_referenced_locally
	const controller = createTreeController<T>({
		idMember,
		pathMember,
		parentPathMember,
		levelMember,
		hasChildrenMember,
		isExpandedMember,
		getIsExpandedCallback,
		isSelectableMember,
		getIsSelectableCallback,
		isCheckedMember,
		getIsCheckedCallback,
		isDraggableMember,
		getIsDraggableCallback,
		isDropAllowedMember,
		getIsDropAllowedCallback,
		allowedDropPositionsMember,
		getAllowedDropPositionsCallback,
		isCollapsibleMember,
		getIsCollapsibleCallback,
		displayValueMember,
		getDisplayValueCallback,
		labels,
		searchValueMember,
		getSearchValueCallback,
		orderMember,
		isSorted,
		sortCallback,
		treeId,
		treePathSeparator,
		data,
		focusedNode,
		selectedPaths,
		checkedPaths,
		expandLevel,
		clickBehavior,
		selectionMode,
		isCheckboxesShown,
		checkboxMode,
		cascadeCheckPolicy,
		shouldClickToggleCheckbox,
		beforeCheckboxToggleCallback,
		rangeSelectionMode,
		shouldUseInternalSearchIndex,
		initializeIndexCallback,
		searchTerm,
		indexerBatchSize,
		indexerTimeout,
		isLoading,
		isProgressiveRenderEnabled,
		initialBatchSize,
		maxBatchSize,
		onRenderStart,
		onRenderProgress,
		onRenderComplete,
		isFlatRenderingEnabled,
		isVirtualScrollEnabled,
		virtualScrollItemHeight,
		virtualScrollOverscan,
		virtualScrollContainerHeight,
		dragDropMode,
		dropZoneMode,
		dropZoneLayout,
		dropZoneStart,
		dropZoneMaxWidth,
		isCopyAllowed,
		shouldAutoHandleCopy,
		shouldAutoHandleMove,
		shouldAutoHandlePaste,
		shouldHandleKeyboardShortcuts,
		shouldExpandAsAccordion,
		onNodeClick,
		onNodeDoubleClick,
		onSelectionChange,
		onCheckedChange,
		onNodeDragStart,
		onNodeDragOver,
		onNodeDrop,
		onNodeDragReject,
		onNodeDropReject,
		onNodeCopy,
		onNodeCut,
		onNodePaste,
		onNodeDelete,
		beforeDragStartCallback,
		beforeDropCallback,
		beforeCopyCallback,
		beforeCutCallback,
		beforePasteCallback,
		beforeDeleteCallback,
		nodeOutputTransformationCallback,
		nodeInputTransformationCallback,
		getContextMenuItemsCallback,
		hasContextMenuSnippet: !!contextMenu,
		bodyClass,
		selectedNodeClass,
		focusedNodeClass,
		checkedNodeClass,
		getNodeClassCallback,
		getNodeContentClassCallback,
		dragOverNodeClass,
		draggedNodeClass,
		expandIconClass,
		collapseIconClass,
		leafIconClass,
		toggleIconMode,
		nodeTitleOverflow,
		isNodeTooltipsShown,
		getNodeTooltipCallback,
		tooltipPlacement,
		tooltipDelay,
		tooltipOffset,
		shouldTooltipFollowCursor,
		iconMember,
		getIconCallback,
		iconColorMember,
		getIconColorCallback,
		shouldAlignNodeIcons,
		scrollHighlightTimeout,
		scrollHighlightClass,
		contextMenuXOffset,
		contextMenuYOffset,
		touchDragDelay,
		shouldIndicateUndraggable
	});

	// ── Apply navigation overrides if provided ─────────────────────────
	// Snapshot at init only — navigation handlers aren't expected to swap mid-
	// lifetime. Consumers passing a new object on rerender would not see it
	// applied; if that becomes a need, hoist into an $effect.
	// svelte-ignore state_referenced_locally
	if (navigationOverrides) {
		// svelte-ignore state_referenced_locally
		controller.navigation = { ...controller.createDefaultNavigation(), ...navigationOverrides };
	}

	// Reactive render environment shared with every Node — device class + the tree's
	// container box. Mutated (not replaced) in an $effect below so the context reference
	// stays stable; each Node merges it with the node's live state into a NodeRenderContext.
	const nodeRenderEnv = $state<{ deviceClass: NodeRenderContext['deviceClass']; container: ElementSize }>({
		deviceClass: 'desktop',
		container: { width: 0, height: 0 }
	});

	// ── Set contexts (must happen synchronously during component init) ──
	setContext('Ltree', controller.tree);
	setContext('NodeCallbacks', controller.nodeCallbacks);
	setContext('NodeConfig', controller.nodeConfig);
	// The rich-content tooltip snippet (stable identity) reaches every Node via
	// context, so it doesn't need threading through each render site + the recursive
	// forward. The string callback + options travel in NodeConfig.
	// svelte-ignore state_referenced_locally
	setContext('NodeTooltip', tooltip);
	// The icon snippet (stable identity) also reaches every Node via context.
	// svelte-ignore state_referenced_locally
	setContext('NodeIcon', icon);
	setContext('NodeRenderEnv', nodeRenderEnv);
	if (controller.renderCoordinator) {
		setContext('RenderCoordinator', controller.renderCoordinator);
	}

	// ── Cleanup on destroy ──────────────────────────────────────────────
	onDestroy(() => controller.destroy());

	// ── Bind container element for controller ───────────────────────────
	let treeContainerRef: HTMLDivElement;
	$effect(() => {
		if (treeContainerRef) {
			controller.containerElement = treeContainerRef;
		}
	});

	// ── Responsive container-box signal (signal only; see core/responsive.svelte.ts) ──
	// Reactive border-box of the tree's own container, backed by the shared
	// ResizeObserver in vendor/environment. The tree does NOT change its own render
	// on this — it just surfaces the signal to consumers two ways: the `containerSize`
	// bindable (declarative reads) and the `onContainerResize` callback (imperative).
	const _box = trackContainerSize(() => treeContainerRef);
	let _lastEmittedBox: ElementSize | null = null;
	$effect(() => {
		const w = _box.width;
		const h = _box.height;
		// Skip the pre-mount 0×0 read so consumers don't see a phantom resize.
		if (w === 0 && h === 0) return;
		// Emit a FRESH plain snapshot — never the tracked source object — so a consumer's
		// bind:containerSize can't alias our reactive state and feed a write-back loop.
		// The last-emitted guard keeps identical boxes from re-firing the callback.
		if (_lastEmittedBox && _lastEmittedBox.width === w && _lastEmittedBox.height === h) return;
		const snapshot: ElementSize = { width: w, height: h };
		_lastEmittedBox = snapshot;
		containerSize = snapshot;
		onContainerResize?.({ size: snapshot, deviceClass: classifyDevice(getEnvironment()) });
	});

	// Feed the shared NodeRenderContext env: reactive device class + container box.
	// Reuses the same signals (environmentState / _box) — no extra observers.
	const _env = environmentState();
	$effect(() => {
		nodeRenderEnv.deviceClass = _env.deviceClass;
		nodeRenderEnv.container = { width: _box.width, height: _box.height };
	});

	// ── Context menu element + Floating UI positioning ─────────────────
	let contextMenuEl = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (!controller.contextMenuVisible || !contextMenuEl) return;
		// Track position + target so the effect re-runs (tears down the old autoUpdate
		// and re-anchors) when a right-click moves the menu to a DIFFERENT node while
		// it's already open — otherwise autoUpdate only recomputes on scroll/resize and
		// the menu stays stuck at the first node's position.
		void controller.contextMenuX;
		void controller.contextMenuY;
		void controller.contextMenuNode;
		const xOff = controller.contextMenuXOffset ?? 0;
		const yOff = controller.contextMenuYOffset ?? 0;
		const virtualRef = {
			getBoundingClientRect: () => {
				const ax = controller.contextMenuX + xOff;
				const ay = controller.contextMenuY + yOff;
				return {
					x: ax,
					y: ay,
					width: 0,
					height: 0,
					top: ay,
					left: ax,
					right: ax,
					bottom: ay,
					toJSON() {
						return this;
					}
				};
			}
		};
		const menu = contextMenuEl;
		return autoUpdate(virtualRef, menu, () => {
			computePosition(virtualRef, menu, {
				strategy: 'fixed',
				placement: 'bottom-start',
				middleware: [offset(0), flip(), shift({ padding: 8 })]
			}).then(({ x, y }) => {
				menu.style.left = `${x}px`;
				menu.style.top = `${y}px`;
			});
		});
	});

	// ── Sync props → controller (one-way: parent prop changes flow in) ─
	$effect(() => {
		controller.data = data;
	});
	$effect(() => {
		controller.searchTerm = searchTerm;
	});
	$effect(() => {
		if (treeId) controller.treeId = treeId;
	});
	$effect(() => {
		controller.treePathSeparator = treePathSeparator ?? '.';
	});
	$effect(() => {
		controller.isLoading = isLoading ?? false;
	});
	$effect(() => {
		controller.bodyClass = bodyClass;
	});
	$effect(() => {
		controller.isTreeDropZoneEnabled = isTreeDropZoneEnabled;
	});
	$effect(() => {
		controller.isFlatRenderingEnabled = isFlatRenderingEnabled ?? true;
	});
	$effect(() => {
		controller.isVirtualScrollEnabled = isVirtualScrollEnabled ?? false;
	});
	$effect(() => {
		controller.virtualScrollItemHeight = virtualScrollItemHeight;
	});
	$effect(() => {
		controller.virtualScrollOverscan = virtualScrollOverscan ?? 5;
	});
	$effect(() => {
		controller.virtualScrollContainerHeight = virtualScrollContainerHeight;
	});
	$effect(() => {
		controller.isProgressiveRenderEnabled = isProgressiveRenderEnabled ?? true;
	});
	$effect(() => {
		controller.initialBatchSize = initialBatchSize ?? 20;
	});
	$effect(() => {
		controller.maxBatchSize = maxBatchSize ?? 500;
	});
	$effect(() => {
		controller.dragDropMode = dragDropMode ?? 'none';
	});
	$effect(() => {
		controller.isCopyAllowed = isCopyAllowed ?? false;
	});
	$effect(() => {
		controller.shouldAutoHandleCopy = shouldAutoHandleCopy ?? true;
	});
	$effect(() => {
		controller.shouldAutoHandleMove = shouldAutoHandleMove ?? true;
	});
	$effect(() => {
		controller.shouldAutoHandlePaste = shouldAutoHandlePaste ?? true;
	});
	$effect(() => {
		controller.shouldHandleKeyboardShortcuts = shouldHandleKeyboardShortcuts ?? false;
	});
	$effect(() => {
		controller.shouldExpandAsAccordion = shouldExpandAsAccordion ?? false;
	});
	$effect(() => {
		controller.hasContextMenuSnippet = !!contextMenu;
	});

	// Visual config sync (drives nodeConfig update via controller's internal effect)
	$effect(() => {
		controller.clickBehavior = clickBehavior ?? 'expand-and-focus';
	});
	$effect(() => {
		controller.selectionMode = selectionMode ?? 'single';
	});
	$effect(() => {
		controller.isCheckboxesShown = isCheckboxesShown ?? false;
	});
	$effect(() => {
		controller.checkboxMode = checkboxMode ?? 'independent';
	});
	$effect(() => {
		controller.cascadeCheckPolicy = cascadeCheckPolicy ?? 'rolled-up';
	});
	$effect(() => {
		controller.shouldClickToggleCheckbox = shouldClickToggleCheckbox ?? false;
	});
	$effect(() => {
		controller.beforeCheckboxToggleHandler = beforeCheckboxToggleCallback;
	});
	$effect(() => {
		controller.rangeSelectionMode = rangeSelectionMode ?? 'visual';
	});
	$effect(() => {
		controller.expandIconClass = expandIconClass ?? 'stv__toggle-icon--expand';
	});
	$effect(() => {
		controller.collapseIconClass = collapseIconClass ?? 'stv__toggle-icon--collapse';
	});
	$effect(() => {
		controller.leafIconClass = leafIconClass ?? 'stv__toggle-icon--leaf';
	});
	$effect(() => {
		controller.toggleIconMode = toggleIconMode ?? 'rotate';
	});
	$effect(() => {
		controller.nodeTitleOverflow = nodeTitleOverflow ?? 'wrap';
	});
	$effect(() => {
		controller.isNodeTooltipsShown = isNodeTooltipsShown ?? false;
	});
	$effect(() => {
		controller.getNodeTooltipCallback = getNodeTooltipCallback;
	});
	$effect(() => {
		controller.tooltipPlacement = tooltipPlacement ?? 'top-start';
	});
	$effect(() => {
		controller.tooltipDelay = tooltipDelay ?? { show: 400, hide: 100 };
	});
	$effect(() => {
		controller.tooltipOffset = tooltipOffset ?? 8;
	});
	$effect(() => {
		controller.shouldTooltipFollowCursor = shouldTooltipFollowCursor ?? false;
	});
	$effect(() => {
		controller.iconMember = iconMember;
	});
	$effect(() => {
		controller.getIconCallback = getIconCallback;
	});
	$effect(() => {
		controller.iconColorMember = iconColorMember;
	});
	$effect(() => {
		controller.getIconColorCallback = getIconColorCallback;
	});
	$effect(() => {
		controller.shouldAlignNodeIcons = shouldAlignNodeIcons ?? false;
	});
	$effect(() => {
		controller.selectedNodeClass = selectedNodeClass;
	});
	$effect(() => {
		controller.getNodeClassCallback = getNodeClassCallback;
	});
	$effect(() => {
		controller.getNodeContentClassCallback = getNodeContentClassCallback;
	});
	$effect(() => {
		controller.focusedNodeClass = focusedNodeClass;
	});
	$effect(() => {
		controller.checkedNodeClass = checkedNodeClass;
	});
	$effect(() => {
		controller.dragOverNodeClass = dragOverNodeClass;
	});
	$effect(() => {
		controller.draggedNodeClass = draggedNodeClass;
	});
	$effect(() => {
		controller.dropZoneMode = dropZoneMode ?? 'glow';
	});
	$effect(() => {
		controller.dropZoneLayout = dropZoneLayout ?? 'around';
	});
	$effect(() => {
		controller.dropZoneStart = dropZoneStart ?? 33;
	});
	$effect(() => {
		controller.dropZoneMaxWidth = dropZoneMaxWidth ?? 120;
	});
	$effect(() => {
		controller.scrollHighlightTimeout = scrollHighlightTimeout ?? 4000;
	});
	$effect(() => {
		controller.scrollHighlightClass = scrollHighlightClass ?? 'stv__node-content--scroll-highlight';
	});
	$effect(() => {
		controller.contextMenuXOffset = contextMenuXOffset ?? 8;
	});
	$effect(() => {
		controller.contextMenuYOffset = contextMenuYOffset ?? 0;
	});
	$effect(() => {
		controller.touchDragDelay = touchDragDelay ?? 300;
	});
	$effect(() => {
		controller.shouldIndicateUndraggable = shouldIndicateUndraggable ?? true;
	});
	$effect(() => {
		controller.labels = labels;
	});

	// Callback sync
	$effect(() => {
		controller.onNodeClickHandler = onNodeClick;
	});
	$effect(() => {
		controller.onNodeDoubleClickHandler = onNodeDoubleClick;
	});
	$effect(() => {
		controller.onSelectionChangeHandler = onSelectionChange;
	});
	$effect(() => {
		controller.onCheckedChangeHandler = onCheckedChange;
	});
	$effect(() => {
		controller.onNodeDragStartHandler = onNodeDragStart;
	});
	$effect(() => {
		controller.onNodeDragOverHandler = onNodeDragOver;
	});
	$effect(() => {
		controller.onNodeDropHandler = onNodeDrop;
	});
	$effect(() => {
		controller.onNodeDragRejectHandler = onNodeDragReject;
	});
	$effect(() => {
		controller.onNodeDropRejectHandler = onNodeDropReject;
	});
	$effect(() => {
		controller.onNodeCopyHandler = onNodeCopy;
	});
	$effect(() => {
		controller.onNodeCutHandler = onNodeCut;
	});
	$effect(() => {
		controller.onNodePasteHandler = onNodePaste;
	});
	$effect(() => {
		controller.onNodeDeleteHandler = onNodeDelete;
	});
	$effect(() => {
		controller.beforeDragStartHandler = beforeDragStartCallback;
	});
	$effect(() => {
		controller.beforeDropHandler = beforeDropCallback;
	});
	$effect(() => {
		controller.beforeCopyHandler = beforeCopyCallback;
	});
	$effect(() => {
		controller.beforeCutHandler = beforeCutCallback;
	});
	$effect(() => {
		controller.beforePasteHandler = beforePasteCallback;
	});
	$effect(() => {
		controller.beforeDeleteHandler = beforeDeleteCallback;
	});
	$effect(() => {
		controller.outputTransformHandler = nodeOutputTransformationCallback;
	});
	$effect(() => {
		controller.inputTransformHandler = nodeInputTransformationCallback;
	});
	$effect(() => {
		controller.getContextMenuItemsHandler = getContextMenuItemsCallback;
	});
	$effect(() => {
		controller.onRenderStartHandler = onRenderStart;
	});
	$effect(() => {
		controller.onRenderProgressHandler = onRenderProgress;
	});
	$effect(() => {
		controller.onRenderCompleteHandler = onRenderComplete;
	});

	// ── Sync controller → bindable props (outputs flow back to parent) ──
	$effect(() => {
		focusedNode = controller.focusedNode;
	});
	$effect(() => {
		selectedPaths = controller.selectedPaths;
	});
	$effect(() => {
		// The bindable prop exposes the POLICY-PROJECTED selection (rolled-up /
		// leaves / all), not the internal canonical set. See cascadeCheckPolicy.
		checkedPaths = controller.emittedPaths;
	});
	$effect(() => {
		insertResult = controller.insertResult;
	});
	$effect(() => {
		isRendering = controller.isRendering;
	});

	// Bidirectional: parent can also SET these
	$effect(() => {
		controller.focusedNode = focusedNode;
	});
	$effect(() => {
		// Compare by size + content to avoid proxy identity loops
		const hp = selectedPaths;
		const cp = controller.selectedPaths;
		if (hp.size !== cp.size || [...hp].some((p) => !cp.has(p))) {
			// Assigning the bindable replaces the set (node flags too) — silent, no event.
			controller._replaceSelectedPaths(hp);
		}
	});
	$effect(() => {
		const sp = checkedPaths;
		const cp = controller.emittedPaths;
		if (sp.size !== cp.size || [...sp].some((p) => !cp.has(p))) {
			// Incoming set is a projection; expand it (cascade-down) into the canonical
			// checked state. Silent — the parent set this, so don't echo onCheckedChange.
			controller._replaceCheckedPaths(sp);
		}
	});

	// ── Floating drop zone helpers ───────────────────────────────────────
	const formattedDropZoneStart = $derived(
		typeof controller.dropZoneStart === 'number'
			? `${controller.dropZoneStart}%`
			: controller.dropZoneStart
	);

	// Show the drop placeholder either mid-drag (isDropPlaceholderActive) or, when
	// isEmptyDropPlaceholderShown is set, permanently while the tree is empty.
	const showEmptyDropPlaceholder = $derived(
		controller.isDropPlaceholderActive || isEmptyDropPlaceholderShown
	);

	// Focus-on-hover for the permanent empty drop zone: gives the tabbable container
	// keyboard focus so a Ctrl/Cmd+V (routed through beforeKeydownCallback) pastes into this
	// tree without a node to click first. No-op unless the permanent placeholder is on.
	function focusEmptyDropZone() {
		if (isEmptyDropPlaceholderShown) treeContainerRef?.focus();
	}

	// ── Export public methods (thin proxies) ────────────────────────────
	export async function expandNodes(
		nodePath: string | string[],
		options?: { exclusive?: boolean; noEmit?: boolean }
	) {
		controller.expandNodes(nodePath, options);
	}

	export async function collapseNodes(nodePath: string | string[], options?: { noEmit?: boolean }) {
		controller.collapseNodes(nodePath, options);
	}

	export function expandAll(
		nodePath?: string | string[] | null | undefined,
		options?: { exclusive?: boolean; noEmit?: boolean }
	) {
		controller.expandAll(nodePath, options);
	}

	export function collapseAll(
		nodePath?: string | string[] | null | undefined,
		options?: { noEmit?: boolean }
	) {
		controller.collapseAll(nodePath, options);
	}

	export function filterNodes(term: string, searchOptions?: SearchOptions): void {
		controller.filterNodes(term, searchOptions);
	}

	export function searchNodes(
		term: string | null | undefined,
		searchOptions?: SearchOptions
	): LTreeNode<T>[] {
		return controller.searchNodes(term, searchOptions);
	}

	export function getChildren(parentPath: string): LTreeNode<T>[] {
		return controller.getChildren(parentPath);
	}

	export function getSiblings(path: string): LTreeNode<T>[] {
		return controller.getSiblings(path);
	}

	export function refreshSiblings(parentPath: string): void {
		controller.refreshSiblings(parentPath);
	}

	export function refreshNode(path: string): void {
		controller.refreshNode(path);
	}

	export function getNodeByPath(path: string): LTreeNode<T> | null {
		return controller.getNodeByPath(path);
	}

	export function moveNode(
		sourcePath: string,
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; error?: string } {
		return controller.moveNode(sourcePath, targetPath, position);
	}

	export function moveNodes(
		paths: string[],
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; movedNodes: LTreeNode<T>[]; leftBehind: LTreeNode<T>[]; error?: string } {
		return controller.moveNodes(paths, targetPath, position);
	}

	export function duplicateNodes(
		paths: string[],
		targetPath: string,
		position: 'before' | 'after' | 'child',
		transform?: NodeTransformCallback<T> | null
	): { success: boolean; copiedNodes: LTreeNode<T>[]; skipped: number; error?: string } {
		return controller.duplicateNodes(paths, targetPath, position, transform);
	}

	export function removeNode(
		path: string,
		includeDescendants: boolean = true
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return controller.removeNode(path, includeDescendants);
	}

	/** Programmatic removal of several subtrees (no beforeDeleteCallback, no onNodeDelete). */
	export function removeNodes(paths: string[]): { removed: number; failed: number } {
		return controller.removeNodes(paths);
	}

	export function addNode(
		parentPath: string,
		nodeData: T,
		pathSegment?: string
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return controller.addNode(parentPath, nodeData, pathSegment);
	}

	export function updateNode(
		path: string,
		dataUpdates: Partial<T>
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return controller.updateNode(path, dataUpdates);
	}

	export function applyChanges(changes: TreeChange<T>[]): ApplyChangesResult {
		return controller.applyChanges(changes);
	}

	export function insertBranch(parentPath: string, data: T[]): InsertBranchResult<T> {
		return controller.insertBranch(parentPath, data);
	}

	export function replaceBranch(parentPath: string, data: T[]): InsertBranchResult<T> {
		return controller.replaceBranch(parentPath, data);
	}

	export function removeBranch(path: string, keepParent?: boolean): RemoveBranchResult<T> {
		return controller.removeBranch(path, keepParent);
	}

	export function copyNodeWithDescendants(
		sourceNode: LTreeNode<T>,
		targetParentPath: string,
		transformData: (ctx: { data: T; node: LTreeNode<T> }) => T | null,
		siblingPath?: string,
		position?: 'before' | 'after'
	): { success: boolean; rootNode?: LTreeNode<T>; count: number; error?: string } {
		return controller.copyNodeWithDescendants(
			sourceNode,
			targetParentPath,
			transformData,
			siblingPath,
			position
		);
	}

	export function getExpandedPaths(): string[] {
		return controller.getExpandedPaths();
	}

	export function setExpandedPaths(paths: string[]): void {
		controller.setExpandedPaths(paths);
	}

	export function getAllData(): T[] {
		return controller.getAllData();
	}

	export function closeContextMenu() {
		controller.closeContextMenu();
	}

	// ── Selection set (UI multi-select — selectedPaths) ──────────────
	export function selectNode(
		path: string,
		mode: SelectMode = 'replace',
		options?: TreeMutationOptions
	) {
		controller.selectNode(path, mode, options);
	}

	export function selectNodes(paths: string[], options?: TreeMutationOptions) {
		controller.selectNodes(paths, options);
	}

	export function selectAll(options?: TreeMutationOptions) {
		controller.selectAll(options);
	}

	export function clearSelection(paths?: string[], options?: TreeMutationOptions) {
		controller.clearSelection(paths, options);
	}

	// ── Checked set (checkbox / data state — checkedPaths) ───────────
	export function checkNode(path: string, options?: TreeMutationOptions) {
		controller.checkNode(path, options);
	}

	export function checkNodes(paths: string[], options?: TreeMutationOptions) {
		controller.checkNodes(paths, options);
	}

	export function checkAll(options?: TreeMutationOptions) {
		controller.checkAll(options);
	}

	export function uncheckNode(path: string, options?: TreeMutationOptions) {
		controller.uncheckNode(path, options);
	}

	export function uncheckNodes(paths: string[], options?: TreeMutationOptions) {
		controller.uncheckNodes(paths, options);
	}

	export function uncheckAll(options?: TreeMutationOptions) {
		controller.uncheckAll(options);
	}

	// ── Focus (single cursor — focusedNode) ─────────────────────────────
	export function focusNode(path: string, options?: TreeMutationOptions) {
		controller.focusNode(path, options);
	}

	export function clearFocus(options?: TreeMutationOptions) {
		controller.clearFocus(options);
	}

	export function getCheckedNodes(): LTreeNode<T>[] {
		return controller.getCheckedNodes();
	}

	export function isNodeChecked(path: string): boolean {
		return controller.isNodeChecked(path);
	}

	export async function scrollToPath(
		path: string,
		options?: {
			expand?: boolean;
			expandTarget?: boolean;
			highlight?: boolean;
			scrollOptions?: ScrollIntoViewOptions;
			containerScroll?: boolean;
		}
	): Promise<boolean> {
		return controller.scrollToPath(path, options);
	}

	// External update method for HTML/JavaScript usage
	export function update(
		updates: Partial<
			Pick<
				Props,
				| 'treeId'
				| 'treePathSeparator'
				| 'idMember'
				| 'pathMember'
				| 'parentPathMember'
				| 'levelMember'
				| 'hasChildrenMember'
				| 'isExpandedMember'
				| 'getIsExpandedCallback'
				| 'isSelectableMember'
				| 'getIsSelectableCallback'
				| 'isCheckedMember'
				| 'getIsCheckedCallback'
				| 'isDraggableMember'
				| 'getIsDraggableCallback'
				| 'isDropAllowedMember'
				| 'getIsDropAllowedCallback'
				| 'displayValueMember'
				| 'getDisplayValueCallback'
				| 'searchValueMember'
				| 'getSearchValueCallback'
				| 'isCollapsibleMember'
				| 'getIsCollapsibleCallback'
				| 'orderMember'
				| 'isSorted'
				| 'sortCallback'
				| 'data'
				| 'focusedNode'
				| 'selectedPaths'
				| 'checkedPaths'
				| 'expandLevel'
				| 'clickBehavior'
				| 'selectionMode'
				| 'isCheckboxesShown'
				| 'checkboxMode'
				| 'cascadeCheckPolicy'
				| 'shouldClickToggleCheckbox'
				| 'beforeCheckboxToggleCallback'
				| 'rangeSelectionMode'
				| 'shouldUseInternalSearchIndex'
				| 'initializeIndexCallback'
				| 'searchTerm'
				| 'indexerBatchSize'
				| 'indexerTimeout'
				| 'onNodeClick'
				| 'onNodeDoubleClick'
				| 'onSelectionChange'
				| 'onCheckedChange'
				| 'onNodeDragStart'
				| 'onNodeDragOver'
				| 'onNodeDrop'
				| 'onNodeDragReject'
				| 'onNodeDropReject'
				| 'onNodeCopy'
				| 'onNodeCut'
				| 'onNodePaste'
				| 'onNodeDelete'
				| 'onContainerResize'
				| 'beforeDragStartCallback'
				| 'beforeDropCallback'
				| 'beforeCopyCallback'
				| 'beforeCutCallback'
				| 'beforePasteCallback'
				| 'beforeDeleteCallback'
				| 'shouldHandleKeyboardShortcuts'
				| 'nodeOutputTransformationCallback'
				| 'nodeInputTransformationCallback'
				| 'getContextMenuItemsCallback'
				| 'isVirtualScrollEnabled'
				| 'virtualScrollItemHeight'
				| 'virtualScrollOverscan'
				| 'virtualScrollContainerHeight'
				| 'dragDropMode'
				| 'dropZoneMode'
				| 'isEmptyDropPlaceholderShown'
				| 'isTreeDropZoneEnabled'
				| 'labels'
				| 'bodyClass'
				| 'iconSet'
				| 'expandIconClass'
				| 'collapseIconClass'
				| 'leafIconClass'
				| 'toggleIconMode'
				| 'nodeTitleOverflow'
				| 'isNodeTooltipsShown'
				| 'getNodeTooltipCallback'
				| 'tooltipPlacement'
				| 'tooltipDelay'
				| 'tooltipOffset'
				| 'shouldTooltipFollowCursor'
				| 'iconMember'
				| 'getIconCallback'
				| 'iconColorMember'
				| 'getIconColorCallback'
				| 'shouldAlignNodeIcons'
				| 'selectedNodeClass'
				| 'getNodeClassCallback'
				| 'getNodeContentClassCallback'
				| 'focusedNodeClass'
				| 'checkedNodeClass'
				| 'dragOverNodeClass'
				| 'draggedNodeClass'
				| 'scrollHighlightTimeout'
				| 'scrollHighlightClass'
				| 'contextMenuXOffset'
				| 'contextMenuYOffset'
				| 'touchDragDelay'
				| 'shouldIndicateUndraggable'
				| 'shouldExpandAsAccordion'
			>
		>
	) {
		// Update local props (triggers $effect syncs to controller)
		if (updates.treeId !== undefined) treeId = updates.treeId;
		if (updates.treePathSeparator !== undefined) treePathSeparator = updates.treePathSeparator;
		if (updates.idMember !== undefined) idMember = updates.idMember;
		if (updates.pathMember !== undefined) pathMember = updates.pathMember;
		if (updates.parentPathMember !== undefined) parentPathMember = updates.parentPathMember;
		if (updates.levelMember !== undefined) levelMember = updates.levelMember;
		if (updates.hasChildrenMember !== undefined) hasChildrenMember = updates.hasChildrenMember;
		if (updates.isExpandedMember !== undefined) isExpandedMember = updates.isExpandedMember;
		if (updates.getIsExpandedCallback !== undefined)
			getIsExpandedCallback = updates.getIsExpandedCallback;
		if (updates.isSelectableMember !== undefined) isSelectableMember = updates.isSelectableMember;
		if (updates.getIsSelectableCallback !== undefined)
			getIsSelectableCallback = updates.getIsSelectableCallback;
		if (updates.isCheckedMember !== undefined) isCheckedMember = updates.isCheckedMember;
		if (updates.getIsCheckedCallback !== undefined)
			getIsCheckedCallback = updates.getIsCheckedCallback;
		if (updates.isDraggableMember !== undefined) isDraggableMember = updates.isDraggableMember;
		if (updates.getIsDraggableCallback !== undefined)
			getIsDraggableCallback = updates.getIsDraggableCallback;
		if (updates.isDropAllowedMember !== undefined)
			isDropAllowedMember = updates.isDropAllowedMember;
		if (updates.getIsDropAllowedCallback !== undefined)
			getIsDropAllowedCallback = updates.getIsDropAllowedCallback;
		if (updates.displayValueMember !== undefined) displayValueMember = updates.displayValueMember;
		if (updates.getDisplayValueCallback !== undefined)
			getDisplayValueCallback = updates.getDisplayValueCallback;
		if (updates.searchValueMember !== undefined) searchValueMember = updates.searchValueMember;
		if (updates.getSearchValueCallback !== undefined)
			getSearchValueCallback = updates.getSearchValueCallback;
		if (updates.isCollapsibleMember !== undefined)
			isCollapsibleMember = updates.isCollapsibleMember;
		if (updates.getIsCollapsibleCallback !== undefined)
			getIsCollapsibleCallback = updates.getIsCollapsibleCallback;
		if (updates.orderMember !== undefined) orderMember = updates.orderMember;
		if (updates.isSorted !== undefined) isSorted = updates.isSorted;
		if (updates.sortCallback !== undefined) sortCallback = updates.sortCallback;
		if (updates.data !== undefined) data = updates.data;
		if (updates.focusedNode !== undefined) focusedNode = updates.focusedNode;
		if (updates.selectedPaths !== undefined) selectedPaths = updates.selectedPaths;
		if (updates.checkedPaths !== undefined) checkedPaths = updates.checkedPaths;
		if (updates.expandLevel !== undefined) expandLevel = updates.expandLevel;
		if (updates.clickBehavior !== undefined) clickBehavior = updates.clickBehavior;
		if (updates.selectionMode !== undefined) selectionMode = updates.selectionMode;
		if (updates.isCheckboxesShown !== undefined)
			isCheckboxesShown = updates.isCheckboxesShown;
		if (updates.checkboxMode !== undefined) checkboxMode = updates.checkboxMode;
		if (updates.cascadeCheckPolicy !== undefined)
			cascadeCheckPolicy = updates.cascadeCheckPolicy;
		if (updates.shouldClickToggleCheckbox !== undefined)
			shouldClickToggleCheckbox = updates.shouldClickToggleCheckbox;
		if (updates.beforeCheckboxToggleCallback !== undefined)
			beforeCheckboxToggleCallback = updates.beforeCheckboxToggleCallback;
		if (updates.rangeSelectionMode !== undefined) rangeSelectionMode = updates.rangeSelectionMode;
		if (updates.shouldUseInternalSearchIndex !== undefined)
			shouldUseInternalSearchIndex = updates.shouldUseInternalSearchIndex;
		if (updates.initializeIndexCallback !== undefined)
			initializeIndexCallback = updates.initializeIndexCallback;
		if (updates.searchTerm !== undefined) searchTerm = updates.searchTerm;
		if (updates.indexerBatchSize !== undefined) indexerBatchSize = updates.indexerBatchSize;
		if (updates.indexerTimeout !== undefined) indexerTimeout = updates.indexerTimeout;
		if (updates.onNodeClick !== undefined) onNodeClick = updates.onNodeClick;
		if (updates.onNodeDoubleClick !== undefined) onNodeDoubleClick = updates.onNodeDoubleClick;
		if (updates.onSelectionChange !== undefined) onSelectionChange = updates.onSelectionChange;
		if (updates.onCheckedChange !== undefined) onCheckedChange = updates.onCheckedChange;
		if (updates.onNodeDragStart !== undefined) onNodeDragStart = updates.onNodeDragStart;
		if (updates.onNodeDragOver !== undefined) onNodeDragOver = updates.onNodeDragOver;
		if (updates.onNodeDrop !== undefined) onNodeDrop = updates.onNodeDrop;
		if (updates.onNodeDragReject !== undefined) onNodeDragReject = updates.onNodeDragReject;
		if (updates.onNodeDropReject !== undefined) onNodeDropReject = updates.onNodeDropReject;
		if (updates.onNodeCopy !== undefined) onNodeCopy = updates.onNodeCopy;
		if (updates.onNodeCut !== undefined) onNodeCut = updates.onNodeCut;
		if (updates.onNodePaste !== undefined) onNodePaste = updates.onNodePaste;
		if (updates.onNodeDelete !== undefined) onNodeDelete = updates.onNodeDelete;
		if (updates.onContainerResize !== undefined) onContainerResize = updates.onContainerResize;
		if (updates.beforeDragStartCallback !== undefined)
			beforeDragStartCallback = updates.beforeDragStartCallback;
		if (updates.beforeDropCallback !== undefined) beforeDropCallback = updates.beforeDropCallback;
		if (updates.beforeCopyCallback !== undefined) beforeCopyCallback = updates.beforeCopyCallback;
		if (updates.beforeCutCallback !== undefined) beforeCutCallback = updates.beforeCutCallback;
		if (updates.beforePasteCallback !== undefined)
			beforePasteCallback = updates.beforePasteCallback;
		if (updates.beforeDeleteCallback !== undefined)
			beforeDeleteCallback = updates.beforeDeleteCallback;
		if (updates.shouldHandleKeyboardShortcuts !== undefined)
			shouldHandleKeyboardShortcuts = updates.shouldHandleKeyboardShortcuts;
		if (updates.nodeOutputTransformationCallback !== undefined)
			nodeOutputTransformationCallback = updates.nodeOutputTransformationCallback;
		if (updates.nodeInputTransformationCallback !== undefined)
			nodeInputTransformationCallback = updates.nodeInputTransformationCallback;
		if (updates.getContextMenuItemsCallback !== undefined)
			getContextMenuItemsCallback = updates.getContextMenuItemsCallback;
		if (updates.isVirtualScrollEnabled !== undefined)
			isVirtualScrollEnabled = updates.isVirtualScrollEnabled;
		if (updates.virtualScrollItemHeight !== undefined) virtualScrollItemHeight = updates.virtualScrollItemHeight;
		if (updates.virtualScrollOverscan !== undefined) virtualScrollOverscan = updates.virtualScrollOverscan;
		if (updates.virtualScrollContainerHeight !== undefined)
			virtualScrollContainerHeight = updates.virtualScrollContainerHeight;
		if (updates.dragDropMode !== undefined) dragDropMode = updates.dragDropMode;
		if (updates.dropZoneMode !== undefined) dropZoneMode = updates.dropZoneMode;
		if (updates.isEmptyDropPlaceholderShown !== undefined)
			isEmptyDropPlaceholderShown = updates.isEmptyDropPlaceholderShown;
		if (updates.isTreeDropZoneEnabled !== undefined)
			isTreeDropZoneEnabled = updates.isTreeDropZoneEnabled;
		if (updates.labels !== undefined) labels = updates.labels;
		if (updates.bodyClass !== undefined) bodyClass = updates.bodyClass;
		if (updates.iconSet !== undefined) iconSet = updates.iconSet;
		if (updates.expandIconClass !== undefined) expandIconClass = updates.expandIconClass;
		if (updates.collapseIconClass !== undefined) collapseIconClass = updates.collapseIconClass;
		if (updates.leafIconClass !== undefined) leafIconClass = updates.leafIconClass;
		if (updates.toggleIconMode !== undefined) toggleIconMode = updates.toggleIconMode;
		if (updates.nodeTitleOverflow !== undefined) nodeTitleOverflow = updates.nodeTitleOverflow;
		if (updates.isNodeTooltipsShown !== undefined)
			isNodeTooltipsShown = updates.isNodeTooltipsShown;
		if (updates.getNodeTooltipCallback !== undefined)
			getNodeTooltipCallback = updates.getNodeTooltipCallback;
		if (updates.tooltipPlacement !== undefined) tooltipPlacement = updates.tooltipPlacement;
		if (updates.tooltipDelay !== undefined) tooltipDelay = updates.tooltipDelay;
		if (updates.tooltipOffset !== undefined) tooltipOffset = updates.tooltipOffset;
		if (updates.shouldTooltipFollowCursor !== undefined)
			shouldTooltipFollowCursor = updates.shouldTooltipFollowCursor;
		if (updates.iconMember !== undefined) iconMember = updates.iconMember;
		if (updates.getIconCallback !== undefined) getIconCallback = updates.getIconCallback;
		if (updates.iconColorMember !== undefined) iconColorMember = updates.iconColorMember;
		if (updates.getIconColorCallback !== undefined)
			getIconColorCallback = updates.getIconColorCallback;
		if (updates.shouldAlignNodeIcons !== undefined)
			shouldAlignNodeIcons = updates.shouldAlignNodeIcons;
		if (updates.selectedNodeClass !== undefined)
			selectedNodeClass = updates.selectedNodeClass;
		if (updates.getNodeClassCallback !== undefined) getNodeClassCallback = updates.getNodeClassCallback;
		if (updates.getNodeContentClassCallback !== undefined) getNodeContentClassCallback = updates.getNodeContentClassCallback;
		if (updates.focusedNodeClass !== undefined) focusedNodeClass = updates.focusedNodeClass;
		if (updates.checkedNodeClass !== undefined) checkedNodeClass = updates.checkedNodeClass;
		if (updates.dragOverNodeClass !== undefined) dragOverNodeClass = updates.dragOverNodeClass;
		if (updates.draggedNodeClass !== undefined) draggedNodeClass = updates.draggedNodeClass;
		if (updates.scrollHighlightTimeout !== undefined)
			scrollHighlightTimeout = updates.scrollHighlightTimeout;
		if (updates.scrollHighlightClass !== undefined)
			scrollHighlightClass = updates.scrollHighlightClass;
		if (updates.contextMenuXOffset !== undefined) contextMenuXOffset = updates.contextMenuXOffset;
		if (updates.contextMenuYOffset !== undefined) contextMenuYOffset = updates.contextMenuYOffset;
		if (updates.touchDragDelay !== undefined) touchDragDelay = updates.touchDragDelay;
		if (updates.shouldIndicateUndraggable !== undefined)
			shouldIndicateUndraggable = updates.shouldIndicateUndraggable;
		if (updates.shouldExpandAsAccordion !== undefined) shouldExpandAsAccordion = updates.shouldExpandAsAccordion;
	}

	// ── Arrow key navigation ─────────────────────────────────────────────
	function handleTreeKeydown(event: KeyboardEvent) {
		// Ignore modifier-only key presses (Ctrl, Shift, Alt, Meta)
		if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

		// Don't interfere with context menu keyboard handling
		if (controller.contextMenuVisible) return;

		// Call custom handler first — return true to suppress default handling. Resolve the
		// focus + selection sets up front so the consumer gets nodes, not raw paths.
		if (beforeKeydownCallback) {
			const selectedNodes = [...controller.selectedPaths]
				.map((p) => controller.getNodeByPath(p))
				.filter((n): n is LTreeNode<T> => n !== null);
			const result: unknown = beforeKeydownCallback({
				event,
				focusedNode: controller.focusedNode ?? null,
				selectedNodes,
				controller
			});
			if (result instanceof Promise) {
				uiLogger.warn('beforeKeydownCallback is synchronous — a returned Promise is ignored');
			} else if (result === false) {
				event.preventDefault();
				return;
			}
		}

		// Built-in opt-in shortcuts (copy/cut/paste/delete/esc). Runs AFTER the consumer
		// hook (so it can override) but BEFORE the empty-tree return (so paste works into
		// an empty tree). No-op unless shouldHandleKeyboardShortcuts is set.
		if (controller.handleShortcutKeydown(event)) {
			event.preventDefault();
			return;
		}

		if (controller.allFlatNodes.length === 0) return;

		let handled = true;

		// Shift+nav extends the selection range. In single mode the controller
		// short-circuits these to no-ops (see _navSelectTo).
		switch (event.key) {
			case 'ArrowDown':
				event.shiftKey ? controller.navSelectNext() : controller.navNextSibling();
				break;
			case 'ArrowUp':
				event.shiftKey ? controller.navSelectPrev() : controller.navPrevSibling();
				break;
			case 'ArrowRight':
				controller.navInto();
				break;
			case 'ArrowLeft':
				controller.navOut();
				break;
			case 'Backspace':
				controller.navBackOut();
				break;
			case 'Home':
				event.shiftKey ? controller.navSelectFirst() : controller.navFirst();
				break;
			case 'End':
				event.shiftKey ? controller.navSelectLast() : controller.navLast();
				break;
			case 'PageDown':
				event.shiftKey ? controller.navSelectPageDown() : controller.navPageDown();
				break;
			case 'PageUp':
				event.shiftKey ? controller.navSelectPageUp() : controller.navPageUp();
				break;
			case 'Enter':
				// single: no-op (per spec); multi: toggle selection on focused node.
				if (controller.selectionMode === 'multiple') controller.toggleFocusedSelect();
				else handled = false;
				break;
			case ' ':
				// With checkboxes: toggle the focused node's checkbox.
				// Without: keep the legacy expand/collapse behaviour as a useful fallback.
				if (controller.isCheckboxesShown && controller.focusedNode?.isSelectable) {
					controller.nodeCallbacks.onCheckboxToggle(controller.focusedNode);
				} else {
					controller.navToggle();
				}
				break;
			case 'Escape':
				// Priority: pending cut → selection set → leave alone for surrounding UI.
				// File Explorer / Finder convention. Context-menu Escape is handled by
				// the separate window-level listener above and never reaches this path.
				if (controller.hasClipboardContent() && controller.getClipboardOperation() === 'cut') {
					controller.cancelCut();
				} else if (controller.selectedPaths.size > 0) {
					controller.clearSelection();
				} else {
					handled = false;
				}
				break;
			default:
				handled = false;
		}

		if (handled) event.preventDefault();
	}

	// ── Context menu keyboard shortcut handling ──────────────────────────
	function parseShortcut(shortcut: string): {
		key: string;
		ctrl: boolean;
		shift: boolean;
		alt: boolean;
	} {
		const parts = shortcut.split('+').map((p) => p.trim());
		const key = parts.pop()!; // last part is the key
		return {
			key: key.toLowerCase(),
			ctrl: parts.some((p) => p.toLowerCase() === 'ctrl'),
			shift: parts.some((p) => p.toLowerCase() === 'shift'),
			alt: parts.some((p) => p.toLowerCase() === 'alt')
		};
	}

	function findEntryByShortcut(
		entries: ContextMenuEntry[],
		event: KeyboardEvent
	): import('../ltree/types.js').ContextMenuItem | null {
		for (const entry of entries) {
			if ('divider' in entry) continue;
			if (entry.isVisible === false || entry.isDisabled) continue;
			if (entry.shortcut) {
				const parsed = parseShortcut(entry.shortcut);
				const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
				if (
					eventKey === parsed.key &&
					event.ctrlKey === parsed.ctrl &&
					event.shiftKey === parsed.shift &&
					event.altKey === parsed.alt
				) {
					return entry;
				}
			}
			// Search children (submenus) too
			if (entry.children) {
				const found = findEntryByShortcut(entry.children, event);
				if (found) return found;
			}
		}
		return null;
	}

	/** The ctx handed to getContextMenuItemsCallback and every item's onClick. */
	function contextMenuContext(node: LTreeNode<T>): ContextMenuContext<T> {
		return {
			node,
			selectedNodes: controller.getSelectedNodes(),
			checkedNodes: controller.getCheckedNodes(),
			closeMenu: controller.closeContextMenu.bind(controller)
		};
	}

	async function handleContextMenuKeydown(event: KeyboardEvent) {
		if (
			!controller.contextMenuVisible ||
			!controller.contextMenuNode ||
			!getContextMenuItemsCallback
		)
			return;

		if (event.key === 'Escape') {
			controller.closeContextMenu();
			return;
		}

		const menuCtx = contextMenuContext(controller.contextMenuNode);
		const entries = getContextMenuItemsCallback(menuCtx);
		const match = findEntryByShortcut(entries, event);
		if (match) {
			event.preventDefault();
			try {
				await match.onClick?.(menuCtx);
			} catch (error) {
				console.error('Context menu shortcut error:', error);
			}
		}
	}
</script>

<svelte:window onkeydown={handleContextMenuKeydown} />

<!-- Empty-tree drop zone. Shared by all render modes (virtual / flat / recursive)
     and the no-container fallback. Shows the drop placeholder mid-drag, or
     permanently when isEmptyDropPlaceholderShown is set; focus-on-hover
     then arms this tree for a keyboard paste. -->
{#snippet emptyDropState()}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="stv__empty-state"
		class:stv__drop-placeholder={showEmptyDropPlaceholder}
		class:stv__drop-placeholder--active={controller.isDropPlaceholderActive}
		onmouseenter={focusEmptyDropZone}
		onpointerdown={focusEmptyDropZone}
	>
		{#if showEmptyDropPlaceholder}
			{#if dropPlaceholder}
				{@render dropPlaceholder()}
			{:else}
				{@const dropHereText = controller.getLabel('dropHere')}
				{#if dropHereText}<div class="stv__drop-placeholder-content">{dropHereText}</div>{/if}
			{/if}
		{:else if noData}
			{@render noData()}
		{:else}
			<!-- No nodes at all → noData; nodes exist but the search filter hid them all → noResults -->
			{@const emptyText = controller.getLabel(controller.hasNodes ? 'noResults' : 'noData')}
			{#if emptyText}<div class="stv__empty-state-content">{emptyText}</div>{/if}
		{/if}
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="stv__container"
	class:stv__tree-drop-zone--active={isTreeDropZoneEnabled && controller.isDropPlaceholderActive}
	tabindex="0"
	data-theme={theme}
	data-node-title-overflow={nodeTitleOverflow}
	data-icon-set={iconSet}
	data-toggle-icon-mode={toggleIconMode}
	data-tree-id={controller.treeId}
	bind:this={treeContainerRef}
	onkeydown={handleTreeKeydown}
>
	{@render treeHeader?.()}

	{#if controller.isLoading}
		{@const loadingText = controller.getLabel('loading')}
		<div class="stv__loading-overlay" role="status" aria-label={loadingText || undefined}>
			{#if loadingPlaceholder}
				{@render loadingPlaceholder()}
			{:else}
				<div class="stv__loading-spinner"></div>
			{/if}
		</div>
	{/if}

	<div class={controller.bodyClass}>
		{#if controller.tree?.root}
			{#if controller.vsActive}
				<!-- Virtual scrolling mode -->
				<div
					class="stv__tree stv__tree--flat stv__virtual-scroll"
					style="height: {controller.vsContainerStyle}; overflow-y: auto;"
					bind:this={controller.vsContainerRef}
					onscroll={controller.handleVirtualScroll}
				>
					<!-- Spacer for correct scrollbar -->
					<div style="height: {controller.vsTotalHeight}px; position: relative;">
						<!-- Rendered window at correct offset -->
						<div style="transform: translateY({controller.vsOffsetY}px);">
							{#each controller.flatNodesToRender as node (node.id + '|' + node.path + '|' + node.hasChildren + '|' + node._rev)}
								<Node
									{node}
									children={nodeTemplate}
									isProgressiveRenderEnabled={false}
									isDragInProgress={controller.isDragInProgress}
									hoveredNodeForDropPath={controller.hoveredNodeForDrop?.path}
									activeDropPosition={controller.activeDropPosition}
									dropOperation={controller.currentDropOperation}
									flatMode={true}
									flatGap={false}
								/>
							{:else}
								{@render emptyDropState()}
							{/each}
						</div>
					</div>
				</div>
			{:else if controller.isFlatRenderingEnabled}
				<!-- Flat rendering mode: no {#key} block, uses visibleFlatNodes for efficient updates -->
				<div class="stv__tree stv__tree--flat">
					{#each controller.flatNodesToRender as node, i (node.id + '|' + node.path + '|' + node.hasChildren + '|' + node._rev)}
						{@const prevNode = i > 0 ? controller.flatNodesToRender[i - 1] : null}
						<Node
							{node}
							children={nodeTemplate}
							isProgressiveRenderEnabled={false}
							isDragInProgress={controller.isDragInProgress}
							hoveredNodeForDropPath={controller.hoveredNodeForDrop?.path}
							activeDropPosition={controller.activeDropPosition}
							dropOperation={controller.currentDropOperation}
							flatMode={true}
							flatGap={prevNode != null && (node.level ?? 0) > (prevNode.level ?? 0)}
						/>
					{:else}
						{@render emptyDropState()}
					{/each}
				</div>
			{:else}
				<!-- Recursive rendering mode: uses {#key} block for forced re-renders -->
				{#key controller.tree.changeTracker}
					<div class="stv__tree">
						{#each controller.tree.tree as node (node.id)}
							<Node
								{node}
								children={nodeTemplate}
								isProgressiveRenderEnabled={controller.isProgressiveRenderEnabled}
								renderBatchSize={controller.initialBatchSize}
								isDragInProgress={controller.isDragInProgress}
								hoveredNodeForDropPath={controller.hoveredNodeForDrop?.path}
								activeDropPosition={controller.activeDropPosition}
								dropOperation={controller.currentDropOperation}
							/>
						{:else}
							{@render emptyDropState()}
						{/each}
					</div>
				{/key}
			{/if}
		{:else}
			<!-- Empty tree drop zone -->
			{@render emptyDropState()}
		{/if}
	</div>

	{@render treeFooter?.()}

	<!-- Floating Drop Zones (position:fixed overlay, escapes overflow:hidden) -->
	{#if controller.dropZoneMode === 'floating' && controller.isDragInProgress && controller.hoveredNodeForDrop && controller.floatingZoneRect}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="stv__drop-zones stv__drop-zones--{controller.dropZoneLayout}"
			style="position: fixed; top: {controller.floatingZoneRect.top}px; left: {controller
				.floatingZoneRect.left}px; width: {controller.floatingZoneRect.width}px; height: {controller
				.floatingZoneRect
				.height}px; z-index: 10000; --drop-zone-start: {formattedDropZoneStart}; --drop-zone-max-width: {controller.dropZoneMaxWidth}px;"
		>
			{#if controller.isFloatingPositionAllowed('before')}
				<div
					class="stv__drop-zone stv__drop-zone--before"
					class:stv__drop-zone--active={controller.floatingHoveredZone === 'before'}
				>
					↑ Before
				</div>
			{/if}
			{#if controller.isFloatingPositionAllowed('after')}
				<div
					class="stv__drop-zone stv__drop-zone--after"
					class:stv__drop-zone--active={controller.floatingHoveredZone === 'after'}
				>
					↓ After
				</div>
			{/if}
			{#if controller.isFloatingPositionAllowed('child')}
				<div
					class="stv__drop-zone stv__drop-zone--child"
					class:stv__drop-zone--active={controller.floatingHoveredZone === 'child'}
				>
					→ Child
				</div>
			{/if}
		</div>
	{/if}

	<!-- Context Menu -->
	{#if controller.contextMenuVisible && controller.contextMenuNode}
		<div bind:this={contextMenuEl} class="stv__context-menu" role="menu">
			{#if getContextMenuItemsCallback}
				{@const menuCtx = contextMenuContext(controller.contextMenuNode)}
				{@const menuEntries = getContextMenuItemsCallback(menuCtx)}
				<ContextMenuLevel
					entries={menuEntries}
					{menuCtx}
					closeContextMenu={controller.closeContextMenu.bind(controller)}
				/>
			{:else if contextMenu}
				{@render contextMenu(
					controller.contextMenuNode,
					controller.closeContextMenu.bind(controller)
				)}
			{/if}
		</div>
	{/if}
</div>
