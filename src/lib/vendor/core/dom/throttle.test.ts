// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThrottle } from './throttle.js';

describe('createThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => vi.useRealTimers());

  it('runs on the leading edge, folds a burst into one trailing run', () => {
    const fn = vi.fn();
    const t = createThrottle(fn, 30);
    t.schedule();
    expect(fn).toHaveBeenCalledTimes(1); // leading
    vi.advanceTimersByTime(10);
    t.schedule();
    t.schedule();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20); // the window ends
    expect(fn).toHaveBeenCalledTimes(2); // one trailing run
  });

  // Review D-26: a backwards clock step used to queue the next run for as long as the step.
  it('runs at once when the wall clock went backwards, instead of waiting out the jump', () => {
    const fn = vi.fn();
    const t = createThrottle(fn, 30);
    t.schedule();
    vi.setSystemTime(1_000_000 - 3_600_000); // the clock jumps back one hour
    t.schedule();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel() drops a queued run; the next schedule is a leading edge', () => {
    const fn = vi.fn();
    const t = createThrottle(fn, 30);
    t.schedule();
    t.schedule(); // queued trailing
    t.cancel();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    t.schedule();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
