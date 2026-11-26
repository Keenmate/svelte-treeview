/**
 * Shared types for the positioning module (SPEC §12.2). One low-level
 * {@link AnchorOptions} primitive plus the two preset option/handle shapes.
 * Re-exports the `@floating-ui/dom` types a caller needs so components import
 * them from core (one pinned version) instead of the raw package (which drifted
 * across 1.5/1.7 in the five shipping components).
 */
import type { Placement, Strategy, Platform, VirtualElement } from '@floating-ui/dom';
import type { DriftReport } from './containing-block.js';

export type { Placement, Strategy, Platform, VirtualElement };

/**
 * How to size the floating element against its reference width (via floating-ui
 * `size()`):
 * - `'min'` — `min-width` = reference → panel is **at least** the reference width
 *   but may grow for wider content (`max(reference, content)`).
 * - `'exact'` — `width` = reference → panel is **always** the reference width
 *   (wider content wraps).
 * - `'max'` — `max-width` = reference → panel is **at most** the reference width
 *   but may shrink for narrower content (`min(reference, content)`).
 * - `false` — don't size against the reference (natural width).
 *
 * Note `'max'` sets `max-width` (to the *reference* width), as does the separate
 * {@link AnchorOptions.maxWidth} viewport cap (to the *available* width); using
 * both leaves the viewport cap in effect (it applies last). Combine with care.
 */
export type MatchWidth = 'min' | 'exact' | 'max' | false;

/**
 * How `anchor()` keeps the placement stable (`AnchorOptions.lockPlacement`): `'initial'` flips
 * back to the initial placement, `'freeze'` flips once then pins, `false` flips freely.
 */
export type PlacementLock = 'initial' | 'freeze' | false;

/** The object form of {@link AnchorOptions.offset} (floating-ui `offset()` axes, in px). */
export interface AnchorOffset {
  /** Gap away from the reference. */
  mainAxis?: number;
  /** Shift along the reference edge (skidding). */
  crossAxis?: number;
  /** Like `crossAxis`, but flips sign with an aligned placement (`-start` / `-end`). */
  alignmentAxis?: number | null;
}

