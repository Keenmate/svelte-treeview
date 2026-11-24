<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import ContextMenuItem from '$lib/components/ContextMenuItem.svelte';
	import type { TreeMenuEntry, TreeRenderIconCallback } from '$lib/index.js';

	// Fixture for per-node icons (iconMember/getIconCallback + iconColorMember +
	// `icon` snippet), rendered on ALL nodes by core renderIcon into a <span> wrapper.
	// Same scenarios as web-treeview's test/node-icons.html. Targeted by e2e/node-icons.spec.ts.

	// The page-wide hook, set before any tree renders on the client.
	type Seen = { element: string[]; page: string[] };
	const w = (typeof window !== 'undefined' ? window : undefined) as
		| (Window & { __seen?: Seen; __setIconHook?: (hook: 'replace' | 'none') => void })
		| undefined;
	if (w) {
		w.__seen = { element: [], page: [] };
		w.components = w.components || {};
		w.components.renderIconCallback = (name) => {
			w.__seen!.page.push(name);
			return name === 'both' || name === 'page-only' ? '<b data-hook="page">P</b>' : null;
		};
	}

	type Item = { id: number; path: string; name: string; icon: string; color?: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Region', icon: 'fa-sitemap', color: '#7c3aed' },
		{ id: 2, path: '1.1', name: 'Manager', icon: 'fa-user-tie', color: '#2563eb' },
		{ id: 3, path: '1.1.1', name: 'Employee', icon: 'fa-user' },
		{ id: 4, path: '1.2', name: 'Branch', icon: 'fa-building' }
	];
	const hooked: Item[] = [
		{ id: 1, path: '1', name: 'Both hooks', icon: 'both' },
		{ id: 2, path: '1.1', name: 'Page hook only', icon: 'page-only' },
		{ id: 3, path: '1.1.1', name: 'Built-in', icon: 'check' },
		{ id: 4, path: '1.2', name: 'Nobody', icon: 'fa-solid fa-building' },
		{ id: 5, path: '1.3', name: 'Markup', icon: '<svg data-testid="raw-svg" width="8" height="8"></svg>' },
		{ id: 6, path: '1.4', name: 'No icon', icon: '' }
	];
	const elementHook: TreeRenderIconCallback<Item> = (name, ctx) => {
		w?.__seen!.element.push(name);
		// A context-menu item icon: ctx.item, no node.
		const item = (ctx as unknown as { item?: { id?: string } }).item;
		if (item) return name === 'both' ? `<b data-hook="element-menu" data-item="${item.id}">M</b>` : null;
		return name === 'both'
			? `<b data-hook="element" data-path="${ctx.node.path}" data-component="${ctx.component}" data-prefix="${ctx.prefix}" data-has-controller="${!!ctx.controller}" data-level="${ctx.level}">E</b>`
			: null;
	};
	let renderIconCallback = $state<TreeRenderIconCallback<Item> | null>(elementHook);
	if (w)
		w.__setIconHook = (hook) =>
			(renderIconCallback = hook === 'replace' ? (name) => (name === 'both' ? '<em>new</em>' : null) : null);

	// Context-menu item icons go through the same renderIcon: font class, the tree hook (ctx.item).
	const menu = (): TreeMenuEntry<Item>[] => [
		{ id: 'font', text: 'Font', icon: 'fa-solid fa-star' },
		{ id: 'hooked', text: 'Hooked', icon: 'both' },
		{ id: 'emoji', text: 'Emoji', icon: '★' }
	];

	function sortByPath({ nodes: items }: { nodes: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path));
	}

	// Tree A — default render: an icon-font value → <i class="stv__icon …">, color from iconColorMember.
	// Tree B — the `icon` snippet (rich: inline SVG), receiving the resolved value.
</script>

<h1>node icons test</h1>

<h2>default (icon font &lt;i class="stv__icon …"&gt; + iconColorMember)</h2>
<div class="tree" data-testid="tree-default">
	<Tree
		nodes={data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		iconMember="icon"
		iconColorMember="color"
		shouldAlignNodeIcons
	/>
</div>

<h2>getIconCallback returning emoji (text, not a class)</h2>
<div class="tree" data-testid="tree-emoji">
	<Tree
		nodes={data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		getIconCallback={({ node }) => (node.path === '1.2' ? 'fa-building' : node.path === '1' ? '🗂️' : '👤')}
	/>
</div>

<h2>renderIconCallback (tree hook) + the page-wide hook</h2>
<div class="tree" data-testid="tree-custom">
	<Tree
		nodes={hooked}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		iconMember="icon"
		shouldAlignNodeIcons={false}
		{renderIconCallback}
		getContextMenuItemsCallback={menu}
	/>
</div>

<h2>snippet context menu (ContextMenuItem icon) + renderIconCallback</h2>
<div class="tree" data-testid="tree-snippet-menu">
	<Tree
		nodes={hooked.slice(0, 1)}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		{renderIconCallback}
	>
		{#snippet contextMenu(node: LTreeNode<Item>, close: () => void)}
			<ContextMenuItem id="hooked" text="Hooked" icon="both" onClick={() => close()} />
			<ContextMenuItem id="font" text="Font" icon="fa-solid fa-star" onClick={() => close()} />
		{/snippet}
	</Tree>
</div>

<h2>icon snippet (receives resolved value)</h2>
<div class="tree" data-testid="tree-snippet">
	<Tree
		nodes={data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		sortCallback={sortByPath}
		isSorted={true}
		expandLevel={3}
		iconMember="icon"
	>
		{#snippet icon(node: LTreeNode<Item>, value: string | null | undefined)}
			<span data-testid="snippet-icon" data-value={value}>★</span>
		{/snippet}
	</Tree>
</div>

<style>
	.tree {
		width: 320px;
		border: 1px solid #ccc;
		margin-bottom: 1rem;
	}
</style>
