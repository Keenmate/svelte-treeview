<script lang="ts">
	// Deterministic fixture for the state-change callbacks (web-treeview parity):
	//   - expandedPaths (bindable) / onNodeExpand / onNodeCollapse / onExpandedChange
	//   - beforeExpandCallback (sync veto + async lazy load with the loading state)
	// Targeted by e2e/state-events.spec.ts.
	import { Tree } from '$lib/index.js';
	import type { LTreeNode } from '$lib/index.js';

	type Item = { id: number; path: string; name: string; hasKids?: boolean };

	const data: Item[] = [
		{ id: 1, path: '1', name: 'A', hasKids: true },
		{ id: 11, path: '1.1', name: 'A1', hasKids: true },
		{ id: 111, path: '1.1.1', name: 'A1a' },
		{ id: 12, path: '1.2', name: 'A2' },
		{ id: 2, path: '2', name: 'B', hasKids: true },
		{ id: 21, path: '2.1', name: 'B1' },
		{ id: 3, path: '3', name: 'Locked', hasKids: true },
		{ id: 31, path: '3.1', name: 'L1' },
		{ id: 4, path: '4', name: 'Lazy', hasKids: true }
	];

	let treeRef: Tree<Item>;
	let expanded = $state<Set<string>>(new Set());
	let log = $state<string[]>([]);
	let isAccordion = $state(false);
	let releaseLazy: ((v: boolean) => void) | null = null;

	function push(entry: string) {
		log = [...log, entry];
	}

	function beforeExpand(ctx: { path: string; node: LTreeNode<Item> | null; controller: unknown }) {
		push(`before:${ctx.path}:${ctx.controller ? 'ctrl' : 'no-ctrl'}`);
		if (ctx.path === '3') return false;
		if (ctx.path === '4') {
			return new Promise<boolean>((resolve) => {
				releaseLazy = (v) => {
					if (v) {
						treeRef.addNode('4', { id: 41, path: '4.1', name: 'Loaded' } as Item);
					}
					resolve(v);
				};
			});
		}
	}
</script>

<svelte:head>
	<title>Test — State events</title>
</svelte:head>

<main>
	<div class="controls">
		<button data-testid="expand-1" onclick={() => treeRef.expandNodes('1.1')}>expandNodes('1.1')</button>
		<button data-testid="collapse-1" onclick={() => treeRef.collapseNodes('1')}>collapseNodes('1')</button>
		<button data-testid="expand-silent" onclick={() => treeRef.expandNodes('2', { isSilent: true })}>expand silent</button>
		<button data-testid="expand-all" onclick={() => treeRef.expandAll()}>expandAll</button>
		<button data-testid="collapse-all" onclick={() => treeRef.collapseAll()}>collapseAll</button>
		<button data-testid="assign-expanded" onclick={() => (expanded = new Set(['2']))}>expanded = {'{2}'}</button>
		<button data-testid="release-lazy" onclick={() => releaseLazy?.(true)}>release lazy</button>
		<button data-testid="reject-lazy" onclick={() => releaseLazy?.(false)}>reject lazy</button>
		<button data-testid="accordion" onclick={() => (isAccordion = !isAccordion)}>accordion</button>
		<button data-testid="clear-log" onclick={() => (log = [])}>clear</button>
	</div>
	<pre data-testid="log">{JSON.stringify(log)}</pre>
	<pre data-testid="expanded">{JSON.stringify([...expanded].sort())}</pre>

	<div data-testid="tree">
		<Tree
			bind:this={treeRef}
			bind:expandedPaths={expanded}
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			hasChildrenMember="hasKids"
			expandLevel={0}
			shouldExpandAsAccordion={isAccordion}
			beforeExpandCallback={beforeExpand}
			onNodeExpand={(ctx) => push(`expand:${ctx.path}`)}
			onNodeCollapse={(ctx) => push(`collapse:${ctx.path}`)}
			onExpandedChange={(ctx) => push(`changed:${[...ctx.paths].sort().join(',')}`)}
		/>
	</div>
</main>
