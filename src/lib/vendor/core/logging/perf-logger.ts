/**
 * Opt-in performance logger (treeview's `perfStart`/`perfEnd`/`perfMeasure`/
 * `perfSummary`, SPEC §12.1). Logs through a `NAMESPACE:PERF` colored logger,
 * so timings appear only when logging is enabled at `debug` or below — and
 * nothing is recorded while it is silent.
 */
import { createLoggers } from './create-loggers.js';
import { LOG_LEVELS } from './log-core.js';

export interface PerfLoggerOptions {
  /** Only log spans at least this long, in ms (`0` = every span). Default `0`. */
  thresholdMs?: number;
  /**
   * Spans kept for {@link PerfLogger.summary} (the newest; older ones are dropped and counted). Default `1000` —
   * a long-running page with perf logging on doesn't grow without bound. Counters are per label, never capped.
   */
  maxSpans?: number;
}

export interface PerfLogger {
  /** Mark the start of a span; `metadata` is appended to its line (JSON). */
  start(label: string, metadata?: Record<string, unknown>): void;
  /**
   * Close a span opened by {@link start}; returns elapsed ms (0 if never started). `itemCount` adds
   * per-item time and items/sec to the line.
   */
  end(label: string, itemCount?: number): number;
  /** Time a synchronous function, record the span, and return its result. */
  measure<T>(label: string, fn: () => T, itemCount?: number): T;
  /** Time an async function (until its promise settles), record the span, and return its result. */
  measureAsync<T>(label: string, fn: () => Promise<T>, itemCount?: number): Promise<T>;
  /** Count an event (`ms` adds to its time) — a hot path called many times; shown by {@link summary}. */
  count(label: string, ms?: number): void;
  /** Log every recorded span and counter plus a total (`title` heads it). */
  summary(title?: string): void;
  /** Log a named set of timings you collected yourself (`{ parse: 12, render: 30 }`), with a total. */
  summarize(title: string, timings: Record<string, number>, totalItems?: number): void;
  /** Only log spans at least this long, in ms. */
  setThreshold(ms: number): void;
  /** Whether PERF prints (and records) right now. */
  readonly isEnabled: boolean;
  /** Drop all open marks, recorded spans and counters. */
  clear(): void;
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);
const ms2 = (ms: number): string => `${ms.toFixed(2)}ms`;

function perItem(ms: number, itemCount: number | undefined): string {
  if (!itemCount || itemCount <= 0) return '';
  const each = ms / itemCount;
  const perSec = each > 0 ? Math.round(1000 / each).toLocaleString() : '∞';
  return ` | ${itemCount.toLocaleString()} items | ${ms2(each)}/item | ${perSec} items/sec`;
}

export function createPerfLogger(namespace: string, opts: PerfLoggerOptions = {}): PerfLogger {
  const logger = createLoggers(namespace, ['PERF'] as const).loggers.PERF;
  let threshold = opts.thresholdMs ?? 0;
  /** Open marks per label — a stack, so a nested start() of the same label doesn't overwrite. */
  const marks = new Map<string, { start: number; metadata?: Record<string, unknown> }[]>();
  const spans: { label: string; ms: number }[] = [];
  const maxSpans = Math.max(1, opts.maxSpans ?? 1000);
  /** Spans dropped by the cap since the last clear(). */
  let droppedSpans = 0;
  const counters = new Map<string, { count: number; ms: number }>();
  /** Spans are kept only while PERF prints (debug or below): a silent logger accumulates nothing. */
  const isRecording = (): boolean => logger.getLevel() <= LOG_LEVELS.DEBUG;

  const record = (label: string, ms: number, itemCount?: number, metadata?: Record<string, unknown>): void => {
    if (!isRecording()) return;
    spans.push({ label, ms });
    if (spans.length > maxSpans) {
      droppedSpans += spans.length - maxSpans;
      spans.splice(0, spans.length - maxSpans);
    }
    if (ms < threshold) return;
    let line = `${label} took ${ms2(ms)}${perItem(ms, itemCount)}`;
    if (metadata) line += ` | ${JSON.stringify(metadata)}`;
    logger.debug(line);
  };

  return {
    start(label, metadata) {
      const mark = { start: now(), ...(metadata ? { metadata } : {}) };
      const open = marks.get(label);
      if (open) open.push(mark);
      else marks.set(label, [mark]);
    },
    end(label, itemCount) {
      const open = marks.get(label);
      const mark = open?.pop();
      if (!mark) {
        logger.warn(`end("${label}") called with no matching start()`);
        return 0;
      }
      if (open!.length === 0) marks.delete(label);
      const ms = now() - mark.start;
      record(label, ms, itemCount, mark.metadata);
      return ms;
    },
    measure(label, fn, itemCount) {
      const started = now();
      try {
        return fn();
      } finally {
        record(label, now() - started, itemCount); // a throwing fn is still timed
      }
    },
    async measureAsync(label, fn, itemCount) {
      const started = now();
      try {
        return await fn();
      } finally {
        record(label, now() - started, itemCount);
      }
    },
    count(label, ms = 0) {
      if (!isRecording()) return;
      const c = counters.get(label);
      if (c) {
        c.count++;
        c.ms += ms;
      } else counters.set(label, { count: 1, ms });
    },
    summary(title) {
      if (spans.length === 0 && counters.size === 0) {
        logger.debug(`${title ? `${title}: ` : ''}no measurements recorded`);
        return;
      }
      const total = spans.reduce((sum, s) => sum + s.ms, 0);
      const dropped = droppedSpans ? ` (${droppedSpans} older dropped — maxSpans ${maxSpans})` : '';
      logger.debug(`${title ? `${title} — ` : ''}summary — ${spans.length} spans${dropped}, ${ms2(total)} total:`);
      for (const s of spans) logger.debug(`  ${s.label}: ${ms2(s.ms)}`);
      for (const [label, c] of counters) logger.debug(`  ${label}: ×${c.count.toLocaleString()}${c.ms ? ` (${ms2(c.ms)})` : ''}`);
    },
    summarize(title, timings, totalItems) {
      if (!isRecording()) return;
      const entries = Object.entries(timings);
      const total = entries.reduce((sum, [, ms]) => sum + ms, 0);
      logger.debug(`${title} — ${ms2(total)} total${perItem(total, totalItems)}: ${entries.map(([k, ms]) => `${k} ${ms2(ms)}`).join(', ')}`);
    },
    setThreshold(ms) {
      threshold = Math.max(0, ms);
    },
    get isEnabled() {
      return isRecording();
    },
    clear() {
      marks.clear();
      spans.length = 0;
      droppedSpans = 0;
      counters.clear();
    },
  };
}
