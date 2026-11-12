<script lang="ts">
	// Treeview styles from source during development. Page chrome is per section:
	// (showcase)/+layout.svelte = devkit examples kit; test/ + dev/ = legacy shared CSS.
	import '$lib/styles/main.css';

	let { children } = $props();
</script>

{@render children()}
