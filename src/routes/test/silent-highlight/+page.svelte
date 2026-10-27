<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	// Deterministic e2e fixture for the silent: true option on
	// selectNode / selectNodes / clearSelection / uncheckAll.
	// Targeted by e2e/silent-highlight.spec.ts.

	type Item = { id: number; path: string; name: string };

	const sampleData: Item[] = [
		{ id: 1, path: '1', name: 'Documents' },
		{ id: 2, path: '1.1', name: 'Work' },
		{ id: 3, path: '1.2', name: 'Personal' },
		{ id: 4, path: '2', name: 'Downloads' },
		{ id: 5, path: '2.1', name: 'Software' },
		{ id: 6, path: '3', name: 'Projects' },
		{ id: 7, path: '3.1', name: 'Web App' }
	];

	function sortByName({ items }: { items: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	let treeRef: Tree<Item>;
	let selectedPaths = $state(new Set<string>());
	let checkedPaths = $state(new Set<string>());

	// Counters incremented by each callback. Spec asserts on these to verify
	// the silent option suppresses callbacks without breaking state updates.
	let onNodeClickCount = $state(0);
	let onSelectionChangeCount = $state(0);
	let onCheckedChangeCount = $state(0);

	let lastClickedPath = $state<string | null>(null);
	let lastSelectionSize = $state(0);
	let lastCheckedSize = $state(0);

	function handleNodeClick({ node }: { node: LTreeNode<Item> | null }) {
		onNodeClickCount++;
		lastClickedPath = node?.path ?? null;
	}

	function handleSelectionChange({ paths }: { paths: Set<string> }) {
		onSelectionChangeCount++;
		lastSelectionSize = paths.size;
	}

	function handleCheckedChange({ paths }: { paths: Set<string> }) {
		onCheckedChangeCount++;
		lastCheckedSize = paths.size;
	}

	function resetCounters() {
		onNodeClickCount = 0;
		onSelectionChangeCount = 0;
		onCheckedChangeCount = 0;
		lastClickedPath = null;
		lastSelectionSize = 0;
		lastCheckedSize = 0;
	}
</script>

<svelte:head>
	<title>Test — Silent Highlight Fixture</title>
</svelte:head>

<main>
	<h1>Silent Highlight Test Fixture</h1>

	<div class="controls">
		<button data-testid="highlight-loud" onclick={() => treeRef?.selectNode('1.2')}>
			selectNode('1.2') — loud
		</button>
		<button data-testid="highlight-silent" onclick={() => treeRef?.selectNode('1.2', 'replace', { silent: true })}>
			selectNode('1.2', silent)
		</button>
		<button data-testid="highlight-other-silent" onclick={() => treeRef?.selectNode('2.1', 'replace', { silent: true })}>
			selectNode('2.1', silent)
		</button>
		<button data-testid="highlight-many-loud" onclick={() => treeRef?.selectNodes(['1.1', '1.2'])}>
			selectNodes(['1.1','1.2']) — loud
		</button>
		<button data-testid="highlight-many-silent" onclick={() => treeRef?.selectNodes(['1.1', '1.2'], { silent: true })}>
			selectNodes(['1.1','1.2'], silent)
		</button>
		<button data-testid="clear-loud" onclick={() => treeRef?.clearSelection()}>
			clearSelection() — loud
		</button>
		<button data-testid="clear-silent" onclick={() => treeRef?.clearSelection(undefined, { silent: true })}>
			clearSelection(silent)
		</button>
		<button data-testid="clear-selection-loud" onclick={() => treeRef?.uncheckAll()}>
			uncheckAll() — loud
		</button>
		<button data-testid="clear-selection-silent" onclick={() => treeRef?.uncheckAll({ silent: true })}>
			uncheckAll(silent)
		</button>
		<button data-testid="reset-counters" onclick={resetCounters}>Reset counters</button>
	</div>

	<div class="tree-container">
		<Tree
			bind:this={treeRef}
			data={sampleData}
			idMember="id"
			pathMember="path"
			sortCallback={sortByName}
			isSorted={true}
			expandLevel={3}
			shouldShowCheckboxes={true}
			selectedNodeClass="test-highlighted"
			bind:selectedPaths
			bind:checkedPaths
			onNodeClick={handleNodeClick}
			onSelectionChange={handleSelectionChange}
			onCheckedChange={handleCheckedChange}
		>
			{#snippet nodeTemplate(node: LTreeNode<Item>)}
				<span>{node.data?.name}</span>
			{/snippet}
		</Tree>
	</div>

	<div class="output">
		<p class="output-label">Counters</p>
		<pre>onNodeClick: <span data-testid="counter-click">{onNodeClickCount}</span>
onSelectionChange: <span data-testid="counter-highlight">{onSelectionChangeCount}</span>
onCheckedChange: <span data-testid="counter-selection">{onCheckedChangeCount}</span></pre>
	</div>

	<div class="output">
		<p class="output-label">State</p>
		<pre>lastClickedPath: <span data-testid="last-clicked">{lastClickedPath ?? '(none)'}</span>
selectedPaths.size: <span data-testid="highlight-size">{selectedPaths.size}</span>
selectedPaths: <span data-testid="highlight-paths">{[...selectedPaths].sort().join(',') || '(empty)'}</span>
checkedPaths.size: <span data-testid="checked-size">{checkedPaths.size}</span></pre>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	h1 {
		margin: 0 0 1rem;
		font-size: 1.2rem;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.tree-container {
		border: 1px solid #e2e8f0;
		padding: 0.5rem;
		max-width: 520px;
		margin-bottom: 0.75rem;
	}
	.output {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 3px;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.output-label {
		margin: 0 0 0.25rem;
		font-size: 0.8rem;
		font-weight: 600;
	}
	.output pre {
		margin: 0;
		font-size: 0.85rem;
		white-space: pre-wrap;
	}
</style>
