<script lang="ts" generics="T">
	import {type LTreeNode} from "../ltree/ltree-node.svelte.js"
	import {getContext, type Snippet} from "svelte"
	import type {Ltree, DropPosition, DropOperation, NodeRenderContext} from "../ltree/types.js"
	import type {NodeCallbacks, NodeConfig} from "../core/TreeEngine.svelte.js"
	import { observeElementSize } from "../vendor/core/environment/element-size.js"
	import { createPopover } from "../vendor/core/positioning/popover.js"
	import { tooltip } from "../actions/tooltip.js"
	import { rowDomId } from "../helpers/string-helpers.js"

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
	// renders the single `stv__toggle-icon--expand` class + the `stv__toggle-icon--expanded` modifier.
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
	// Row animation: only rows the last expand revealed play the enter keyframes
	// (a _rev re-key re-mounts the row — mounting alone must not animate).
	const isOpening = $derived(config.revealedPaths?.has(node.path) ?? false);
	// Collapse half: core animateOut adds the closing class to the live element; this keeps
	// it (and inert) when a _rev re-key re-creates the row mid-animation.
	const isClosing = $derived(config.closingPaths?.has(node.path) ?? false);
	// An async beforeExpandCallback is in flight for this node (lazy load): the toggle
	// shows the loader and the row carries aria-busy + data-loading.
	const isExpandPending = $derived(config.expandPendingPaths?.has(node.path) ?? false);
	// Data-driven per-row classes. The callbacks read node data; recompute when the
	// node's _rev bumps (same trigger the rest of the render uses).
	const customNodeClass = $derived(config.getNodeClassCallback ? (config.getNodeClassCallback({ node }) ?? '') : '');
	const customNodeContentClass = $derived(config.getNodeContentClassCallback ? (config.getNodeContentClassCallback({ node }) ?? '') : '');
	// dragOverNodeClass is applied to the DOM directly by the controller
	// (see hoveredNodeForDrop $effect in TreeEngine) — no per-Node binding.
	const isCheckboxesShown = $derived(config.isCheckboxesShown);
	const checkboxMode = $derived(config.checkboxMode);

	// Indeterminate state: driven by controller's _reconcileCascadeStates
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
	// the Keenmate core createTooltip `content: HTMLElement` path).
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
	// or iconColorMember. The wrapper is always a <span>; inside it core renderIcon's markup
	// (config.renderIconHtml: markup → built-in name → renderIconCallback → page hook →
	// icon-font `<i class="stv__icon …">` → text); the `icon` snippet (via context)
	// overrides. shouldAlignNodeIcons reserves an empty column.
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

	// Full-label reveal popover (info mode). One per node, opened on ⓘ click — a click panel
	// (not a hover tooltip, which never fires on touch). Core createPopover (same as
	// web-treeview): a second click toggles it; Escape / an outside press close it through
	// core's overlay tree (one level per Escape, focus back on the ⓘ); a scroll that MOVES the
	// row closes it (a scroll inside the panel doesn't). The panel stays where Svelte renders
	// it (shouldKeepMounted — position: fixed escapes the tree's overflow clip).
	let infoBtnEl: HTMLElement | undefined = $state()
	let revealEl: HTMLElement | undefined = $state()
	let isRevealOpen = $state(false)

	function toggleReveal(e: MouseEvent) {
		e.stopPropagation()
		isRevealOpen = !isRevealOpen
	}

	$effect(() => {
		if (!isRevealOpen || !infoBtnEl || !revealEl) return
		const handle = createPopover({
			reference: infoBtnEl,
			panel: revealEl,
			shouldKeepMounted: true,
			placement: 'top-end',
			offset: 6,
			shouldCloseOnEscape: true,
			shouldCloseOnOutsideClick: true,
			shouldCloseOnScroll: true,
			closeCallback: () => { isRevealOpen = false }
		})
		handle.open()
		return () => handle.destroy()
	})

	// Glow/drop position is owned by the controller now (pointer-driven drag) and arrives
	// via the `activeDropPosition` prop — no per-node local calculation on dragover.

	// Whether this node takes a drop at `position` (callback > member > node property; none = all)
	function isPositionAllowed(position: DropPosition): boolean {
		return tree.isDropPositionAllowed(node, position);
	}


	// Resolve isCollapsible via tree's resolution method (callback > member > node property)
	const isCollapsible = $derived(tree.getNodeIsCollapsible(node));

	const hasChildren = $derived(node?.hasChildren || false)

	// ARIA tree (role="treeitem"): set position over the visible siblings, and the checked
	// state only on a row that shows a checkbox (mixed = indeterminate). Same as web-treeview.
	const ariaPosition = $derived(config.ariaPositions?.get(node.path))
	const ariaChecked = $derived(
		!isCheckboxesShown || !node.isSelectable ? undefined : isIndeterminate ? ('mixed' as const) : !!node.isChecked
	)
	// Root nodes (level 1) sit flush against the left edge; only descendants indent,
	// so the offset is (level - 1) × indent (matches web-treeview's root-at-zero math).
	const indentStyle = $derived(
		`margin-left: calc(${Math.max(0, (node?.level || 1) - 1)} * ${config.flatIndentSize || 'var(--stv-indent-size)'})`
	)

	function toggleExpanded() {
		// Accordion, beforeExpandCallback (lazy loading) and the expand events live in the
		// controller (toggleNodeExpanded) — the same path the API and keyboard take.
		if (node.hasChildren && isCollapsible) callbacks.handleToggleClick(node)
	}


	// Click routing (checkbox-on-click, clickBehavior) is the engine's handleNodeClick.
	function _handleNodeSelectClick(event?: MouseEvent) {
		callbacks.handleNodeContentClick(node, event)
	}

	// Note: double-click in clickBehavior='select' is detected on the controller
	// side (see _lastSelectClickPath in TreeEngine). The browser's native
	// dblclick event isn't reliable here: the first click bumps node._rev for
	// the focus update, which destroys+recreates the row in flat-mode rendering,
	// so the browser sees the two clicks on different elements and skips the
	// dblclick. Manual detection on the (stable) controller avoids that.
