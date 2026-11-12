<script lang="ts" module>
	// One event-log line. A plain string is a single text line; an object is the kit's
	// timeline line (time · name · detail), exactly what the devkit's appendLogLine()
	// writes — a detail that isn't a string is pretty-printed JSON.
	export type LogEntry =
		| string
		| {
				name: string;
				detail?: unknown;
				variant?: 'info' | 'success' | 'warning' | 'danger';
				time?: string;
		  };

	/** Build a timeline entry stamped with the current time (appendLogLine's default). */
	export function logLine(
		name: string,
		detail?: unknown,
		variant?: 'info' | 'success' | 'warning' | 'danger'
	): LogEntry {
		return { name, detail, variant, time: new Date().toLocaleTimeString() };
	}
</script>

<script lang="ts">
	// The devkit kit's event log (.log-panel / .log-line markup, widgets.css), rendered
	// reactively from an array instead of the kit's imperative appendLogLine(panel, …).
	// Same markup + classes, so it looks like every other KeenMate examples site.
	import { tick } from 'svelte';
	import { LOG_LINE_CLASSES, LOG_LINE_VARIANT_CLASSES } from '@keenmate/web-components-devkit/examples';

	interface Props {
		entries: LogEntry[];
		/** Shown while there are no entries (the kit's data-empty). */
		empty?: string;
		/** Console look (.log-panel--dark). */
		isDark?: boolean;
		/** CSS length for --log-max-height ('none' grows). */
		maxHeight?: string;
		/** Keep the newest line in view. */
		shouldFollow?: boolean;
	}

	let { entries, empty = '(nothing yet)', isDark = false, maxHeight, shouldFollow = true }: Props = $props();

	let panel: HTMLElement | undefined = $state();

	const detailText = (detail: unknown) => {
		if (typeof detail === 'string') return detail;
		try {
			return JSON.stringify(detail, null, 2) ?? String(detail);
		} catch {
			return String(detail);
		}
	};

	$effect(() => {
		entries.length;
		if (!shouldFollow || !panel) return;
		tick().then(() => panel && (panel.scrollTop = panel.scrollHeight));
	});
</script>

<div
	bind:this={panel}
	class="log-panel"
	class:log-panel--dark={isDark}
	data-empty={empty}
	style:--log-max-height={maxHeight}
>{#each entries as entry, i (i)}{#if typeof entry === 'string'}<div class={LOG_LINE_CLASSES.root}>{entry}</div>{:else}<div
				class="{LOG_LINE_CLASSES.root} {entry.variant ? LOG_LINE_VARIANT_CLASSES[entry.variant] : ''}"
			><span class={LOG_LINE_CLASSES.time}>{entry.time ?? ''}</span><span class={LOG_LINE_CLASSES.name}>{entry.name}</span
			>{#if entry.detail !== undefined}<span>{detailText(entry.detail)}</span>{/if}</div>{/if}{/each}</div>
