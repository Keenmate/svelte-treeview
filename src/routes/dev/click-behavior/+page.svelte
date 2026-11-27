<script lang="ts">
	// Dev comparison (not an e2e fixture): clickBehavior + Ctrl / Shift click, svelte-treeview
	// next to web-treeview. The web tree is loaded from a web-treeview Vite dev server
	// (default http://localhost:12695 — `npx vite --port 12695` in ../web-treeview).
	import { onMount } from 'svelte';
	import { Tree } from '$lib/index.js';
	import type { LTreeNode } from '$lib/index.js';

	type Item = { id: string; path: string; name: string };
	const data: Item[] = [
		{ id: '1', path: '1', name: 'Documents' },
		{ id: '1.1', path: '1.1', name: 'Reports' },
		{ id: '1.1.1', path: '1.1.1', name: 'Q1.pdf' },
		{ id: '1.1.2', path: '1.1.2', name: 'Q2.pdf' },
		{ id: '1.2', path: '1.2', name: 'Notes.txt' },
		{ id: '1.3', path: '1.3', name: 'Todo.txt' },
		{ id: '2', path: '2', name: 'Pictures' },
		{ id: '2.1', path: '2.1', name: 'Beach.jpg' },
		{ id: '2.2', path: '2.2', name: 'Forest.jpg' },
		{ id: '3', path: '3', name: 'Music' }
	];
	const byPath = (a: LTreeNode<Item>, b: LTreeNode<Item>) =>
		a.path.localeCompare(b.path, undefined, { numeric: true });

	const WEB_ORIGIN = 'http://localhost:12695';

	let clickBehavior = $state<'select' | 'expand' | 'expand-and-focus'>('expand');
	let selectionMode = $state<'single' | 'multiple'>('multiple');

	let svelteLog = $state<string[]>([]);
	let webLog = $state<string[]>([]);
	let svelteSelected = $state<Set<string>>(new Set());
	let svelteFocused = $state<LTreeNode<Item> | null>(null);
	let webSelected = $state('');
	let webFocused = $state('');
	let webStatus = $state(`loading web-treeview from ${WEB_ORIGIN}…`);

	const fmt = (paths: Iterable<string>) =>
		[...paths].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(', ') || '—';
	const push = (log: string[], line: string) => [line, ...log].slice(0, 30);

	let webHost: HTMLElement;
	let webTree = $state.raw<any>(null);

	onMount(() => {
		let isCancelled = false;
		import(/* @vite-ignore */ `${WEB_ORIGIN}/src/index.ts`)
			.then(() => customElements.whenDefined('web-treeview'))
			.then(() => {
				if (isCancelled) return;
				const tree = document.createElement('web-treeview') as any;
				tree.idMember = 'id';
				tree.pathMember = 'path';
				tree.displayValueMember = 'name';
				tree.sortCallback = ({ nodes }: { nodes: LTreeNode<Item>[] }) => [...nodes].sort(byPath);
				tree.expandLevel = 2;
				tree.clickBehavior = clickBehavior;
				tree.selectionMode = selectionMode;
				tree.nodes = data;
				const log = (line: string) => (webLog = push(webLog, line));
				tree.addEventListener('node-click', (e: CustomEvent) => log(`click ${e.detail.node?.path}`));
				tree.addEventListener('selection-change', (e: CustomEvent) => {
					webSelected = fmt(e.detail.paths);
					log(`selection → ${webSelected}`);
				});
				tree.addEventListener('focus-change', (e: CustomEvent) => {
					webFocused = e.detail.focusedNode?.path ?? '—';
					log(`focus → ${webFocused}`);
				});
				tree.addEventListener('node-expand', (e: CustomEvent) => log(`expand ${e.detail.node?.path ?? e.detail.path}`));
				tree.addEventListener('node-collapse', (e: CustomEvent) => log(`collapse ${e.detail.node?.path ?? e.detail.path}`));
				webHost.appendChild(tree);
				webTree = tree;
				webStatus = '';
			})
			.catch((err) => {
				webStatus = `web-treeview not reachable at ${WEB_ORIGIN} (${err?.message ?? err})`;
			});
		return () => {
			isCancelled = true;
		};
	});

	$effect(() => {
		if (!webTree) return;
		webTree.clickBehavior = clickBehavior;
		webTree.selectionMode = selectionMode;
	});

	function reset() {
		svelteLog = [];
		webLog = [];
		svelteSelected = new Set();
		svelteFocused = null;
		webTree?.clearSelection?.();
		webTree?.clearFocus?.();
		webSelected = '';
		webFocused = '';
	}
