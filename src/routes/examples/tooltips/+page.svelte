<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, TooltipPlacement } from '$lib/ltree/types.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type FileItem = { id: number; path: string; name: string; icon: string; desc: string };

	const sampleData: FileItem[] = [
		{ id: 1, path: '1', name: 'Fruits', icon: '🍎', desc: 'Sweet, edible plant fruits' },
		{ id: 2, path: '1.1', name: 'Apple', icon: '🍏', desc: 'Crisp orchard fruit, great raw or baked' },
		{ id: 3, path: '1.2', name: 'Banana', icon: '🍌', desc: 'Potassium-rich berry' },
		{ id: 4, path: '1.3', name: 'Citrus', icon: '🍊', desc: 'Tangy, high in vitamin C' },
		{ id: 5, path: '1.3.1', name: 'Orange', icon: '🍊', desc: 'Juicy citrus staple' },
		{ id: 6, path: '1.3.2', name: 'Lemon', icon: '🍋', desc: '' /* empty → no tooltip */ },
		{ id: 7, path: '2', name: 'Vegetables', icon: '🥦', desc: 'Edible plants & roots' },
		{ id: 8, path: '2.1', name: 'Carrot', icon: '🥕', desc: 'Crunchy orange root' },
		{ id: 9, path: '2.2', name: 'Potato', icon: '🥔', desc: 'Starchy tuber, endlessly versatile' }
	];

	function sortByPath(items: LTreeNode<FileItem>[]) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}

	// TT01 controls
	let placement = $state<TooltipPlacement>('top-start');
	let followCursor = $state(false);
	let delay = $state(400);
	const placements: TooltipPlacement[] = ['top-start', 'top', 'right', 'bottom', 'left'];

	// TT03 sizing — applied as inline --stv-tooltip-* on the tree wrapper (they
	// inherit down into .stv__container, where the portaled tooltip lives).
	type SizeMode = 'auto' | 'min' | 'fixed';
	let sizeMode = $state<SizeMode>('auto');
	const sizeStyle = $derived.by(() => {
		if (sizeMode === 'min') return '--stv-tooltip-min-width: 24rem;';
		if (sizeMode === 'fixed') return '--stv-tooltip-width: 22rem; --stv-tooltip-max-width: none;';
		return '';
	});
</script>

<svelte:head>
	<title>Tooltips - Svelte Treeview</title>
</svelte:head>

