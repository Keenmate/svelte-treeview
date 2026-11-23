<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// e2e fixture for the row animation (docs/PLAN-row-animation.md): on by default (part of
	// core `motion`, no on/off prop); rows an expand reveals get stv__node--opening (capped by
	// rowAnimationLimit), never on first render, a re-key (focus / select click) or a data
	// reload. Off = motion="none" / reduced motion / --stv-row-animation-duration: 0s.
	// Targeted by e2e/row-animation.spec.ts.

	type Item = { id: number; path: string; name: string };
	const make = (): Item[] => [
		{ id: 1, path: '1', name: 'Folder A' },
		...[1, 2, 3, 4, 5].map((i) => ({ id: 10 + i, path: `1.${i}`, name: `A ${i}` })),
		{ id: 2, path: '2', name: 'Folder B' },
		{ id: 21, path: '2.1', name: 'B 1' },
		{ id: 22, path: '2.2', name: 'B 2' },
		{ id: 3, path: '3', name: 'Folder C (open)' },
		{ id: 31, path: '3.1', name: 'C 1' }
	];
	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) =>
		[...nodes].sort((a, b) => a.path.localeCompare(b.path));

	let offData = $state.raw(make());
	let onData = $state.raw(make());
	let noneData = $state.raw(make());
	let plainData = $state.raw(make());
	// B11: a root that never collapses (getIsCollapsibleCallback) — collapseAll / collapseNodes
	// must animate (and hide) only what really collapses under it.
	const pinnedData: Item[] = [
		{ id: 1, path: '1', name: 'Pinned root' },
		{ id: 11, path: '1.1', name: 'Folder' },
		{ id: 111, path: '1.1.1', name: 'Leaf' },
		{ id: 12, path: '1.2', name: 'Item' }
	];
	let pinnedTree: Tree<Item> | undefined = $state();
	let pinnedLog = $state<string[]>([]);
	let onTree: Tree<Item> | undefined = $state();
	$effect(() => {
		(window as any).__onTree = onTree;
	});
	// Collapse half: onNodeCollapse fires only after the rows animated out;
	// `await collapseNodes()` settles after it too.
	let collapseLog = $state<string[]>([]);
	let awaitResult = $state('');
	async function collapseFromCode() {
		const started = performance.now();
		await onTree?.collapseNodes('3');
		const rowsLeft = document.querySelectorAll('[data-scenario="on"] .stv__node[data-tree-path="3.1"]').length;
		awaitResult = `${Math.round(performance.now() - started)}|${rowsLeft}`;
	}
</script>

<main>
	<h1>Row animation fixture</h1>

	<div data-scenario="off" class="rows-off">
		<p>--stv-row-animation-duration: 0s → just the rows are off.</p>
		<Tree nodes={offData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath}
			expandLevel={0} expandedPaths={new Set(['3'])} />
	</div>

	<div data-scenario="on" class="slow">
		<p>No prop (on by default), limit 3, a 1s duration (so the test can see it).</p>
		<button data-testid="expand-all" onclick={() => onTree?.expandAll()}>expandAll</button>
		<button data-testid="reload" onclick={() => (onData = make())}>reload data</button>
		<button data-testid="collapse-code" onclick={collapseFromCode}>await collapseNodes('3')</button>
		<button data-testid="collapse-all" onclick={() => onTree?.collapseAll()}>collapseAll</button>
		<output data-testid="collapse-log">{collapseLog.join(',')}</output>
		<output data-testid="await-result">{awaitResult}</output>
		<Tree bind:this={onTree} nodes={onData} idMember="id" pathMember="path" displayValueMember="name"
			sortCallback={sortByPath} expandLevel={0} expandedPaths={new Set(['3'])}
			rowAnimationLimit={3} onNodeCollapse={({ path }) => (collapseLog = [...collapseLog, path])} />
	</div>

	<div data-scenario="pinned" class="slow">
		<p>Root 1 is not collapsible (B11).</p>
		<button data-testid="pinned-collapse-all" onclick={() => pinnedTree?.collapseAll()}>collapseAll</button>
		<button data-testid="pinned-collapse-root" onclick={() => pinnedTree?.collapseNodes('1')}>collapseNodes('1')</button>
		<output data-testid="pinned-log">{pinnedLog.join(',')}</output>
		<Tree bind:this={pinnedTree} nodes={pinnedData} idMember="id" pathMember="path" displayValueMember="name"
			sortCallback={sortByPath} expandLevel={0} expandedPaths={new Set(['1', '1.1'])}
			getIsCollapsibleCallback={({ node }) => node.path !== '1'}
			onNodeCollapse={({ path }) => (pinnedLog = [...pinnedLog, path])} />
	</div>

	<div data-scenario="none">
		<p>motion="none" → 0s → no reveal.</p>
		<Tree nodes={noneData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath}
			expandLevel={0} expandedPaths={new Set(['3'])} motion="none" />
	</div>
	<div data-scenario="plain">
		<p>Default tokens (transition-normal) — reduced motion zeroes it.</p>
		<Tree nodes={plainData} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath}
			expandLevel={0} expandedPaths={new Set(['3'])} />
	</div>
</main>

<style>
	.slow :global(.stv__container) {
		--stv-row-animation-duration: 1s;
	}
	.rows-off :global(.stv__container) {
		--stv-row-animation-duration: 0s;
	}
</style>
