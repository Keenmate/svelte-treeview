<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, NodeRenderContext } from '$lib/ltree/types.js';

	// Fixture for NodeRenderContext passed into the render snippets. The `icon` snippet
	// stamps the ctx fields onto data-attributes so e2e can assert them.
	// Targeted by e2e/render-context.spec.ts.

	type Item = { id: number; path: string; name: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Root' },
		{ id: 2, path: '1.1', name: 'Child' },
		{ id: 3, path: '1.1.1', name: 'Leaf' }
	];
	function sortByPath(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path));
	}
</script>

<h1>render context test</h1>

<div class="tree" data-testid="tree">
	<Tree
		{data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		selectionMode="multi"
		shouldShowCheckboxes
		getIconCallback={() => 'dot'}
	>
		{#snippet icon(_node: LTreeNode<Item>, _value: string | null | undefined, ctx: NodeRenderContext)}
			<span
				data-testid="ctx"
				data-device={ctx.deviceClass}
				data-level={ctx.level}
				data-haschildren={ctx.hasChildren}
				data-expanded={ctx.isExpanded}
				data-selected={ctx.isSelected}
				data-highlighted={ctx.isHighlighted}
				data-focused={ctx.isFocused}
				data-cw={ctx.container.width}
			>•</span>
		{/snippet}
	</Tree>
</div>

<style>
	.tree {
		width: 300px;
		border: 1px solid #ccc;
	}
</style>
