<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// e2e fixture for REVIEW-2026-11-19's "plausible, not proven" list (component-level ones).
	// Targeted by e2e/plausible.spec.ts.
	//   #preset — checkedPaths + selectedPaths set BEFORE mount: do the node flags follow?
	//   #echo   — onNodesChange assigns a NEW `nodes` array (the parent replaces the data in the
	//             change handler): is the assignment applied, or swallowed by the echo guards?

	type Item = { id: string; path: string; name: string };
	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) => nodes;

	const presetData: Item[] = [
		{ id: '1', path: '1', name: 'One' },
		{ id: '11', path: '1.1', name: 'One-one' },
		{ id: '12', path: '1.2', name: 'One-two' },
		{ id: '2', path: '2', name: 'Two' }
	];
	let presetChecked = $state(new Set(['1.1']));
	let presetSelected = $state(new Set(['2']));

	let echoNodes = $state.raw<Item[]>([
		{ id: 'a', path: '1', name: 'Alpha' },
		{ id: 'b', path: '2', name: 'Beta' }
	]);
	let replaced = $state(false);
	let echoTree = $state<any>();

	function onEchoChange() {
		if (replaced) return;
		replaced = true;
		echoNodes = [
			{ id: 'x', path: '1', name: 'Replaced X' },
			{ id: 'y', path: '2', name: 'Replaced Y' },
			{ id: 'z', path: '3', name: 'Replaced Z' }
		];
	}

	$effect(() => {
		(window as any).__echo = echoTree;
		(window as any).__echoNodes = () => echoNodes.map((n) => n.name);
	});
</script>

<main>
	<h1>Plausible bugs</h1>
	<div id="preset" class="box">
		<Tree
			nodes={presetData}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={2}
			isCheckboxesShown={true}
			selectionMode="multiple"
			bind:checkedPaths={presetChecked}
			bind:selectedPaths={presetSelected}
		/>
	</div>
	<div id="echo" class="box">
		<Tree
			bind:this={echoTree}
			bind:nodes={echoNodes}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			onNodesChange={onEchoChange}
		/>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	.box {
		width: 360px;
		border: 1px solid #ccc;
		margin-bottom: 1rem;
	}
</style>
