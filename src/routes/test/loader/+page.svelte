<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';
	import { onMount } from 'svelte';

	// Fixture for e2e/loader.spec.ts: the isLoading overlay — default .stv-loader,
	// the page-wide window.components.renderLoaderCallback, the loadingPlaceholder snippet.
	const data = [
		{ id: 'a', path: '1', name: 'Documents' },
		{ id: 'b', path: '2', name: 'Pictures' }
	];
	let isLoading = $state(false);
	let isSnippetLoading = $state(false);

	onMount(() => {
		const w = window as any;
		w.setLoading = (v: boolean) => (isLoading = v);
		w.setSnippetLoading = (v: boolean) => (isSnippetLoading = v);
		w.loaderReady = true;
	});
</script>

<h1>loader</h1>

<div id="plain" style="max-width: 420px; position: relative">
	<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" {isLoading} />
</div>

<div id="snippet" style="max-width: 420px; position: relative">
	<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" isLoading={isSnippetLoading}>
		{#snippet loadingPlaceholder()}<em class="my-snippet">wait</em>{/snippet}
	</Tree>
</div>
