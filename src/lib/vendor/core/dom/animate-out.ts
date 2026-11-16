/**
 * The disappear half of the suite's enter / exit animations (SPEC §12.16): appearing needs no
 * JavaScript (a CSS `@keyframes` plays when the element is inserted), but something that goes
 * away must wait for its closing animation before the caller removes it / collapses it.
 *
 * Durations come only from CSS (the motion tokens — `--base-duration-*`, rewritten by
 * `data-motion` and zeroed by OS reduced motion), so `readAnimationMs()` reads back what CSS
 * resolved: `0` means no animation and `animateOut()` finishes at once, with no waiting.
 */
import { callSafely } from '../logging/safe-call.js';

/** The CSS variable {@link AnimateOutOptions.shouldSetHeightVar} writes: the element's height in px. */
export const EXIT_HEIGHT_VAR = '--km-exit-height';

/** `'0.25s'` / `'150ms'` → ms; anything unparsable → 0. */
function toMs(raw: string | undefined): number {
  const text = (raw ?? '').trim();
  const value = parseFloat(text);
  if (!Number.isFinite(value)) return 0;
  return text.endsWith('ms') ? value : value * 1000;
}

const list = (value: string | undefined): string[] => (value ?? '').split(',').map((part) => part.trim());

/**
 * How long the element's current CSS animations run, in ms: the longest `animation-delay` +
 * `animation-duration` over the comma-separated list (`animation: fade .15s, slide .25s .05s` →
 * 300). `0` when there is no animation (`animation-name: none`), a `0s` duration (motion off), or
 * no `getComputedStyle` (SSR).
 */
export function readAnimationMs(el: Element): number {
  if (typeof getComputedStyle !== 'function') return 0;
  const style = getComputedStyle(el);
  const names = list(style.animationName);
  const durations = list(style.animationDuration);
  const delays = list(style.animationDelay);
  let longest = 0;
  names.forEach((name, i) => {
    if (!name || name === 'none') return;
    // CSS repeats a shorter duration / delay list to match the names.
    const duration = toMs(durations[i % durations.length]);
    if (duration <= 0) return;
    longest = Math.max(longest, duration + toMs(delays[i % delays.length]));
  });
  return longest;
}

/** Options for {@link animateOut}. */
export interface AnimateOutOptions {
  /**
   * The closing class; its CSS runs the disappear `@keyframes` (`forwards`). A function is asked once
   * per element — different BEM modifiers on one call (`cp__container--closing` /
   * `cp__backdrop--closing`), so `cancel()` takes each one's own class off and `onDone` waits for both.
   */
  className: string | ((el: Element) => string);
  /**
   * Runs once every element's closing animation ended (at once when there is none): remove the
   * elements, collapse the node, … Never runs after `cancel()`. A throw is logged.
   */
  onDone?(): void;
  /** Make the elements `inert` while they animate out (no clicks, no focus). Default `true`. */
  shouldSetInert?: boolean;
  /**
   * Write each element's current height to `--km-exit-height` (px, inline) before the class goes
   * on, so a keyframe can shrink it in the normal flow — `from { height: var(--km-exit-height) }
   * to { height: 0 }` — and what follows slides up with it (CSS can't animate from
   * `height: auto`). Default `false`.
   */
  shouldSetHeightVar?: boolean;
}

/** Handle returned by {@link animateOut}. */
export interface AnimateOutHandle {
  /**
   * Stop: the closing class, `inert` and the height variable come off, `onDone` never runs (the
   * user reopened mid-close). No-op once finished.
   */
  cancel(): void;
  /** Resolves `true` after `onDone`, `false` when cancelled. */
  readonly finished: Promise<boolean>;
}

/**
 * Animate elements out: add the closing class (+ `inert`), wait for their closing animations,
 * then run `onDone` — synchronously when nothing animates (motion off, `0s`, reduced motion). An
 * element that gets no `animationend` (a hidden tab, `display: none`) is given up on after its
 * duration + 50ms. The closing class stays on after `onDone` (the caller removes or resets the
 * elements); `inert` and the height variable are put back.
 *
 * ```ts
 * animateOut(rows, { className: 'wtv__row--closing', shouldSetHeightVar: true, onDone: () => collapse(node) });
 * animateOut([panel, backdrop], {
 *   className: (el) => (el === backdrop ? 'xx__backdrop--closing' : 'xx__panel--closing'),
 *   onDone: () => { panel.remove(); backdrop.remove(); },
 * });
 * ```
 */
export function animateOut(elements: Element | readonly Element[], opts: AnimateOutOptions): AnimateOutHandle {
  const targets = Array.isArray(elements) ? [...(elements as readonly Element[])] : [elements as Element];
  const shouldSetInert = opts.shouldSetInert ?? true;
  const html = targets.filter((el): el is HTMLElement => typeof HTMLElement !== 'undefined' && el instanceof HTMLElement);
  const wasInert = new Map(html.map((el) => [el, el.inert]));

  if (opts.shouldSetHeightVar) {
    // Measure all first, then write: no layout thrash across many rows.
    const heights = html.map((el) => el.getBoundingClientRect().height);
    html.forEach((el, i) => el.style.setProperty(EXIT_HEIGHT_VAR, `${heights[i]}px`));
  }
  // Resolved once per element, so cancel() removes exactly what was added.
  const classes = new Map(targets.map((el) => [el, typeof opts.className === 'function' ? opts.className(el) : opts.className]));
  for (const el of targets) el.classList.add(classes.get(el)!);
  if (shouldSetInert) for (const el of html) el.inert = true;

  let resolveFinished!: (isDone: boolean) => void;
  const finished = new Promise<boolean>((resolve) => (resolveFinished = resolve));
  let isSettled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Set<Element>();
  const onEnd = (event: Event): void => {
    // Only the element's OWN animation — a child's animationend bubbles up too.
    if (event.target !== event.currentTarget) return;
    pending.delete(event.currentTarget as Element);
    if (pending.size === 0) settle(true);
  };

  const restore = (): void => {
    if (shouldSetInert) for (const el of html) el.inert = wasInert.get(el) ?? false;
    if (opts.shouldSetHeightVar) for (const el of html) el.style.removeProperty(EXIT_HEIGHT_VAR);
  };
  function settle(isDone: boolean): void {
    if (isSettled) return;
    isSettled = true;
    if (timer !== undefined) clearTimeout(timer);
    for (const el of targets) el.removeEventListener('animationend', onEnd);
    if (isDone) {
      const { onDone } = opts;
      if (onDone) callSafely(onDone, { source: targets[0] ?? null, message: 'animateOut onDone threw' });
    } else {
      for (const el of targets) el.classList.remove(classes.get(el)!);
    }
    restore();
    resolveFinished(isDone);
  }

  let longest = 0;
  for (const el of targets) {
    const ms = readAnimationMs(el);
    if (ms <= 0) continue;
    longest = Math.max(longest, ms);
    pending.add(el);
    el.addEventListener('animationend', onEnd);
  }
  if (pending.size === 0) settle(true);
  else timer = setTimeout(() => settle(true), longest + 50);

  return { cancel: () => settle(false), finished };
}
