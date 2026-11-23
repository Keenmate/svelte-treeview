import { TreeEngine, type TreeEngineProps } from './TreeEngine.svelte.js';

/**
 * Factory function that creates a TreeEngine (the engine behind `<Tree>` — for a custom renderer).
 *
 * IMPORTANT: Must be called during component initialization (inside a
 * component's `<script>` block) so that the controller's internal `$effect()`
 * calls bind to the component's lifecycle.
 */
export function createTreeEngine<T>(props: TreeEngineProps<T>): TreeEngine<T> {
	return new TreeEngine<T>(props);
}