</script>

<div class="container py-3">
	<h1 class="h4">clickBehavior + Ctrl / Shift click — svelte-treeview vs web-treeview</h1>
	<p class="text-muted small mb-2">
		Same data, same options, same clicks. Try: plain click on a folder, plain click on a file,
		Ctrl+click a few rows, Shift+click a range — under each <code>clickBehavior</code>.
	</p>

	<div class="d-flex gap-4 align-items-center mb-3 flex-wrap">
		<label>clickBehavior
			<select bind:value={clickBehavior} class="form-select form-select-sm d-inline-block w-auto">
				<option value="expand">expand</option>
				<option value="expand-and-focus">expand-and-focus</option>
				<option value="select">select</option>
			</select>
		</label>
		<label>selectionMode
			<select bind:value={selectionMode} class="form-select form-select-sm d-inline-block w-auto">
				<option value="multiple">multiple</option>
				<option value="single">single</option>
			</select>
		</label>
		<button class="btn btn-sm btn-outline-secondary" onclick={reset}>Clear selection + logs</button>
	</div>

	<div class="row g-4">
		<div class="col-md-6">
			<h2 class="h6">svelte-treeview</h2>
			<div class="border rounded p-1" style="height: 300px; overflow: auto">
				<Tree
					nodes={data}
					idMember="id"
					pathMember="path"
					displayValueMember="name"
					sortCallback={({ nodes }) => [...nodes].sort(byPath)}
					expandLevel={2}
					{clickBehavior}
					{selectionMode}
					bind:selectedPaths={svelteSelected}
					bind:focusedNode={svelteFocused}
					onNodeClick={(ctx) => (svelteLog = push(svelteLog, `click ${ctx.path}`))}
					onSelectionChange={(ctx) => (svelteLog = push(svelteLog, `selection → ${fmt(ctx.paths)}`))}
					onFocusChange={(ctx) => (svelteLog = push(svelteLog, `focus → ${ctx.focusedNode?.path ?? '—'}`))}
					onNodeExpand={(ctx) => (svelteLog = push(svelteLog, `expand ${ctx.path}`))}
					onNodeCollapse={(ctx) => (svelteLog = push(svelteLog, `collapse ${ctx.path}`))}
				/>
			</div>
			<p class="small mt-2 mb-1">Selected: <b>{fmt(svelteSelected)}</b> · Focused: <b>{svelteFocused?.path ?? '—'}</b></p>
			<pre class="small border rounded p-2 bg-light" style="height: 220px; overflow: auto">{svelteLog.join('\n')}</pre>
		</div>
		<div class="col-md-6">
			<h2 class="h6">web-treeview</h2>
			<div class="border rounded p-1" style="height: 300px; overflow: auto" bind:this={webHost}>
				{#if webStatus}<p class="small m-2 {webStatus.startsWith('web-treeview not reachable') ? 'text-danger' : 'text-muted'}">{webStatus}</p>{/if}
			</div>
			<p class="small mt-2 mb-1">Selected: <b>{webSelected || '—'}</b> · Focused: <b>{webFocused || '—'}</b></p>
			<pre class="small border rounded p-2 bg-light" style="height: 220px; overflow: auto">{webLog.join('\n')}</pre>
		</div>
	</div>
</div>
