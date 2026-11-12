<script lang="ts">
	// The examples landing page — the devkit kit's index page (renderExamplesIndex() markup,
	// kmwc-index__* classes) rendered in Svelte so it's prerendered. Cards come from the
	// shared registry, which also feeds this page's cross-page chapter nav
	// ((showcase)/+layout.svelte) and the spotlight index.
	import {
		getVersionLabel,
		renderFooterLineHtml,
		INDEX_PAGE_CLASSES as c,
		type KmwcPageConfig
	} from '@keenmate/web-components-devkit/examples';
	import { EXAMPLE_PAGES } from './examples-registry.js';

	const pageConfig = __KMWC_PAGE_CONFIG__.pageConfig as unknown as KmwcPageConfig;
	const footerHtml = renderFooterLineHtml(pageConfig, {
		links: [{ label: 'npm', href: 'https://www.npmjs.com/package/@keenmate/svelte-treeview' }],
		devkitClass: c.devkit
	});
</script>

<svelte:head>
	<title>{pageConfig.title} — Examples</title>
</svelte:head>

<div class={c.page}>
	<header class={c.header}>
		<h1>{pageConfig.title}</h1>
		<p class={c.tagline}>{pageConfig.tagline}</p>
		<span class={c.version} data-kmwc-version>{getVersionLabel(pageConfig)}</span>
	</header>
	<div class={c.cards}>
		{#each EXAMPLE_PAGES as example (example.href)}
			<a href={example.href} class={c.card}>
				<div class={c.icon}>{example.icon}</div>
				<h2 class={c.cardTitle}>
					{example.title}
					{#if example.badge}
						<span class={c.badge}>{example.badge}</span>
					{/if}
				</h2>
				<p class={c.cardDescription}>{example.description}</p>
			</a>
		{/each}
	</div>
	<footer class={c.footer}>{@html footerHtml}</footer>
</div>
