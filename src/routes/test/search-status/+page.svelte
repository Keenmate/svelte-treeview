<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, IndexProgress, SearchStatus } from '$lib/ltree/types.js';

	// e2e fixture for the search-status API: searchResultLimit truncation detection,
	// onSearchStatusChange, onIndexProgress — and a tree that STARTS with a non-empty
	// searchTerm (?term=) before its index is built. Targeted by e2e/search-status.spec.ts.
	//   ?term=<initial searchTerm>   ?limit=<searchResultLimit>   ?count=<groups>

	type Item = { id: number; path: string; name: string };

	const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
	const groups = Number(params.get('count') ?? 20);
	const limitParam = params.get('limit');

	// `groups` groups × 10 leaves. Every leaf is "Leaf …", every group "Group …".
	const data: Item[] = [];
	let id = 1;
	for (let g = 1; g <= groups; g++) {
		data.push({ id: id++, path: `${g}`, name: `Group ${g}` });
		for (let l = 1; l <= 10; l++) data.push({ id: id++, path: `${g}.${l}`, name: `Leaf ${g}-${l}` });
	}

	let searchTerm = $state(params.get('term') ?? '');
	let searchResultLimit = $state<number | undefined>(limitParam ? Number(limitParam) : undefined);
	let status = $state<SearchStatus | null>(null);
	let progress = $state<IndexProgress | null>(null);
	let statusEvents = $state(0);

	function sortByPath({ nodes }: { nodes: LTreeNode<Item>[] }) {
		return nodes;
	}
</script>

<main>
	<h1>Search status fixture</h1>
	<div class="controls">
		<input data-testid="term" bind:value={searchTerm} />
		<button data-testid="limit-5" onclick={() => (searchResultLimit = 5)}>limit = 5</button>
		<button data-testid="limit-default" onclick={() => (searchResultLimit = undefined)}>limit = default</button>
	</div>
	<pre>status: <span data-testid="status"
			>{status
				? `${status.searchTerm}|${status.matchCount}|${status.isLimited}|${status.limit}`
				: '(none)'}</span
		>
indexing: <span data-testid="index-complete">{progress?.isComplete ?? false}</span> <span
			data-testid="index-progress">{progress ? `${progress.processed}/${progress.total}` : ''}</span
		>
status events: <span data-testid="status-events">{statusEvents}</span></pre>
	<div class="tree-container" style="height: 400px; overflow: auto;">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={1}
			shouldUseInternalSearchIndex={true}
			searchValueMember="name"
			bind:searchTerm
			{searchResultLimit}
			onSearchStatusChange={(ctx) => {
				status = { searchTerm: ctx.searchTerm, matchCount: ctx.matchCount, isLimited: ctx.isLimited, limit: ctx.limit, isIndexing: ctx.isIndexing };
				statusEvents++;
			}}
			onIndexProgress={(ctx) => (progress = { processed: ctx.processed, total: ctx.total, isComplete: ctx.isComplete })}
		/>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	.controls {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
</style>
