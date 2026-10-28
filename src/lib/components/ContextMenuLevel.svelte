<script lang="ts" generics="T">
	import type { TreeMenuContext, TreeMenuEntry, TreeMenuItem, TreeAction } from '../core/menu.js';
	import type { TreeController } from '../core/TreeController.svelte.js';
	import {
		resolveMenuEntries,
		getMenuChildren,
		type ResolvedMenuEntry
	} from '../vendor/actions/resolve.js';
	import { computePosition, autoUpdate, offset, flip, shift } from '@floating-ui/dom';
	import Self from './ContextMenuLevel.svelte';

	interface Props {
		/** This level's raw entries (items, dividers, built-in names) — resolved here. */
		entries: TreeMenuEntry<T>[];
		/** The menu's surface ctx (node, path, parent, siblings, controller). */
		menuCtx: TreeMenuContext<T>;
		controller: TreeController<T>;
		closeContextMenu: () => void;
		/** Called by a child submenu to keep this level open while the cursor crosses into it. */
		cancelParentHide?: () => void;
	}

	let { entries, menuCtx, controller, closeContextMenu, cancelParentHide }: Props = $props();

	const resolved = $derived<ResolvedMenuEntry<TreeMenuContext<T>, TreeAction>[]>(
		resolveMenuEntries<TreeMenuContext<T>, TreeAction>(entries, menuCtx, (item) =>
			controller.menuItemDefaults(item, menuCtx)
		)
	);
	// The open submenu's entries (children / getChildrenCallback, which may be async).
	let submenuEntries = $state<TreeMenuEntry<T>[] | null>(null);

	async function activate(item: TreeMenuItem<T>, el: HTMLElement, event: Event) {
		try {
			await controller.activateMenuItem(item, menuCtx, el, event);
		} finally {
			// Selecting an entry dismisses the menu, like every native menu. Opt out with
			// shouldCloseOnClick: false (the handler closes via ctx.controller.closeContextMenu()).
			if (item.shouldCloseOnClick !== false) closeContextMenu();
		}
	}

	let openIdx = $state<number | null>(null);
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;
	// $state so `bind:this={itemEls[i]}` writes are reactive and the submenu
	// positioning $effect re-runs once the parent item element is attached.
	let itemEls = $state<HTMLElement[]>([]);
	let submenuEl = $state<HTMLElement | null>(null);

	function cancelHide() {
		if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
		cancelParentHide?.();
	}

	function scheduleHide() {
		if (hideTimeout) clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => { openIdx = null; hideTimeout = null; }, 150);
	}

	async function showSubmenu(idx: number) {
		cancelHide();
		if (openIdx === idx) return;
		openIdx = idx;
		submenuEntries = null;
		const entry = resolved[idx];
		if (entry?.kind !== 'item') return;
		const children = await getMenuChildren(entry.item, menuCtx);
		if (openIdx === idx) submenuEntries = children as TreeMenuEntry<T>[];
	}

	$effect(() => {
		const idx = openIdx;
		const menu = submenuEl;
		if (idx === null || !menu) return;
		const parent = itemEls[idx];
		if (!parent) return;
		return autoUpdate(parent, menu, () => {
			computePosition(parent, menu, {
				strategy: 'fixed',
				placement: 'right-start',
				middleware: [
					offset({ mainAxis: 0, crossAxis: -4 }),
					flip({ fallbackPlacements: ['left-start'] }),
					shift({ padding: 8 })
				]
			}).then(({ x, y }) => {
				menu.style.left = `${x}px`;
				menu.style.top = `${y}px`;
			});
		});
	});
</script>

{#each resolved as entry, i (i)}
	{#if entry.kind === 'divider'}
		<div class="stv__context-menu-divider" role="separator">
			{#if entry.text}
				<span class="stv__context-menu-divider-label">{entry.text}</span>
			{/if}
		</div>
	{:else}
		{@const item = entry.item}
		{@const r = entry.resolved}
		{@const hasChildren = entry.hasChildren}
		{@const isToggle = item.isToggled !== undefined || typeof item.getIsToggledCallback === 'function'}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (role is menuitem | menuitemcheckbox) -->
		<div
			bind:this={itemEls[i]}
			class="stv__context-menu-item {r.cssClass}"
			class:stv__context-menu-item--disabled={r.isDisabled}
			class:stv__context-menu-item--danger={r.isDanger}
			class:stv__context-menu-item--toggled={r.isToggled}
			class:stv__context-menu-item--has-children={hasChildren}
			role={isToggle ? 'menuitemcheckbox' : 'menuitem'}
			aria-checked={isToggle ? r.isToggled : undefined}
			aria-disabled={r.isDisabled || undefined}
			data-action={r.action !== 'custom' ? r.action : undefined}
			data-id={r.id}
			title={r.tooltip}
			tabindex={r.isDisabled ? -1 : 0}
			onmouseenter={() => { if (hasChildren) showSubmenu(i); else cancelHide(); }}
			onmouseleave={() => { if (hasChildren) scheduleHide(); }}
			onclick={(e) => {
				if (r.isDisabled || hasChildren) return;
				activate(item, e.currentTarget as HTMLElement, e);
			}}
			onkeydown={(e) => {
				if ((e.key === 'Enter' || e.key === ' ') && !r.isDisabled && !hasChildren) {
					e.preventDefault();
					activate(item, e.currentTarget as HTMLElement, e);
				}
			}}
		>
			{#if r.icon}
				<span class="stv__context-menu-icon">{r.icon}</span>
			{/if}
			<span class="stv__context-menu-label">{r.text}</span>
			{#if r.shortcut}
				<span class="stv__context-menu-shortcut">{r.shortcut}</span>
			{/if}
			{#if hasChildren}
				<span class="stv__context-menu-arrow" aria-hidden="true"></span>
			{/if}
		</div>
	{/if}
{/each}

{#if openIdx !== null && submenuEntries}
	<div
		bind:this={submenuEl}
		class="stv__context-menu stv__context-submenu"
		role="menu"
		tabindex="-1"
		onmouseenter={cancelHide}
		onmouseleave={scheduleHide}
	>
		<Self
			entries={submenuEntries}
			{menuCtx}
			{controller}
			{closeContextMenu}
			cancelParentHide={cancelHide}
		/>
	</div>
{/if}
