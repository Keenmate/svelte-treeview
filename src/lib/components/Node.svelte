<script lang="ts" generics="T">
	import {type LTreeNode} from "../ltree/ltree-node.svelte.js"
	import {getContext, type Snippet} from "svelte"
	import type {Ltree, DropPosition, DropOperation, NodeRenderContext} from "../ltree/types.js"
	import type {NodeCallbacks, NodeConfig} from "../core/TreeController.svelte.js"
	import { uiLogger } from "../logger.js"
	import { observeElementSize } from "../vendor/environment/element-size.js"
	import { computePosition, autoUpdate, offset, flip, shift } from "@floating-ui/dom"
	import { tooltip } from "../actions/tooltip.js"

	// Define component props interface
	// Callbacks and config come from context, drag state comes as props
	interface Props {
		node: LTreeNode<T>;
		children?: Snippet<[LTreeNode<T>, NodeRenderContext]>; // nodeTemplate — (node, ctx)

		// Drag state (passed as props for efficient Svelte diffing).
		// isDraggedNode is NOT a prop — each node derives it from config.draggedPaths so the
		// dragged visual dims the whole set (a dragged folder's descendants included).
		isDragInProgress?: boolean;
		hoveredNodeForDropPath?: string | null;
		activeDropPosition?: DropPosition | null;
		dropOperation?: DropOperation;

	}

	// Destructure props using Svelte 5 syntax
	let {
		node,
		children = undefined,

		// Drag state
		isDragInProgress = false,
		hoveredNodeForDropPath = null,
		activeDropPosition = null,
		dropOperation = 'move',

	}: Props = $props()

	// Get stable references from context (avoids prop drilling and re-renders from inline functions)
	const callbacks = getContext<NodeCallbacks<T>>('NodeCallbacks');
	const config = getContext<NodeConfig>('NodeConfig');

	// Read every config field through $derived so updates from controller.update()
	// or the controller's runtime $effect syncs propagate into this Node's render.
	// Plain destructuring would snapshot primitives once and never react.
	// For the BUILT-IN glyph, which picture the disclosure shows (and whether it
	// rotates or swaps on expand) is decided by CSS via the --stv-icon-* variables +
	// data-icon-set / data-toggle-icon-mode on .stv__container — the template just
	// renders the single `stv__toggle-icon--expand` class + an `.expanded` marker.
	const leafIconClass = $derived(config.leafIconClass);
	const selectedNodeClass = $derived(config.selectedNodeClass);
	const focusedNodeClass = $derived(config.focusedNodeClass);
	// Opt-in class for checked (isChecked) rows — the checkbox is the default signal.
	const checkedNodeClass = $derived(config.checkedNodeClass);
	// When set, replaces the built-in .stv__node-content--dragged visual on the dimmed
	// source row (see template). Mirrors selectedNodeClass / focusedNodeClass.
	const draggedNodeClass = $derived(config.draggedNodeClass);
	// This node is part of the active drag (lead, a multi-drag member, or a traveling
	// descendant). Derived per-node from the controller's complete manifest.
	const isDraggedNode = $derived(config.draggedPaths?.has(node.path) ?? false);
	// An async beforeExpandCallback is in flight for this node (lazy load): the toggle
	// shows the loader and the row carries aria-busy + data-loading.
	const isExpandPending = $derived(config.expandPendingPaths?.has(node.path) ?? false);
	// Data-driven per-row classes. The callbacks read node data; recompute when the
	// node's _rev bumps (same trigger the rest of the render uses).
	const customNodeClass = $derived(config.getNodeClassCallback ? (config.getNodeClassCallback({ node }) ?? '') : '');
	const customNodeContentClass = $derived(config.getNodeContentClassCallback ? (config.getNodeContentClassCallback({ node }) ?? '') : '');
	// dragOverNodeClass is applied to the DOM directly by the controller
	// (see hoveredNodeForDrop $effect in TreeController) — no per-Node binding.
	const clickBehavior = $derived(config.clickBehavior);
	const isCheckboxesShown = $derived(config.isCheckboxesShown);
	const checkboxMode = $derived(config.checkboxMode);
	const shouldClickToggleCheckbox = $derived(config.shouldClickToggleCheckbox);

	// Indeterminate state: driven by controller's _updateAncestorVisualStates
	const isIndeterminate = $derived(checkboxMode === 'cascade' && node.visualState === 'indeterminate');

	// Read dropZoneMode through the proxy each time (not destructured) so it stays
	// reactive in flat mode where nodes are NOT recreated on config change.
	const dropZoneMode = $derived(config.dropZoneMode);

	// Compute if THIS node is the one being hovered for drop.
	// Single source of truth from the controller — guarantees exactly one highlighted
	// row at a time, unlike the per-node local flag we used before (HTML5 dragleave
	// is unreliable and leaked stale highlights when moving fast between rows).
	const isHoveredForDrop = $derived(hoveredNodeForDropPath === node.path);

	const tree = getContext<Ltree<T>>("Ltree")

	// ── Node title overflow (wrap | ellipsis | info) ────────────────────────
	// wrap/ellipsis are pure CSS (gated by data-node-title-overflow on the container);
	// `info` additionally measures whether the built-in label is horizontally clipped and,
	// if so, shows a trailing ⓘ affordance that reveals the full label on click — the
	// touch/no-hover substitute for the native title tooltip. Only the default label path
	// (no nodeTemplate) participates; a snippet owns its own layout.
	const nodeTitleOverflow = $derived(config.nodeTitleOverflow)
	const displayValue = $derived(tree.getNodeDisplayValue(node))

	// ── Node tooltip (hover/focus) ──────────────────────────────────────────
	// Rich content comes from the `tooltip` snippet (via context); the plain-text
	// callback is the fallback. The snippet is rendered into a hidden host element
	// which the `tooltip` action adopts into its portaled panel on show (mirrors
	// the KeenMate core createTooltip `content: HTMLElement` path).
	const nodeTooltipSnippet = getContext<Snippet<[LTreeNode<T>, NodeRenderContext]> | undefined>('NodeTooltip')
	const tooltipText = $derived(
		config.getNodeTooltipCallback ? (config.getNodeTooltipCallback({ node }) ?? null) : null
	)
	let tooltipHostEl: HTMLElement | undefined = $state()
	const tooltipContent = $derived(
		nodeTooltipSnippet ? (tooltipHostEl ?? null) : tooltipText
	)
	const tooltipEnabled = $derived(
		!!config.isNodeTooltipsShown &&
			(nodeTooltipSnippet ? !!tooltipHostEl : !!(tooltipText && tooltipText.trim()))
	)

	// ── Per-node icon (dedicated .stv__node-icon element, all nodes) ─────────
	// VALUE from getIconCallback (wins) or iconMember; COLOR from getIconColorCallback
	// or iconColorMember. Default render is `<i class={value}>` (FA-friendly) or, for a
	// non-class value like an emoji, `<i>{value}</i>`; the `icon`
	// snippet (via context) overrides. shouldAlignNodeIcons reserves an empty column.
	const nodeIconSnippet = getContext<Snippet<[LTreeNode<T>, string | null | undefined, NodeRenderContext]> | undefined>('NodeIcon')
	const hasIconSupport = $derived(!!(config.iconMember || config.getIconCallback || nodeIconSnippet))
	const iconValue = $derived.by(() => {
		if (config.getIconCallback) return config.getIconCallback({ node }) ?? null
		if (config.iconMember && node.data) {
			const v = (node.data as any)[config.iconMember]
			return v != null ? String(v) : null
		}
		return null
	})
	// A value that reads as CSS classes (`fa-solid fa-user`) goes on the class; anything
	// else (emoji, symbol, text) is rendered as the element's text.
	const iconIsClassList = $derived(!iconValue || /^\s*-?[A-Za-z_][\w-]*(\s+-?[A-Za-z_][\w-]*)*\s*$/.test(iconValue))
	const iconColor = $derived.by(() => {
		if (config.getIconColorCallback) return config.getIconColorCallback({ node }) ?? null
		if (config.iconColorMember && node.data) {
			const v = (node.data as any)[config.iconColorMember]
			return v != null ? String(v) : null
		}
		return null
	})
	// Render the icon element when there's a snippet, a value, or we're reserving the
	// column (shouldAlignNodeIcons) while icon support is configured.
	const showIcon = $derived(
		!!nodeIconSnippet || !!iconValue || (config.shouldAlignNodeIcons && hasIconSupport)
	)
	const alignIcons = $derived(!!config.shouldAlignNodeIcons)

	// ── Render context passed to the nodeTemplate / icon / tooltip snippets ──
	// Device + container (shared reactive env from Tree) merged with this node's live
	// state, so a snippet can adapt to device/space and selection without re-resolving.
	const renderEnv = getContext<{ deviceClass: NodeRenderContext['deviceClass']; container: { width: number; height: number } } | undefined>('NodeRenderEnv')
	const renderCtx = $derived<NodeRenderContext>({
		deviceClass: renderEnv?.deviceClass ?? 'desktop',
		container: renderEnv?.container ?? { width: 0, height: 0 },
		isExpanded: !!node.isExpanded,
		isChecked: !!node.isChecked,
		isSelected: !!node.isSelected,
		isFocused: !!node.isFocused,
		level: node.level ?? 0,
		hasChildren: !!node.hasChildren
	})

	let labelEl: HTMLElement | undefined = $state()
	let isTruncated = $state(false)

	// Measure clip only in `info` mode. Re-runs when the text changes (displayValue dep)
	// and, via observeElementSize (shared ResizeObserver), whenever the label's box changes
	// (container resize, indent depth, font). scrollWidth > clientWidth ⇒ the ellipsis is cutting.
	$effect(() => {
		if (nodeTitleOverflow !== 'info' || !labelEl || children) {
			isTruncated = false
			return
		}
		const el = labelEl
		void displayValue // dependency: re-measure on content change
		const measure = () => { isTruncated = el.scrollWidth > el.clientWidth + 1 }
		measure()
		return observeElementSize(el, measure)
	})

	// Full-label reveal popover (info mode). One per node, opened on ⓘ click. A manual
	// floating panel (not a hover tooltip, which never fires on touch); dismissed by a
	// second click, an outside pointer, a scroll, or Escape.
	let infoBtnEl: HTMLElement | undefined = $state()
	let revealEl: HTMLElement | undefined = $state()
	let isRevealOpen = $state(false)

	function toggleReveal(e: MouseEvent) {
		e.stopPropagation()
		isRevealOpen = !isRevealOpen
	}

	$effect(() => {
		if (!isRevealOpen || !infoBtnEl || !revealEl) return
		const btn = infoBtnEl
		const panel = revealEl
		const stopAutoUpdate = autoUpdate(btn, panel, () => {
			computePosition(btn, panel, {
				strategy: 'fixed',
				placement: 'top-end',
				middleware: [offset(6), flip(), shift({ padding: 8 })]
			}).then(({ x, y }) => {
				panel.style.left = `${x}px`
				panel.style.top = `${y}px`
			})
		})
		const onOutside = (ev: Event) => {
			const t = ev.target as HTMLElement | null
			if (t !== btn && !panel.contains(t)) isRevealOpen = false
		}
		const onScroll = () => { isRevealOpen = false }
		const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') isRevealOpen = false }
		document.addEventListener('pointerdown', onOutside, true)
		window.addEventListener('scroll', onScroll, true)
		document.addEventListener('keydown', onKey, true)
		return () => {
			stopAutoUpdate()
			document.removeEventListener('pointerdown', onOutside, true)
			window.removeEventListener('scroll', onScroll, true)
			document.removeEventListener('keydown', onKey, true)
		}
	})

	// Glow/drop position is owned by the controller now (pointer-driven drag) and arrives
	// via the `activeDropPosition` prop — no per-node local calculation on dragover.

	// Get allowed drop positions for this node (empty/undefined = all allowed)
	// Uses tree.getNodeAllowedDropPositions which checks callback > member > node property
	const allowedPositions = $derived(tree.getNodeAllowedDropPositions(node));

	// Check if a position is allowed for this node
	function isPositionAllowed(position: DropPosition): boolean {
		if (!allowedPositions || allowedPositions.length === 0) {
			return true; // All positions allowed by default
		}
		return allowedPositions.includes(position);
	}


	// Resolve isCollapsible via tree's resolution method (callback > member > node property)
	const isCollapsible = $derived(tree.getNodeIsCollapsible(node));

	const hasChildren = $derived(node?.hasChildren || false)
	// Root nodes (level 1) sit flush against the left edge; only descendants indent,
	// so the offset is (level - 1) × indent (matches web-treeview's root-at-zero math).
	const indentStyle = $derived(
		`margin-left: calc(${Math.max(0, (node?.level || 1) - 1)} * ${config.flatIndentSize || 'var(--stv-indent-size)'})`
	)

	function toggleExpanded() {
		// Accordion, beforeExpandCallback (lazy loading) and the expand events live in the
		// controller (toggleNodeExpanded) — the same path the API and keyboard take.
		if (node.hasChildren && isCollapsible) callbacks.onToggleExpanded(node)
	}


	function _onNodeClicked(event?: MouseEvent) {
		uiLogger.debug(`Node clicked: ${node.path}`, { id: node.id, hasChildren: node.hasChildren })
		const modifiers = event ? { ctrl: event.ctrlKey || event.metaKey, shift: event.shiftKey } : undefined;
		const hasModifiers = !!(modifiers?.ctrl || modifiers?.shift);

		// Plain click on a selectable node with checkboxes shown → toggle the checkbox
		// instead of focusing/highlighting. Expand still happens if clickBehavior asks for it.
		// Modified clicks (Ctrl/Shift) fall through to the normal multi-highlight path.
		if (shouldClickToggleCheckbox && isCheckboxesShown && node.isSelectable && !hasModifiers) {
			callbacks.onCheckboxToggle(node, { skipFocus: true });
			if (clickBehavior !== 'select') toggleExpanded();
			return;
		}

		if (clickBehavior === 'expand') {
			// Expand only — no selection callback. Ctrl/Shift have no meaning here
			// (no selection to extend), so they shouldn't toggle expand either.
			if (!hasModifiers) toggleExpanded()
		} else if (clickBehavior === 'expand-and-focus') {
			// Select + expand on single click. Modified clicks are reserved for
			// highlight management — don't also toggle expand (matches OS file
			// explorers where Ctrl/Shift+click manages selection without opening).
			callbacks.onNodeClicked(node, modifiers)
			if (!hasModifiers) toggleExpanded()
		} else {
			// 'select' — single click selects only
			callbacks.onNodeClicked(node, modifiers)
		}
	}

	// Note: double-click in clickBehavior='select' is detected on the controller
	// side (see _lastSelectClickPath in TreeController). The browser's native
	// dblclick event isn't reliable here: the first click bumps node._rev for
	// the focus update, which destroys+recreates the row in flat-mode rendering,
	// so the browser sees the two clicks on different elements and skips the
	// dblclick. Manual detection on the (stable) controller avoids that.
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="stv__node {customNodeClass}"
	id="{node.treeId}-{node.id}"
	data-tree-path="{node.path}"
	data-loading={isExpandPending ? '' : undefined}
	aria-busy={isExpandPending ? 'true' : undefined}
	style={indentStyle}
