<script lang="ts">
	// Custom menu renderer fixture: a menu rendered by the consumer (no <Tree> menu markup) over the
	// public API — controller.menuContext / menuItemDefaults / activateMenuItem +
	// resolveMenuEntries / getMenuChildren. Activation must run the same path as the built-in
	// menu (beforeActionCallback veto → onClick → built-in → onAction).
	// Targeted by e2e/custom-menu.spec.ts.
	import {
		TreeProvider,
		resolveMenuEntries,
		getMenuChildren,
		menuDivider,
		type TreeController,
		type TreeMenuContext,
		type TreeMenuEntry,
		type TreeMenuItem,
		type TreeAction,
		type TreeActionEventDetail
	} from '$lib/index.js';

	type Item = { id: number; path: string; name: string };

	const data: Item[] = [
		{ id: 1, path: '1', name: 'A' },
		{ id: 11, path: '1.1', name: 'A1' },
		{ id: 2, path: '2', name: 'B' },
		{ id: 3, path: '3', name: 'C' }
	];

	let log = $state<string[]>([]);
	let isBlocking = $state(false);
	let target = $state('2');
	let submenu = $state<string[]>([]);

	function entries(_ctx: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		return [
			'paste',
			'delete',
			menuDivider(),
			'expand',
			{ id: 'custom', text: 'Custom', onClick: (d) => { log = [...log, `click:${d.id}:${d.path}`]; } },
			{ id: 'more', text: 'More', getChildrenCallback: async (c) => [{ id: 'child', text: `Child of ${c.path}` }] }
		];
	}

	function before(d: TreeActionEventDetail<Item>) {
		log = [...log, `before:${d.action}:${d.id ?? '-'}`];
		if (isBlocking) return false;
	}

	async function activate(controller: TreeController<Item>, item: TreeMenuItem<Item>, ctx: TreeMenuContext<Item>, el: HTMLElement, e: Event) {
		const ok = await controller.activateMenuItem(item, ctx, el, e);
		log = [...log, `result:${ok}`];
	}

	async function openSub(item: TreeMenuItem<Item>, ctx: TreeMenuContext<Item>) {
		const children = await getMenuChildren(item, ctx);
		submenu = children.map((c) => ('text' in c ? String(c.text) : '-'));
	}
</script>

<svelte:head>
	<title>Test — Custom menu renderer</title>
</svelte:head>

<main>
	<button data-testid="block" onclick={() => (isBlocking = !isBlocking)}>block: {isBlocking}</button>
	<button data-testid="target-1" onclick={() => (target = '1')}>target 1</button>
	<pre data-testid="log">{JSON.stringify(log)}</pre>
	<pre data-testid="submenu">{JSON.stringify(submenu)}</pre>

	<TreeProvider
		nodes={data}
		idMember="id"
		pathMember="path"
		displayValueMember="name"
		beforeActionCallback={before}
		onNodeExpand={(c) => (log = [...log, `expand:${c.node?.path}`])}
		onNodeDelete={(c) => (log = [...log, `delete:${c.paths.join(',')}`])}
		onAction={(d) => (log = [...log, `action:${d.action}:${d.id ?? '-'}:${d.source}`])}
	>
		{#snippet children(controller)}
			{@const node = controller.allFlatNodes.find((n) => n.path === target)}
			{#if node}
				{@const ctx = controller.menuContext(node)}
				<ul data-testid="menu" role="menu">
					{#each resolveMenuEntries<TreeMenuContext<Item>, TreeAction>(entries(ctx), ctx, (item) => controller.menuItemDefaults(item, ctx)) as entry}
						{#if entry.kind === 'divider'}
							<li role="separator" data-testid="divider"></li>
						{:else}
							<li role="none">
								<button
									role="menuitem"
									data-testid="item"
									disabled={entry.resolved.isDisabled}
									class:danger={entry.resolved.isDanger}
									onclick={(e) =>
										entry.hasChildren
											? openSub(entry.item, ctx)
											: activate(controller, entry.item, ctx, e.currentTarget, e)}
								>{entry.resolved.text}</button>
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		{/snippet}
	</TreeProvider>
</main>
