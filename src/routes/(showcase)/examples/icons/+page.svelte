<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import RenderModeSwitch from '../RenderModeSwitch.svelte';
	import { getTreeProps } from '../render-mode.svelte.js';

	// An org-structure dataset (branches = regions/managers, leaves = people) so the
	// point is clear: icons render on EVERY node, including branches with children.
	// `lucide` holds an icon NAME (`lucide-<key>`) the IC04 renderIconCallback maps to an SVG.
	type Item = { id: number; path: string; name: string; icon: string; emoji: string; lucide: string; color?: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Twin Peaks', icon: 'fa-solid fa-sitemap', emoji: '🗂️', lucide: 'lucide-map-pin', color: '#7c3aed' },
		{ id: 2, path: '1.1', name: "Sheriff's Department", icon: 'fa-solid fa-building', emoji: '🏢', lucide: 'lucide-shield', color: '#2563eb' },
		{ id: 3, path: '1.1.1', name: 'Sheriff Harry S. Truman', icon: 'fa-solid fa-user-tie', emoji: '👔', lucide: 'lucide-user-star', color: '#059669' },
		{ id: 4, path: '1.1.1.1', name: 'Deputy Tommy "Hawk" Hill', icon: 'fa-solid fa-user', emoji: '👤', lucide: 'lucide-user' },
		{ id: 5, path: '1.1.1.2', name: 'Deputy Andy Brennan', icon: 'fa-solid fa-user', emoji: '👤', lucide: 'lucide-user' },
		{ id: 6, path: '1.2', name: 'Double R Diner', icon: 'fa-solid fa-store', emoji: '🏬', lucide: 'lucide-coffee', color: '#d97706' },
		{ id: 7, path: '1.2.1', name: 'Norma Jennings', icon: 'fa-solid fa-user', emoji: '👤', lucide: 'lucide-user' }
	];
	function sortByPath({ nodes: items }: { nodes: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
	}

	let align = $state(true);

	// Lucide icon inner-markup, fetched from the pure-admin icon library. Each value is
	// the inner <path>/<circle> of a 24×24 Lucide glyph; lucideSvg wraps it in an
	// <svg stroke="currentColor"> so it inherits the per-node color.
	const LUCIDE: Record<string, string> = {
		'map-pin':
			'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
		shield:
			'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
		'user-star':
			'<path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/><path d="M8 15H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/>',
		coffee:
			'<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
		user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
	};
	const lucideSvg = (key: string) =>
		`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LUCIDE[key] ?? ''}</svg>`;

	// IC03 — per-node markup from getIconCallback (a value starting with '<' goes in as is).
	const hasChildren = (node: LTreeNode<Item>) => Object.keys(node.children ?? {}).length > 0;
	const SVG_BRANCH =
		'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>';
	const SVG_LEAF =
		'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>';

	// IC04 — the tree's icon hook owns the `lucide-*` names; null for the rest.
	const renderLucide = (name: string) =>
		name.startsWith('lucide-') ? lucideSvg(name.slice('lucide-'.length)) : null;
</script>

<svelte:head>
	<title>Icons - Svelte Treeview</title>
	<!-- FontAwesome (document-level; svelte-treeview is light DOM so the classes resolve). -->
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
	/>
</svelte:head>

<header>
	<a href="/" class="back-link">&larr; Back to Examples</a>
	<h1>Icons</h1>
	<p class="subtitle">
		Per-node icons on <strong>every</strong> node (branch + leaf) — a dedicated
		<code>.stv__node-icon</code> wrapper driven by <code>iconMember</code> /
		<code>getIconCallback</code> (markup, a built-in name, icon-font classes or text), with per-node
		color, a <code>renderIconCallback(name, ctx)</code> that maps your own icon names to markup, and
		a custom <code>icon</code> snippet.
	</p>
	<RenderModeSwitch />
</header>

<!-- IC01 · FontAwesome via iconMember + color -->
<div class="card">
	<h2>IC01 · FontAwesome classes + per-node color</h2>
	<p class="description">
		<code>iconMember</code> resolves a class string (e.g. <code>fa-solid fa-user-tie</code>); it
		renders as <code>&lt;i class="stv__icon {'{value}'}"&gt;</code> inside the
		<code>.stv__node-icon</code> wrapper on every node — zero config for icon fonts (the tree is
		light DOM, so the page's FontAwesome stylesheet reaches it). <code>iconColorMember</code> colors
		each icon. Note the chevron stays on branches; the icon is its own element beside it.
	</p>

	<label class="toggle-label">
		<input type="checkbox" bind:checked={align} /> <span><code>shouldAlignNodeIcons</code> (reserve the column)</span>
	</label>

	<div class="tree-container">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={4}
			iconMember="icon"
			iconColorMember="color"
			shouldAlignNodeIcons={align}
			{...getTreeProps()}
		/>
	</div>
</div>

<!-- IC02 · Emoji via getIconCallback -->
<div class="card">
	<h2>IC02 · Emoji via <code>getIconCallback</code></h2>
	<p class="description">An emoji needs no font — the value's text renders directly. Use a callback to derive it.</p>
	<div class="tree-container">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={4}
			getIconCallback={({ node }) => node.data?.emoji ?? null}
			{...getTreeProps()}
		/>
	</div>
</div>

<!-- IC03 · Per-node inline SVG via getIconCallback -->
<div class="card">
	<h2>IC03 · Per-node inline SVG via <code>getIconCallback</code></h2>
	<p class="description">
		An icon value that starts with <code>&lt;</code> is markup and goes in as is — so
		<code>getIconCallback(&#123; node &#125;)</code> can return a different SVG per node (here: branch vs
		leaf). Color flows from <code>iconColorMember</code> onto the <code>.stv__node-icon</code> wrapper,
		so <code>stroke="currentColor"</code> tints the SVG.
	</p>
	<div class="tree-container">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={4}
			iconColorMember="color"
			getIconCallback={({ node }) => (hasChildren(node) ? SVG_BRANCH : SVG_LEAF)}
			{...getTreeProps()}
		/>
	</div>
</div>

<!-- IC04 · Lucide SVGs via iconMember + renderIconCallback -->
<div class="card">
	<h2>IC04 · Lucide SVGs (data-keyed) via <code>renderIconCallback</code></h2>
	<p class="description">
		A data member holds an icon <em>name</em> (<code>lucide-map-pin</code>, <code>lucide-shield</code>,
		<code>lucide-user-star</code>, <code>lucide-coffee</code>, <code>lucide-user</code>);
		<code>renderIconCallback(name, ctx)</code> maps the names it owns to an inline SVG with
		<code>stroke="currentColor"</code> (so <code>iconColorMember</code> tints each glyph) and answers
		<code>null</code> for any other name — the page-wide <code>window.components.renderIconCallback</code>
		or the icon-font rule decides then. Built-in names (<code>user</code>, <code>check</code>, …) never
		reach the hook, hence the prefix. <code>ctx</code> carries <code>node</code>, the render state and
		<code>controller</code>. Icons from the <a href="https://icons.pureadmin.io" target="_blank" rel="noopener"><code>pure-admin</code></a> Lucide set.
	</p>
	<div class="tree-container">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={4}
			iconMember="lucide"
			iconColorMember="color"
			shouldAlignNodeIcons
			renderIconCallback={renderLucide}
			{...getTreeProps()}
		/>
	</div>
	<div class="code-block" data-language="svelte">
		<pre>{`<Tree
  iconMember="lucide"
  renderIconCallback={(name, ctx) =>
    name.startsWith('lucide-') ? lucideSvg(name.slice(7)) : null}
/>

<!-- or once for every Keenmate component on the page:
     window.components.renderIconCallback = (name, ctx) => … -->`}</pre>
	</div>
</div>

<!-- IC05 · The icon snippet -->
<div class="card">
	<h2>IC05 · Anything via the <code>icon</code> snippet</h2>
	<p class="description">
		For full Svelte control (components, badges, reactive markup) pass an <code>icon</code> snippet. It
		receives the node, the resolved value and the render context, and wins over every rule above;
		color still flows from <code>iconColorMember</code> onto the wrapper (so <code>currentColor</code>
		tints the SVG). Here it draws the same Lucide names plus a child count on branches.
	</p>
	<div class="tree-container">
		<Tree
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={sortByPath}
			isSorted={true}
			expandLevel={4}
			iconMember="lucide"
			iconColorMember="color"
			shouldAlignNodeIcons
			{...getTreeProps()}
		>
			{#snippet icon(node: LTreeNode<Item>, value: string | null | undefined)}
				{#if value}
					{@html lucideSvg(value.slice('lucide-'.length))}
					{#if hasChildren(node)}<sup class="icon-badge">{Object.keys(node.children).length}</sup>{/if}
				{/if}
			{/snippet}
		</Tree>
	</div>
</div>

<style>
	.icon-badge {
		font-size: 0.6rem;
		margin-left: 1px;
	}
</style>
