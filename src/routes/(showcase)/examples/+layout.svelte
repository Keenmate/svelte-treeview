<script lang="ts">
	// Example pages: the devkit kit's page footer. Its mountPageFooter() looks for
	// `body > .container`, which a SvelteKit app never has, so it's rendered here with the
	// kit's own markup + footer line. Pages keep their inline <header> (the kit layout
	// markup: .container > header > .back-link / h1 / .subtitle). Chapter nav, copy-links,
	// spotlight and the theme switch are mounted by (showcase)/+layout.svelte.
	import { renderFooterLineHtml, PAGE_FOOTER_CLASSES, type KmwcPageConfig } from '@keenmate/web-components-devkit/examples';

	let { children } = $props();

	// The build-time page config (same object as window.__KMWC__), so SSR and hydration agree.
	const footerHtml = renderFooterLineHtml(__KMWC_PAGE_CONFIG__.pageConfig as unknown as KmwcPageConfig, {
		links: [{ label: 'npm', href: 'https://www.npmjs.com/package/@keenmate/svelte-treeview' }],
		devkitClass: PAGE_FOOTER_CLASSES.devkit
	});
</script>

<div class="container">
	{@render children()}
	<footer class={PAGE_FOOTER_CLASSES.root}>{@html footerHtml}</footer>
</div>
