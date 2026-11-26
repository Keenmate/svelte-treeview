<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { TreeEngine } from '../core/TreeEngine.svelte.js';
	import { renderIcon } from '../vendor/core/dom/render-icon.js';
	import { formatShortcut } from '../vendor/actions/shortcut.js';
	import { uiLogger } from '../logger.js';
	import { computePosition, autoUpdate, offset, flip, shift } from '@floating-ui/dom';

	/**
	 * One item of a `contextMenu` snippet. The snippet renders into core `openMenu()`'s custom-menu
	 * element (Tree.svelte), so the item carries core's `/menu` markup — `km-menu__item` + icon /
	 * label / shortcut spans, the same classes and styles as a `getContextMenuItemsCallback` item.
	 */
	interface Props {
		id?: string;
		text: string;
		icon?: string;
		shortcut?: string;
		isDisabled?: boolean;
		tooltip?: string;
		isDanger?: boolean;
		isToggled?: boolean;
		cssClass?: string;
		onClick?: () => void | Promise<void>;
		children?: Snippet;
	}

	let {
		id,
		text,
		tooltip,
		isDanger = false,
		isToggled,
		icon,
		shortcut,
		isDisabled = false,
		cssClass,
		onClick,
		children
	}: Props = $props();

	const hasChildren = $derived(!!children);

	// Icons go through core renderIcon like core's menu: the enclosing tree's renderIconCallback
	// (ctx.item = this item's props) → the page-wide hook → icon font / text.
	const controller = getContext<TreeEngine<unknown> | undefined>('TreeEngine');
	const iconHtml = $derived(
		!icon
			? ''
			: controller
				? controller.renderMenuIconHtml(icon, { id, text, icon })
				: renderIcon(icon, { component: 'svelte-treeview', context: { item: { id, text, icon } } })
	);

	let itemEl = $state<HTMLElement | null>(null);
	let submenuEl = $state<HTMLElement | null>(null);
	let submenuOpen = $state(false);
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;

	function cancelHide() {
		if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
	}

	function scheduleHide() {
		if (hideTimeout) clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => { submenuOpen = false; hideTimeout = null; }, 150);
	}

	async function activate() {
		if (isDisabled || hasChildren) return;
		try {
			await onClick?.();
		} catch (error) {
			uiLogger.error('Context menu callback error:', error);
		}
	}

	$effect(() => {
		if (!submenuOpen || !itemEl || !submenuEl) return;
		const parent = itemEl;
		const menu = submenuEl;
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

<!-- svelte-ignore a11y_no_noninteractive_tabindex (role is menuitem | menuitemcheckbox) -->
<div
	bind:this={itemEl}
	class="km-menu__item {cssClass || ''}"
	class:km-menu__item--disabled={isDisabled}
	class:km-menu__item--danger={isDanger}
	class:km-menu__item--toggled={isToggled}
	class:km-menu__item--has-submenu={hasChildren}
	data-id={id}
	role={isToggled !== undefined ? 'menuitemcheckbox' : 'menuitem'}
	aria-checked={isToggled !== undefined ? isToggled : undefined}
	aria-disabled={isDisabled || undefined}
	aria-haspopup={hasChildren ? 'menu' : undefined}
	aria-expanded={hasChildren ? submenuOpen : undefined}
	title={tooltip}
	tabindex={isDisabled ? -1 : 0}
	onmouseenter={() => { if (hasChildren) { cancelHide(); submenuOpen = true; } }}
	onmouseleave={() => { if (hasChildren) scheduleHide(); }}
	onclick={activate}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (hasChildren) submenuOpen = true;
			else activate();
		}
	}}
>
	{#if icon}
		<span class="km-menu__icon" aria-hidden="true">{@html iconHtml}</span>
	{/if}
	<span class="km-menu__label">{text}</span>
	{#if shortcut}
		<span class="km-menu__shortcut">{formatShortcut(shortcut)}</span>
	{/if}
</div>

{#if hasChildren && submenuOpen}
	<div
		bind:this={submenuEl}
		class="km-menu km-menu--submenu km-menu--custom"
		role="menu"
		tabindex="-1"
		onmouseenter={cancelHide}
		onmouseleave={scheduleHide}
	>
		{@render children!()}
	</div>
{/if}
