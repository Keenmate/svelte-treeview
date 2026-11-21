<script lang="ts">
	// Context-menu model fixture (web-treeview parity): built-in action names + labels,
	// custom items, createMenuDivider(), beforeActionCallback / item onClick / onAction order,
	// built-in targets (the selection when the clicked node is in it).
	// Targeted by e2e/menu-actions.spec.ts.
	import { Tree, createMenuDivider } from '$lib/index.js';
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
	let presentation = $state<'auto' | 'sheet'>('auto');
	// A lazy submenu the test resolves (window.__resolveLazy) — core shows its loading row meanwhile.
	let resolveLazy: (() => void) | null = null;
	if (typeof window !== 'undefined') (window as any).__resolveLazy = () => resolveLazy?.();

	function menu(ctx: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		// Called while the menu renders — record on a microtask (no state writes during render).
		const entry = `menu:${ctx.path}:${ctx.parent?.path ?? 'root'}:${ctx.siblings.length}:${ctx.controller ? 'ctrl' : 'no-ctrl'}`;
		queueMicrotask(() => (log = [...log, entry]));
		return [
			'copy',
			'paste',
			'delete',
			createMenuDivider('View'),
			'expand',
			'collapse',
			'expand-subtree',
			'collapse-subtree',
			'expand-all',
			'collapse-all',
			createMenuDivider(),
			'sort',
			{ action: 'sort-all', text: 'Sort everything' },
			{ id: 'hidden', text: 'Hidden', isVisible: false },
			{ id: 'custom', text: 'Custom', icon: '★', shortcut: 'Ctrl+K', onClick: (d) => { log = [...log, `click:${d.id}:${d.path}`]; } },
			{ id: 'parent', text: 'More', children: [{ id: 'child', text: 'Child item', onClick: (d) => { log = [...log, `click:${d.id}`]; } }] },
			{
				id: 'lazy',
				text: 'Lazy',
				getChildrenCallback: () =>
					new Promise<TreeMenuEntry<Item>[]>((resolve) => {
						resolveLazy = () => resolve([{ id: 'loaded', text: 'Loaded item' }]);
					})
			}
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
	<button data-testid="sheet" onclick={() => (presentation = presentation === 'sheet' ? 'auto' : 'sheet')}>presentation: {presentation}</button>
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
			labels={{ 'menuItems.copy': 'Kopírovat' }}
			getContextMenuItemsCallback={menu}
			menuPresentation={presentation}
			beforeActionCallback={before}
			onAction={(d) => (log = [...log, `action:${d.action}:${d.id ?? '-'}:${d.source}`])}
		/>
	</div>
</main>