</script>

<!-- The tree (.stv__container, role="tree") keeps focus and points aria-activedescendant at
     the focused row — a treeitem is never focused itself, so it carries no tabindex. -->
<!-- svelte-ignore a11y_role_has_required_aria_props, a11y_interactive_supports_focus -->
<div
	class="stv__node {customNodeClass}"
	class:stv__node--opening={isOpening}
	class:stv__node--closing={isClosing}
	inert={isClosing || undefined}
	id={rowDomId(node.treeId, node.path)}
	role="treeitem"
	aria-level={node.level ?? undefined}
	aria-posinset={ariaPosition?.[0]}
	aria-setsize={ariaPosition?.[1]}
	aria-expanded={hasChildren ? !!node.isExpanded : undefined}
	aria-selected={!!node.isSelected}
	aria-checked={ariaChecked}
	data-tree-path="{node.path}"
	data-loading={isExpandPending ? '' : undefined}
	aria-busy={isExpandPending ? 'true' : undefined}
	style={indentStyle}
>
	<div class="stv__node-row">
		<!-- Toggle icon with its own click handler -->
		{#if hasChildren && isCollapsible}
			<!-- Pointer-only: the keyboard expands through the tree (ArrowRight / ArrowLeft / Enter). -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<span
				class="stv__toggle-icon stv__clickable stv__toggle-icon--expand"
				class:stv__toggle-icon--expanded={node.isExpanded}
				class:stv__toggle-icon--loading={isExpandPending}
				onclick={toggleExpanded}
			></span>
		{:else}
			<span class="stv__toggle-icon {leafIconClass}"></span>
		{/if}

		{#if isCheckboxesShown && node.isSelectable}
			<!-- Canonical single-<input> checkbox — the shared Keenmate render
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
					callbacks.handleCheckboxToggle(node);
				}}
			/>
		{/if}

		{#if showIcon}
			{#if nodeIconSnippet}
				<span class="stv__node-icon" class:stv__node-icon--aligned={alignIcons} style:color={iconColor}>{@render nodeIconSnippet(node, iconValue, renderCtx)}</span>
			{:else}
				<span class="stv__node-icon" class:stv__node-icon--aligned={alignIcons} style:color={iconColor}>{@html iconValue ? config.renderIconHtml(iconValue, node, renderCtx) : ''}</span>
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
				_handleNodeSelectClick(e);
			}}
			oncontextmenu={(e) => {
				e.stopPropagation();
				callbacks.handleNodeContextMenu(node, e);
			}}
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
	     placed by core createPopover relative to the ⓘ button. -->
	{#if isRevealOpen}
		<div class="stv__node-info-reveal" role="tooltip" bind:this={revealEl}>{displayValue}</div>
	{/if}

	<!-- Hidden host for the `tooltip` snippet. The tooltip action adopts this element
	     into its portaled panel on show (and reveals it); it stays display:none here. -->
	{#if nodeTooltipSnippet}
		<div bind:this={tooltipHostEl} style="display:none">{@render nodeTooltipSnippet(node, renderCtx)}</div>
	{/if}

</div>
