/**
 * Performance logging for svelte-treeview
 *
 * Times key operations (insertArray phases, filterNodes, expandAll/collapseAll,
 * scrollToPath) through core's `createPerfLogger` (vendored @keenmate/web-components-core,
 * `STV:PERF`, SPEC §12.1) — the same wrapper as web-treeview's perf-logger.ts (REVIEW §4:
 * the own 190-line timer copy is gone). Timings log at `debug`; nothing is recorded while silent.
 *
 * Usage:
 *   import { enablePerfLogging, setPerfThreshold } from '@keenmate/svelte-treeview';
 *
 *   enablePerfLogging();
 *   setPerfThreshold(10); // Only log operations taking >10ms
 */
import { createLoggers, type Logger } from './vendor/core/logging/create-loggers.js';
import { createPerfLogger } from './vendor/core/logging/perf-logger.js';
import { LOG_LEVELS } from './vendor/core/logging/log-core.js';

/** The shared perf logger: `perf.start` / `perf.end` / `perf.measure` / `perf.summarize`. */
export const perf = createPerfLogger('STV');

// The same `STV:PERF` logger core's perf logger writes through (loggers are registered by
// name), so its level stays independent of the STV:* category loggers in logger.ts.
export const perfLogger: Logger = createLoggers('STV', ['PERF'] as const).loggers.PERF;

// Off by default without forcing it: core's default level is `warn` and perf lines log at
// `debug`, so a level the page set first (window.components.logging) is left alone.

/** Start a timer (`metadata` is appended to its line). */
export function perfStart(label: string, metadata?: Record<string, unknown>): void {
	perf.start(label, metadata);
}

/** End a timer and log it; returns the elapsed ms. `itemCount` adds per-item time and items/sec. */
export function perfEnd(label: string, itemCount?: number): number {
	return perf.end(label, itemCount);
}

/** Time a synchronous function and return its result. */
export function perfMeasure<T>(label: string, fn: () => T, itemCount?: number): T {
	return perf.measure(label, fn, itemCount);
}

/** Time an async function (until its promise settles) and return its result. */
export function perfMeasureAsync<T>(label: string, fn: () => Promise<T>, itemCount?: number): Promise<T> {
	return perf.measureAsync(label, fn, itemCount);
}

/** Log a set of timings you collected (`{ parse: 12, render: 30 }`) with a total, headed by the tree id. */
export function perfSummary(treeId: string, timings: Record<string, number>, totalItems?: number): void {
	perf.summarize(`[${treeId}] Performance Summary`, timings, totalItems);
}

/** Enable performance logging (core's perf lines log at `debug`). */
export function enablePerfLogging(): void {
	perfLogger.setLevel('debug', false);
}

/** Disable performance logging. */
export function disablePerfLogging(): void {
	perfLogger.setLevel('silent', false);
}

/**
 * Set minimum threshold for logging (only log operations slower than threshold)
 * @param thresholdMs - Threshold in milliseconds (0 = log everything)
 */
export function setPerfThreshold(thresholdMs: number): void {
	perf.setThreshold(thresholdMs);
}

/** Whether performance logging is on. */
export function isPerfLoggingEnabled(): boolean {
	return perfLogger.getLevel() <= LOG_LEVELS.DEBUG;
}
