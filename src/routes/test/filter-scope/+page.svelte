<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode, FilterScope } from '$lib/ltree/types.js';

	// e2e fixture for the EXPERIMENTAL filterScope / filterDescendantDepth /
	// shouldExpandFilterDescendants. Ragged org chart: Sales is 6 levels deep,
	// IT and Finance only 3. Targeted by e2e/filter-scope.spec.ts.
	//   ?scope=<FilterScope>  ?x=<filterDescendantDepth>  ?expand=0  ?term=<searchTerm>

	type Item = { id: number; path: string; name: string };
	const data: Item[] = [
		['1', 'Acme Corp'],
		['1.1', 'Sales Division'],
		['1.1.1', 'Sales Europe'],
		['1.1.1.1', 'Sales Germany'],
		['1.1.1.1.1', 'Team Berlin'],
		['1.1.1.1.1.1', 'Anna Weber'],
		['1.1.1.1.1.2', 'Lukas Schmidt'],
		['1.1.1.1.2', 'Team Munich'],
		['1.1.1.1.2.1', 'Mia Fischer'],
		['1.1.1.1.2.2', 'Jonas Wagner'],
		['1.1.1.2', 'Sales France'],
		['1.1.1.2.1', 'Team Paris'],
		['1.1.1.2.1.1', 'Chloe Martin'],
		['1.1.1.2.1.2', 'Hugo Bernard'],
		['1.1.2', 'Sales Americas'],
		['1.1.2.1', 'Sales USA'],
		['1.1.2.1.1', 'Team Boston'],
		['1.1.2.1.1.1', 'Emma Johnson'],
		['1.1.2.1.1.2', 'Noah Williams'],
		['1.1.2.1.2', 'Team Austin'],
		['1.1.2.1.2.1', 'Olivia Brown'],
		['1.2', 'IT Division'],
		['1.2.1', 'Platform Team'],
		['1.2.1.1', 'Petr Novak'],
		['1.2.1.2', 'Jana Svobodova'],
		['1.2.2', 'Support Team'],
		['1.2.2.1', 'Tomas Dvorak'],
		['1.2.2.2', 'Eva Cerna'],
		['1.3', 'Finance'],
		['1.3.1', 'Accounting Team'],
		['1.3.1.1', 'Karel Horak'],
		['1.3.2', 'Payroll Team'],
		['1.3.2.1', 'Lucie Kralova']
	].map(([path, name], i) => ({ id: i + 1, path, name }));

	const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
	const filterScope = (params.get('scope') ?? 'matches') as FilterScope;
	const filterDescendantDepth = Number(params.get('x') ?? 1);
	const shouldExpandFilterDescendants = params.get('expand') !== '0';
	let searchTerm = $state(params.get('term') ?? '');

	function sortByPath({ nodes }: { nodes: LTreeNode<Item>[] }) {
		return [...nodes].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}
</script>

<main>
	<h1>Filter scope fixture ({filterScope}, x={filterDescendantDepth})</h1>
	<input data-testid="term" bind:value={searchTerm} />
	<div class="tree-container">
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
			{filterScope}
			{filterDescendantDepth}
			{shouldExpandFilterDescendants}
		/>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
</style>