>
	<div class="stv__node-row">
		<!-- Toggle icon with its own click handler -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		{#if hasChildren && isCollapsible}
			<span
				class="stv__toggle-icon stv__clickable stv__toggle-icon--expand"
				class:expanded={node.isExpanded}
				class:stv__toggle-icon--loading={isExpandPending}
				onclick={toggleExpanded}
			></span>
		{:else}
			<span class="stv__toggle-icon {leafIconClass}"></span>
		{/if}

		{#if isCheckboxesShown && node.isSelectable}
			<!-- Canonical single-<input> checkbox — the shared KeenMate render
			     contract (same DOM as web-multiselect / web-treeview): the input IS
			     the box, indeterminate is a modifier class + aria-checked="mixed"
			     (not the native .indeterminate prop, which doesn't survive re-render /
			     virtual scroll). tabindex=-1 keeps keyboard nav scoped to
			     .stv__container; onclick preventDefaults so the controller's
			     node.isChecked stays the source of truth. -->
			<input
				type="checkbox"
				class="stv__checkbox"
				class:stv__checkbox--indeterminate={isIndeterminate}
				checked={node.isChecked && !isIndeterminate}
				aria-checked={isIndeterminate ? 'mixed' : undefined}
				tabindex={-1}
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					callbacks.onCheckboxToggle(node);
				}}
			/>
		{/if}

		{#if showIcon}
			{#if nodeIconSnippet}
				<span class="stv__node-icon" class:stv__node-icon--aligned={alignIcons} style:color={iconColor}>{@render nodeIconSnippet(node, iconValue, renderCtx)}</span>
			{:else}
				<i class="stv__node-icon {iconIsClassList ? (iconValue ?? '') : ''}" class:stv__node-icon--aligned={alignIcons} style:color={iconColor}>{iconIsClassList ? '' : iconValue}</i>
			{/if}
		{/if}

		<!-- Node content with separate click handler -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="stv__node-content {node.isSelected ? selectedNodeClass : ''} {node.isFocused && focusedNodeClass ? focusedNodeClass : ''} {node.isChecked && checkedNodeClass ? checkedNodeClass : ''} {isDraggedNode && draggedNodeClass ? draggedNodeClass : ''} {customNodeContentClass}"
			class:stv__node-content--selected={node.isSelected && !selectedNodeClass}
			class:stv__node-content--focused={node.isFocused}
			class:stv__node-content--focused-default={node.isFocused && !focusedNodeClass}
			class:stv__clickable={node.isSelectable}
			class:stv__node-content--dragged={isDraggedNode && !draggedNodeClass}
			class:stv__node-content--draggable={node?.isDraggable}
			class:stv__node-content--glow-before={dropZoneMode === 'glow' && isDragInProgress && isHoveredForDrop && activeDropPosition === 'before' && isPositionAllowed('before')}
			class:stv__node-content--glow-after={dropZoneMode === 'glow' && isDragInProgress && isHoveredForDrop && activeDropPosition === 'after' && isPositionAllowed('after')}
			class:stv__node-content--glow-child={dropZoneMode === 'glow' && isDragInProgress && isHoveredForDrop && activeDropPosition === 'child' && isPositionAllowed('child')}
			class:stv__node-content--drop-copy={isDragInProgress && isHoveredForDrop && dropOperation === 'copy'}
			onclick={(e) => {
				e.stopPropagation();
				_onNodeClicked(e);
			}}
			oncontextmenu={(e) => {
				e.stopPropagation();
				callbacks.onNodeRightClicked(node, e);
			}}
			onpointerdown={(e) => callbacks.onPointerDown(node, e)}
			use:tooltip={{
				enabled: tooltipEnabled,
				content: tooltipContent,
				placement: config.tooltipPlacement,
				offset: config.tooltipOffset,
				delay: config.tooltipDelay,
				followCursor: config.shouldTooltipFollowCursor
			}}
		>
			{#if children}
				{@render children(node, renderCtx)}
			{:else}
				<span
					class="stv__node-label"
					bind:this={labelEl}
					title={nodeTitleOverflow === 'info' && isTruncated ? displayValue : null}
				>{displayValue}</span>
				{#if nodeTitleOverflow === 'info' && isTruncated}
					<button
						type="button"
						class="stv__node-info"
						aria-label={config.showFullLabel}
						bind:this={infoBtnEl}
						onpointerdown={(e) => e.stopPropagation()}
						onclick={toggleReveal}
					></button>
				{/if}
			{/if}
		</div>

	</div>

	<!-- Full-label reveal (info mode). position: fixed → escapes the tree's overflow clip;
	     placed by @floating-ui relative to the ⓘ button. -->
	{#if isRevealOpen}
		<div class="stv__node-info-reveal" role="tooltip" bind:this={revealEl}>{displayValue}</div>
	{/if}

	<!-- Hidden host for the `tooltip` snippet. The tooltip action adopts this element
	     into its portaled panel on show (and reveals it); it stays display:none here. -->
	{#if nodeTooltipSnippet}
		<div bind:this={tooltipHostEl} style="display:none">{@render nodeTooltipSnippet(node, renderCtx)}</div>
	{/if}

</div>
