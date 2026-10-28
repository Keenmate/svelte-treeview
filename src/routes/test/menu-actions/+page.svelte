<script lang="ts">
	// Context-menu model fixture (web-treeview parity): built-in action names + labels,
	// custom items, menuDivider(), beforeActionCallback / item onClick / onAction order,
	// built-in targets (the selection when the clicked node is in it).
	// Targeted by e2e/menu-actions.spec.ts.
	import { Tree, menuDivider } from '$lib/index.js';
	import type { TreeMenuContext, TreeMenuEntry, TreeActionEventDetail } from '$lib/index.js';

	type Item = { id: number; path: string; name: string };

	const data: Item[] = [
		{ id: 1, path: '1', name: 'A' },
		{ id: 11, path: '1.1', name: 'A1' },
		{ id: 111, path: '1.1.1', name: 'A1a' },
		{ id: 2, path: '2', name: 'B' },
		{ id: 21, path: '2.1', name: 'B1' },
		{ id: 3, path: '3', name: 'C' }
	];

	let log = $state<string[]>([]);
	let isBlocking = $state(false);
	let expanded = $state<Set<string>>(new Set());

	function menu(ctx: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		// Called while the menu renders — record on a microtask (no state writes during render).
		const entry = `menu:${ctx.path}:${ctx.parent?.path ?? 'root'}:${ctx.siblings.length}:${ctx.controller ? 'ctrl' : 'no-ctrl'}`;
		queueMicrotask(() => (log = [...log, entry]));
		return [
			'copy',
			'paste',
			'delete',
			menuDivider('View'),
			'expand',
			'collapse',
			'expand-subtree',
			'collapse-subtree',
			'expand-all',
			'collapse-all',
			menuDivider(),
			'sort',
			{ action: 'sort-all', text: 'Sort everything' },
			{ id: 'hidden', text: 'Hidden', isVisible: false },
			{ id: 'custom', text: 'Custom', icon: '★', onClick: (d) => { log = [...log, `click:${d.id}:${d.path}`]; } },
			{ id: 'parent', text: 'More', children: [{ id: 'child', text: 'Child item', onClick: (d) => { log = [...log, `click:${d.id}`]; } }] }
		];
	}

	function before(d: TreeActionEventDetail<Item>) {
		log = [...log, `before:${d.action}:${d.id ?? '-'}`];
		if (isBlocking) return false;
	}
</script>

<svelte:head>
	<title>Test — Menu actions</title>
</svelte:head>

<main>
	<button data-testid="block" onclick={() => (isBlocking = !isBlocking)}>block: {isBlocking}</button>
	<button data-testid="clear-log" onclick={() => (log = [])}>clear</button>
	<pre data-testid="log">{JSON.stringify(log)}</pre>
	<pre data-testid="expanded">{JSON.stringify([...expanded].sort())}</pre>

	<div data-testid="tree">
		<Tree
			bind:expandedPaths={expanded}
			nodes={data}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			selectionMode="multiple"
			labels={{ copy: 'Kopírovat' }}
			getContextMenuItemsCallback={menu}
			beforeActionCallback={before}
			onAction={(d) => (log = [...log, `action:${d.action}:${d.id ?? '-'}:${d.source}`])}
		/>
	</div>
</main>
