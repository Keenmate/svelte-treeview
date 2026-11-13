<script lang="ts">
	import { onMount } from 'svelte';
	import Tree from '$lib/components/Tree.svelte';
	import { setThemeMode } from '$lib/index.js';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// e2e fixture for the theme context (vendored core SPEC §12.10): themeSource unset
	// (page) / 'closest' / selector, nearest-ancestor-wins, per-instance `theme` on top,
	// setThemeMode() force. Tests drive <html data-theme> + section attributes directly.
	// Targeted by e2e/theme-context.spec.ts.

	type Item = { id: number; path: string; name: string };
	const data: Item[] = [
		{ id: 1, path: '1', name: 'Root' },
		{ id: 2, path: '1.1', name: 'Child' }
	];
	const sortByPath = ({ nodes }: { nodes: LTreeNode<Item>[] }) =>
		[...nodes].sort((a, b) => a.path.localeCompare(b.path));

	onMount(() => {
		(window as unknown as { __setThemeMode: typeof setThemeMode }).__setThemeMode = setThemeMode;
	});
</script>

<main>
	<h1>Theme context fixture</h1>

	<div id="source-panel" data-theme="dark">selector source (dark)</div>

	<section data-theme="dark" data-testid="dark-section">
		<div data-scenario="page">
			<p>No themeSource inside a dark section → follows the PAGE.</p>
			<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} />
		</div>
		<div data-scenario="closest">
			<p>themeSource="closest" inside a dark section → the section wins over the page.</p>
			<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} themeSource="closest" />
		</div>
		<div data-theme="light" data-testid="light-subsection">
			<div data-scenario="closest-nested">
				<p>themeSource="closest" in a light sub-section of the dark section → nearest (light) wins.</p>
				<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} themeSource="closest" />
			</div>
		</div>
		<div data-scenario="instance">
			<p>themeSource="closest" + per-instance theme="light" → the instance wins.</p>
			<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} themeSource="closest" theme="light" />
		</div>
	</section>

	<div data-scenario="selector">
		<p>themeSource="#source-panel" (not an ancestor) → first match in the document.</p>
		<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" sortCallback={sortByPath} themeSource="#source-panel" />
	</div>
</main>
