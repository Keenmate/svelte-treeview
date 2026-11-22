/**
 * `guardGhostClick()` (SPEC §12.19): swallow the ONE "ghost" click the opening tap leaves behind.
 *
 * A tap fires `pointerdown` → `pointerup` → `mousedown` → `click` at one spot within milliseconds. A component
 * that opens a sheet on the PRESS (`pointerdown` / `mousedown` — to keep the soft keyboard down) has the
 * panel on screen when that tap's own `click` arrives: it lands on a day cell / an option (picks it) or the
 * backdrop (closes the sheet). Opening on `click` has no ghost click — don't arm it then.
 *
 * Armed once: the next click is swallowed when its path hits one of `elements`, then the guard removes
 * itself (a later, genuine tap is untouched); `durationMs` is the safety net when no click comes. The
 * optional `trailingFocus` element is blurred if the press focuses it while armed (a pressed `<input>`
 * would raise the keyboard). `startModalSession({ isOpenedByPointer: true })` arms it for its panel +
 * backdrop. web-daterangepicker had the original.
 */

export interface GhostClickGuardOptions {
  /** How long the guard waits for the ghost click. Default `700` ms. */
  durationMs?: number;
  /** Blur this element if it takes focus while armed (the pressed input's trailing focus). */
  trailingFocus?: HTMLElement | null;
}

/** Arm the guard for `elements` (null entries skipped); returns `stop()` (idempotent). SSR-safe. */
export function guardGhostClick(
  elements: readonly (Element | null | undefined)[],
  opts: GhostClickGuardOptions = {},
): () => void {
  const targets = elements.filter((el): el is Element => !!el);
  const doc = targets[0]?.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc) return () => {};
  let isStopped = false;
  const onClick = (e: Event): void => {
    stop();
    const path = e.composedPath();
    if (targets.some((el) => path.includes(el))) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const focusTarget = opts.trailingFocus ?? null;
  const onFocus = (): void => {
    focusTarget?.removeEventListener('focus', onFocus);
    focusTarget?.blur();
  };
  const timer = setTimeout(() => stop(), opts.durationMs ?? 700);
  function stop(): void {
    if (isStopped) return;
    isStopped = true;
    clearTimeout(timer);
    doc!.removeEventListener('click', onClick, true);
    focusTarget?.removeEventListener('focus', onFocus);
  }
  doc.addEventListener('click', onClick, true);
  focusTarget?.addEventListener('focus', onFocus);
  return stop;
}