<div class="container">
	<header class="example-header">
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Tooltips</h1>
		<p class="subtitle">
			Hover/focus node tooltips — a plain-text callback or a rich snippet, themed through the
			shared <code>--base-tooltip-*</code> tokens (parity with web-multiselect's option tooltips).
		</p>
		<RenderModeSwitch />
	</header>

	<!-- TT01 · Plain-text tooltips -->
	<div class="card">
		<h2>TT01 · Plain-text tooltips</h2>
		<p class="description">
			Set <code>shouldShowNodeTooltips</code> and a <code>getNodeTooltipCallback</code> that
			returns a <strong>string</strong>. The tooltip is portaled out of the row, Floating-UI
			positioned, and shows on hover <em>and</em> keyboard focus. A row whose callback returns an
			empty string (here, <em>Lemon</em>) gets no tooltip.
		</p>

		<div class="controls">
			<span class="muted">Placement:</span>
			{#each placements as p (p)}
				<button class="btn {placement === p ? '' : 'btn-secondary'}" onclick={() => (placement = p)}>{p}</button>
			{/each}
		</div>
		<div class="controls">
			<label><input type="checkbox" bind:checked={followCursor} /> follow cursor</label>
			<span class="muted" style="margin-left:1rem">Show delay:</span>
			<input type="range" min="0" max="1000" step="50" bind:value={delay} />
			<code>{delay}ms</code>
		</div>

		<div class="tree-container">
			<Tree
				data={sampleData}
				idMember="id"
				pathMember="path"
				displayValueMember="name"
				sortCallback={sortByPath}
				isSorted={true}
				expandLevel={3}
				shouldShowNodeTooltips
				getNodeTooltipCallback={(node) => node.data?.desc ?? null}
				tooltipPlacement={placement}
				tooltipFollowCursor={followCursor}
				tooltipDelay={{ show: delay, hide: 100 }}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: LTreeNode<FileItem>)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>

		<p class="hint">
			<code>getNodeTooltipCallback(node) =&gt; string | null</code>. Knobs:
			<code>tooltipPlacement</code> (<code>'top-start'</code>), <code>tooltipDelay</code>
			(<code>{'{ show: 400, hide: 100 }'}</code>), <code>tooltipOffset</code> (<code>8</code>),
			<code>tooltipFollowCursor</code>.
		</p>
	</div>

	<!-- TT02 · Rich snippet tooltips -->
	<div class="card">
		<h2>TT02 · Rich tooltips (the <code>tooltip</code> snippet)</h2>
		<p class="description">
			Pass a <code>tooltip</code> snippet for arbitrary Svelte content — it wins over the string
			callback. The library renders it into a hidden host and adopts it into the portaled panel,
			so it stays reactive. Here: icon + name, description, and the node path.
		</p>

		<div class="tree-container">
			<Tree
				data={sampleData}
				idMember="id"
				pathMember="path"
				displayValueMember="name"
				sortCallback={sortByPath}
				isSorted={true}
				expandLevel={3}
				shouldShowNodeTooltips
				tooltipPlacement="right-start"
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: LTreeNode<FileItem>)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
				{#snippet tooltip(node: LTreeNode<FileItem>)}
					<div class="tip">
						<strong>{node.data?.icon} {node.data?.name}</strong>
						<span class="tip__desc">{node.data?.desc || '—'}</span>
						<span class="tip__path">path {node.data?.path}</span>
					</div>
				{/snippet}
			</Tree>
		</div>
	</div>

	<!-- TT03 · Sizing -->
	<div class="card">
		<h2>TT03 · Sizing</h2>
		<p class="description">
			By default the tooltip <strong>shrink-wraps its content</strong>, capped at
			<code>--stv-tooltip-max-width</code> (320px). Switch the width model: a
			<code>--stv-tooltip-min-width</code> floor (still grows to max-width), or a fixed
			<code>--stv-tooltip-width</code> box (set <code>--stv-tooltip-max-width: none</code> so the
			width wins). The vars are set on the tree wrapper here and inherit into the portaled tooltip.
		</p>

		<div class="controls">
			<span class="muted">Width model:</span>
			<button class="btn {sizeMode === 'auto' ? '' : 'btn-secondary'}" onclick={() => (sizeMode = 'auto')}>auto (shrink)</button>
			<button class="btn {sizeMode === 'min' ? '' : 'btn-secondary'}" onclick={() => (sizeMode = 'min')}>min-width 24rem</button>
			<button class="btn {sizeMode === 'fixed' ? '' : 'btn-secondary'}" onclick={() => (sizeMode = 'fixed')}>fixed 22rem</button>
		</div>

		<div class="tree-container" style={sizeStyle}>
			<Tree
				data={sampleData}
				idMember="id"
				pathMember="path"
				displayValueMember="name"
				sortCallback={sortByPath}
				isSorted={true}
				expandLevel={3}
				shouldShowNodeTooltips
				getNodeTooltipCallback={(node) => node.data?.desc || node.data?.name || null}
				{...getTreeProps()}
			>
				{#snippet nodeTemplate(node: LTreeNode<FileItem>)}
					<span>{node.data?.icon} {node.data?.name}</span>
				{/snippet}
			</Tree>
		</div>

		<div class="code-block">
			<pre>{`/* fixed box — disable shrink */
:global(.stv__tooltip) {
  --stv-tooltip-width: 22rem;
  --stv-tooltip-max-width: none;
}
/* or a floor that still grows up to max-width */
:global(.stv__tooltip) { --stv-tooltip-min-width: 24rem; }`}</pre>
		</div>
	</div>

	<!-- TT04 · Variable reference -->
	<div class="card">
		<h2>TT04 · Tooltip CSS variables</h2>
		<p class="description">
			All chain to the shared <code>--base-tooltip-*</code> contract (so a KeenMate theme retints
			the tooltip), each with a hardcoded fallback. Sizes are <code>calc(N × --stv-rem)</code>.
		</p>
		<table class="reference-table">
			<thead><tr><th>Variable</th><th>Default</th><th>Effect</th></tr></thead>
			<tbody>
				<tr><td><code>--stv-tooltip-bg</code></td><td><code>--base-tooltip-bg</code> → inverse / light-dark</td><td>Background</td></tr>
				<tr><td><code>--stv-tooltip-color</code></td><td><code>--base-tooltip-text-color</code> → light-dark</td><td>Text color</td></tr>
				<tr><td><code>--stv-tooltip-padding</code></td><td><code>0.8×rem 1.2×rem</code> (8px 12px)</td><td>Inner spacing</td></tr>
				<tr><td><code>--stv-tooltip-font-size</code></td><td><code>1.4×rem</code> (14px)</td><td>Text size</td></tr>
				<tr><td><code>--stv-tooltip-width</code></td><td><code>auto</code></td><td>Fixed box when set (shrink off)</td></tr>
				<tr><td><code>--stv-tooltip-min-width</code></td><td><code>0</code></td><td>Floor (still grows to max)</td></tr>
				<tr><td><code>--stv-tooltip-max-width</code></td><td><code>32×rem</code> (320px)</td><td>Wrap point / cap</td></tr>
				<tr><td><code>--stv-tooltip-border-radius</code></td><td><code>--base-border-radius-lg</code></td><td>Corner rounding</td></tr>
				<tr><td><code>--stv-tooltip-shadow</code></td><td><code>0 2px 8px rgba(0,0,0,.15)</code></td><td>Drop shadow</td></tr>
				<tr><td><code>--stv-tooltip-z-index</code></td><td><code>10000</code></td><td>Stacking order</td></tr>
			</tbody>
		</table>
		<p class="hint">
			Related but distinct: <code>nodeTitleOverflow="info"</code> is a <em>click</em> reveal that
			appears only on clipped labels — not a hover tooltip.
		</p>
	</div>

	<footer>
		<p><a href="/">&larr; Back to Examples</a></p>
	</footer>
</div>

<style>
	/* Tooltip snippet content. The library paints the portaled .stv__tooltip surface;
	   this lays out the inner lines. :global because it's portaled into .stv__container. */
	:global(.tip) {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	:global(.tip__desc) {
		opacity: 0.85;
	}
	:global(.tip__path) {
		font-size: 0.85em;
		opacity: 0.6;
		font-variant-numeric: tabular-nums;
	}
</style>
