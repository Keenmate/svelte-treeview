/**
 * Read resolved CSS values in JS (SPEC §12.16): what a component needs when CSS decides and JS has to follow —
 * a WAAPI duration from a speed token, "is motion off here", the effective scroll behavior, a length
 * variable in px. Every reader takes the element the value applies to (a token inherits, so the answer
 * depends on where the element sits: its own `motion`, a section's `data-motion`, the page, the OS).
 */

/** The token every component's speeds read; `0s` under `motion="none"` and OS reduced motion. */
const MOTION_PROBE = '--base-duration-normal';

function computed(el: Element, property: string): string {
  const view = el.ownerDocument?.defaultView;
  if (!view) return '';
  return view.getComputedStyle(el).getPropertyValue(property).trim();
}

/**
 * A CSS time (`'0.15s'`, `'150ms'`, `'0'`) in milliseconds; `undefined` for anything else (unset, a
 * `var()` the browser didn't resolve, garbage).
 */
export function parseCssTimeMs(value: string): number | undefined {
  const v = value.trim();
  const m = /^(-?\d*\.?\d+)(ms|s)?$/i.exec(v);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  if (!m[2]) return n === 0 ? 0 : undefined; // a bare number is only valid as 0
  return m[2].toLowerCase() === 's' ? n * 1000 : n;
}

/**
 * The resolved duration of a CSS custom property (a speed token: `'--xx-transition-normal'`) at `el`, in
 * ms; `fallbackMs` when it is unset or not a time. For a WAAPI animation timed by a token — the token
 * already follows `motion` and reduced motion.
 */
export function readCssDurationMs(el: Element, property: string, fallbackMs = 0): number {
  return parseCssTimeMs(computed(el, property)) ?? fallbackMs;
}

/**
 * `true` when decorative motion is off at `el`: its own `motion="none"`, a section's / the page's
 * `data-motion="none"`, or OS reduced motion (all zero `--base-duration-*`). A component that draws
 * something only to animate it (a countdown bar) asks this instead of probing its own token.
 */
export function isMotionOff(el: Element): boolean {
  return parseCssTimeMs(computed(el, MOTION_PROBE)) === 0;
}

/**
 * The effective scroll behavior at `el` for `scrollTo({ behavior })`: the component's token
 * (`'--xx-scroll-behavior'`, which defaults to `var(--base-scroll-behavior, smooth)`), else
 * `--base-scroll-behavior`; `'smooth'` when neither is set. `'auto'` under `motion="none"` / reduced motion.
 */
export function readScrollBehavior(el: Element, property = '--base-scroll-behavior'): ScrollBehavior {
  const value = computed(el, property) || computed(el, '--base-scroll-behavior');
  return value === 'auto' || value === 'instant' ? value : 'smooth';
}

/**
 * A CSS length custom property (`'--xx-badge-height'`: `2.4rem`, `calc(…)`, `var(…)`) resolved to px at
 * `el`, by letting the browser resolve it on a hidden probe inside `el` (so `em` and inherited variables
 * resolve where they apply) — also inside a `display: none` subtree (the computed width). `fallbackPx` when
 * unset or unresolvable (SSR, jsdom).
 */
export function readCssLengthPx(el: Element, property: string, fallbackPx = 0): number {
  if (!computed(el, property)) return fallbackPx;
  const doc = el.ownerDocument;
  const probe = doc.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;inset-block-start:0;inset-inline-start:0;width:var(${property});height:0;padding:0;border:0`;
  // A host's shadow root is where its own CSS applies; the probe goes there when there is one.
  const parent: Node = (el as HTMLElement).shadowRoot ?? el;
  parent.appendChild(probe);
  try {
    const width = probe.getBoundingClientRect().width;
    if (width > 0) return width;
    // No layout (a display: none subtree, a detached panel): the computed width is still an absolute length.
    const value = getComputedStyle(probe).width;
    const px = value.endsWith('px') ? parseFloat(value) : NaN;
    return px > 0 ? px : fallbackPx;
  } finally {
    probe.remove();
  }
}
