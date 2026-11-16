/**
 * Coalesce bursts (resize, scroll, visualViewport) into one `fn` call per
 * animation frame. Where `requestAnimationFrame` is missing (SSR, old test
 * environments) `schedule()` runs `fn` synchronously. Internal.
 */
export interface FrameScheduler {
  /** Run `fn` on the next frame; repeated calls before then coalesce to one run. */
  schedule(): void;
  /** Drop a queued run — call it on teardown so a late frame can't touch released state. */
  cancel(): void;
}

export function createFrameScheduler(fn: () => void): FrameScheduler {
  let isQueued = false;
  let frame: number | undefined;
  return {
    schedule() {
      if (typeof requestAnimationFrame !== 'function') {
        fn();
        return;
      }
      if (isQueued) return;
      isQueued = true;
      const id = requestAnimationFrame(() => {
        isQueued = false;
        frame = undefined;
        fn();
      });
      // A synchronous rAF (test stubs) has already run the callback by now.
      if (isQueued) frame = id;
    },
    cancel() {
      if (!isQueued) return;
      isQueued = false;
      if (frame !== undefined && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
      frame = undefined;
    },
  };
}
