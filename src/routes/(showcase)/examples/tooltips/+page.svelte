<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, NodeRenderContext, TooltipPlacement } from '$lib/ltree/types.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	type FileItem = { id: number; path: string; name: string; icon: string; desc: string };

	const sampleData: FileItem[] = [
		{ id: 1, path: '1', name: 'Fruits', icon: '🍎', desc: 'Sweet, edible plant fruits' },
		{ id: 2, path: '1.1', name: 'Apple', icon: '🍏', desc: 'Crisp orchard fruit' },
		{ id: 3, path: '1.2', name: 'Banana', icon: '🍌', desc: 'Potassium-rich berry' },
		{ id: 4, path: '1.3', name: 'Citrus', icon: '🍊', desc: 'Tangy, high in vitamin C' },
		{ id: 5, path: '1.3.1', name: 'Orange', icon: '🍊', desc: 'Juicy citrus staple' },
		{ id: 6, path: '1.3.2', name: 'Lemon', icon: '🍋', desc: '' /* empty → no tooltip */ },
		{ id: 7, path: '2', name: 'Vegetables', icon: '🥦', desc: 'Edible plants & roots' },
		{ id: 8, path: '2.1', name: 'Carrot', icon: '🥕', desc: 'Crunchy orange root' },
		{ id: 9, path: '2.2', name: 'Potato', icon: '🥔', desc: 'Starchy tuber' },
		{ id: 10, path: '2.3', name: 'Spinach', icon: '🥬', desc: 'Leafy green, eaten raw in salads or cooked; rich in iron, folate and vitamins A, C and K, and one of the quickest crops to grow' }
	];

	function sortByPath({ nodes: items }: { nodes: LTreeNode<FileItem>[] }) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}

	// TT01 controls
	let placement = $state<TooltipPlacement>('top-start');
	let followCursor = $state(false);
	let delay = $state(400);
	let offset = $state(8);
	const placements: TooltipPlacement[] = [
		'top-start', 'top', 'top-end',
		'right-start', 'right', 'right-end',
		'bottom-start', 'bottom', 'bottom-end',
		'left-start', 'left', 'left-end'
	];

	// TT03 sizing — the library declares --stv-tooltip-* on .stv__container, so a value set
	// on a wrapper is shadowed there. The wrapper carries page vars (--tt-*) instead and
	// .tt-sizing (style below) maps them onto .stv__container. An empty field falls back to
	// the variable's own default; an empty max-width means `none`. 0 (or less) counts as empty: a
	// fixed `width: 0px` + a min-width would pin the box at the min-width, never growing.
	let tipWidth = $state<number | null>(null);
	let tipMinWidth = $state<number | null>(null);
	let tipMaxWidth = $state<number | null>(320);
	const sizeStyle = $derived(
		[
			tipWidth != null && tipWidth > 0 && `--tt-width: ${tipWidth}px`,
			tipMinWidth != null && tipMinWidth > 0 && `--tt-min-width: ${tipMinWidth}px`,
			`--tt-max-width: ${tipMaxWidth != null && tipMaxWidth > 0 ? `${tipMaxWidth}px` : 'none'}`
		]
			.filter(Boolean)
			.join('; ')
	);

	// TT04 theme reaction — the tree's per-instance `theme` (undefined = follow the page).
	let tipTheme = $state<'light' | 'dark' | undefined>(undefined);
</script>

<svelte:head>
	<title>Tooltips - Svelte Treeview</title>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Tooltips</h1>
	<p class="subtitle">
		Hover/focus node tooltips — the direct analog of <code>@keenmate/web-multiselect</code>'s
		option tooltips, built on the shared <code>createTooltip</code> core primitive and themed
		through the same <code>--base-tooltip-*</code> tokens.
	</p>
	<RenderModeSwitch />
</header>

