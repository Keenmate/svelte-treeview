<script lang="ts">
	// e2e fixtures / dev pages keep their original chrome (Bootstrap + examples-shared.css)
	// so geometry assertions don't move; the devkit examples kit is showcase-only.
	let { children } = $props();
</script>

<svelte:head>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
	<link rel="stylesheet" href="/examples-shared.css" />
</svelte:head>

{@render children()}
