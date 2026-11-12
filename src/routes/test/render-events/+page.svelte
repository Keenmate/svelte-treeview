<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// e2e fixture for onRenderStart / onRenderProgress / onRenderComplete + bindable
	// isRendering around FLAT progressive rendering (the only render mode since the
	// recursive renderer was removed). 20 groups × 20 leaves, all expanded = 420 rows,
	// initialBatchSize 10 → several rAF batches. Targeted by e2e/render-events.spec.ts.

	type Item = { id: number; path: string; name: string };

	function build(prefix: string): Item[] {
		const out: Item[] = [];
		let id = 1;
		for (let g = 1; g <= 20; g++) {
			out.push({ id: id++, path: `${g}`, name: `${prefix} ${g}` });
			for (let l = 1; l <= 20; l++) out.push({ id: id++, path: `${g}.${l}`, name: `${prefix} ${g}-${l}` });
		}
		return out;
	}

	let data = $state.raw<Item[]>(build('Item'));
	let isRendering = $state(false);
	let starts = $state(0);
	let progressEvents = $state(0);
	let completes = $state(0);
	let lastProcessed = $state(0);
	let wasRenderingAtStart = $state(false);

	function sortByPath({ nodes }: { nodes: LTreeNode<Item>[] }) {
		return [...nodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}
</script>

<main>
	<h1>Render events fixture</h1>
	<button data-testid="reload" onclick={() => (data = build('Reloaded'))}>Reload data</button>
	<dl>
		<dt>starts</dt><dd data-testid="starts">{starts}</dd>
		<dt>progress</dt><dd data-testid="progress">{progressEvents}</dd>
		<dt>completes</dt><dd data-testid="completes">{completes}</dd>
		<dt>processed</dt><dd data-testid="processed">{lastProcessed}</dd>
		<dt>isRendering</dt><dd data-testid="is-rendering">{isRendering}</dd>
		<dt>isRendering at start</dt><dd data-testid="rendering-at-start">{wasRenderingAtStart}</dd>
	</dl>
	<div class="tree-container">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={2}
			isProgressiveRenderEnabled={true}
			initialBatchSize={10}
			maxBatchSize={40}
			bind:isRendering
			onRenderStart={() => {
				starts++;
				wasRenderingAtStart = true;
			}}
			onRenderProgress={(stats) => {
				progressEvents++;
				lastProcessed = stats.processed;
			}}
			onRenderComplete={(stats) => {
				completes++;
				lastProcessed = stats.processed;
			}}
		/>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	dl {
		display: grid;
		grid-template-columns: max-content max-content;
		gap: 0 1rem;
	}
</style>
