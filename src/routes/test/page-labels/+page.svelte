<script lang="ts">
	// e2e fixture for labels (vendored core /locale, SPEC §12.24): flat `<elementType>.<name>`
	// keys; per key the labels prop → the tree's translateCallback → the page-wide one → the page
	// dictionary window.components.locale.labels['svelte-treeview.<key>'] → English. Assigning a
	// new page object re-renders every tree's texts.
	// Targeted by e2e/page-labels.spec.ts.
	import { Tree } from '$lib/index.js';
	import type { LTreeNode, TreeMenuEntry } from '$lib/index.js';

	type Item = { id: number; path: string; name?: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Root' },
		{ id: 2, path: '2' } // displayValueMember set, no name → labels.noDisplayValue
	];
	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) =>
		[...nodes].sort((a, b) => a.path.localeCompare(b.path));
	const menu = (): TreeMenuEntry<Item>[] => ['copy', 'expand-all'];
	// The tree's own translateCallback: answers noData, passes everything else on (null).
	const ownTranslate = ({ key }: { key: string }) =>
		key === 'svelte-treeview.messages.noData' ? 'element' : null;
	// The <Tree> refs the spec reaches through update() (the callbacks' controller has no props).
	let translateTree: Tree<Item> | undefined = $state();
	let noDisplayTree: Tree<Item> | undefined = $state();
	$effect(() => {
		(window as unknown as { __labelTrees: object }).__labelTrees = { translate: translateTree, noDisplay: noDisplayTree };
	});
</script>

<main>
	<h1>Page-wide labels fixture</h1>

	<div data-scenario="empty">
		<p>Empty tree, no labels prop → page-wide noData, else "No data".</p>
		<Tree nodes={[]} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} />
	</div>

	<div data-scenario="own">
		<p>Empty tree with labels messages.noData → the prop wins over the page-wide text.</p>
		<Tree nodes={[]} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} labels={{ 'messages.noData': 'Own empty' }} />
	</div>

	<div data-scenario="own-full-key">
		<p>The prop may use the full key (svelte-treeview.messages.noData).</p>
		<Tree nodes={[]} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} labels={{ 'svelte-treeview.messages.noData': 'Own full' }} />
	</div>

	<div data-scenario="translate">
		<p>Own translateCallback: answers messages.noData ("element"), null for the rest.</p>
		<Tree nodes={[]} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} translateCallback={ownTranslate} bind:this={translateTree} />
	</div>

	<div data-scenario="nodes">
		<p>Nodes + a context menu with built-ins (copy, expand-all); node 2 has no name.</p>
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			getContextMenuItemsCallback={menu}
		/>
	</div>

	<div data-scenario="no-display">
		<p>No displayValueMember → every row shows labels.noDisplayValue.</p>
		<Tree nodes={[{ id: 1, path: '1' }]} idMember="id" pathMember="path" sortCallback={sortByPath} bind:this={noDisplayTree} />
	</div>
</main>
