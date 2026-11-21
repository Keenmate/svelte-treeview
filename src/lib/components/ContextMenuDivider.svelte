<script lang="ts">
	/** A divider of a `contextMenu` snippet — core `/menu` markup (`km-menu__divider`, named with `text`). */
	interface Props {
		text?: string;
	}

	let { text }: Props = $props();
</script>

<div class="km-menu__divider" class:km-menu__divider--named={!!text} role="separator">{text ?? ''}</div>
