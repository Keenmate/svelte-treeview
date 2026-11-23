<script lang="ts" generics="T">
	import type { Index, SearchOptions } from 'flexsearch';
	import Node from './Node.svelte';
	import { openMenu } from '../vendor/core/menu/open-menu.js';
	import type { MenuDrawerSide, MenuHandle, MenuPresentation } from '../vendor/core/menu/types.js';
	import { matchesShortcut, isTypingTarget } from '../vendor/actions/shortcut.js';
	import { type LTreeNode } from '../ltree/ltree-node.svelte.js';
	import {
		type Ltree,
		type InsertArrayResult,
		type InsertBranchResult,
		type RemoveBranchResult,
		type ReplaceBranchResult,
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
		type NodesReorderContext,
		type TreeChange,
		type ApplyChangesResult
	} from '../ltree/types.js';
	import { setContext, onDestroy, untrack, type Snippet } from 'svelte';
	import type { RenderStats } from '../ltree/types.js';
	import { TreeController, type TreeControllerProps } from '../core/TreeController.svelte.js';
	import { TREE_OPTION_KEYS } from '../core/tree-props.js';
	import type { TranslateCallback, TreeLabelsInput } from '../core/labels.js';
	import type {
		NodeEventContext,
		NodeDragContext,
		NodeDropContext,
		ClipboardEventContext,
		SelectionChangeContext,
		ExpandedChangeContext,
		BeforeExpandContext,
		FocusChangeContext,
		TreeChangeContext,
		BeforeCheckboxToggleContext,
		NodeTransformCallbackContext,
		NodeTransformCallback,
		KeydownContext,
		NodeRef,
		PasteResult,
		TreeCallbackContext,
		TreeRenderIconCallback,
		ScrollToPathOptions
	} from '../core/TreeController.svelte.js';
	import { uiLogger } from '../logger.js';
	import { getPageLoaderCallback, pageLoader } from '../core/loader.js';
	import { createTreeController } from '../core/createTreeController.js';
	import type { TreeNavigationOverrides } from '../core/navigation.js';
	import type { TreeMenuContext, TreeMenuEntry, TreeAction, TreeActionEventDetail } from '../core/menu.js';
	import { containerSize as trackContainerSize, environmentState } from '../core/responsive.svelte.js';
	import { classifyDevice, getEnvironment } from '../vendor/core/environment/environment.js';
	import type { ElementSize } from '../vendor/core/environment/element-size.js';
	import type { DeviceClass } from '../vendor/core/environment/environment.js';
	import { observeThemeContext, type ColorScheme, type ThemeSource } from '../vendor/core/environment/theme.js';
	import { adoptMotionStyles, isMotion, publishMotionHook, type Motion } from '../vendor/core/environment/motion.js';

	// NodeCallbacks and NodeConfig are now defined in ../core/TreeController.svelte.ts
	// and re-exported from index.ts for public consumption.

	interface Props {
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

		searchValueMember?: string | null | undefined;
		getSearchValueCallback?: (ctx: NodeContext<T> & TreeCallbackContext<T>) => string;

		// For sibling ordering in drag-drop (before/after positioning)
		orderMember?: string | null | undefined;

		treeId?: string | null | undefined;
		treePathSeparator?: string | null | undefined;
		sortCallback?: (ctx: SortContext<T> & TreeCallbackContext<T>) => LTreeNode<T>[];

		// DATA
		/** The tree's nodes (flat `T[]` with ltree paths). Input AND current state: after a
		 *  mutation (move / add / remove / paste / applyChanges…) `bind:nodes` receives the
		 *  tree's current data. */
		nodes: T[];
		focusedNode?: LTreeNode<T> | null | undefined;
		selectedPaths?: Set<string>;
		checkedPaths?: Set<string>;
		/** Paths of the expanded nodes (bindable). Assigning replaces the expanded state
		 *  (silently — no onExpandedChange); given before the data, it applies after the
		 *  first non-empty load (overriding expandLevel / isExpandedMember). */
		expandedPaths?: Set<string>;
		insertResult?: InsertArrayResult<T> | null | undefined;

		// SLOTS
		/** Custom row content. Receives (node, ctx) — ctx is the NodeRenderContext
		 *  (device + container + live node state) so the template can adapt to device. */
		nodeTemplate?: Snippet<[LTreeNode<T>, NodeRenderContext]>;
		/** Rich tooltip content for a node's row. Receives (node, ctx); wins over
		 *  getNodeTooltipCallback when both are given. Shown only if isNodeTooltipsShown. */
		tooltip?: Snippet<[LTreeNode<T>, NodeRenderContext]>;
		/** Custom icon render for a node. Receives (node, value, ctx) where value is the resolved
		 *  icon from iconMember/getIconCallback. Wins over core renderIcon and every icon hook. */
		icon?: Snippet<[LTreeNode<T>, string | null | undefined, NodeRenderContext]>;
		/** Above the tree. */
		treeHeader?: Snippet;
		/** Unused by the default renderer (reserved). */
		treeBody?: Snippet;
		/** Below the tree. */
		treeFooter?: Snippet;
		/** Empty state (no nodes / no search results). */
		noData?: Snippet;
		/** Custom context menu: `(node, close)` — an alternative to `getContextMenuItemsCallback`. */
		contextMenu?: Snippet<[LTreeNode<T>, () => void]>;
		/** The empty-tree drop zone's content. */
		dropPlaceholder?: Snippet;
		/** Shown while `isLoading` (inside the `role="status"` overlay). Beats the page-wide
		 *  `window.components.renderLoadingCallback`; neither: the default `.stv__loader`
		 *  (`--stv-loader-*` tokens → `--base-loader-*`). */
		loadingPlaceholder?: Snippet;

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
		 *  `menuItems.copy` … `menuItems.sortAll` (built-in context-menu items). `{name}` placeholders.
		 *  The `noData` / `dropPlaceholder` snippets still replace the markup. */
		labels?: TreeLabelsInput;
		/** This tree's own translation seam (i18next / ICU / the app's lookup): gets
		 *  `{ component, key (full), template, params, locale }` for every key `labels` did NOT set and
		 *  returns the finished text, or `null` / `undefined` = not mine → the page-wide
		 *  `window.components.locale.translateCallback` → the page dictionary → English. */
		translateCallback?: TranslateCallback | null;

		// BEHAVIOUR
		expandLevel?: number | null | undefined;
		clickBehavior?: ClickBehavior | null | undefined;
		/**
		 * `'single'` (default): plain click selects one node; Ctrl/Shift+click
		 * degrade to plain click; Shift+Arrow is a no-op.
		 * `'multiple'`: Ctrl-toggle, Shift-range, Shift+Arrow extend, Space toggles
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
		/** Which descendants of a filter match stay visible. See {@link FilterScope}. */
		filterScope?: FilterScope | null | undefined;
		/** The `x` for the depth-limited filterScopes (default 1). */
		filterDescendantDepth?: number | null | undefined;
		/** Expand the descendants a filterScope adds (default true). */
		shouldExpandFilterDescendants?: boolean | null | undefined;
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
		/** Rows an expand reveals animate in (part of `motion` — `motion="none"`, reduced motion or
		 *  `--stv-row-animation-duration: 0s` make it instant). At most this many rows animate per
		 *  expand; the rest appear at once. Default 50; 0 = none. */
		rowAnimationLimit?: number;
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
		/** Max matches a search/filter returns (default 1000). FlexSearch's own silent
		 *  default was 100; check `isLimited` in onSearchStatusChange to surface truncation. */
		searchResultLimit?: number | null | undefined;


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
		/** Built-in keyboard shortcuts (default true; false = opt out): Ctrl/Cmd+C/X/V (copy/cut/paste),
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
		/** A node expanded (toggle, keyboard, `expandNodes`, after any `beforeExpandCallback`
		 *  load; NOT `expandAll` / expand-level seeding). Skipped with `isSilent`. */
		onNodeExpand?: (ctx: NodeEventContext<T>) => void;
		/** A node collapsed (toggle, keyboard, `collapseNodes`, an accordion sibling; NOT
		 *  `collapseAll`). Skipped with `isSilent`. */
		onNodeCollapse?: (ctx: NodeEventContext<T>) => void;
		/** The expanded set changed (any cause) — `paths` = the whole new set (same as
		 *  `expandedPaths`). Not fired for `isSilent` operations nor for assigning `expandedPaths`. */
		onExpandedChange?: (ctx: ExpandedChangeContext<T>) => void;
		/** Runs before a node expands (toggle, keyboard, `expandNodes` — not `expandAll` /
		 *  seeding / accordion): `false` keeps it collapsed; a Promise defers the expand and
		 *  shows the node's loading state (lazy loading). A throw / rejection keeps it collapsed. */
		beforeExpandCallback?: (ctx: BeforeExpandContext<T>) => boolean | void | Promise<boolean | void>;
		/** The focused node changed (click, keyboard, `focusNode` / `clearFocus`). `ctx =
		 *  { focusedNode, controller }`. Not for `isSilent` nor for assigning `focusedNode`. */
		onFocusChange?: (ctx: FocusChangeContext<T>) => void;
		/** The tree's data / structure changed through a mutation (add / insert / move / remove /
		 *  update / applyChanges / paste / drop / sort) — once per batch. Not for loading `nodes`. */
		onTreeChange?: (ctx: TreeChangeContext<T>) => void;
		/** `sortNodes` / `sortAll` rewrote one parent's `orderMember` values (custom compare /
		 *  `direction: 'desc'`) — persist `changes`. Skipped with `isSilent`. */
		onNodesReorder?: (ctx: NodesReorderContext<T> & TreeCallbackContext<T>) => void;
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
		// vendor/core/environment; see core/responsive.svelte.ts.
		/** Fire-and-forget: the tree's own border-box changed (immediate on mount, then on
		 *  resize, throttled ~30ms). `deviceClass` is the capability+size class of the WINDOW
		 *  (`classifyDevice`), handy alongside the box for AB10-style adaptation. */
		onContainerResize?: (ctx: { size: ElementSize; deviceClass: DeviceClass } & TreeCallbackContext<T>) => void;
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
			ctx: import('../core/TreeController.svelte.js').BeforeDropContext<T>
		) =>
			| boolean
			| { position?: DropPosition; operation?: DropOperation }
			| import('../core/TreeController.svelte.js').DropGroup[]
			| void
			| Promise<
					| boolean
					| { position?: DropPosition; operation?: DropOperation }
					| import('../core/TreeController.svelte.js').DropGroup[]
					| void
			  >;
		/** Set-level pre-drag interceptor. Return a `string[]` of top-level paths to REPLACE the
		 *  dragged set (prune and/or force-add nodes that can't be omitted), `false` to cancel the
		 *  drag, or `void` to keep the default. Synchronous. See DragStartContext. */
		beforeDragStartCallback?: (
			ctx: import('../core/TreeController.svelte.js').DragStartContext<T>
		) => string[] | false | void;
		beforeCopyCallback?: (
			ctx: import('../core/TreeController.svelte.js').BeforeCopyContext<T>
		) => string[] | false | void;
		beforeCutCallback?: (
			ctx: import('../core/TreeController.svelte.js').BeforeCopyContext<T>
		) => string[] | false | void;
		beforePasteCallback?: (
			ctx: import('../core/TreeController.svelte.js').BeforePasteContext<T>
		) => { targetPath?: string; position?: 'child' | 'before' | 'after' } | false | void;
		/** Runs before the built-in Delete removes anything. Return a narrowed path[] to restrict, or false to block. */
		beforeDeleteCallback?: (
			ctx: import('../core/TreeController.svelte.js').BeforeDeleteContext<T>
		) => string[] | false | void;
		/** OUTPUT transform (egress) — per node as it LEAVES the source: Ctrl+C/X, or the capture
		 *  side of a copy-drop. Strip transient/sensitive fields. Fires for copy, never a move. */
		nodeOutputTransformationCallback?: (ctx: NodeTransformCallbackContext<T>) => T;
		/** INPUT transform (ingress) — per node as a DUPLICATE LANDS in a destination: Ctrl+V
		 *  paste, or the insert side of a copy-drop (same- or cross-tree). Return new data
		 *  (fresh ids/names) or null to skip the node. Fires for copy, never a move. */
		nodeInputTransformationCallback?: NodeTransformCallback<T>;

		// DATA PROVIDERS (get*Callback = returns data the system uses)
		/** The context menu's entries for the node it opened on: action items (`{ id, text, icon,
		 *  isDisabled, isDanger, isToggled, isVisible, children, onClick(detail) }`), `createMenuDivider()`s
		 *  and built-in action names (`'copy'`, `'cut'`, `'paste'`, `'delete'`, `'expand'`,
		 *  `'collapse'`, `'expand-subtree'`, `'collapse-subtree'`, `'expand-all'`,
		 *  `'collapse-all'`, `'sort'`, `'sort-subtree'`, `'sort-all'`). `ctx = { node, path, parent,
		 *  siblings, controller }`. No menu when unset. */
		getContextMenuItemsCallback?: (ctx: TreeMenuContext<T>) => TreeMenuEntry<T>[];
		/** Runs before a menu item activates — `false` cancels (no `onClick`, built-in or
		 *  `onAction`); async OK. */
		beforeActionCallback?: (detail: TreeActionEventDetail<T>) => boolean | void | Promise<boolean | void>;
		/** A menu item ran (after its `onClick` and the built-in). */
		onAction?: (detail: TreeActionEventDetail<T>) => void;

		// VISUALS
		/** Per-instance theme override. Forwarded to the root `.stv__container`
		 *  as `data-theme="dark"|"light"`, which the stylesheet uses to flip the
		 *  tree's colors independently of the surrounding page. Wins over every
		 *  detected signal. Leave undefined to follow the theme context (see `themeSource`). */
		theme?: 'dark' | 'light' | null | undefined;
		/** Where the tree reads its dark/light signal from (core theme context, SPEC §12.10 —
		 *  the same switch every Keenmate web component has as `theme-source`). Unset = the
		 *  page: `data-theme` / `data-bs-theme` / `.dark` / `.light` on `<html>`, then `<body>`.
		 *  `'closest'` = the nearest ancestor carrying such a signal (re-resolved when one
		 *  changes); a CSS selector = the nearest matching ancestor, else the first match; or an
		 *  `Element`. The result is mirrored onto `.stv__container` as `data-context-theme`.
		 *  No signal anywhere → the inherited `color-scheme` applies. `setThemeMode()` forces it
		 *  for every component on the page. */
		themeSource?: ThemeSource;
		/** Animation speed for this tree (core motion level, SPEC §12.16 — the same `motion`
		 *  every Keenmate web component has): `'none' | 'snappy' | 'smooth'`, or `'auto'`
		 *  (default) = follow the nearest `data-motion` section, then the page
		 *  (`window.components.motion`), then the tree's own speeds. Written onto
		 *  `.stv__container` as `data-motion`; a preset only sets the `--base-duration-*` /
		 *  `--base-scroll-behavior` tokens the `--stv-transition-*` vars read. The OS
		 *  `prefers-reduced-motion: reduce` always wins. */
		motion?: Motion;
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
		/** Pick the disclosure glyph as a single knob (default `'chevron'`). Re-points
		 *  the ONE `--stv-icon-*` variable set via `data-icon-set` on `.stv__container`
		 *  — it does not switch between separate CSS classes. `'plus-minus'` is a swap
		 *  set (glyph-swaps regardless of `toggleIconMode`). Each set chains to a shared
		 *  `--base-icon-*` token, so a theme reskins every Keenmate component at once. */
		iconSet?: 'chevron' | 'triangle' | 'plus-minus' | 'arrow';
		leafIconClass?: string | null | undefined;
		toggleIconMode?: 'rotate' | 'swap';
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
		/** How the context menu opens (core `menuPresentation`, same as web-treeview): `'auto'`
		 *  (default — a bottom sheet on a phone, else floating), `'floating'`, `'sheet'` or
		 *  `'drawer'`. Read when the menu opens. */
		menuPresentation?: MenuPresentation | null | undefined;
		/** The edge a `'drawer'` context menu slides in from (core `menuSide`): `'start'` (default) or `'end'`. */
		menuSide?: MenuDrawerSide | null | undefined;

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

	/** What `update()` takes: every prop but the snippets. */
	type TreeUpdateProps = Partial<
		Omit<Props, 'nodeTemplate' | 'tooltip' | 'icon' | 'treeHeader' | 'treeBody' | 'treeFooter' | 'noData' | 'contextMenu' | 'dropPlaceholder' | 'loadingPlaceholder'>
	>;

	let {
		// STATE (bindable) — synced both ways below
		nodes = $bindable(),
		focusedNode = $bindable(),
		selectedPaths = $bindable(new Set<string>()),
		checkedPaths = $bindable(new Set<string>()),
		expandedPaths = $bindable(new Set<string>()),
		searchTerm = $bindable(),
		insertResult = $bindable(),
		isRendering = $bindable(false),
		containerSize = $bindable(),

		// SNIPPETS
		nodeTemplate = undefined,
		treeHeader = undefined,
		treeFooter = undefined,
		noData = undefined,
		contextMenu = undefined,
		dropPlaceholder = undefined,
		loadingPlaceholder = undefined,
		tooltip,
		icon,

		// Props of the component itself (not the controller's)
		theme,
		themeSource,
		motion = 'auto',
		iconSet = 'chevron',
		isEmptyDropPlaceholderShown = false,
		menuPresentation = 'auto',
		menuSide = 'start',
		onContainerResize,
		beforeKeydownCallback,

		// Every other prop is a controller option (core/tree-props.ts: defaults + how a change applies)
		...options
	}: Props = $props();

	// ── Create controller ───────────────────────────────────────────────
	// Initial values only — every option is re-synced by the per-key effects below (search for
	// "Sync props → controller"); the svelte-ignore covers reading the props here.
	// svelte-ignore state_referenced_locally
	const controller = createTreeController<T>({
		...(options as Partial<TreeControllerProps<T>>),
		nodes,
		focusedNode,
		selectedPaths,
		checkedPaths,
		expandedPaths,
		searchTerm,
		hasContextMenuSnippet: !!contextMenu
	} as TreeControllerProps<T>);

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
	// The tree's controller for the snippet-based menu items (ContextMenuItem icons).
	setContext('TreeController', controller);

	// ── Cleanup on destroy ──────────────────────────────────────────────
	onDestroy(() => controller.destroy());

	// ── Bind container element for controller ───────────────────────────
	let treeContainerRef: HTMLDivElement;
	$effect(() => {
		if (treeContainerRef) {
			controller.containerElement = treeContainerRef;
			// Core's /menu asks its host's `renderIconCallback` for item icons (a web component's
			// own input): the container answers with this tree's hook (ctx.item).
			(treeContainerRef as HTMLElement & { renderIconCallback?: unknown }).renderIconCallback =
				controller.menuRenderIconCallback;
		}
	});

	// Drag and drop: core createPointerDrag on the container (one listener for every row; mouse /
	// pen / touch). A row's .stv__node-content is the grab handle.
	$effect(() => {
		if (!treeContainerRef) return;
		const el = treeContainerRef;
		return untrack(() => controller._attachPointerDrag(el, true));
	});

	// ── Theme context (core SPEC §12.10, vendored) ─────────────────────────
	// The page's (or `themeSource`'s) dark/light signal, detected once per watched
	// element and shared with every Keenmate component on the page, mirrored onto
	// .stv__container as data-context-theme (dark-mode.css flips color-scheme on it).
	// Re-subscribes when themeSource changes; the listener fires immediately.
	let contextTheme = $state<ColorScheme | null>(null);
	$effect(() => {
		const el = treeContainerRef;
		const source = themeSource;
		if (!el) return;
		return observeThemeContext(el, source, (scheme) => {
			contextTheme = scheme;
		});
	});

	// ── Motion level (core SPEC §12.16, vendored) ──────────────────────────
	// The presets are plain CSS on [data-motion] (adopted into the document once, shared
	// with every Keenmate component); publishMotionHook installs window.components.motion,
	// which core mirrors onto <html data-motion>. Our own level goes on .stv__container,
	// so the closest level wins through inheritance. An invalid value reads as 'auto'.
	const motionLevel = $derived<Motion>(isMotion(motion) ? motion : 'auto');
	$effect(() => {
		const el = treeContainerRef;
		if (!el) return;
		adoptMotionStyles(el);
		publishMotionHook();
	});

	// ── Responsive container-box signal (signal only; see core/responsive.svelte.ts) ──
	// Reactive border-box of the tree's own container, backed by the shared
	// ResizeObserver in vendor/core/environment. The tree does NOT change its own render
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
		onContainerResize?.(Object.defineProperty({ size: snapshot, deviceClass: classifyDevice(getEnvironment()) }, 'controller', { value: controller, enumerable: false }) as { size: ElementSize; deviceClass: DeviceClass } & TreeCallbackContext<T>);
	});

	// Feed the shared NodeRenderContext env: reactive device class + container box.
	// Reuses the same signals (environmentState / _box) — no extra observers.
	const _env = environmentState();
	$effect(() => {
		nodeRenderEnv.deviceClass = _env.deviceClass;
		nodeRenderEnv.container = { width: _box.width, height: _box.height };
	});

	// ── Context menu (core /menu `openMenu()` — the same menu as web-treeview) ─────
	// Core renders it, positions it, dismisses it (outside press, scroll, blur, Escape, Tab, phone
	// Back) and runs the WAI-ARIA menu keyboard; a phone gets the sheet / drawer (`menuPresentation`).
	// It opens once per (node, point) and reports its own close back to the controller. A
	// `contextMenu` snippet renders into a host below and moves into core's custom-menu element.
	let contextMenuHandle: MenuHandle | null = null;
	let snippetMenuHost = $state<HTMLDivElement | null>(null);
	/** The next open came from the keyboard (Shift+F10 / ContextMenu) → focus its first item. */
	let isMenuOpeningFromKeyboard = false;
	// Core owns the dismiss; the controller's own (for headless renderers — canvas) stays off.
	controller.shouldAutoCloseContextMenu = false;
	$effect(() => {
		const node = controller.contextMenuNode;
		const host = controller.containerElement;
		// contextMenuX/Y already include contextMenuXOffset/YOffset (controller.openContextMenu).
		const at = { x: controller.contextMenuX, y: controller.contextMenuY };
		const getItems = controller.getContextMenuItemsHandler;
		const isSnippet = !getItems && !!contextMenu;
		const snippetHost = snippetMenuHost;
		if (!controller.contextMenuVisible || !node || !host) return;
		if (isSnippet && !snippetHost) return; // the snippet renders first, then moves into the menu
		return untrack(() => {
			const isFromKeyboard = isMenuOpeningFromKeyboard;
			isMenuOpeningFromKeyboard = false;
			// One surface ctx per open: every item callback, onClick and submenu share it.
			const ctx = controller.menuContext(node);
			const menu: MenuHandle = openMenu<TreeMenuContext<T>, TreeAction>(
				isSnippet ? [] : (getItems?.(ctx) ?? []),
				ctx,
				{
					at,
					host,
					shouldFocusFirst: isFromKeyboard,
					returnFocusTo: host,
					// The node's text names the menu: the phone sheet's header and the menu's aria-label.
					title: controller.tree?.getNodeDisplayValue(node) || node.path,
					presentation: menuPresentation ?? 'auto',
					side: menuSide ?? 'start',
					// The tree's own strings: a lazy submenu's loading row, the sheet's back / close buttons.
					labels: {
						loading: controller.getLabel('messages.loading'),
						back: controller.getLabel('menuItems.back'),
						close: controller.getLabel('ariaLabels.closeSheet')
					},
					defaults: (item) => controller.menuItemDefaults(item, ctx),
					renderMenuCallback:
						isSnippet && snippetHost ? (el) => el.appendChild(snippetHost) : undefined,
					runAction: (item, { triggerElement, sourceEvent }) =>
						controller.activateMenuItem(item, ctx, triggerElement, sourceEvent),
					onClose: () => {
						if (contextMenuHandle !== menu) return; // replaced by a newer open / torn down
						contextMenuHandle = null;
						if (controller.contextMenuVisible) controller.closeContextMenu();
					}
				}
			);
			if (!menu.isOpen) {
				// No visible item — nothing was shown; keep the controller in sync.
				controller.closeContextMenu();
				return;
			}
			contextMenuHandle = menu;
			return () => {
				if (contextMenuHandle === menu) contextMenuHandle = null;
				menu.close();
			};
		});
	});

	/** Shift+F10 / the ContextMenu key: the focused node's menu, below its row, first item focused. */
	function openContextMenuFromKeyboard(): boolean {
		if (!contextMenu && !controller.getContextMenuItemsHandler) return false;
		const node = controller.focusedNode;
		if (!node || !treeContainerRef) return false;
		const row = treeContainerRef.querySelector(
			`[data-tree-path="${CSS.escape(node.path)}"] .stv__node-content`
		);
		const rect = (row ?? treeContainerRef).getBoundingClientRect();
		isMenuOpeningFromKeyboard = true;
		// At the node's inline-start corner (the right edge in a right-to-left tree). openContextMenu
		// adds the cursor offsets; take them back off — a keyboard menu sits on the row.
		const isRtl = getComputedStyle(treeContainerRef).direction === 'rtl';
		controller.openContextMenu(
			node.path,
			(isRtl ? rect.right : rect.left) - controller.contextMenuXOffset,
			rect.bottom - controller.contextMenuYOffset
		);
		return true;
	}

	// ── Sync props → controller (one-way: parent prop changes flow in) ─
	// `nodes` is input AND current state: the controller writes the tree's data back after a
	// mutation (reverse effect below); that echo must not be fed in again as a new input.
	let isNodesEcho = false;
	$effect(() => {
		const incoming = nodes;
		if (isNodesEcho) {
			isNodesEcho = false;
			return;
		}
		controller.nodes = incoming;
	});
	$effect(() => {
		const term = searchTerm;
		untrack(() => controller.updateProps({ searchTerm: term }));
	});
	$effect(() => {
		const hasSnippet = !!contextMenu;
		untrack(() => controller.updateProps({ hasContextMenuSnippet: hasSnippet }));
	});
	// One effect per option: a changed prop goes through updateProps (which skips an unchanged
	// value, applies the default for undefined, re-inserts the data for an ltree option and warns
	// for the init-only treeId).
	for (const key of TREE_OPTION_KEYS) {
		if (key === 'searchTerm' || key === 'hasContextMenuSnippet') continue;
		$effect(() => {
			const value = (options as Record<string, unknown>)[key];
			untrack(() => controller.updateProps({ [key]: value }));
		});
	}

	// ── Sync controller → bindable props (outputs flow back to parent) ──
	$effect(() => {
		focusedNode = controller.focusedNode;
	});
	$effect(() => {
		selectedPaths = controller.selectedPaths;
	});
	$effect(() => {
		// Current state after a mutation (the controller's write-back) flows out to bind:nodes.
		const current = controller.nodes;
		if (untrack(() => nodes) !== current) {
			isNodesEcho = true;
			nodes = current;
		}
	});
	$effect(() => {
		// The bindable prop exposes the POLICY-PROJECTED selection (rolled-up /
		// leaves / all), not the internal canonical set. See cascadeCheckPolicy.
		checkedPaths = controller.emittedPaths;
	});
	$effect(() => {
		expandedPaths = controller.expandedPaths;
	});
	$effect(() => {
		insertResult = controller.insertResult;
	});
	$effect(() => {
		isRendering = controller.isRendering;
	});

	// Bidirectional: parent can also SET these
	$effect(() => {
		// Through the focus writer: a raw write left the old row's focus visual behind and
		// never set the new row's. The controller→prop echo is a no-op (same path).
		const fn = focusedNode;
		untrack(() => controller._replaceFocusedNode(fn));
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
	$effect(() => {
		const ep = expandedPaths;
		const cp = untrack(() => controller.expandedPaths);
		if (ep !== cp && (ep.size !== cp.size || [...ep].some((p) => !cp.has(p)))) {
			// Assigning the bindable replaces the expanded state — silent, no event.
			controller._replaceExpandedPaths(ep);
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
	export async function expandNodes(paths: string | string[], options?: ExpandOptions) {
		return controller.expandNodes(paths, options);
	}

	/** Settles after the collapse applied — after the rows animated out (motion). */
	export async function collapseNodes(paths: string | string[], options?: ExpandOptions) {
		return controller.collapseNodes(paths, options);
	}

	export async function toggleNodeExpanded(path: string, options?: ExpandOptions) {
		return controller.toggleNodeExpanded(path, options);
	}

	export function expandAll(paths?: string | string[] | null, options?: ExpandOptions) {
		controller.expandAll(paths, options);
	}

	/** Settles after the collapse applied — after the rows animated out (motion). */
	export function collapseAll(paths?: string | string[] | null, options?: ExpandOptions): Promise<void> {
		return controller.collapseAll(paths, options);
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

	/** Sort the children of each node — one level (`''` = the root level). Default rule = the
	 *  tree's own (`sortCallback` → `orderMember` → `Intl.Collator(numeric)` by display value);
	 *  `compareCallback` / `direction` override it. Runs even with `isSortingEnabled={false}`. */
	export function sortNodes(paths: string | string[], options?: SortOptions<T>): void {
		controller.sortNodes(paths, options);
	}

	/** Sort whole subtrees (`null` / omitted = the whole tree). Same rule / options as `sortNodes`. */
	export function sortAll(paths?: string | string[] | null, options?: SortOptions<T>): void {
		controller.sortAll(paths, options);
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
		transform?: NodeTransformCallback<T> | null,
		sourceTree?: Ltree<T>
	): { success: boolean; copiedNodes: LTreeNode<T>[]; skipped: number; error?: string } {
		return controller.duplicateNodes(paths, targetPath, position, transform, sourceTree);
	}

	export function removeNode(
		path: string,
		includeDescendants: boolean = true
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return controller.removeNode(path, includeDescendants);
	}

	/** The user's Delete command on `paths` (default: the selection, else the focused node):
	 *  `beforeDeleteCallback` may narrow / veto, then `onNodeDelete` fires with the removed paths. */
	export function runDeleteCommand(paths?: string[]): { removed: number; blocked: number } {
		return controller.runDeleteCommand(paths);
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

	export function insertNode(
		targetPath: string,
		nodeData: T,
		position: InsertPosition
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return controller.insertNode(targetPath, nodeData, position);
	}

	export function addBranch(parentPath: string, data: T[]): InsertBranchResult<T> {
		return controller.addBranch(parentPath, data);
	}

	export function insertBranch(
		targetPath: string,
		data: T[],
		position: InsertPosition
	): InsertBranchResult<T> {
		return controller.insertBranch(targetPath, data, position);
	}

	export function replaceBranch(parentPath: string, data: T[]): ReplaceBranchResult<T> {
		return controller.replaceBranch(parentPath, data);
	}

	export function removeBranch(path: string, keepParent?: boolean): RemoveBranchResult<T> {
		return controller.removeBranch(path, keepParent);
	}

	export function duplicateNode(
		sourceNode: LTreeNode<T>,
		targetParentPath: string,
		transformData: (ctx: { data: T; node: LTreeNode<T>; targetParentPath: string }) => T | null,
		siblingPath?: string,
		position?: 'before' | 'after'
	): { success: boolean; rootNode?: LTreeNode<T>; count: number; error?: string } {
		return controller.duplicateNode(
			sourceNode,
			targetParentPath,
			transformData,
			siblingPath,
			position
		);
	}

	export function closeContextMenu() {
		controller.closeContextMenu();
	}

	/** Open the context menu for the node at `path` at viewport coordinates (offsets applied). */
	export function openContextMenu(path: string, x: number, y: number): void {
		controller.openContextMenu(path, x, y);
	}

	// ── Lookups ──────────────────────────────────────────────────────
	/** `{ path, node, parent, siblings }` for a node (or a path — node/parent null when unknown). */
	export function getNodeRef(nodeOrPath: LTreeNode<T> | string | null): NodeRef<T> {
		return controller.getNodeRef(nodeOrPath);
	}

	/** The visible nodes in display order (expanded + search filter applied). */
	export function getVisibleFlatNodes(): LTreeNode<T>[] {
		return controller.getVisibleFlatNodes();
	}

	/** The underlying LTree (advanced use). */
	export function getTree(): Ltree<T> {
		return controller.getTree();
	}

	/** Whether the node at `path` accepts drops (`getIsDropAllowedCallback` > `isDropAllowedMember`). */
	export function isNodeDropAllowed(path: string): boolean {
		return controller.isNodeDropAllowed(path);
	}

	// ── Clipboard ────────────────────────────────────────────────────
	/** Copy `paths` (default: the selection) to the clipboard (`beforeCopyCallback`, `onNodeCopy`). */
	export function copyNodes(paths?: string[]): void {
		controller.copyNodes(paths);
	}

	/** Cut `paths` (default: the selection) — removed on paste (`beforeCutCallback`, `onNodeCut`). */
	export function cutNodes(paths?: string[]): void {
		controller.cutNodes(paths);
	}

	/** Paste the clipboard under / before / after `targetPath` (`beforePasteCallback`, `onNodePaste`). */
	export function pasteNodes(
		targetPath: string,
		transformData?: NodeTransformCallback<T> | null,
		position: 'child' | 'before' | 'after' = 'child'
	): PasteResult<T> {
		return controller.pasteNodes(targetPath, transformData, position);
	}

	/** Cancel a pending cut (the cut nodes stay). */
	export function cancelCut(): void {
		controller.cancelCut();
	}

	/** Whether the (page-wide) clipboard holds something to paste. */
	export function hasClipboardContent(): boolean {
		return controller.hasClipboardContent();
	}

	/** `'copy'` / `'cut'` of the clipboard content, `null` when empty. */
	export function getClipboardOperation(): 'copy' | 'cut' | null {
		return controller.getClipboardOperation();
	}

	// ── Keyboard navigation (what the built-in keys call; overridable via navigationOverrides) ──
	export function focusAndSelectNode(path: string): void { controller.focusAndSelectNode(path); }
	export function focusNext(): void { controller.focusNext(); }
	export function focusPrevious(): void { controller.focusPrevious(); }
	export function focusNextAtLevel(): void { controller.focusNextAtLevel(); }
	export function focusPreviousAtLevel(): void { controller.focusPreviousAtLevel(); }
	export function focusFirstChild(): void { controller.focusFirstChild(); }
	export function focusParent(): void { controller.focusParent(); }
	export function collapseParent(): void { controller.collapseParent(); }
	export function toggleFocusedNodeExpanded(): void { controller.toggleFocusedNodeExpanded(); }
	export function focusFirst(): void { controller.focusFirst(); }
	export function focusLast(): void { controller.focusLast(); }
	export function focusNextPage(): void { controller.focusNextPage(); }
	export function focusPreviousPage(): void { controller.focusPreviousPage(); }
	export function extendSelectionNext(): void { controller.extendSelectionNext(); }
	export function extendSelectionPrevious(): void { controller.extendSelectionPrevious(); }
	export function extendSelectionToFirst(): void { controller.extendSelectionToFirst(); }
	export function extendSelectionToLast(): void { controller.extendSelectionToLast(); }
	export function extendSelectionNextPage(): void { controller.extendSelectionNextPage(); }
	export function extendSelectionPreviousPage(): void { controller.extendSelectionPreviousPage(); }

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

	/** The selected nodes (the `selectedPaths` set, resolved). */
	export function getSelectedNodes(): LTreeNode<T>[] {
		return controller.getSelectedNodes();
	}

	/** Whether the node at `path` is in the selection. */
	export function isNodeSelected(path: string): boolean {
		return controller.isNodeSelected(path);
	}

	export function getCheckedNodes(): LTreeNode<T>[] {
		return controller.getCheckedNodes();
	}

	export function isNodeChecked(path: string): boolean {
		return controller.isNodeChecked(path);
	}

	/** Scroll the node at `path` into view (see `ScrollToPathOptions`); resolves `true` when found. */
	export async function scrollToPath(path: string, options?: ScrollToPathOptions): Promise<boolean> {
		return controller.scrollToPath(path, options);
	}

	/**
	 * Change props from vanilla JavaScript (`tree.update({ searchTerm: 'x', expandLevel: 3 })`).
	 * Every prop but the snippets. Bindable state and the component's own props are assigned here
	 * (a parent's `bind:` sees them); every other prop goes to `controller.updateProps`.
	 */
	export function update(updates: TreeUpdateProps) {
		if (updates.nodes !== undefined) nodes = updates.nodes;
		if (updates.focusedNode !== undefined) focusedNode = updates.focusedNode;
		if (updates.selectedPaths !== undefined) selectedPaths = updates.selectedPaths;
		if (updates.checkedPaths !== undefined) checkedPaths = updates.checkedPaths;
		if (updates.expandedPaths !== undefined) expandedPaths = updates.expandedPaths;
		if ('searchTerm' in updates) searchTerm = updates.searchTerm;
		if ('theme' in updates) theme = updates.theme;
		if ('themeSource' in updates) themeSource = updates.themeSource;
		if ('motion' in updates) motion = updates.motion ?? 'auto';
		if ('iconSet' in updates) iconSet = updates.iconSet ?? 'chevron';
		if ('isEmptyDropPlaceholderShown' in updates)
			isEmptyDropPlaceholderShown = updates.isEmptyDropPlaceholderShown ?? false;
		if ('menuPresentation' in updates) menuPresentation = updates.menuPresentation ?? 'auto';
		if ('menuSide' in updates) menuSide = updates.menuSide ?? 'start';
		if ('onContainerResize' in updates) onContainerResize = updates.onContainerResize;
		if ('beforeKeydownCallback' in updates) beforeKeydownCallback = updates.beforeKeydownCallback;

		const optionUpdates: Record<string, unknown> = {};
		for (const key of TREE_OPTION_KEYS) {
			if (key !== 'searchTerm' && key in updates) optionUpdates[key] = (updates as Record<string, unknown>)[key];
		}
		controller.updateProps(optionUpdates as Partial<TreeControllerProps<T>>);
	}

	// ── Arrow key navigation ─────────────────────────────────────────────
	function handleTreeKeydown(event: KeyboardEvent) {
		// Ignore modifier-only key presses (Ctrl, Shift, Alt, Meta)
		if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

		// Don't interfere with context menu keyboard handling
		if (controller.contextMenuVisible) return;

		// Call custom handler first — return false to suppress default handling. Resolve the
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

		// A key typed into a field inside a row (an <input> in a nodeTemplate) belongs to that
		// field — no built-in shortcut (Delete, Ctrl+C/V) and no navigation (arrows, Backspace).
		if (isTypingTarget(event)) return;

		// Shift+F10 / the ContextMenu key open the focused node's context menu.
		if (matchesShortcut(event, 'ContextMenu') || matchesShortcut(event, 'Shift+F10')) {
			if (openContextMenuFromKeyboard()) event.preventDefault();
			return;
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
		// short-circuits these to no-ops (see _extendSelectionTo).
		switch (event.key) {
			case 'ArrowDown':
				event.shiftKey ? controller.extendSelectionNext() : controller.focusNextAtLevel();
				break;
			case 'ArrowUp':
				event.shiftKey ? controller.extendSelectionPrevious() : controller.focusPreviousAtLevel();
				break;
			case 'ArrowRight':
				controller.focusFirstChild();
				break;
			case 'ArrowLeft':
				controller.focusParent();
				break;
			case 'Backspace':
				controller.collapseParent();
				break;
			case 'Home':
				event.shiftKey ? controller.extendSelectionToFirst() : controller.focusFirst();
				break;
			case 'End':
				event.shiftKey ? controller.extendSelectionToLast() : controller.focusLast();
				break;
			case 'PageDown':
				event.shiftKey ? controller.extendSelectionNextPage() : controller.focusNextPage();
				break;
			case 'PageUp':
				event.shiftKey ? controller.extendSelectionPreviousPage() : controller.focusPreviousPage();
				break;
			case 'Enter':
				// WAI-ARIA tree: Enter = the node's default action (expand / collapse).
				controller.toggleFocusedNodeExpanded();
				break;
			case ' ':
				// WAI-ARIA tree: Space toggles selection. With checkboxes: the focused node's
				// checkbox; multiple mode: the focused node in the selection; single mode:
				// selects the focused node (Enter expands / collapses).
				if (controller.isCheckboxesShown && controller.focusedNode?.isSelectable) {
					controller.nodeCallbacks.onCheckboxToggle(controller.focusedNode);
				} else if (controller.selectionMode === 'multiple') {
					controller.toggleFocusedSelect();
				} else if (controller.focusedNode?.isSelectable) {
					controller.selectNode(controller.focusedNode.path);
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
</script>


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
				{@const dropHereText = controller.getLabel('messages.dropHere')}
				{#if dropHereText}<div class="stv__drop-placeholder-content">{dropHereText}</div>{/if}
			{/if}
		{:else if noData}
			{@render noData()}
		{:else}
			<!-- No nodes at all → noData; nodes exist but the search filter hid them all → noResults -->
			{@const emptyText = controller.getLabel(controller.hasNodes ? 'messages.noResults' : 'messages.noData')}
			{#if emptyText}<div class="stv__empty-state-content">{emptyText}</div>{/if}
		{/if}
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="stv__container"
	class:stv__tree-drop-zone--active={controller.isTreeDropZoneEnabled && controller.isDropPlaceholderActive}
	tabindex="0"
	data-theme={theme}
	data-context-theme={contextTheme}
	data-motion={motionLevel === 'auto' ? undefined : motionLevel}
	data-node-title-overflow={controller.nodeTitleOverflow}
	data-icon-set={iconSet}
	data-toggle-icon-mode={controller.toggleIconMode}
	data-tree-id={controller.treeId}
	bind:this={treeContainerRef}
	onkeydown={handleTreeKeydown}
	oncontextmenu={(e) => {
		// The browser's keyboard-initiated `contextmenu` (Shift+F10 / ContextMenu key) targets the
		// focused container — ours is already open, don't show the native one too.
		if (controller.contextMenuVisible && e.target === treeContainerRef) e.preventDefault();
	}}
>
	{@render treeHeader?.()}

	{#if controller.isLoading}
		{@const loadingText = controller.getLabel('ariaLabels.loading')}
		<!-- Precedence: loadingPlaceholder snippet > page-wide window.components.renderLoadingCallback
		     (the suite's shared loader hook, read without core; optional) > the default .stv__loader. -->
		{@const pageLoaderHook = loadingPlaceholder ? undefined : getPageLoaderCallback()}
		{#if pageLoaderHook}
			<div
				class="stv__loading-overlay"
				role="status"
				aria-label={loadingText || undefined}
				use:pageLoader={{ hook: pageLoaderHook, label: loadingText }}
			></div>
		{:else}
			<div class="stv__loading-overlay" role="status" aria-label={loadingText || undefined}>
				{#if loadingPlaceholder}
					{@render loadingPlaceholder()}
				{:else}
					<span class="stv__loader" aria-hidden="true"></span>
				{/if}
			</div>
		{/if}
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
									isDragInProgress={controller.isDragInProgress}
									hoveredNodeForDropPath={controller.hoveredNodeForDrop?.path}
									activeDropPosition={controller.activeDropPosition}
									dropOperation={controller.currentDropOperation}
								/>
							{:else}
								{@render emptyDropState()}
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<!-- Flat rendering: uses visibleFlatNodes (progressively revealed) for efficient updates -->
				<div class="stv__tree stv__tree--flat">
					{#each controller.flatNodesToRender as node (node.id + '|' + node.path + '|' + node.hasChildren + '|' + node._rev)}
						<Node
							{node}
							children={nodeTemplate}
							isDragInProgress={controller.isDragInProgress}
							hoveredNodeForDropPath={controller.hoveredNodeForDrop?.path}
							activeDropPosition={controller.activeDropPosition}
							dropOperation={controller.currentDropOperation}
						/>
					{:else}
						{@render emptyDropState()}
					{/each}
				</div>
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
			{#if controller._isFloatingPositionAllowed('before')}
				<div
					class="stv__drop-zone stv__drop-zone--before"
					class:stv__drop-zone--active={controller.floatingHoveredZone === 'before'}
				>
					<span aria-hidden="true">↑</span> {controller.getLabel('labels.dropBefore')}
				</div>
			{/if}
			{#if controller._isFloatingPositionAllowed('after')}
				<div
					class="stv__drop-zone stv__drop-zone--after"
					class:stv__drop-zone--active={controller.floatingHoveredZone === 'after'}
				>
					<span aria-hidden="true">↓</span> {controller.getLabel('labels.dropAfter')}
				</div>
			{/if}
			{#if controller._isFloatingPositionAllowed('child')}
				<div
					class="stv__drop-zone stv__drop-zone--child"
					class:stv__drop-zone--active={controller.floatingHoveredZone === 'child'}
				>
					<span aria-hidden="true">→</span> {controller.getLabel('labels.dropChild')}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Context menu snippet: rendered here, moved into core's custom-menu element (openMenu's
	     renderMenuCallback, the effect above) — the callback menu is all core's. -->
	{#if controller.contextMenuVisible && controller.contextMenuNode && contextMenu && !controller.getContextMenuItemsHandler}
		<div bind:this={snippetMenuHost} class="stv__context-menu-content" role="menu">
			{@render contextMenu(
				controller.contextMenuNode,
				controller.closeContextMenu.bind(controller)
			)}
		</div>
	{/if}
</div>
