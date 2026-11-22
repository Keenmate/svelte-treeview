<script lang="ts">
	// Custom-renderer pointer drag (TreeProvider + controller.attachPointerDrag). Targeted by
	// e2e/custom-drag.spec.ts. Each item is a [data-tree-path] drop target with three
	// [data-drop-position] pads; Bravo only allows before / after (its "child" pad is not a target).
	import TreeProvider from '$lib/components/TreeProvider.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	type Item = { id: number; path: string; name: string };

	const nodes: Item[] = [
		{ id: 1, path: '1', name: 'Alpha' },
		{ id: 2, path: '2', name: 'Bravo' },
		{ id: 3, path: '3', name: 'Charlie' }
	];
	let log = $state<string[]>([]);
</script>

<main>
	<h1>Custom drag renderer</h1>
	<TreeProvider
		{nodes}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		expandLevel={5}
		dragDropMode="self"
		getIsDraggableCallback={() => true}
		getIsDropAllowedCallback={() => true}
		getAllowedDropPositionsCallback={({ node }) => (node.data?.name === 'Bravo' ? ['before', 'after'] : null)}
		onNodeDrop={({ source, target, position }) => {
			log = [...log, `${source.node?.data?.name} ${position} ${target?.node?.data?.name ?? 'root'}`];
		}}
	>
		{#snippet children(ctrl: any)}
			<div class="list" {@attach (el) => ctrl.attachPointerDrag(el)}>
				{#each ctrl.tree.visibleFlatNodes as node (node.id)}
					{@const n = node as LTreeNode<Item>}
					<div class="item" data-tree-path={n.path} data-testid="item-{n.data?.name}">
						<button
							class="chip"
							data-testid="chip-{n.data?.name}"
							class:hovered={ctrl.hoveredNodeForDrop?.path === n.path}
						>{n.data?.name}</button>
						<span class="pad" data-drop-position="before" data-testid="pad-{n.data?.name}-before">B</span>
						<span class="pad" data-drop-position="child" data-testid="pad-{n.data?.name}-child">C</span>
						<span class="pad" data-drop-position="after" data-testid="pad-{n.data?.name}-after">A</span>
					</div>
				{/each}
			</div>
			<pre>hover: <span data-testid="hover">{ctrl.hoveredNodeForDrop?.data?.name ?? ''}:{ctrl.activeDropPosition ?? ''}</span></pre>
		{/snippet}
	</TreeProvider>
	<pre data-testid="log">{log.join('\n')}</pre>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	.item {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-bottom: 12px;
	}
	.chip {
		width: 120px;
		height: 32px;
		touch-action: none;
		user-select: none;
	}
	.pad {
		display: inline-block;
		width: 40px;
		height: 32px;
		line-height: 32px;
		text-align: center;
		border: 1px dashed #999;
	}
</style>
