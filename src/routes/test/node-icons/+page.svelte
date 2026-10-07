<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// Fixture for per-node icons (iconMember/getIconCallback + iconColorMember +
	// `icon` snippet), rendered on ALL nodes. Targeted by e2e/node-icons.spec.ts.

	type Item = { id: number; path: string; name: string; icon: string; color?: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Region', icon: 'fa-sitemap', color: '#7c3aed' },
		{ id: 2, path: '1.1', name: 'Manager', icon: 'fa-user-tie', color: '#2563eb' },
		{ id: 3, path: '1.1.1', name: 'Employee', icon: 'fa-user' },
		{ id: 4, path: '1.2', name: 'Branch', icon: 'fa-building' }
	];
	function sortByPath(items: LTreeNode<Item>[]) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path));
	}

	// Tree A — default render: iconMember value becomes a class on <i>, color from iconColorMember.
	// Tree B — the `icon` snippet (rich: inline SVG), receiving the resolved value.
</script>

<h1>node icons test</h1>

<h2>default (class on &lt;i&gt; + iconColorMember)</h2>
<div class="tree" data-testid="tree-default">
	<Tree
		{data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		iconMember="icon"
		iconColorMember="color"
		shouldAlignNodeIcons
	/>
</div>

<h2>icon snippet (receives resolved value)</h2>
<div class="tree" data-testid="tree-snippet">
	<Tree
		{data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		iconMember="icon"
	>
		{#snippet icon(node: LTreeNode<Item>, value: string | null | undefined)}
			<span data-testid="snippet-icon" data-value={value}>★</span>
		{/snippet}
	</Tree>
</div>

<style>
	.tree {
		width: 320px;
		border: 1px solid #ccc;
		margin-bottom: 1rem;
	}
</style>
