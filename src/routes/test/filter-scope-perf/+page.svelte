<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, FilterScope } from '$lib/ltree/types.js';
	import { tick } from 'svelte';

	// Perf fixture for the EXPERIMENTAL filterScope. Generates a balanced tree
	// (?branching=10&depth=5 → 5 + 50 + 500 + 5,000 + 50,000 = 55,555 nodes) and
	// exposes window.__filterBench(term, scope, x) which times the filtered-tree
	// build (sync) and the render to the next paint separately.
	// ?mode=virtual (default) | flat.

	type Item = { id: number; path: string; name: string };

	const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
	const branching = Number(params.get('branching') ?? 10);
	const depth = Number(params.get('depth') ?? 5);
	const mode = params.get('mode') ?? 'virtual';
	const expandAdded = params.get('expand') !== '0';
	const indexerBatchSize = params.get('batch') ? Number(params.get('batch')) : undefined;
	const kinds = ['Region', 'Country', 'City', 'District', 'Street', 'House', 'Flat'];

	function generate(): Item[] {
		const out: Item[] = [];
		let id = 1;
		const walk = (prefix: string, level: number) => {
			const count = level === 1 ? 5 : branching;
			for (let i = 1; i <= count; i++) {
				const path = prefix ? `${prefix}.${i}` : `${i}`;
				out.push({ id: id++, path, name: `${kinds[level - 1]} ${path.replaceAll('.', '-')}` });
				if (level < depth) walk(path, level + 1);
			}
		};
		walk('', 1);
		return out;
	}
	const data = $state.raw(generate());

	let treeRef: Tree<Item>;
	let filterScope = $state<FilterScope>('matches');
	let filterDescendantDepth = $state(1);

	function sortByPath({ nodes }: { nodes: LTreeNode<Item>[] }) {
		return nodes;
	}

	const nextPaint = () =>
		new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

	if (typeof window !== 'undefined') {
		(window as any).__filterBench = async (term: string, scope: FilterScope, x: number) => {
			filterScope = scope;
			filterDescendantDepth = x;
			treeRef.filterNodes(''); // reset to the unfiltered tree first
			await tick();
			await nextPaint();
			const t0 = performance.now();
			treeRef.filterNodes(term);
			const t1 = performance.now();
			await tick();
			await nextPaint();
			const t2 = performance.now();
			return {
				filterMs: +(t1 - t0).toFixed(1),
				renderMs: +(t2 - t1).toFixed(1),
				matches: treeRef.searchNodes(term).length,
				domRows: document.querySelectorAll('.stv__node').length
			};
		};
		(window as any).__nodeCount = () => data.length;
		(window as any).__tree = () => treeRef;
		(window as any).__isIndexed = (term: string) => treeRef?.searchNodes(term).length ?? 0;
	}
</script>

<main>
	<h1>Filter scope perf fixture ({data.length} nodes, {mode})</h1>
	<div class="tree-container" style="height: 600px; overflow: auto;">
		<Tree
			bind:this={treeRef}
			nodes={data}
			idMember="id"
			pathMember="path"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={1}
			shouldUseInternalSearchIndex={true}
			searchValueMember="name"
			{filterScope}
			{filterDescendantDepth}
			shouldExpandFilterDescendants={expandAdded}
			{indexerBatchSize}
			isVirtualScrollEnabled={mode === 'virtual'}
			virtualScrollContainerHeight="600px"
		/>
	</div>
</main>
