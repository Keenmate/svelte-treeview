/**
 * Leading + trailing throttle: `schedule()` runs `fn` straight away when `ms`
 * has passed since the last run, otherwise queues ONE trailing run at the end
 * of the window (later calls in the window fold into it — `fn` reads the latest
 * state when it runs). Internal.
 */
export interface Throttle {
  /** Run now (leading edge) or once the window ends (trailing edge). */
  schedule(): void;
  /** Record a run made outside the throttle (e.g. an immediate first fire), so the window starts now. */
  markRun(): void;
  /** Drop a queued trailing run and forget the last run — the next `schedule()` is a leading edge. */
  cancel(): void;
}

export function createThrottle(fn: () => void, ms: number): Throttle {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastRun = 0;
  const run = (): void => {
    lastRun = Date.now();
    fn();
  };
  return {
    schedule() {
      if (timer !== undefined) return; // trailing edge already queued
      const elapsed = Date.now() - lastRun;
      // A negative elapsed time means the wall clock went backwards: run now rather than wait
      // out the jump (lodash's throttle does the same). Date.now(), not performance.now(), so
      // test suites that fake timers (which fake Date, not performance) keep working. Review D-26.
      if (elapsed >= ms || elapsed < 0) {
        run();
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        run();
      }, ms - elapsed);
    },
    markRun() {
      lastRun = Date.now();
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      lastRun = 0;
    },
  };
}
