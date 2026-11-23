<script lang="ts" generics="T">
	import { setContext, onDestroy, type Snippet } from 'svelte';
	import { createTreeEngine } from '../core/createTreeEngine.js';
	import { TreeEngine, type TreeEngineProps } from '../core/TreeEngine.svelte.js';

	interface Props extends TreeEngineProps<T> {
		children?: Snippet<[TreeEngine<T>]>;
	}

	let {
		children,
		...engineProps
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	const engine = createTreeEngine<T>(engineProps as TreeEngineProps<T>);

	// Set contexts that Node.svelte expects
	setContext('Ltree', engine.tree);
	setContext('NodeCallbacks', engine.nodeCallbacks);
	setContext('NodeConfig', engine.nodeConfig);

	onDestroy(() => engine.destroy());
</script>

{@render children?.(engine)}
