<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// Fixture for the node tooltip API (shouldShowNodeTooltips + getNodeTooltipCallback
	// + `tooltip` snippet). Targeted by e2e/tooltip.spec.ts. Two trees: one callback
	// (plain text), one snippet (rich content). delay 0 so hover shows immediately.

	type Item = { id: number; path: string; name: string; desc: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Fruits', desc: 'Sweet edible plant fruits' },
		{ id: 2, path: '1.1', name: 'Apple', desc: 'Crisp orchard fruit' },
		{ id: 3, path: '1.2', name: 'Plain', desc: '' }
	];
	function sortByPath(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path));
	}

	let enabled = $state(true);
	const tip = (node: LTreeNode<Item>) => node.data?.desc ?? null;
</script>

<h1>tooltip test</h1>

<div class="controls">
	<button data-testid="toggle" onclick={() => (enabled = !enabled)} aria-pressed={enabled}>
		tooltips: {enabled ? 'on' : 'off'}
	</button>
</div>

<h2>callback (plain text)</h2>
<div class="tree" data-testid="tree-callback">
	<Tree
		{data}
		idMember="id"
		pathMember="path"
		sortCallback={sortByPath}
		isSorted={true}
		displayValueMember="name"
		expandLevel={2}
		shouldShowNodeTooltips={enabled}
		getNodeTooltipCallback={tip}
		tooltipDelay={0}
	/>
</div>

<h2>snippet (rich)</h2>
<div class="tree" data-testid="tree-snippet">
	<Tree
		{data}
		idMember="id"
		pathMember="path"
		sortCallback={sortByPath}
		isSorted={true}
		displayValueMember="name"
		expandLevel={2}
		shouldShowNodeTooltips={enabled}
		tooltipDelay={0}
	>
		{#snippet tooltip(node: LTreeNode<Item>)}
			<div class="tip" data-testid="tip-content">
				<strong>{node.data?.name}</strong>
				<span>{node.data?.desc}</span>
			</div>
		{/snippet}
	</Tree>
</div>

<style>
	.tree {
		width: 280px;
		border: 1px solid #ccc;
		margin-bottom: 1rem;
	}
	.controls {
		margin-bottom: 0.5rem;
	}
	.tip {
		display: flex;
		flex-direction: column;
	}
</style>
