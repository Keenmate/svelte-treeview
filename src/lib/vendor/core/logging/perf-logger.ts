/**
 * Opt-in performance logger (treeview's `perfStart`/`perfEnd`/`perfMeasure`/
 * `perfSummary`, SPEC §12.1). Logs through a `NAMESPACE:PERF` colored logger,
 * so timings appear only when logging is enabled at `debug` or below.
 */
import { createLoggers } from './create-loggers.js';
import { LOG_LEVELS } from './log-core.js';

export interface PerfLogger {
  /** Mark the start of a span. */
  start(label: string): void;
  /** Close a span opened by {@link start}; returns elapsed ms (0 if never started). */
  end(label: string): number;
  /** Time a synchronous function, record the span, and return its result. */
  measure<T>(label: string, fn: () => T): T;
  /** Log every recorded span plus a total. */
  summary(): void;
  /** Drop all open marks and recorded spans. */
  clear(): void;
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

export function createPerfLogger(namespace: string): PerfLogger {
  const logger = createLoggers(namespace, ['PERF'] as const).loggers.PERF;
  /** Open marks per label — a stack, so a nested start() of the same label doesn't overwrite. */
  const marks = new Map<string, number[]>();
  const spans: { label: string; ms: number }[] = [];
  /** Spans are kept only while PERF prints (debug or below): a silent logger accumulates nothing. */
  const isRecording = (): boolean => logger.getLevel() <= LOG_LEVELS.DEBUG;

  const record = (label: string, ms: number): void => {
    if (!isRecording()) return;
    spans.push({ label, ms });
    logger.debug(`${label} took ${ms.toFixed(2)}ms`);
  };

  return {
    start(label) {
      const open = marks.get(label);
      if (open) open.push(now());
      else marks.set(label, [now()]);
    },
    end(label) {
      const open = marks.get(label);
      const started = open?.pop();
      if (started === undefined) {
        logger.warn(`end("${label}") called with no matching start()`);
        return 0;
      }
      if (open!.length === 0) marks.delete(label);
      const ms = now() - started;
      record(label, ms);
      return ms;
    },
    measure(label, fn) {
      const started = now();
      try {
        return fn();
      } finally {
        record(label, now() - started); // a throwing fn is still timed
      }
    },
    summary() {
      if (spans.length === 0) {
        logger.debug('no measurements recorded');
        return;
      }
      const total = spans.reduce((sum, s) => sum + s.ms, 0);
      logger.debug(`summary — ${spans.length} spans, ${total.toFixed(2)}ms total:`);
      for (const s of spans) logger.debug(`  ${s.label}: ${s.ms.toFixed(2)}ms`);
    },
    clear() {
      marks.clear();
      spans.length = 0;
    },
  };
}
