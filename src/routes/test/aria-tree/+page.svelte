<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// e2e fixture for the ARIA tree (REVIEW B22) — the same scenarios as web-treeview's
	// test/aria-tree.html + test/announce.html. Targeted by e2e/aria-tree.spec.ts.
	//   #tree   — 1 Fruit (1.1 Apple, 1.2 Banana, 1.3 Cherry) · 2 Veg (2.1 Carrot) · 3 Leaf; single selection
	//   #multi  — same data, selectionMode multiple, labels['ariaLabels.tree'] = "Food"
	//   #checks — same data, checkboxes, cascade
	//   #big    — virtual scroll, 50 roots × 99 children
	//   #ann    — announcements: 1 Apple (1.1 Apricot) · 2 Banana · 3 Locked (refuses drops), search index
	//   #silent — same as #ann, every announcement label = ''

	type Item = { id: number | string; path: string; name: string };

	const data = (): Item[] => [
		{ id: 1, path: '1', name: 'Fruit' },
		{ id: 11, path: '1.1', name: 'Apple' },
		{ id: 12, path: '1.2', name: 'Banana' },
		{ id: 13, path: '1.3', name: 'Cherry' },
		{ id: 2, path: '2', name: 'Veg' },
		{ id: 21, path: '2.1', name: 'Carrot' },
		{ id: 3, path: '3', name: 'Leaf' }
	];
	const bigData = (): Item[] => {
		const out: Item[] = [];
		for (let r = 1; r <= 50; r++) {
			out.push({ id: `r${r}`, path: `${r}`, name: `Root ${r}` });
			for (let c = 1; c <= 99; c++) out.push({ id: `r${r}c${c}`, path: `${r}.${c}`, name: `Item ${r}.${c}` });
		}
		return out;
	};
	const announceData = (): Item[] => [
		{ id: 1, path: '1', name: 'Apple' },
		{ id: 11, path: '1.1', name: 'Apricot' },
		{ id: 2, path: '2', name: 'Banana' },
		{ id: 3, path: '3', name: 'Locked' }
	];
	const SILENT = {
		'ariaLabels.searchResults': '',
		'ariaLabels.searchNoResults': '',
		'ariaLabels.movedInto': '',
		'ariaLabels.movedBefore': '',
		'ariaLabels.movedAfter': '',
		'ariaLabels.copiedInto': '',
		'ariaLabels.copiedBefore': '',
		'ariaLabels.copiedAfter': '',
		'ariaLabels.dropDenied': ''
	};

	let treeNodes = $state.raw(data());
	let treeLabels = $state<Record<string, string>>({});
	let annLabels = $state<Record<string, string>>({});
	let annTranslate = $state<((ctx: any) => string | null) | undefined>(undefined);
	let annTerm = $state('');
	let silentTerm = $state('');
	let trees: Record<string, any> = $state({});

	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) => nodes;
	const isDropAllowed = ({ node }: { node: LTreeNode<Item> }) => node.data?.name !== 'Locked';

	if (typeof window !== 'undefined') {
		Object.assign(window, {
			__trees: trees,
			__setTreeLabels: (l: Record<string, string>) => (treeLabels = l),
			__setAnnLabels: (l: Record<string, string>) => (annLabels = l),
			__setAnnTranslate: (cb: ((ctx: any) => string | null) | undefined) => (annTranslate = cb),
			__search: (id: string, term: string) => {
				if (id === 'ann') annTerm = term;
				else silentTerm = term;
			}
		});
	}
</script>

<main>
	<h1>ARIA tree fixture</h1>
	<div class="grid">
		<div id="tree" class="box">
			<Tree bind:this={trees.tree} nodes={treeNodes} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} isSorted={true} expandLevel={1} labels={treeLabels} />
		</div>
		<div id="multi" class="box">
			<Tree bind:this={trees.multi} nodes={data()} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} isSorted={true} expandLevel={1} selectionMode="multiple" labels={{ 'ariaLabels.tree': 'Food' }} />
		</div>
		<div id="checks" class="box">
			<Tree bind:this={trees.checks} nodes={data()} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} isSorted={true} expandLevel={2} isCheckboxesShown={true} checkboxMode="cascade" />
		</div>
		<div id="big" class="box">
			<Tree bind:this={trees.big} nodes={bigData()} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} isSorted={true} expandLevel={1} isVirtualScrollEnabled={true} virtualScrollContainerHeight="300px" />
		</div>
		<div id="ann" class="box">
			<Tree bind:this={trees.ann} nodes={announceData()} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} isSorted={true} expandLevel={1} isInternalSearchIndexEnabled={true} searchValueMember="name" searchTerm={annTerm} dragDropMode="self" getIsDraggableCallback={() => true} getIsDropAllowedCallback={isDropAllowed} labels={annLabels} translateCallback={annTranslate} />
		</div>
		<div id="silent" class="box">
			<Tree bind:this={trees.silent} nodes={announceData()} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} isSorted={true} expandLevel={1} isInternalSearchIndexEnabled={true} searchValueMember="name" searchTerm={silentTerm} dragDropMode="self" getIsDraggableCallback={() => true} getIsDropAllowedCallback={isDropAllowed} labels={SILENT} />
		</div>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 360px);
		gap: 1rem;
	}
	.box {
		border: 1px solid #ccc;
	}
</style>
