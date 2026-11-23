<script lang="ts" generics="T">
	import type { SearchOptions } from 'flexsearch';
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
		type NodeRenderContext,
		type SelectMode,
		type TreeMutationOptions,
		type ExpandOptions,
		type InsertPosition,
		type SortOptions,
		type TreeChange,
		type ApplyChangesResult
	} from '../ltree/types.js';
	import { setContext, onDestroy, untrack, type Snippet } from 'svelte';
	import type { TreeEngineProps } from '../core/TreeEngine.svelte.js';
	import { TREE_OPTION_KEYS } from '../core/tree-props.js';
	import type {
		NodeTransformCallback,
		KeydownContext,
		NodeRef,
		PasteResult,
		TreeCallbackContext,
		ScrollToPathOptions
	} from '../core/TreeEngine.svelte.js';
	import { uiLogger } from '../logger.js';
	import { getPageLoaderCallback, pageLoader } from '../core/loader.js';
	import { createTreeEngine } from '../core/createTreeEngine.js';
	import type { TreeMenuContext, TreeAction } from '../core/menu.js';
	import { containerSize as trackContainerSize, environmentState } from '../core/responsive.svelte.js';
	import { classifyDevice, getEnvironment } from '../vendor/core/environment/environment.js';
	import type { ElementSize } from '../vendor/core/environment/element-size.js';
	import type { DeviceClass } from '../vendor/core/environment/environment.js';
	import { observeThemeContext, type ColorScheme, type ThemeSource } from '../vendor/core/environment/theme.js';
	import { adoptMotionStyles, isMotion, publishMotionHook, type Motion } from '../vendor/core/environment/motion.js';

	// NodeCallbacks and NodeConfig are now defined in ../core/TreeEngine.svelte.ts
	// and re-exported from index.ts for public consumption.

	/** `<Tree>`'s props: every engine option ({@link TreeEngineProps} — mappings, behaviour, events,
	 *  interceptors, visuals) plus what only the component has (snippets, view-only bindables, theme,
	 *  motion, menu presentation). */
	interface Props extends Omit<TreeEngineProps<T>, 'hasContextMenuSnippet'> {
		// STATE (bindable, the component's own)
		/** Bindable: the last `nodes` load's result (inserted / failed nodes with reasons). */
		insertResult?: InsertArrayResult<T> | null | undefined;
		/** Bindable: true while a progressive render pass is running. */
		isRendering?: boolean;
		/** Bindable: the tree's live border-box size in CSS px. Read it in your own `$derived`
		 *  to switch settings by space. Updated from the same signal as `onContainerResize`. */
		containerSize?: ElementSize;

		// SNIPPETS
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

		// VIEW (the component's own — not engine options)
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
		/** Pick the disclosure glyph as a single knob (default `'chevron'`). Re-points
		 *  the ONE `--stv-icon-*` variable set via `data-icon-set` on `.stv__container`
		 *  — it does not switch between separate CSS classes. `'plus-minus'` is a swap
		 *  set (glyph-swaps regardless of `toggleIconMode`). Each set chains to a shared
		 *  `--base-icon-*` token, so a theme reskins every Keenmate component at once. */
		iconSet?: 'chevron' | 'triangle' | 'plus-minus' | 'arrow';
		/**
		 * Keep the `dropPlaceholder` (or `labels.dropHere`, default "Drop here") visible whenever the tree
		 * is empty — not just mid-drag. Also makes the empty drop zone grab keyboard
		 * focus on hover, so a clipboard paste (Ctrl/Cmd+V routed through `beforeKeydownCallback`)
		 * lands on this tree without needing a node to click first. Default: false.
		 */
		isEmptyDropPlaceholderShown?: boolean;
		/** How the context menu opens (core `menuPresentation`, same as web-treeview): `'auto'`
		 *  (default — a bottom sheet on a phone, else floating), `'floating'`, `'sheet'` or
		 *  `'drawer'`. Read when the menu opens. */
		menuPresentation?: MenuPresentation | null | undefined;
		/** The edge a `'drawer'` context menu slides in from (core `menuSide`): `'start'` (default) or `'end'`. */
		menuSide?: MenuDrawerSide | null | undefined;
		/** Fire-and-forget: the tree's own border-box changed (immediate on mount, then on
		 *  resize, throttled ~30ms). `deviceClass` is the capability+size class of the WINDOW
		 *  (`classifyDevice`), handy alongside the box for AB10-style adaptation. */
		onContainerResize?: (ctx: { size: ElementSize; deviceClass: DeviceClass } & TreeCallbackContext<T>) => void;
		/** Keydown interceptor (SYNCHRONOUS — a key's default can only be prevented in the
		 *  handler). Return `false` to suppress the tree's keyboard handling (navigation and the
		 *  built-in shortcuts) and preventDefault the key; return nothing to continue. Gets a context object mirroring the other
		 *  callback families: the resolved `focusedNode` (single) and `selectedNodes`
		 *  (multi) so you don't reach through the controller for the common case; `controller`
		 *  remains for imperative actions (addNode, copyNodes, …). A keydown is a tree-level
		 *  event, so there's no single "the node" — that's why it carries both selections. */
		beforeKeydownCallback?: (ctx: KeydownContext<T>) => false | void;
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

		// Props of the component itself (not the engine's)
		theme,
		themeSource,
		motion = 'auto',
		iconSet = 'chevron',
		isEmptyDropPlaceholderShown = false,
		menuPresentation = 'auto',
		menuSide = 'start',
		onContainerResize,
		beforeKeydownCallback,

		// Every other prop is a engine option (core/tree-props.ts: defaults + how a change applies)
		...options
	}: Props = $props();

	// ── Create engine ───────────────────────────────────────────────
	// Initial values only — every option is re-synced by the per-key effects below (search for
	// "Sync props → engine"); the svelte-ignore covers reading the props here.
	// svelte-ignore state_referenced_locally
	const engine = createTreeEngine<T>({
		...options,
		nodes,
		focusedNode,
		selectedPaths,
		checkedPaths,
		expandedPaths,
		searchTerm,
		hasContextMenuSnippet: !!contextMenu
	});

	// Reactive render environment shared with every Node — device class + the tree's
	// container box. Mutated (not replaced) in an $effect below so the context reference
	// stays stable; each Node merges it with the node's live state into a NodeRenderContext.
	const nodeRenderEnv = $state<{ deviceClass: NodeRenderContext['deviceClass']; container: ElementSize }>({
		deviceClass: 'desktop',
		container: { width: 0, height: 0 }
	});

	// ── Set contexts (must happen synchronously during component init) ──
	setContext('Ltree', engine.tree);
	setContext('NodeCallbacks', engine.nodeCallbacks);
	setContext('NodeConfig', engine.nodeConfig);
	// The rich-content tooltip snippet (stable identity) reaches every Node via
	// context, so it doesn't need threading through each render site + the recursive
	// forward. The string callback + options travel in NodeConfig.
	// svelte-ignore state_referenced_locally
	setContext('NodeTooltip', tooltip);
	// The icon snippet (stable identity) also reaches every Node via context.
	// svelte-ignore state_referenced_locally
	setContext('NodeIcon', icon);
	setContext('NodeRenderEnv', nodeRenderEnv);
	// The tree's engine for the snippet-based menu items (ContextMenuItem icons).
	setContext('TreeEngine', engine);

	// ── Cleanup on destroy ──────────────────────────────────────────────
	onDestroy(() => engine.destroy());

	// ── Bind container element for engine ───────────────────────────
	let treeContainerRef: HTMLDivElement;
	$effect(() => {
		if (treeContainerRef) {
			engine.containerElement = treeContainerRef;
			// Core's /menu asks its host's `renderIconCallback` for item icons (a web component's
			// own input): the container answers with this tree's hook (ctx.item).
			(treeContainerRef as HTMLElement & { renderIconCallback?: unknown }).renderIconCallback =
				engine.menuRenderIconCallback;
		}
	});

	// Drag and drop: core createPointerDrag on the container (one listener for every row; mouse /
	// pen / touch). A row's .stv__node-content is the grab handle.
	$effect(() => {
		if (!treeContainerRef) return;
		const el = treeContainerRef;
		return untrack(() => engine._attachPointerDrag(el, true));
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
		onContainerResize?.(Object.defineProperty({ size: snapshot, deviceClass: classifyDevice(getEnvironment()) }, 'controller', { value: engine.controller, enumerable: false }) as { size: ElementSize; deviceClass: DeviceClass } & TreeCallbackContext<T>);
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
	// It opens once per (node, point) and reports its own close back to the engine. A
	// `contextMenu` snippet renders into a host below and moves into core's custom-menu element.
	let contextMenuHandle: MenuHandle | null = null;
	let snippetMenuHost = $state<HTMLDivElement | null>(null);
	/** The next open came from the keyboard (Shift+F10 / ContextMenu) → focus its first item. */
	let isMenuOpeningFromKeyboard = false;
	// Core owns the dismiss; the engine's own (for headless renderers — canvas) stays off.
	engine.shouldAutoCloseContextMenu = false;
	$effect(() => {
		const node = engine.contextMenuNode;
		const host = engine.containerElement;
		// contextMenuX/Y already include contextMenuXOffset/YOffset (engine.openContextMenu).
		const at = { x: engine.contextMenuX, y: engine.contextMenuY };
		const getItems = engine.getContextMenuItemsHandler;
		const isSnippet = !getItems && !!contextMenu;
		const snippetHost = snippetMenuHost;
		if (!engine.contextMenuVisible || !node || !host) return;
		if (isSnippet && !snippetHost) return; // the snippet renders first, then moves into the menu
		return untrack(() => {
			const isFromKeyboard = isMenuOpeningFromKeyboard;
			isMenuOpeningFromKeyboard = false;
			// One surface ctx per open: every item callback, onClick and submenu share it.
			const ctx = engine.menuContext(node);
			const menu: MenuHandle = openMenu<TreeMenuContext<T>, TreeAction>(
				isSnippet ? [] : (getItems?.(ctx) ?? []),
				ctx,
				{
					at,
					host,
					shouldFocusFirst: isFromKeyboard,
					returnFocusTo: host,
					// The node's text names the menu: the phone sheet's header and the menu's aria-label.
					title: engine.tree?.getNodeDisplayValue(node) || node.path,
					presentation: menuPresentation ?? 'auto',
					side: menuSide ?? 'start',
					// The tree's own strings: a lazy submenu's loading row, the sheet's back / close buttons.
					labels: {
						loading: engine.getLabel('messages.loading'),
						back: engine.getLabel('menuItems.back'),
						close: engine.getLabel('ariaLabels.closeSheet')
					},
					defaults: (item) => engine.menuItemDefaults(item, ctx),
					renderMenuCallback:
						isSnippet && snippetHost ? (el) => el.appendChild(snippetHost) : undefined,
					runAction: (item, { triggerElement, sourceEvent }) =>
						engine.activateMenuItem(item, ctx, triggerElement, sourceEvent),
					onClose: () => {
						if (contextMenuHandle !== menu) return; // replaced by a newer open / torn down
						contextMenuHandle = null;
						if (engine.contextMenuVisible) engine.closeContextMenu();
					}
				}
			);
			if (!menu.isOpen) {
				// No visible item — nothing was shown; keep the engine in sync.
				engine.closeContextMenu();
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
		if (!contextMenu && !engine.getContextMenuItemsHandler) return false;
		const node = engine.focusedNode;
		if (!node || !treeContainerRef) return false;
		const row = treeContainerRef.querySelector(
			`[data-tree-path="${CSS.escape(node.path)}"] .stv__node-content`
		);
		const rect = (row ?? treeContainerRef).getBoundingClientRect();
		isMenuOpeningFromKeyboard = true;
		// At the node's inline-start corner (the right edge in a right-to-left tree). openContextMenu
		// adds the cursor offsets; take them back off — a keyboard menu sits on the row.
		const isRtl = getComputedStyle(treeContainerRef).direction === 'rtl';
		engine.openContextMenu(
			node.path,
			(isRtl ? rect.right : rect.left) - engine.contextMenuXOffset,
			rect.bottom - engine.contextMenuYOffset
		);
		return true;
	}

	// ── Sync props → engine (one-way: parent prop changes flow in) ─
	// `nodes` is input AND current state: the engine writes the tree's data back after a
	// mutation (reverse effect below); that echo must not be fed in again as a new input.
	let isNodesEcho = false;
	$effect(() => {
		const incoming = nodes;
		if (isNodesEcho) {
			isNodesEcho = false;
			return;
		}
		engine.nodes = incoming;
	});
	$effect(() => {
		const term = searchTerm;
		untrack(() => engine.updateProps({ searchTerm: term }));
	});
	$effect(() => {
		const hasSnippet = !!contextMenu;
		untrack(() => engine.updateProps({ hasContextMenuSnippet: hasSnippet }));
	});
	// One effect per option: a changed prop goes through updateProps (which skips an unchanged
	// value, applies the default for undefined, re-inserts the data for an ltree option and warns
	// for the init-only treeId).
	for (const key of TREE_OPTION_KEYS) {
		if (key === 'searchTerm' || key === 'hasContextMenuSnippet') continue;
		$effect(() => {
			const value = (options as Record<string, unknown>)[key];
			untrack(() => engine.updateProps({ [key]: value }));
		});
	}

	// ── Sync engine → bindable props (outputs flow back to parent) ──
	$effect(() => {
		focusedNode = engine.focusedNode;
	});
	$effect(() => {
		selectedPaths = engine.selectedPaths;
	});
	$effect(() => {
		// Current state after a mutation (the engine's write-back) flows out to bind:nodes.
		const current = engine.nodes;
		if (untrack(() => nodes) !== current) {
			isNodesEcho = true;
			nodes = current;
		}
	});
	$effect(() => {
		// The bindable prop exposes the POLICY-PROJECTED selection (rolled-up /
		// leaves / all), not the internal canonical set. See cascadeCheckPolicy.
		checkedPaths = engine.emittedPaths;
	});
	$effect(() => {
		expandedPaths = engine.expandedPaths;
	});
	$effect(() => {
		insertResult = engine.insertResult;
	});
	$effect(() => {
		isRendering = engine.isRendering;
	});

	// Bidirectional: parent can also SET these
	$effect(() => {
		// Through the focus writer: a raw write left the old row's focus visual behind and
		// never set the new row's. The engine→prop echo is a no-op (same path).
		const fn = focusedNode;
		untrack(() => engine._replaceFocusedNode(fn));
	});
	$effect(() => {
		// Compare by size + content to avoid proxy identity loops
		const hp = selectedPaths;
		const cp = engine.selectedPaths;
		if (hp.size !== cp.size || [...hp].some((p) => !cp.has(p))) {
			// Assigning the bindable replaces the set (node flags too) — silent, no event.
			engine._replaceSelectedPaths(hp);
		}
	});
	$effect(() => {
		const sp = checkedPaths;
		const cp = engine.emittedPaths;
		if (sp.size !== cp.size || [...sp].some((p) => !cp.has(p))) {
			// Incoming set is a projection; expand it (cascade-down) into the canonical
			// checked state. Silent — the parent set this, so don't echo onCheckedChange.
			engine._replaceCheckedPaths(sp);
		}
	});
	$effect(() => {
		const ep = expandedPaths;
		const cp = untrack(() => engine.expandedPaths);
		if (ep !== cp && (ep.size !== cp.size || [...ep].some((p) => !cp.has(p)))) {
			// Assigning the bindable replaces the expanded state — silent, no event.
			engine._replaceExpandedPaths(ep);
		}
	});

	// ── Floating drop zone helpers ───────────────────────────────────────
	const formattedDropZoneStart = $derived(
		typeof engine.dropZoneStart === 'number'
			? `${engine.dropZoneStart}%`
			: engine.dropZoneStart
	);

	// Show the drop placeholder either mid-drag (isDropPlaceholderActive) or, when
	// isEmptyDropPlaceholderShown is set, permanently while the tree is empty.
	const showEmptyDropPlaceholder = $derived(
		engine.isDropPlaceholderActive || isEmptyDropPlaceholderShown
	);

	// Focus-on-hover for the permanent empty drop zone: gives the tabbable container
	// keyboard focus so a Ctrl/Cmd+V (routed through beforeKeydownCallback) pastes into this
	// tree without a node to click first. No-op unless the permanent placeholder is on.
	function focusEmptyDropZone() {
		if (isEmptyDropPlaceholderShown) treeContainerRef?.focus();
	}

	// ── Export public methods (thin proxies) ────────────────────────────
	export async function expandNodes(paths: string | string[], options?: ExpandOptions) {
		return engine.expandNodes(paths, options);
	}

	/** Settles after the collapse applied — after the rows animated out (motion). */
	export async function collapseNodes(paths: string | string[], options?: ExpandOptions) {
		return engine.collapseNodes(paths, options);
	}

	export async function toggleNodeExpanded(path: string, options?: ExpandOptions) {
		return engine.toggleNodeExpanded(path, options);
	}

	export function expandAll(paths?: string | string[] | null, options?: ExpandOptions) {
		engine.expandAll(paths, options);
	}

	/** Settles after the collapse applied — after the rows animated out (motion). */
	export function collapseAll(paths?: string | string[] | null, options?: ExpandOptions): Promise<void> {
		return engine.collapseAll(paths, options);
	}

	export function filterNodes(term: string, searchOptions?: SearchOptions): void {
		engine.filterNodes(term, searchOptions);
	}

	export function searchNodes(
		term: string | null | undefined,
		searchOptions?: SearchOptions
	): LTreeNode<T>[] {
		return engine.searchNodes(term, searchOptions);
	}

	export function getChildren(parentPath: string): LTreeNode<T>[] {
		return engine.getChildren(parentPath);
	}

	export function getSiblings(path: string): LTreeNode<T>[] {
		return engine.getSiblings(path);
	}

	export function refreshSiblings(parentPath: string): void {
		engine.refreshSiblings(parentPath);
	}

	/** Sort the children of each node — one level (`''` = the root level). Default rule = the
	 *  tree's own (`sortCallback` → `orderMember` → `Intl.Collator(numeric)` by display value);
	 *  `compareCallback` / `direction` override it. Runs even with `isSortingEnabled={false}`. */
	export function sortNodes(paths: string | string[], options?: SortOptions<T>): void {
		engine.sortNodes(paths, options);
	}

	/** Sort whole subtrees (`null` / omitted = the whole tree). Same rule / options as `sortNodes`. */
	export function sortAll(paths?: string | string[] | null, options?: SortOptions<T>): void {
		engine.sortAll(paths, options);
	}

	export function refreshNode(path: string): void {
		engine.refreshNode(path);
	}

	export function getNodeByPath(path: string): LTreeNode<T> | null {
		return engine.getNodeByPath(path);
	}

	export function moveNode(
		sourcePath: string,
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; error?: string } {
		return engine.moveNode(sourcePath, targetPath, position);
	}

	export function moveNodes(
		paths: string[],
		targetPath: string,
		position: 'before' | 'after' | 'child'
	): { success: boolean; movedNodes: LTreeNode<T>[]; leftBehind: LTreeNode<T>[]; error?: string } {
		return engine.moveNodes(paths, targetPath, position);
	}

	export function duplicateNodes(
		paths: string[],
		targetPath: string,
		position: 'before' | 'after' | 'child',
		transform?: NodeTransformCallback<T> | null,
		sourceTree?: Ltree<T>
	): { success: boolean; copiedNodes: LTreeNode<T>[]; skipped: number; error?: string } {
		return engine.duplicateNodes(paths, targetPath, position, transform, sourceTree);
	}

	export function removeNode(
		path: string,
		includeDescendants: boolean = true
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return engine.removeNode(path, includeDescendants);
	}

	/** The user's Delete command on `paths` (default: the selection, else the focused node):
	 *  `beforeDeleteCallback` may narrow / veto, then `onNodeDelete` fires with the removed paths. */
	export function runDeleteCommand(paths?: string[]): { removed: number; blocked: number } {
		return engine.runDeleteCommand(paths);
	}

	/** Programmatic removal of several subtrees (no beforeDeleteCallback, no onNodeDelete). */
	export function removeNodes(paths: string[]): { removed: number; failed: number } {
		return engine.removeNodes(paths);
	}

	export function addNode(
		parentPath: string,
		nodeData: T,
		pathSegment?: string
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return engine.addNode(parentPath, nodeData, pathSegment);
	}

	export function updateNode(
		path: string,
		dataUpdates: Partial<T>
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return engine.updateNode(path, dataUpdates);
	}

	export function applyChanges(changes: TreeChange<T>[]): ApplyChangesResult {
		return engine.applyChanges(changes);
	}

	export function insertNode(
		targetPath: string,
		nodeData: T,
		position: InsertPosition
	): { success: boolean; node?: LTreeNode<T>; error?: string } {
		return engine.insertNode(targetPath, nodeData, position);
	}

	export function addBranch(parentPath: string, data: T[]): InsertBranchResult<T> {
		return engine.addBranch(parentPath, data);
	}

	export function insertBranch(
		targetPath: string,
		data: T[],
		position: InsertPosition
	): InsertBranchResult<T> {
		return engine.insertBranch(targetPath, data, position);
	}

	export function replaceBranch(parentPath: string, data: T[]): ReplaceBranchResult<T> {
		return engine.replaceBranch(parentPath, data);
	}

	export function removeBranch(path: string, keepParent?: boolean): RemoveBranchResult<T> {
		return engine.removeBranch(path, keepParent);
	}

	export function duplicateNode(
		sourceNode: LTreeNode<T>,
		targetParentPath: string,
		transformData: (ctx: { data: T; node: LTreeNode<T>; targetParentPath: string }) => T | null,
		siblingPath?: string,
		position?: 'before' | 'after'
	): { success: boolean; rootNode?: LTreeNode<T>; count: number; error?: string } {
		return engine.duplicateNode(
			sourceNode,
			targetParentPath,
			transformData,
			siblingPath,
			position
		);
	}

	export function closeContextMenu() {
		engine.closeContextMenu();
	}

	/** Open the context menu for the node at `path` at viewport coordinates (offsets applied). */
	export function openContextMenu(path: string, x: number, y: number): void {
		engine.openContextMenu(path, x, y);
	}

	// ── Lookups ──────────────────────────────────────────────────────
	/** `{ path, node, parent, siblings }` for a node (or a path — node/parent null when unknown). */
	export function getNodeRef(nodeOrPath: LTreeNode<T> | string | null): NodeRef<T> {
		return engine.getNodeRef(nodeOrPath);
	}

	/** The visible nodes in display order (expanded + search filter applied). */
	export function getVisibleFlatNodes(): LTreeNode<T>[] {
		return engine.getVisibleFlatNodes();
	}

	/** The underlying LTree (advanced use). */
	export function getTree(): Ltree<T> {
		return engine.getTree();
	}

	/** Whether the node at `path` accepts drops (`getIsDropAllowedCallback` > `isDropAllowedMember`). */
	export function isNodeDropAllowed(path: string): boolean {
		return engine.isNodeDropAllowed(path);
	}

	// ── Clipboard ────────────────────────────────────────────────────
	/** Copy `paths` (default: the selection) to the clipboard (`beforeCopyCallback`, `onNodeCopy`). */
	export function copyNodes(paths?: string[]): void {
		engine.copyNodes(paths);
	}

	/** Cut `paths` (default: the selection) — removed on paste (`beforeCutCallback`, `onNodeCut`). */
	export function cutNodes(paths?: string[]): void {
		engine.cutNodes(paths);
	}

	/** Paste the clipboard under / before / after `targetPath` (`beforePasteCallback`, `onNodePaste`). */
	export function pasteNodes(
		targetPath: string,
		transformData?: NodeTransformCallback<T> | null,
		position: 'child' | 'before' | 'after' = 'child'
	): PasteResult<T> {
		return engine.pasteNodes(targetPath, transformData, position);
	}

	/** Cancel a pending cut (the cut nodes stay). */
	export function cancelCut(): void {
		engine.cancelCut();
	}

	/** Whether the (page-wide) clipboard holds something to paste. */
	export function hasClipboardContent(): boolean {
		return engine.hasClipboardContent();
	}

	/** `'copy'` / `'cut'` of the clipboard content, `null` when empty. */
	export function getClipboardOperation(): 'copy' | 'cut' | null {
		return engine.getClipboardOperation();
	}

	// ── Keyboard navigation (what the built-in keys call; overridable via navigationOverrides) ──
	export function focusAndSelectNode(path: string): void { engine.focusAndSelectNode(path); }
	export function focusNext(): void { engine.focusNext(); }
	export function focusPrevious(): void { engine.focusPrevious(); }
	export function focusNextAtLevel(): void { engine.focusNextAtLevel(); }
	export function focusPreviousAtLevel(): void { engine.focusPreviousAtLevel(); }
	export function focusFirstChild(): void { engine.focusFirstChild(); }
	export function focusParent(): void { engine.focusParent(); }
	export function collapseParent(): void { engine.collapseParent(); }
	export function toggleFocusedNodeExpanded(): void { engine.toggleFocusedNodeExpanded(); }
	export function focusFirst(): void { engine.focusFirst(); }
	export function focusLast(): void { engine.focusLast(); }
	export function focusNextPage(): void { engine.focusNextPage(); }
	export function focusPreviousPage(): void { engine.focusPreviousPage(); }
	export function extendSelectionNext(): void { engine.extendSelectionNext(); }
	export function extendSelectionPrevious(): void { engine.extendSelectionPrevious(); }
	export function extendSelectionToFirst(): void { engine.extendSelectionToFirst(); }
	export function extendSelectionToLast(): void { engine.extendSelectionToLast(); }
	export function extendSelectionNextPage(): void { engine.extendSelectionNextPage(); }
	export function extendSelectionPreviousPage(): void { engine.extendSelectionPreviousPage(); }

	// ── Selection set (UI multi-select — selectedPaths) ──────────────
	export function selectNode(
		path: string,
		mode: SelectMode = 'replace',
		options?: TreeMutationOptions
	) {
		engine.selectNode(path, mode, options);
	}

	export function selectNodes(paths: string[], options?: TreeMutationOptions) {
		engine.selectNodes(paths, options);
	}

	export function selectAll(options?: TreeMutationOptions) {
		engine.selectAll(options);
	}

	export function clearSelection(paths?: string[], options?: TreeMutationOptions) {
		engine.clearSelection(paths, options);
	}

	// ── Checked set (checkbox / data state — checkedPaths) ───────────
	export function checkNode(path: string, options?: TreeMutationOptions) {
		engine.checkNode(path, options);
	}

	export function checkNodes(paths: string[], options?: TreeMutationOptions) {
		engine.checkNodes(paths, options);
	}

	export function checkAll(options?: TreeMutationOptions) {
		engine.checkAll(options);
	}

	export function uncheckNode(path: string, options?: TreeMutationOptions) {
		engine.uncheckNode(path, options);
	}

	export function uncheckNodes(paths: string[], options?: TreeMutationOptions) {
		engine.uncheckNodes(paths, options);
	}

	export function uncheckAll(options?: TreeMutationOptions) {
		engine.uncheckAll(options);
	}

	// ── Focus (single cursor — focusedNode) ─────────────────────────────
	export function focusNode(path: string, options?: TreeMutationOptions) {
		engine.focusNode(path, options);
	}

	export function clearFocus(options?: TreeMutationOptions) {
		engine.clearFocus(options);
	}

	/** The selected nodes (the `selectedPaths` set, resolved). */
	export function getSelectedNodes(): LTreeNode<T>[] {
		return engine.getSelectedNodes();
	}

	/** Whether the node at `path` is in the selection. */
	export function isNodeSelected(path: string): boolean {
		return engine.isNodeSelected(path);
	}

	export function getCheckedNodes(): LTreeNode<T>[] {
		return engine.getCheckedNodes();
	}

	export function isNodeChecked(path: string): boolean {
		return engine.isNodeChecked(path);
	}

	/** Scroll the node at `path` into view (see `ScrollToPathOptions`); resolves `true` when found. */
	export async function scrollToPath(path: string, options?: ScrollToPathOptions): Promise<boolean> {
		return engine.scrollToPath(path, options);
	}

	/**
	 * Change props from vanilla JavaScript (`tree.update({ searchTerm: 'x', expandLevel: 3 })`).
	 * Every prop but the snippets. Bindable state and the component's own props are assigned here
	 * (a parent's `bind:` sees them); every other prop goes to `engine.updateProps`.
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
		engine.updateProps(optionUpdates as Partial<TreeEngineProps<T>>);
	}

	// ── Arrow key navigation ─────────────────────────────────────────────
	function handleTreeKeydown(event: KeyboardEvent) {
		// Ignore modifier-only key presses (Ctrl, Shift, Alt, Meta)
		if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;

		// Don't interfere with context menu keyboard handling
		if (engine.contextMenuVisible) return;

		// Call custom handler first — return false to suppress default handling. Resolve the
		// focus + selection sets up front so the consumer gets nodes, not raw paths.
		if (beforeKeydownCallback) {
			const selectedNodes = [...engine.selectedPaths]
				.map((p) => engine.getNodeByPath(p))
				.filter((n): n is LTreeNode<T> => n !== null);
			const result: unknown = beforeKeydownCallback({
				event,
				focusedNode: engine.focusedNode ?? null,
				selectedNodes,
				controller: engine.controller
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
		if (engine.handleShortcutKeydown(event)) {
			event.preventDefault();
			return;
		}

		if (engine.allFlatNodes.length === 0) return;

		let handled = true;

		// Shift+nav extends the selection range. In single mode the engine
		// short-circuits these to no-ops (see _extendSelectionTo).
		switch (event.key) {
			case 'ArrowDown':
				event.shiftKey ? engine.extendSelectionNext() : engine.focusNextAtLevel();
				break;
			case 'ArrowUp':
				event.shiftKey ? engine.extendSelectionPrevious() : engine.focusPreviousAtLevel();
				break;
			case 'ArrowRight':
				engine.focusFirstChild();
				break;
			case 'ArrowLeft':
				engine.focusParent();
				break;
			case 'Backspace':
				engine.collapseParent();
				break;
			case 'Home':
				event.shiftKey ? engine.extendSelectionToFirst() : engine.focusFirst();
				break;
			case 'End':
				event.shiftKey ? engine.extendSelectionToLast() : engine.focusLast();
				break;
			case 'PageDown':
				event.shiftKey ? engine.extendSelectionNextPage() : engine.focusNextPage();
				break;
			case 'PageUp':
				event.shiftKey ? engine.extendSelectionPreviousPage() : engine.focusPreviousPage();
				break;
			case 'Enter':
				// WAI-ARIA tree: Enter = the node's default action (expand / collapse).
				engine.toggleFocusedNodeExpanded();
				break;
			case ' ':
				// WAI-ARIA tree: Space toggles selection. With checkboxes: the focused node's
				// checkbox; multiple mode: the focused node in the selection; single mode:
				// selects the focused node (Enter expands / collapses).
				if (engine.isCheckboxesShown && engine.focusedNode?.isSelectable) {
					engine.nodeCallbacks.onCheckboxToggle(engine.focusedNode);
				} else if (engine.selectionMode === 'multiple') {
					engine.toggleFocusedSelect();
				} else if (engine.focusedNode?.isSelectable) {
					engine.selectNode(engine.focusedNode.path);
				}
				break;
			case 'Escape':
				// Priority: pending cut → selection set → leave alone for surrounding UI.
				// File Explorer / Finder convention. Context-menu Escape is handled by
				// the separate window-level listener above and never reaches this path.
				if (engine.hasClipboardContent() && engine.getClipboardOperation() === 'cut') {
					engine.cancelCut();
				} else if (engine.selectedPaths.size > 0) {
					engine.clearSelection();
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
		class:stv__drop-placeholder--active={engine.isDropPlaceholderActive}
		onmouseenter={focusEmptyDropZone}
		onpointerdown={focusEmptyDropZone}
	>
		{#if showEmptyDropPlaceholder}
			{#if dropPlaceholder}
				{@render dropPlaceholder()}
			{:else}
				{@const dropHereText = engine.getLabel('messages.dropHere')}
				{#if dropHereText}<div class="stv__drop-placeholder-content">{dropHereText}</div>{/if}
			{/if}
		{:else if noData}
			{@render noData()}
		{:else}
			<!-- No nodes at all → noData; nodes exist but the search filter hid them all → noResults -->
			{@const emptyText = engine.getLabel(engine.hasNodes ? 'messages.noResults' : 'messages.noData')}
			{#if emptyText}<div class="stv__empty-state-content">{emptyText}</div>{/if}
		{/if}
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="stv__container"
	class:stv__tree-drop-zone--active={engine.isTreeDropZoneEnabled && engine.isDropPlaceholderActive}
	tabindex="0"
	data-theme={theme}
	data-context-theme={contextTheme}
	data-motion={motionLevel === 'auto' ? undefined : motionLevel}
	data-node-title-overflow={engine.nodeTitleOverflow}
	data-icon-set={iconSet}
	data-toggle-icon-mode={engine.toggleIconMode}
	data-tree-id={engine.treeId}
	bind:this={treeContainerRef}
	onkeydown={handleTreeKeydown}
	oncontextmenu={(e) => {
		// The browser's keyboard-initiated `contextmenu` (Shift+F10 / ContextMenu key) targets the
		// focused container — ours is already open, don't show the native one too.
		if (engine.contextMenuVisible && e.target === treeContainerRef) e.preventDefault();
	}}
>
	{@render treeHeader?.()}

	{#if engine.isLoading}
		{@const loadingText = engine.getLabel('ariaLabels.loading')}
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

	<div class={engine.bodyClass}>
		{#if engine.tree?.root}
			{#if engine.vsActive}
				<!-- Virtual scrolling mode -->
				<div
					class="stv__tree stv__tree--flat stv__virtual-scroll"
					style="height: {engine.vsContainerStyle}; overflow-y: auto;"
					bind:this={engine.vsContainerRef}
					onscroll={engine.handleVirtualScroll}
				>
					<!-- Spacer for correct scrollbar -->
					<div style="height: {engine.vsTotalHeight}px; position: relative;">
						<!-- Rendered window at correct offset -->
						<div style="transform: translateY({engine.vsOffsetY}px);">
							{#each engine.flatNodesToRender as node (node.id + '|' + node.path + '|' + node.hasChildren + '|' + node._rev)}
								<Node
									{node}
									children={nodeTemplate}
									isDragInProgress={engine.isDragInProgress}
									hoveredNodeForDropPath={engine.hoveredNodeForDrop?.path}
									activeDropPosition={engine.activeDropPosition}
									dropOperation={engine.currentDropOperation}
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
					{#each engine.flatNodesToRender as node (node.id + '|' + node.path + '|' + node.hasChildren + '|' + node._rev)}
						<Node
							{node}
							children={nodeTemplate}
							isDragInProgress={engine.isDragInProgress}
							hoveredNodeForDropPath={engine.hoveredNodeForDrop?.path}
							activeDropPosition={engine.activeDropPosition}
							dropOperation={engine.currentDropOperation}
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
	{#if engine.dropZoneMode === 'floating' && engine.isDragInProgress && engine.hoveredNodeForDrop && engine.floatingZoneRect}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="stv__drop-zones stv__drop-zones--{engine.dropZoneLayout}"
			style="position: fixed; top: {engine.floatingZoneRect.top}px; left: {engine
				.floatingZoneRect.left}px; width: {engine.floatingZoneRect.width}px; height: {engine
				.floatingZoneRect
				.height}px; z-index: 10000; --drop-zone-start: {formattedDropZoneStart}; --drop-zone-max-width: {engine.dropZoneMaxWidth}px;"
		>
			{#if engine._isFloatingPositionAllowed('before')}
				<div
					class="stv__drop-zone stv__drop-zone--before"
					class:stv__drop-zone--active={engine.floatingHoveredZone === 'before'}
				>
					<span aria-hidden="true">↑</span> {engine.getLabel('labels.dropBefore')}
				</div>
			{/if}
			{#if engine._isFloatingPositionAllowed('after')}
				<div
					class="stv__drop-zone stv__drop-zone--after"
					class:stv__drop-zone--active={engine.floatingHoveredZone === 'after'}
				>
					<span aria-hidden="true">↓</span> {engine.getLabel('labels.dropAfter')}
				</div>
			{/if}
			{#if engine._isFloatingPositionAllowed('child')}
				<div
					class="stv__drop-zone stv__drop-zone--child"
					class:stv__drop-zone--active={engine.floatingHoveredZone === 'child'}
				>
					<span aria-hidden="true">→</span> {engine.getLabel('labels.dropChild')}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Context menu snippet: rendered here, moved into core's custom-menu element (openMenu's
	     renderMenuCallback, the effect above) — the callback menu is all core's. -->
	{#if engine.contextMenuVisible && engine.contextMenuNode && contextMenu && !engine.getContextMenuItemsHandler}
		<div bind:this={snippetMenuHost} class="stv__context-menu-content" role="menu">
			{@render contextMenu(
				engine.contextMenuNode,
				engine.closeContextMenu.bind(engine)
			)}
		</div>
	{/if}
</div>
