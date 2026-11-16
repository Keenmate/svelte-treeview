<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// e2e fixture for the motion level (vendored core SPEC §12.16): the `motion` prop →
	// data-motion on .stv__container, a data-motion section, the page-wide
	// window.components.motion, closest-wins. Targeted by e2e/motion-level.spec.ts.

	type Item = { id: number; path: string; name: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Root' },
		{ id: 2, path: '1.1', name: 'Child' }
	];
	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) =>
		[...nodes].sort((a, b) => a.path.localeCompare(b.path));
</script>

<main>
	<h1>Motion fixture</h1>

	<div data-scenario="default">
		<p>No motion prop → the tree's own speeds (or the page level).</p>
		<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} />
	</div>

	<div data-scenario="none">
		<p>motion="none" → every transition 0s.</p>
		<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} motion="none" />
	</div>

	<section data-motion="smooth" data-testid="smooth-section">
		<div data-scenario="section">
			<p>Inside a data-motion="smooth" section, no prop → follows the section.</p>
			<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} />
		</div>
		<div data-scenario="section-override">
			<p>Inside the smooth section with motion="snappy" → the tree's own level wins.</p>
			<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} motion="snappy" />
		</div>
	</section>
</main>
