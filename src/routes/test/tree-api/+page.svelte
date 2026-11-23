<script lang="ts">
	// <Tree> instance exports added for web-treeview parity (P5/P6): lookups, selection,
	// clipboard, keyboard navigation, openContextMenu(path), isNodeDropAllowed, and the
	// `controller` every callback ctx carries (non-enumerable). Targeted by e2e/tree-api.spec.ts.
	import { Tree } from '$lib/index.js';

	type Item = { id: number; path: string; name: string; isLocked?: boolean };

	const data: Item[] = [
		{ id: 1, path: '1', name: 'A' },
		{ id: 11, path: '1.1', name: 'A1' },
		{ id: 2, path: '2', name: 'B', isLocked: true },
		{ id: 3, path: '3', name: 'C' }
	];

	let treeRef: Tree<Item>;
	let out = $state('');
	let ctxLog = $state<string[]>([]);
	/** The controller the last onNodeClick ctx carried (REVIEW #6: the public facade, not the engine). */
	let clickController: Record<string, unknown> | null = null;

	function show(value: unknown) {
		out = JSON.stringify(value);
	}
	function ctxInfo(name: string, ctx: object) {
		const c = ctx as { controller?: unknown };
		const entry = `${name}:${c.controller ? 'ctrl' : 'none'}:${Object.keys(ctx).includes('controller') ? 'enum' : 'hidden'}`;
		// Per-node callbacks run while rendering — record on a microtask, once per entry.
		queueMicrotask(() => {
			if (!ctxLog.includes(entry)) ctxLog = [...ctxLog, entry];
		});
	}
</script>

<main>
	<div class="controls">
		<button data-testid="ref" onclick={() => { const r = treeRef.getNodeRef('1.1'); show([r.path, r.parent?.path, r.siblings.length]); }}>getNodeRef</button>
		<button data-testid="visible" onclick={() => show(treeRef.getVisibleFlatNodes().map((n) => n.path))}>getVisibleFlatNodes</button>
		<button data-testid="tree" onclick={() => show(!!treeRef.getTree()?.getNodeByPath('3'))}>getTree</button>
		<button data-testid="select" onclick={() => { treeRef.selectNodes(['1', '3']); show([treeRef.getSelectedNodes().map((n) => n.path), treeRef.isNodeSelected('3'), treeRef.isNodeSelected('2')]); }}>select + getSelectedNodes</button>
		<button data-testid="drop" onclick={() => show([treeRef.isNodeDropAllowed('1'), treeRef.isNodeDropAllowed('2'), treeRef.isNodeDropAllowed('nope')])}>isNodeDropAllowed</button>
		<button data-testid="clip" onclick={() => { treeRef.copyNodes(['3']); const a = [treeRef.hasClipboardContent(), treeRef.getClipboardOperation()]; const r = treeRef.pasteNodes('1'); treeRef.cutNodes(['3']); const b = treeRef.getClipboardOperation(); treeRef.cancelCut(); show([...a, r.success, b, treeRef.hasClipboardContent()]); }}>clipboard</button>
		<button data-testid="nav" onclick={() => { treeRef.focusFirst(); treeRef.focusNext(); const a = treeRef.getVisibleFlatNodes().find((n) => n.isFocused)?.path; treeRef.focusLast(); treeRef.focusPrevious(); const b = treeRef.getVisibleFlatNodes().find((n) => n.isFocused)?.path; show([a, b]); }}>nav</button>
		<button data-testid="facade" onclick={() => {
			const c = clickController!;
			const instances = (window as any).components['svelte-treeview'].getInstances() as unknown[];
			const before = c.selectedPaths as Set<string>;
			(c.selectNodes as (p: string[]) => void)(['1']);
			show([Object.isFrozen(c), 'tree' in c, '_mutate' in c, 'nodeConfig' in c, typeof c.expandNodes,
				instances.includes(c), before.size, (c.selectedPaths as Set<string>).has('1'), typeof c.treeId]);
		}}>ctx.controller = facade</button>
		<button data-testid="menu" onclick={() => treeRef.openContextMenu('3', 100, 100)}>openContextMenu('3')</button>
	</div>
	<pre data-testid="out">{out}</pre>
	<pre data-testid="ctx-log">{JSON.stringify(ctxLog)}</pre>

	<div data-testid="tree-host">
		<Tree
			bind:this={treeRef}
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			getIsDropAllowedCallback={(ctx) => { ctxInfo('getIsDropAllowed', ctx); return !ctx.node.data?.isLocked; }}
			expandLevel={1}
			flatIndentSize="24px"
			selectionMode="multiple"
			getContextMenuItemsCallback={(ctx) => [{ id: 'x', text: `Menu for ${ctx.path}` }]}
			onNodeClick={(ctx) => { ctxInfo('onNodeClick', ctx); clickController = ctx.controller as unknown as Record<string, unknown>; }}
			onSelectionChange={(ctx) => ctxInfo('onSelectionChange', ctx)}
			onNodeCopy={(ctx) => ctxInfo('onNodeCopy', ctx)}
			onNodePaste={(ctx) => ctxInfo('onNodePaste', ctx)}
			beforeCopyCallback={(ctx) => { ctxInfo('beforeCopy', ctx); }}
		/>
	</div>
</main>
