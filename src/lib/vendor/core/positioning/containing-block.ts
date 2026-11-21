/**
 * Fixed-positioning containing-block helpers + a drift diagnostic (SPEC §12.2).
 *
 * A `position: fixed` element is normally positioned relative to the viewport, so
 * Floating UI's computed coordinates land it exactly there. But an ancestor with
 * `transform` (or `translate` / `scale` / `rotate`) / `perspective` / `filter` /
 * `backdrop-filter` (not in WebKit) / a qualifying
 * `will-change` (and, per spec but NOT reliably honoured by browsers, `contain` /
 * `container-type`) establishes a *containing block* for fixed descendants: the
 * browser then measures those coordinates from that ancestor's padding box and
 * the panel drifts. These helpers let a component
 *   1. narrow Floating UI's offset-parent search to what browsers reliably honour
 *      ({@link getFixedPositionOffsetParent}, used via `anchor`'s `platform` hatch), and
 *   2. detect + explain the drift when it still happens ({@link detectFixedDrift}),
 *      so it can warn the developer instead of silently mis-placing a panel.
 *
 * These read live layout (getBoundingClientRect / getComputedStyle) — meaningful
 * only in a real browser; they live in the positioning subpath, out of the base
 * import graph.
 */

import { composedParent } from '../dom/composed-tree.js';

const notNone = (v: string | undefined): v is string => !!v && v !== 'none';

let isWebKitValue: boolean | undefined;
/** WebKit doesn't make `filter` / `backdrop-filter` a fixed containing block (same probe as Floating UI). */
function isWebKit(): boolean {
  isWebKitValue ??= typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('-webkit-backdrop-filter', 'none');
  return isWebKitValue;
}

/** `contain` values that make a fixed containing block (layout or paint containment). */
const CONTAINING_CONTAIN = /\b(paint|layout|strict|content)\b/;

/**
 * The properties in `cs` that establish a fixed-positioning containing block, as
 * `name: value` strings. Mirrors Floating UI's `isContainingBlock` — including the
 * individual `translate` / `scale` / `rotate` transforms and the WebKit `filter`
 * exception — except `container-type`, which Floating UI counts but no engine honours.
 * `contain: paint | layout | strict | content` and `content-visibility: auto` DO trap
 * fixed descendants, in light and shadow DOM alike (measured in Chromium 156, Firefox 157
 * and WebKit 27, review D-23; `e2e/positioning-containing-block.spec.ts`).
 */
function fixedContainingBlockProps(cs: CSSStyleDeclaration): string[] {
  const css = cs as CSSStyleDeclaration & {
    translate?: string;
    scale?: string;
    rotate?: string;
    backdropFilter?: string;
    contentVisibility?: string;
  };
  const props: string[] = [];
  for (const name of ['transform', 'translate', 'scale', 'rotate', 'perspective'] as const) {
    if (notNone(css[name])) props.push(`${name}: ${css[name]}`);
  }
  if (!isWebKit()) {
    if (notNone(css.filter)) props.push(`filter: ${css.filter}`);
    if (notNone(css.backdropFilter)) props.push(`backdrop-filter: ${css.backdropFilter}`);
  }
  if (css.willChange && /transform|translate|scale|rotate|perspective|filter/.test(css.willChange)) {
    props.push(`will-change: ${css.willChange}`);
  }
  if (css.contain && CONTAINING_CONTAIN.test(css.contain)) props.push(`contain: ${css.contain}`);
  if (css.contentVisibility === 'auto') props.push('content-visibility: auto');
  return props;
}

/**
 * The element `position: fixed` descendants of `el` are actually anchored to, or
 * `window` (the viewport) when none. A drop-in `getOffsetParent` for Floating
 * UI's `platform` that — unlike its default — omits `container-type`, which no
 * engine honours for fixed positioning (see {@link fixedContainingBlockProps}).
 * Crosses shadow boundaries so it sees the host's light-DOM ancestors too.
 */
export function getFixedPositionOffsetParent(el: Element): Element | Window {
  // Start at the PARENT — an element is never its own containing block. Without
  // this, an `el` that itself establishes a fixed containing block (e.g. a badge
  // cell with `transform: scale(...)` on hover) would be returned as its own
  // offset parent, and Floating UI would compute element-relative coordinates
  // that render off-screen once applied as `position: fixed`.
  let node: Element | null = flatParent(el);
  while (node) {
    if (node === document.body || node === document.documentElement) break;
    if (fixedContainingBlockProps(getComputedStyle(node)).length > 0) return node;
    // A top-layer element (modal <dialog>, open popover) is laid out against the viewport:
    // its ancestors' transforms don't reach anything inside it.
    if (isTopLayer(node)) break;
    node = flatParent(node);
  }
  return window;
}

