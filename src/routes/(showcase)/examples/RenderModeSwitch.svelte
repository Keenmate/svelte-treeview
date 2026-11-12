<script lang="ts">
	// Flat / Progressive / Virtual switch shown in example page headers. Kit buttons:
	// the active mode is a primary button, the others .btn-outline (readable on the
	// header gradient); only the joined-segment shape is local.
	import { getRenderMode, setRenderMode, type RenderMode } from './render-mode.svelte.js';

	const modes: { value: RenderMode; label: string; title: string }[] = [
		{ value: 'flat', label: 'Flat', title: 'Every visible row rendered at once' },
		{ value: 'progressive', label: 'Progressive', title: 'Flat rendering with progressive batching' },
		{ value: 'virtual', label: 'Virtual', title: 'Flat rendering with virtual scrolling (~50 DOM nodes)' },
	];
</script>

<div class="render-mode-switch" role="group" aria-label="Render mode">
	{#each modes as mode}
		{@const isActive = getRenderMode() === mode.value}
		<button
			type="button"
			class={isActive ? 'btn-primary' : 'btn-outline'}
			aria-pressed={isActive}
			title={mode.title}
			onclick={() => setRenderMode(mode.value)}
		>{mode.label}</button>
	{/each}
</div>

<style>
	.render-mode-switch {
		display: inline-flex;
		margin-top: 1rem;
	}

	.render-mode-switch button {
		border-radius: 0;
	}

	.render-mode-switch button:first-child {
		border-start-start-radius: var(--kmwc-radius-sm);
		border-end-start-radius: var(--kmwc-radius-sm);
	}

	.render-mode-switch button:last-child {
		border-start-end-radius: var(--kmwc-radius-sm);
		border-end-end-radius: var(--kmwc-radius-sm);
	}

	.render-mode-switch button[aria-pressed='true'] {
		border-color: var(--kmwc-text-color-on-accent);
	}
</style>
