<script lang="ts">
	// Deterministic e2e fixture for clipboard (Ctrl/Cmd + C / X / V) + multi-select.
	// Uses PLAIN $state data on purpose so the copy path exercises Svelte's reactive
	// proxy — the regression guard for the structuredClone→$state.snapshot fix in
	// TreeController._collectClipboardEntry (structuredClone throws on a $state proxy).
	//
	// Targeted by e2e/clipboard.spec.ts.
	import { Tree } from '$lib/index.js';
	import type { TreeController, BeforePasteContext } from '$lib/core/TreeController.svelte.js';
	import type { LTreeNode } from '$lib/ltree/types.js';

	type Item = { id: number; path: string; name: string };

	let data = $state<Item[]>([
		{ id: 1, path: '1', name: 'Folder A' },
		{ id: 2, path: '1.1', name: 'A-child-1' },
		{ id: 3, path: '1.2', name: 'A-child-2' },
		{ id: 4, path: '2', name: 'Folder B' },
		{ id: 5, path: '2.1', name: 'B-child-1' }
	]);

	let treeRef: Tree<Item>;
	let focusedNode = $state<LTreeNode<Item> | null>(null);
	let selectedPaths = $state<Set<string>>(new Set());
	let cutPaths = $state<Set<string>>(new Set());
	let lastLog = $state('');
	let nextId = 100;

	function sortByName({ items }: { items: LTreeNode<Item>[] }) {
		return [...items].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	function clipboardPaths(controller: TreeController<Item>): string[] {
		if (controller.selectedPaths.size > 0) return [...controller.selectedPaths];
		return focusedNode ? [focusedNode.path] : [];
	}

	function transformPasted({ data: item }: { data: Item }): Item {
		return { ...item, id: nextId++, path: '' };
	}

	function uniqueCopyName(name: string, taken: Set<string>): string {
		const stem = name.replace(/ Copy \d+$/, '');
		if (!taken.has(stem)) return stem;
		let n = 1;
		while (taken.has(`${stem} Copy ${n}`)) n++;
		return `${stem} Copy ${n}`;
	}

	// Redirect a paste onto the copied node itself into its parent (duplicate in the
	// same folder), then append "(copy)" on name collision under the final target.
	// NOTE: this fixture intentionally keeps the older "mutate entries in beforePaste"
	// style to guard that it still works — the mutation now lands on the per-paste
	// working copy (the clipboard singleton is never touched). New code should rename in
	// nodeInputTransformationCallback instead (see /examples/tree-editor).
	function beforePaste(ctx: BeforePasteContext<Item>): { targetPath?: string } | void {
		if (ctx.operation !== 'copy') return;
		let targetPath = ctx.target.path;
		let redirect: { targetPath?: string } | undefined;
		if (targetPath && ctx.entries.some((e) => e.sourcePath === targetPath)) {
			targetPath = ctx.target.node?.parentPath ?? '';
			redirect = { targetPath };
		}
		const taken = new Set(treeRef.getChildren(targetPath).map((c) => c.data?.name ?? ''));
		for (const entry of ctx.entries) {
			const name = uniqueCopyName(entry.data.name, taken);
			entry.data = { ...entry.data, name };
			taken.add(name);
		}
		return redirect;
	}

	function beforeKeydownCallback({
		event,
		controller
	}: {
		event: KeyboardEvent;
		focusedNode: LTreeNode<Item> | null;
		selectedNodes: LTreeNode<Item>[];
		controller: TreeController<Item>;
	}): false | void {
		const mod = event.ctrlKey || event.metaKey;
		const key = event.key.toLowerCase();

		// Success logging is driven by the onNodeCopy / onNodeCut / onNodePaste callbacks below.
		if (mod && key === 'c') {
			const paths = clipboardPaths(controller);
			if (!paths.length) return false;
			controller.copyNodes(paths);
			cutPaths = new Set();
			return false;
		}
		if (mod && key === 'x') {
			const paths = clipboardPaths(controller);
			if (!paths.length) return false;
			controller.cutNodes(paths);
			cutPaths = new Set(controller.cutPaths);
			return false;
		}
		if (mod && key === 'v') {
			if (!controller.hasClipboardContent()) return false;
			controller.pasteNodes(focusedNode?.path ?? '', transformPasted, 'child');
			cutPaths = new Set();
			return false;
		}
		if (event.key === 'Escape' && cutPaths.size > 0) {
			controller.cancelCut();
			cutPaths = new Set();
			lastLog = 'cut-cancelled';
			return false;
		}
		return;
	}

	const totalNodes = $derived(data.length); // initial only; live count read from DOM in tests
</script>

<svelte:head><title>Test — Clipboard</title></svelte:head>

<main>
	<h1>Clipboard test</h1>
	<p>
		Multi-select with Ctrl/Cmd+click; Ctrl/Cmd + C / X / V to copy / cut / paste.
		Paste lands under the focused node.
	</p>

	<div data-testid="last-log">{lastLog}</div>
	<div data-testid="initial-count">{totalNodes}</div>

	<div style="max-width: 500px; border: 1px solid #ccc;">
		<Tree
			bind:this={treeRef}
			{data}
			idMember="id"
			pathMember="path"
			sortCallback={sortByName}
			isSorted={true}
			expandLevel={3}
			clickBehavior="select"
			selectionMode="multiple"
			bind:focusedNode
			bind:selectedPaths
			{beforeKeydownCallback}
			onNodeCopy={({ paths }) => (lastLog = `copied ${paths.length}`)}
			onNodeCut={({ paths }) => (lastLog = `cut ${paths.length}`)}
			onNodePaste={(result) => (lastLog = result.success ? `pasted ${result.count}` : `paste-failed ${result.error}`)}
			beforePasteCallback={beforePaste}
		>
			{#snippet nodeTemplate(node: LTreeNode<Item>)}
				<span data-name={node.data?.name} class:cut-dimmed={cutPaths.has(node.path)}>
					{node.data?.name}
				</span>
			{/snippet}
		</Tree>
	</div>
</main>

<style>
	main { padding: 1rem; font-family: system-ui, sans-serif; }
	.cut-dimmed { opacity: 0.45; font-style: italic; }
</style>
