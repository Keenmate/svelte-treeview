<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';
	import type { BeforeScrollContext } from '$lib/core/TreeEngine.svelte.js';

	// e2e fixture for beforeScrollCallback + scrollToPath's shouldRevealContainer — the same page as
	// web-treeview's test/before-scroll.html: 60 children in a 200px scroll box (#box) below a 1600px
	// spacer (the tree starts off-screen). window.scrollCtx records each ctx; window.scrollAnswer is
	// what the callback returns. Targeted by e2e/before-scroll.spec.ts.

	type Item = { id: string; path: string; name: string };
	const nodes: Item[] = [{ id: 'r', path: '1', name: 'Root' }];
	for (let i = 1; i <= 60; i++) nodes.push({ id: `n${i}`, path: `1.${i}`, name: `Node ${i}` });
	nodes.push({ id: 'p', path: '2', name: 'Paste target' });
	nodes.push({ id: 'p1', path: '2.1', name: 'Paste child' });

	let tree = $state<any>();
	const w = (typeof window !== 'undefined' ? window : {}) as any;
	w.scrollCtx = [];
	w.scrollAnswer = undefined;

	function beforeScroll(ctx: BeforeScrollContext<Item>) {
		w.scrollCtx.push({
			source: ctx.source,
			path: ctx.path,
			nodePath: ctx.node.path,
			container: ctx.container ? ctx.container.id || ctx.container.className : null,
			options: { ...ctx.options },
			hasController: !!ctx.controller
		});
		return w.scrollAnswer;
	}

	$effect(() => {
		w.tree = tree;
		w.box = document.getElementById('box');
	});
</script>

<main>
	<h1>beforeScrollCallback</h1>
	<div id="spacer">spacer</div>
	<div id="box">
		<Tree
			bind:this={tree}
			{nodes}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			sortCallback={({ nodes }: { nodes: LTreeNode<Item>[] }) => nodes}
			isSorted={true}
			expandLevel={1}
			beforeScrollCallback={beforeScroll}
		/>
	</div>
</main>

<style>
	main {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem;
		font-family: system-ui, sans-serif;
	}
	#box {
		height: 200px;
		overflow: auto;
		border: 1px solid #ccc;
		--base-scroll-behavior: auto;
	}
	#spacer {
		height: 1600px;
		background: #f6f6f6;
	}
</style>
