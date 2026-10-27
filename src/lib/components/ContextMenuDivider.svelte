<script lang="ts">
	interface Props {
		text?: string;
	}

	let { text }: Props = $props();
</script>

<div class="stv__context-menu-divider" role="separator">
	{#if text}
		<span class="stv__context-menu-divider-label">{text}</span>
	{/if}
</div>