/** Options for the low-level {@link anchor} primitive. */
export interface AnchorOptions {
  /** Preferred placement. Default `'bottom-start'`. */
  placement?: Placement;
  /** Positioning strategy. Default `'fixed'` (portal-friendly, avoids ancestor clipping). */
  strategy?: Strategy;
  /**
   * Gap between reference and floating, in px. Default: the page's `--base-dropdown-offset`
   * (`@keenmate/base-css-variables`), read on the reference element (else the floating one) when
   * the anchor is created; `4` when unset. The object form
   * (floating-ui `offset()` axes) also shifts along the edge: `crossAxis` /
   * `alignmentAxis` (e.g. a submenu nudged up to line up with its parent item).
   */
  offset?: number | AnchorOffset;
  /** Allow flipping to the opposite side on overflow. Default `true`. */
  shouldFlip?: boolean;
  /** Shift padding in px to stay in view, or `false` to disable. Default `8`. */
  shift?: number | false;
  /** Match the reference's width: `'min'` (min-width), `'exact'` (width), `'max'` (max-width), or `false`. Default `false`. */
  matchWidth?: MatchWidth;
  /**
   * Keep the placement stable instead of re-flipping every frame. Requires `shouldFlip`.
   * - `'initial'` — flip returns to the initial placement rather than reordering
   *   (floating-ui `fallbackStrategy: 'initialPlacement'`).
   * - `'freeze'` — flip once on the FIRST computation, then pin the resolved
   *   placement and stop flipping (the "open where it fits, then don't jump as
   *   the user scrolls" behaviour a dropdown wants).
   *
   * Default `false`.
   */
  lockPlacement?: PlacementLock;
  /** Keep the position updated on scroll/resize via floating-ui `autoUpdate`. Default `true`. */
  shouldAutoUpdate?: boolean;
  /**
   * Options forwarded to floating-ui `autoUpdate` (e.g. `{ elementResize: false }`
   * to stop the floating element's OWN size changes from re-triggering a
   * reposition — the fix for a resize→reposition→re-hover loop). Ignored when
   * `shouldAutoUpdate` is `false`.
   */
  autoUpdateOptions?: Parameters<typeof import('@floating-ui/dom').autoUpdate>[3];
  /**
   * Called on every frame immediately BEFORE the position is computed. Use it to
   * mutate the reference/floating element first — e.g. publish the reference's
   * measured width to a CSS variable so `shift`/`size` measure the final width,
   * or clamp min/max width. Runs inside the `autoUpdate` loop.
   */
  beforeComputeCallback?(): void;
  /**
   * Copy the nearest `data-theme` from this element onto the floating element at
   * placement time — so a layer portaled out of the component subtree keeps the
   * theme (guideline C-CS-10). Presets default this to the reference/trigger.
   */
  inheritThemeFrom?: HTMLElement;
  /** Escape hatch: a custom floating-ui platform (rarely needed — 1.8 handles shadow DOM). */
  platform?: Platform;
  /**
   * Narrow Floating UI's offset-parent search to the properties browsers reliably
   * honour as a fixed-positioning containing block (`transform` / `perspective` /
   * `filter` / `backdrop-filter` / qualifying `will-change`, `contain: paint | layout |
   * strict | content`, `content-visibility: auto`) — ignoring `container-type` and
   * `contain: size | style`, which don't trap a fixed panel in Chromium, Firefox or
   * WebKit (measured, review D-23). The
   * offset parent is resolved from the FLOATING element (never the reference — the
   * reference can itself be a CB, e.g. a badge cell with `transform` on hover, and
   * a portaled panel has a different CB than its reference).
   *
   * Sugar for building `{ ...floatingUiPlatform, getOffsetParent: () =>
   * getFixedPositionOffsetParent(floating) }` yourself and passing it as
   * {@link platform}. Ignored when an explicit `platform` is given (yours wins).
   * Pairs with {@link driftCallback}. Default `false`.
   */
  shouldUseFixedContainingBlock?: boolean;
  /** Extra viewport-edge padding (px) before flipping switches sides. Default `0`. */
  flipPadding?: number;
  /**
   * The placements flip tries, in order, when the preferred one doesn't fit (floating-ui
   * `flip({ fallbackPlacements })`). Default: the opposite side. Ignored when flipping is off.
   */
  fallbackPlacements?: Placement[];
  /**
   * Cap the floating element's height to the space available on the resolved side
   * (floating-ui `size()`), so it scrolls internally instead of overflowing the
   * viewport — a calendar/dropdown that should stay on-screen. `true` uses no
   * extra inset; `{ padding }` insets from the viewport edges. The floating
   * element needs its own inner scroll region (this only sets `max-height`).
   * `{ cap }` keeps an author limit too (any CSS length: `'40rem'`, `'60vh'`): the written value is
   * `min(cap, available)` — the inline style would otherwise beat the panel's own CSS `max-height`.
   */
  maxHeight?: boolean | { padding?: number; cap?: string };
  /**
   * Cap the floating element's width to the space available on the resolved side
   * (floating-ui `size()`), so a user-resizable panel can't be dragged past the
   * viewport edge (and long content wraps instead of overflowing horizontally).
   * `true` uses no extra inset; `{ padding }` insets from the viewport edges.
   * Mirrors {@link maxHeight}; only sets `max-width`. `{ cap }` keeps an author limit:
   * `min(cap, available)`.
   */
  maxWidth?: boolean | { padding?: number; cap?: string };
  /**
   * Publish the reference's width (`<n>px`) as a CSS custom property before every computation, so a
   * themeable panel width can default to the field width (`width: var(--xx-dropdown-width,
   * var(--xx-field-width))`). A string = the property name, set on the floating element; `{ name,
   * element }` sets it on another element (the host, when the variable that reads it is declared on
   * `:host`). Left in place on `destroy()`.
   */
  referenceWidthVar?: string | { name: string; element: HTMLElement };
  /**
   * `destroy()` also puts back the floating element's own inline `position` / `left` / `top` (a
   * persistent element the anchor floated for a while, e.g. an inline editor host). Default `false`:
   * a panel that animates out after `destroy()` keeps its place. `createPopover()` restores them itself.
   */
  shouldRestorePlacement?: boolean;
  /**
   * Render an arrow that points at the reference. Core adds floating-ui's
   * `arrow()` middleware and, each frame, positions `element` along the resolved
   * side (centered via its own measured size, cleared/re-set on flip). `element`
   * must be a child of the floating element and is typically a small rotated square.
   */
  arrow?: { element: HTMLElement; padding?: number };
  /** Called after each placement with the resolved placement. */
  placedCallback?(placement: Placement): void;
  /** Called after each placement with the computed viewport coordinates + placement. */
  computedCallback?(data: { x: number; y: number; placement: Placement }): void;
  /**
   * Called after a placement ONLY when the panel drifted from where it was
   * positioned — i.e. an ancestor establishes a fixed containing block the
   * heuristic doesn't recognise (typically `contain` / `container-type`). Not
   * called when the panel is on target. Core runs a {@link detectFixedDrift}
   * measurement each frame against the floating element's fixed-CB offset parent,
   * so it fires whenever drift persists — guard against repeated warnings on your
   * side (e.g. a once-per-instance flag). Intended to pair with
   * {@link shouldUseFixedContainingBlock}; needs a real-element reference (skipped for a
   * virtual/cursor reference). The report carries the drift + likely CSS culprit.
   */
  driftCallback?(report: DriftReport): void;
}

/** The teardown handle returned by {@link anchor}. */
export interface AnchorHandle {
  /** Recompute the position once, now. */
  update(): void;
  /**
   * Stop `autoUpdate` and release listeners. Puts back the inline sizes the anchor wrote
   * (`width` / `min-width` / `max-width` / `max-height` from `matchWidth`, `maxWidth`,
   * `maxHeight`) and the copied theme. Position (`position` / `left` / `top`) stays unless
   * {@link AnchorOptions.shouldRestorePlacement}. Idempotent.
   */
  destroy(): void;
}
