<script lang="ts">
	// Regression fixture for the 2026-11-19 review fixes (docs/REVIEW-2026-11-19.md — the ids
	// R1… / B1… are that report's). Targeted by e2e/regressions.spec.ts, which drives the trees
	// through window.__main / __snippet / __input (the Tree instance exports) + a few setters.
	import Tree from '$lib/components/Tree.svelte';
	import ContextMenuItemC from '$lib/components/ContextMenuItem.svelte';
	import type { LTreeNode } from '$lib/ltree/types.js';

	type Item = { id: number; path: string; name: string };

	let nodes = $state.raw<Item[]>([
		{ id: 1, path: '1', name: 'Alpha' },
		{ id: 2, path: '1.1', name: 'Beta' },
		{ id: 3, path: '1.1.1', name: 'Gamma' },
		{ id: 4, path: '1.1.2', name: 'Delta' },
		{ id: 7, path: '1.2', name: 'Eta match' },
		{ id: 5, path: '2', name: 'Epsilon' },
		{ id: 6, path: '2.1', name: 'Zeta match' }
	]);
	let searchTerm = $state('');
	let expandedPaths = $state(new Set<string>());
	let deleted = $state('');
	let shortcutHits = $state('');
	let nextId = 100;
	// B21: paths the beforeCheckboxToggleCallback ADDS to every toggle ([] = leave it alone).
	let toggleExtra: string[] = [];
	// B5: the parent-owned bindable focus.
	let focusedNode = $state<LTreeNode<Item> | null | undefined>(null);
	// B2: the bound selection / checked sets, read back after a removal or move.
	let selectedPaths = $state.raw(new Set<string>());
	let checkedPaths = $state.raw(new Set<string>());
	// B17: a member prop changed by the parent after the tree was built.
	let displayMember = $state('name');

	let main = $state<any>();
	let snippetTree = $state<any>();
	let inputTree = $state<any>();

	// Hole tree: Solo (1) has ONE child, Key (1.1). The callback drops Key from the manifest,
	// so dragging Solo yields a ONE-entry manifest ['1'] — Key must stay behind (re-homed to root).
	let holeNodes = $state.raw<Item[]>([
		{ id: 1, path: '1', name: 'Solo' },
		{ id: 11, path: '1.1', name: 'Key' },
		{ id: 2, path: '2', name: 'Target' }
	]);

	$effect(() => {
		const w = window as any;
		w.__main = main;
		w.__snippet = snippetTree;
		w.__input = inputTree;
		w.__setSearch = (v: string) => (searchTerm = v);
		w.__setExpanded = (v: string[]) => (expandedPaths = new Set(v));
		w.__nodes = () => nodes;
		w.__holeNodes = () => holeNodes;
		w.__setToggleExtra = (v: string[]) => (toggleExtra = v);
		w.__setFocused = (path: string | null) => (focusedNode = path ? main.getNodeByPath(path) : null);
		w.__focusedPath = () => focusedNode?.path ?? null;
		w.__selected = () => [...selectedPaths].sort();
		w.__checked = () => [...checkedPaths].sort();
		w.__setNodes = (v: Item[]) => (nodes = v);
		w.__setDisplayMember = (v: string) => (displayMember = v);
	});
</script>

<main>
	<h1>Review regressions</h1>

	<section data-testid="main-section">
		<div class="tree-container" style="width: 400px">
			<Tree
				bind:this={main}
				bind:nodes
				bind:searchTerm
				bind:expandedPaths
				bind:focusedNode
				bind:selectedPaths
				bind:checkedPaths
				treeId="main"
				dragDropMode="both"
				getIsDraggableCallback={() => true}
				getIsDropAllowedCallback={() => true}
				idMember="id"
				pathMember="path"
				displayValueMember={displayMember}
				searchValueMember="name"
				isInternalSearchIndexEnabled={true}
				expandLevel={5}
				isCheckboxesShown={true}
				checkboxMode="cascade"
				cascadeCheckPolicy="all"
				beforeCheckboxToggleCallback={(ctx: any) =>
					toggleExtra.length ? [...ctx.affectedPaths, ...toggleExtra] : undefined}
				nodeInputTransformationCallback={(ctx: any) => ({ ...ctx.data, id: nextId++ })}
				onNodeDelete={(ctx: any) => (deleted = ctx.paths.join(','))}
				getContextMenuItemsCallback={() => [
					{ text: 'Rename', shortcut: 'F2', onClick: () => { shortcutHits += 'F2;'; } },
					{ text: 'Remove', shortcut: 'Del', onClick: () => { shortcutHits += 'Del;'; } }
				]}
			/>
		</div>
		<pre>deleted: <span data-testid="deleted">{deleted}</span>
shortcuts: <span data-testid="shortcut-hits">{shortcutHits}</span></pre>
	</section>

	<section data-testid="hole-section">
		<div class="tree-container" style="width: 400px">
			<Tree
				bind:nodes={holeNodes}
				treeId="hole"
				dragDropMode="both"
				getIsDraggableCallback={() => true}
				getIsDropAllowedCallback={() => true}
				beforeDragStartCallback={(ctx: any) =>
					ctx.dragged.map((r: any) => r.path).filter((p: string) => p !== '1.1')}
				idMember="id"
				pathMember="path"
				displayValueMember="name"
				expandLevel={5}
			/>
		</div>
	</section>

	<section data-testid="snippet-section">
		<div class="tree-container" style="width: 400px">
			<Tree
				bind:this={snippetTree}
				treeId="snippet"
				nodes={[
					{ id: 1, path: '1', name: 'One' },
					{ id: 2, path: '2', name: 'Two' }
				]}
				idMember="id"
				pathMember="path"
				displayValueMember="name"
			>
				{#snippet contextMenu(node: LTreeNode<Item>, close: () => void)}
					<ContextMenuItemC text="Open" onClick={() => close()} />
				{/snippet}
			</Tree>
		</div>
	</section>

	<section data-testid="input-section">
		<div class="tree-container" style="width: 400px">
			<Tree
				bind:this={inputTree}
				treeId="input"
				nodes={[
					{ id: 1, path: '1', name: 'Editable' },
					{ id: 2, path: '2', name: 'Other' }
				]}
				idMember="id"
				pathMember="path"
				displayValueMember="name"
			>
				{#snippet nodeTemplate(node: LTreeNode<Item>)}
					<span>{node.data?.name}</span>
					{#if node.path === '1'}<input data-testid="row-input" value="text" />{/if}
				{/snippet}
			</Tree>
		</div>
	</section>
</main>

<style>
	main {
		padding: 1rem;
		font-family: sans-serif;
	}
	section {
		margin-bottom: 1rem;
	}
</style>
