<script lang="ts">
	// e2e fixture for page-wide labels (vendored core /locale, SPEC §12.24):
	// window.components.locale.labels['svelte-treeview'] sits between the labels prop and the
	// English defaults; assigning a new object re-renders every tree's texts.
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
</script>

<main>
	<h1>Page-wide labels fixture</h1>

	<div data-scenario="empty">
		<p>Empty tree, no labels prop → page-wide noData, else "No data".</p>
		<Tree nodes={[]} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} />
	</div>

	<div data-scenario="own">
		<p>Empty tree with labels.noData → the prop wins over the page-wide text.</p>
		<Tree nodes={[]} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} labels={{ noData: 'Own empty' }} />
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
		<Tree nodes={[{ id: 1, path: '1' }]} idMember="id" pathMember="path" sortCallback={sortByPath} />
	</div>
</main>