/**
 * The parent in the FLAT tree — where layout happens: a slotted node's slot first (a
 * transform on the slot's wrapper applies to it), then the parent / the shadow host.
 */
function flatParent(node: Element): Element | null {
  return (node as Element & { assignedSlot?: HTMLSlotElement | null }).assignedSlot ?? composedParent(node);
}

function isTopLayer(el: Element): boolean {
  try {
    return el.matches(':modal') || el.matches(':popover-open');
  } catch {
    return false; // an engine without these selectors has no top layer for them
  }
}

/**
 * Walk up from `el` and return the first ancestor whose viewport rect matches the
 * observed drift — the containing block the browser most likely anchored a fixed
 * panel to. `null` if none matches (drift from something else: visual viewport,
 * iframe, scrollbar gutter, …).
 */
export function findContainingBlockCulprit(el: Element, driftX: number, driftY: number): Element | null {
  for (let node: Element | null = el; node; node = flatParent(node)) {
    if (node === document.body || node === document.documentElement) break;
    // The panel is offset by the containing block's PADDING box origin (inside its border).
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const x = rect.x + (parseFloat(style.borderLeftWidth) || 0);
    const y = rect.y + (parseFloat(style.borderTopWidth) || 0);
    if (Math.abs(x - driftX) < 2 && Math.abs(y - driftY) < 2) return node;
  }
  return null;
}

/** The containing-block-establishing CSS set on `el`, for a "likely culprit: has …" hint. */
export function describeContainingBlockProps(el: Element): string {
  const cs = getComputedStyle(el);
  const props = fixedContainingBlockProps(cs); // includes `contain` (review D-29: was listed twice)
  const ct = (cs as { containerType?: string }).containerType;
  if (ct && ct !== 'normal') props.push(`container-type: ${ct}`);
  return props.join('; ');
}

/** A short `<tag#id.class>` description of `el` (up to two classes), for logs. */
function describeElement(el: Element): string {
  const id = el.id ? `#${el.id}` : '';
  const cls =
    typeof el.className === 'string' && el.className
      ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      : '';
  return `<${el.tagName.toLowerCase()}${id}${cls}>`;
}

/** A detected drift: how far off, and the likely CSS culprit. */
export interface DriftReport {
  /** Horizontal drift in px (rendered − expected, in viewport space). */
  driftX: number;
  /** Vertical drift in px. */
  driftY: number;
  /** The ancestor that most likely anchored the panel, or `null` if unidentified. */
  culprit: Element | null;
  /** `<tag#id.class>` for `culprit`, or "an ancestor element (could not auto-identify)". */
  culpritDescription: string;
  /** The containing-block CSS on `culprit` (empty when `culprit` is null). */
  culpritCss: string;
}

/**
 * Verify a fixed panel landed where it was positioned, and explain it if not.
 *
 * `expectedX`/`expectedY` are the coordinates written to the panel (from
 * `anchor`/Floating UI). They are relative to `offsetParent` — the viewport when
 * `getFixedPositionOffsetParent` found no anchoring ancestor, else that ancestor's
 * padding box, so this translates the expectation into viewport space before
 * comparing to the panel's actual rect. Returns `null` when the panel is within
 * `tolerance` (default `1.5`px) — i.e. no meaningful drift.
 */
export function detectFixedDrift(opts: {
  panel: HTMLElement;
  reference: Element;
  expectedX: number;
  expectedY: number;
  offsetParent: Element | Window;
  tolerance?: number;
}): DriftReport | null {
  const tolerance = opts.tolerance ?? 1.5;

  let originX = 0;
  let originY = 0;
  if (opts.offsetParent instanceof Element) {
    const cbRect = opts.offsetParent.getBoundingClientRect();
    const cbStyle = getComputedStyle(opts.offsetParent);
    originX = cbRect.x + (parseFloat(cbStyle.borderLeftWidth) || 0);
    originY = cbRect.y + (parseFloat(cbStyle.borderTopWidth) || 0);
  }

  const rect = opts.panel.getBoundingClientRect();
  const driftX = rect.x - (originX + opts.expectedX);
  const driftY = rect.y - (originY + opts.expectedY);
  if (Math.abs(driftX) < tolerance && Math.abs(driftY) < tolerance) return null;

  // The containing block that moved the panel is an ancestor of the PANEL (portaled or not);
  // the reference's ancestors are the fallback for a panel rendered next to its trigger.
  const panelParent = flatParent(opts.panel);
  const culprit =
    (panelParent ? findContainingBlockCulprit(panelParent, driftX, driftY) : null) ??
    findContainingBlockCulprit(opts.reference, driftX, driftY);
  return {
    driftX,
    driftY,
    culprit,
    culpritDescription: culprit ? describeElement(culprit) : 'an ancestor element (could not auto-identify)',
    culpritCss: culprit ? describeContainingBlockProps(culprit) : '',
  };
}