<!-- TT01 · Plain-text tooltips -->
<div class="card">
	<h2>TT01 · Plain-text tooltips</h2>
	<p class="description">
		Set <code>isNodeTooltipsShown</code> and a <code>getNodeTooltipCallback</code> that
		returns a <strong>string</strong>. The tooltip is portaled out of the row, Floating-UI
		positioned, and shows on hover <em>and</em> keyboard focus. A row whose callback returns an
		empty string (here, <em>Lemon</em>) gets no tooltip.
	</p>

	<!-- Same controls, same order as web-treeview's TT01. -->
	<div class="controls">
		<label>Placement
			<select id="tt-placement" bind:value={placement}>
				{#each placements as p (p)}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</label>
		<label>Show delay
			<input id="tt-delay" type="range" min="0" max="1000" step="50" bind:value={delay} />
			<code>{delay}ms</code>
		</label>
		<label>Offset
			<input id="tt-offset" type="range" min="0" max="24" step="1" bind:value={offset} />
			<code>{offset}px</code>
		</label>
		<label><input type="checkbox" id="tt-follow" bind:checked={followCursor} /> follow cursor</label>
	</div>

	<div class="tree-container">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={3}
			isNodeTooltipsShown
			getNodeTooltipCallback={({ node }) => node.data?.desc ?? null}
			tooltipPlacement={placement}
			shouldTooltipFollowCursor={followCursor}
			tooltipDelay={{ show: delay, hide: 100 }}
			tooltipOffset={offset}
			{...getTreeProps()}
		>
		</Tree>
	</div>

	<p class="form-text">
		<code>getNodeTooltipCallback(&#123; node &#125;) =&gt; string | null</code>. Return
		<code>null</code> / empty to skip a row. Tune timing with <code>tooltipDelay</code>
		(default <code>{'{ show: 400, hide: 100 }'}</code>), <code>tooltipPlacement</code>
		(<code>'top-start'</code>), <code>tooltipOffset</code> (<code>8</code>) and
		<code>shouldTooltipFollowCursor</code>.
	</p>
</div>

<!-- TT02 · Rich snippet tooltips -->
<div class="card">
	<h2>TT02 · Rich tooltips (the <code>tooltip</code> snippet)</h2>
	<p class="description">
		Pass a <code>tooltip</code> snippet for arbitrary Svelte content — it wins over the string
		callback (web-treeview's analog: return an <code>HTMLElement</code> from the callback). It
		gets the node, so the content can show its place in the tree: here a bold icon + name, the
		description in italics, and a chip — <em>folder · N items</em> for a branch, <em>leaf</em>
		otherwise — with the level and path. The library renders it into a hidden host and adopts it
		into the portaled panel, so it stays reactive: the second row of chips reads
		<code>isSelected</code> / <code>isChecked</code> / <code>isExpanded</code> from the render
		context. Click a row, tick a checkbox or press <kbd>Space</kbd> / <kbd>Enter</kbd> with a
		tooltip open — it follows. Tooltip content is display-only: no buttons or links.
	</p>

	<div class="tree-container">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={3}
			isNodeTooltipsShown
			isCheckboxesShown
			{...getTreeProps()}
		>
			{#snippet tooltip(node: LTreeNode<FileItem>, ctx: NodeRenderContext)}
				{@const count = Object.keys(node.children ?? {}).length}
				<div class="tip">
					<strong class="tip__name">{node.data?.icon} {node.data?.name}</strong>
					<span class="tip__desc">{node.data?.desc || 'No description'}</span>
					<span class="tip__chip" class:tip__chip--branch={count > 0}>
						{count ? `folder · ${count} item${count === 1 ? '' : 's'}` : 'leaf'} · level {node.level} · path {node.path}
					</span>
					<span class="tip__states">
						<span class="tip__state" class:tip__state--on={ctx.isSelected}>{ctx.isSelected ? '✓' : '✗'} selected</span>
						<span class="tip__state" class:tip__state--on={ctx.isChecked}>{ctx.isChecked ? '✓' : '✗'} checked</span>
						{#if count}
							<span class="tip__state" class:tip__state--on={ctx.isExpanded}>{ctx.isExpanded ? '✓' : '✗'} expanded</span>
						{/if}
					</span>
				</div>
			{/snippet}
		</Tree>
	</div>
</div>

<!-- TT03 · Sizing -->
<div class="card">
	<h2>TT03 · Sizing</h2>
	<p class="description">
		Three variables size the tooltip box. <code>--stv-tooltip-width</code> is <code>auto</code>
		(shrink to the content) by default, capped by <code>--stv-tooltip-max-width</code> (the wrap
		point, <code>32 × --stv-rem</code> = 320px); <code>--stv-tooltip-min-width</code> sets a floor
		that still grows up to the max. For a fixed box set a width and clear the max
		(<code>none</code>). Change the values and hover a row — short and long descriptions show the
		difference.
	</p>

	<div class="controls">
		<label title="Tooltip width in px (--stv-tooltip-width). Empty = auto (shrink to the content)."><code>--stv-tooltip-width</code> (px):
			<input type="number" id="tw-width" min="40" max="600" step="10" placeholder="auto" class="w-xs" bind:value={tipWidth} /></label>
		<label title="Minimum tooltip width in px (--stv-tooltip-min-width). Empty = 0 (no floor)."><code>--stv-tooltip-min-width</code> (px):
			<input type="number" id="tw-min" min="0" max="600" step="10" placeholder="0" class="w-xs" bind:value={tipMinWidth} /></label>
		<label title="Maximum tooltip width in px before the text wraps (--stv-tooltip-max-width). Empty = none."><code>--stv-tooltip-max-width</code> (px):
			<input type="number" id="tw-max" min="40" max="600" step="10" placeholder="none" class="w-xs" bind:value={tipMaxWidth} /></label>
	</div>

	<div class="tree-container tt-sizing" style={sizeStyle}>
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={3}
			isNodeTooltipsShown
			getNodeTooltipCallback={({ node }) => node.data?.desc || node.data?.name || null}
			{...getTreeProps()}
		>
		</Tree>
	</div>

	<div class="code-block" data-language="css">
		<pre>{`/* fixed box — disable shrink */
:global(.stv__tooltip) {
  --stv-tooltip-width: 22rem;
  --stv-tooltip-max-width: none;
}
/* or a floor that still grows up to max-width */
:global(.stv__tooltip) { --stv-tooltip-min-width: 24rem; }`}</pre>
	</div>
</div>

<!-- TT04 · Theme reaction -->
<div class="card">
	<h2>TT04 · Theme reaction</h2>
	<p class="description">
		The tooltip surface reads the shared <code>--base-tooltip-*</code> tokens (with a
		light/dark fallback), so it retints with the component theme. Flip the theme and hover
		a row — the tooltip follows, identical to how web-multiselect's option tooltip renders.
	</p>

	<div class="controls">
		<button class:secondary={tipTheme !== undefined} onclick={() => (tipTheme = undefined)}>Auto</button>
		<button class:secondary={tipTheme !== 'light'} onclick={() => (tipTheme = 'light')}>Light</button>
		<button class:secondary={tipTheme !== 'dark'} onclick={() => (tipTheme = 'dark')}>Dark</button>
	</div>

	<div class="tree-container">
		<Tree
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			iconMember="icon"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={2}
			isNodeTooltipsShown
			getNodeTooltipCallback={({ node }) => node.data?.desc || node.data?.name || null}
			theme={tipTheme}
			{...getTreeProps()}
		>
		</Tree>
	</div>
</div>

<!-- TT05 · Variable reference -->
<div class="card">
	<h2>TT05 · Tooltip CSS variables</h2>
	<p class="description">
		All chain to the shared <code>--base-tooltip-*</code> contract (so a Keenmate theme retints
		the tooltip), each with a fallback. Sizes are <code>calc(N × --stv-rem)</code>.
	</p>
	<table class="reference-table">
		<thead><tr><th>Variable</th><th>Default</th><th>Effect</th></tr></thead>
		<tbody>
			<tr><td><code>--stv-tooltip-bg</code></td><td><code>--base-tooltip-bg</code> → inverse of the tree surface (light-dark)</td><td>Background</td></tr>
			<tr><td><code>--stv-tooltip-text-color</code></td><td><code>--base-tooltip-text-color</code> → tree background (light-dark)</td><td>Text color</td></tr>
			<tr><td><code>--stv-tooltip-padding</code></td><td><code>0.8×rem 1.2×rem</code> (8px 12px)</td><td>Inner spacing</td></tr>
			<tr><td><code>--stv-tooltip-font-size</code></td><td><code>--base-font-size-sm</code> (1.4) × rem (14px)</td><td>Text size</td></tr>
			<tr><td><code>--stv-tooltip-width</code></td><td><code>auto</code></td><td>Fixed box when set (shrink off)</td></tr>
			<tr><td><code>--stv-tooltip-min-width</code></td><td><code>0</code></td><td>Floor (still grows to max)</td></tr>
			<tr><td><code>--stv-tooltip-max-width</code></td><td><code>32×rem</code> (320px)</td><td>Wrap point / cap</td></tr>
			<tr><td><code>--stv-tooltip-border-radius</code></td><td><code>--stv-border-radius-lg</code></td><td>Corner rounding</td></tr>
			<tr><td><code>--stv-tooltip-box-shadow</code></td><td><code>--base-shadow-md</code> → <code>0 2px 8px</code> shadow color</td><td>Drop shadow</td></tr>
			<tr><td><code>--stv-tooltip-z-index</code></td><td><code>--base-z-tooltip</code> → <code>9000</code></td><td>Stacking order</td></tr>
		</tbody>
	</table>
	<p class="form-text">
		Related but distinct: <code>nodeTitleOverflow="info"</code> is a <em>click</em> reveal that
		appears only on clipped labels — not a hover tooltip.
	</p>
</div>

<style>
	/* TT03: page vars → the tree's own tooltip vars (see sizeStyle). */
	.tt-sizing :global(.stv__container) {
		--stv-tooltip-width: var(--tt-width, auto);
		--stv-tooltip-min-width: var(--tt-min-width, 0);
		--stv-tooltip-max-width: var(--tt-max-width, calc(32 * var(--stv-rem)));
	}

	/* Tooltip snippet content (= web-treeview's TT02 element). The library paints the portaled
	   .stv__tooltip surface; this lays out the inner lines. :global because it's portaled into
	   .stv__container. */
	:global(.tip) {
		display: grid;
		gap: 0.25rem;
		white-space: normal;
	}
	:global(.tip__name) {
		font-size: 1.05em;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	:global(.tip__desc) {
		opacity: 0.8;
		font-style: italic;
	}
	:global(.tip__chip) {
		justify-self: start;
		margin-top: 0.15rem;
		padding: 0 0.45rem;
		border-radius: 999px;
		font-size: 0.85em;
		border: 1px solid currentColor;
		opacity: 0.75;
	}
	:global(.tip__chip--branch) {
		background: #2563eb;
		color: #fff;
		border: 0;
		opacity: 1;
	}
	:global(.tip__states) {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	:global(.tip__state) {
		padding: 0 0.45rem;
		border-radius: 999px;
		font-size: 0.85em;
		border: 1px dashed currentColor;
		opacity: 0.6;
	}
	:global(.tip__state--on) {
		background: #16a34a;
		color: #fff;
		border: 0;
		opacity: 1;
	}
</style>
