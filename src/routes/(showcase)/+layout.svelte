<script lang="ts">
	// Showcase chrome = the KeenMate devkit examples kit (@keenmate/web-components-devkit),
	// the same kit every web-* examples site uses. Its Vite plugin only handles root *.html
	// pages, so the SvelteKit equivalents live here: page config + no-flash theme bootstrap
	// in <head>, and the kit's runtime helpers (re)mounted after every navigation — they are
	// idempotent DOM functions, documented as safe to call again after a re-render.
	// Build-time half: scripts/kmwc-sveltekit.ts. Plan: docs/PLAN-devkit-adoption.md.
	import '@keenmate/web-components-devkit/examples/style.css';
	import './examples-local.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import {
		attachChapterLinks,
		attachCopyLinks,
		attachDemoCopyButtons,
		attachStackedTables,
		mountChapterNav,
		mountSpotlight,
		mountThemeSwitch,
		renderVersionBadges,
		DEFAULT_THEME,
		INDEX_PAGE_CLASSES,
		THEME_ATTRIBUTE,
		THEME_STORAGE_KEY,
		THEMES
	} from '@keenmate/web-components-devkit/examples';
	import { EXAMPLE_PAGES } from './examples-registry.js';

	let { children } = $props();

	const { pageConfig, accent } = __KMWC_PAGE_CONFIG__;

	// Same script the devkit plugin injects (theme-switch.js renderThemeBootstrapScript):
	// apply the saved theme before first paint so a reload doesn't flash light.
	const themeBootstrap =
		`try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
		`document.documentElement.dataset.${THEME_ATTRIBUTE}=${JSON.stringify(THEMES)}.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_THEME)}}` +
		`catch(e){document.documentElement.dataset.${THEME_ATTRIBUTE}=${JSON.stringify(DEFAULT_THEME)}}`;
	const pageConfigScript = `window.__KMWC__=${JSON.stringify(pageConfig).replace(/</g, '\\u003c')};`;
	const accentStyle = [
		accent.color && `--kmwc-accent-color:${accent.color}`,
		accent.endColor && `--kmwc-accent-end-color:${accent.endColor}`
	]
		.filter(Boolean)
		.join(';');
	const headHtml =
		`<script>${themeBootstrap}<\/script><script>${pageConfigScript}<\/script>` +
		(accentStyle ? `<style>:root{${accentStyle}}</style>` : '');

	const isIndex = $derived(page.url.pathname === '/');

	type Mounted = { unmount(): void } | null;
	let mounted: Mounted[] = [];

	function unmountKit() {
		for (const m of mounted) m?.unmount();
		mounted = [];
	}

	afterNavigate(() => {
		// Client-side navigation doesn't re-run the <head> script.
		window.__KMWC__ ??= pageConfig;
		unmountKit();
		document.body.classList.toggle(INDEX_PAGE_CLASSES.body, isIndex);
		// Order = the kit's own mountExamplesKit(); its mountPageFooter is replaced by the
		// Svelte footer in examples/+layout.svelte (it needs `body > .container`).
		if (!isIndex) attachCopyLinks();
		mounted.push(
			mountChapterNav(
				isIndex
					? { items: EXAMPLE_PAGES.map((p) => ({ label: p.title, href: p.href })) }
					: { indexHref: '/' }
			)
		);
		attachChapterLinks();
		mounted.push(mountSpotlight());
		renderVersionBadges();
		// Copy button on every .code-block[data-language] (highlighted at build time by
		// scripts/kmwc-sveltekit.ts).
		attachDemoCopyButtons();
		// data-label + ARIA roles so a .reference-table stacks into cards on a phone.
		attachStackedTables();
		mounted.push(mountThemeSwitch());
	});

	onDestroy(() => {
		if (typeof document === 'undefined') return;
		unmountKit();
		document.body.classList.remove(INDEX_PAGE_CLASSES.body);
		// Leaving the showcase (e.g. to /dev/logging): don't leak the page theme onto
		// pages that don't use the kit.
		delete document.documentElement.dataset[THEME_ATTRIBUTE];
	});
</script>

<svelte:head>
	{@html headHtml}
</svelte:head>

{@render children()}
