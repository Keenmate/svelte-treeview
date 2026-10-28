<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, NodesReorderContext } from '$lib/ltree/types.js';

	// Fixture for isSortingEnabled + sortNodes / sortAll + onNodesReorder.
	// Targeted by e2e/sorting.spec.ts.

	type Item = { id: number; path: string; name: string; order: number };

	const sampleData: Item[] = [
		{ id: 3, path: '3', name: 'C', order: 30 },
		{ id: 1, path: '1', name: 'A', order: 10 },
		{ id: 32, path: '3.2', name: 'Item 10', order: 20 },
		{ id: 31, path: '3.1', name: 'Item 2', order: 10 },
		{ id: 2, path: '2', name: 'B', order: 20 }
	];

	let treeRef: Tree<Item>;
	let isSortingEnabled = $state(false);
	let reorders = $state<string[]>([]);

	function onNodesReorder(ctx: NodesReorderContext<Item>) {
		reorders = [
			...reorders,
			`${ctx.parentPath || '(root)'}: ` +
				ctx.changes.map((c) => `${c.path} ${c.oldOrder}->${c.newOrder}`).join(', ')
		];
	}
	const byNameDesc = ({ a, b }: { a: LTreeNode<Item>; b: LTreeNode<Item> }) =>
		(b.data?.name ?? '').localeCompare(a.data?.name ?? '');
</script>

<svelte:head>
	<title>Test — Sorting Fixture</title>
</svelte:head>

<main>
	<h1>Sorting Test Fixture</h1>

	<div class="controls">
		<label>
			<input type="checkbox" data-testid="sorting-enabled" bind:checked={isSortingEnabled} />
			isSortingEnabled
		</label>
		<button data-testid="add-node" onclick={() => treeRef?.addNode('', { id: 9, path: '', name: '0 new', order: 5 })}>
			addNode('', '0 new')
		</button>
		<button data-testid="sort-root" onclick={() => treeRef?.sortNodes('')}>sortNodes('')</button>
		<button data-testid="sort-all-desc" onclick={() => treeRef?.sortAll(null, { direction: 'desc' })}>
			sortAll(null, desc)
		</button>
		<button data-testid="sort-root-compare" onclick={() => treeRef?.sortNodes('', { compareCallback: byNameDesc })}>
			sortNodes('', compareCallback)
		</button>
		<button
			data-testid="sort-root-compare-silent"
			onclick={() => treeRef?.sortNodes('', { compareCallback: byNameDesc, isSilent: true })}
		>
			sortNodes('', compareCallback, isSilent)
		</button>
	</div>

	<pre data-testid="reorders">{reorders.join('\n')}</pre>

	<div class="tree-container">
		<Tree
			bind:this={treeRef}
			nodes={sampleData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			orderMember="order"
			{isSortingEnabled}
			{onNodesReorder}
			expandLevel={5}
		/>
	</div>
</main>
