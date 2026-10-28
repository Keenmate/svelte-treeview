<script lang="ts">
	import Tree from '$lib/components/Tree.svelte';

	// Fixture for e2e/contract-parity.spec.ts + e2e/motion.spec.ts: one plain tree,
	// no theme of its own. The parity spec renders it with and without
	// @keenmate/base-css-variables.
	const data = [
		{ id: 'a', path: '1', name: 'Documents' },
		{ id: 'b', path: '1.1', name: 'Report.pdf' },
		{ id: 'c', path: '1.2', name: 'Notes.txt' },
		{ id: 'd', path: '2', name: 'Pictures' }
	];
</script>

<h1>contract parity</h1>

<div id="parity" style="max-width: 420px">
	<Tree nodes={data} idMember="id" pathMember="path" displayValueMember="name" expandLevel={2} />
</div>
