/**
 * `anchor()` — the low-level positioning primitive (SPEC §12.2). Places a
 * floating element against a reference and (by default) keeps it placed via
 * floating-ui `autoUpdate`, unifying the ~15 hand-rolled call sites across the
 * five components: `'fixed'` strategy by default, the recurring
 * `offset → (size) → flip → shift` middleware stack, width-matching via `size()`
 * (replacing three different hacks), and `data-theme` inheritance for portaled
 * layers (C-CS-10). The two presets ({@link createTooltip}, {@link createPopover})
 * are thin wrappers over this.
 */
import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip as flipMiddleware,
  offset as offsetMiddleware,
  platform as floatingUiPlatform,
  shift as shiftMiddleware,
  size as sizeMiddleware,
  type Middleware,
  type Platform,
} from '@floating-ui/dom';
import { readDropdownOffset } from './dropdown-offset.js';
import { inheritTheme } from './inherit-theme.js';
import { coreLog } from '../logging/element-logger.js';
import { runSafely } from '../logging/safe-call.js';
import { detectFixedDrift, getFixedPositionOffsetParent } from './containing-block.js';
import type { AnchorHandle, AnchorOptions, Placement } from './types.js';

type Reference = Parameters<typeof computePosition>[0];

const OPPOSITE_SIDE = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const;

/** Position an arrow element on the side facing the reference (centered via its own size). */
function positionArrow(el: HTMLElement, placement: Placement, data: { x?: number; y?: number } | undefined): void {
  if (!data) return;
  const side = placement.split('-')[0] as keyof typeof OPPOSITE_SIDE;
  const staticSide = OPPOSITE_SIDE[side];
  el.style.left = data.x != null ? `${data.x}px` : '';
  el.style.top = data.y != null ? `${data.y}px` : '';
  el.style.right = '';
  el.style.bottom = '';
  // Half the arrow sticks out past the panel edge: its height on a top / bottom edge, its width on a side.
  const size = staticSide === 'top' || staticSide === 'bottom' ? el.offsetHeight : el.offsetWidth;
  el.style[staticSide] = `-${size / 2}px`;
}

/** The inline size properties the `size()` steps write (matchWidth, maxHeight, maxWidth). */
type SizeProperty = 'width' | 'minWidth' | 'maxWidth' | 'maxHeight';

/**
 * Writes the size properties and remembers each one's inline value from before the first
 * write, so `destroy()` can put back exactly what the anchor changed (a reused panel must not
 * keep a stale `max-height` or a width from a reference it no longer follows).
 */
function createSizeWriter(floating: HTMLElement): { set(prop: SizeProperty, value: string): void; restore(): void } {
  const original = new Map<SizeProperty, string>();
  return {
    set(prop, value) {
      if (!original.has(prop)) original.set(prop, floating.style[prop]);
      floating.style[prop] = value;
    },
    restore() {
      for (const [prop, value] of original) floating.style[prop] = value;
      original.clear();
    },
  };
}

/** The available space in px, or `min(<author cap>, <available>)` when the option carries a `cap`. */
function capped(opt: AnchorOptions['maxWidth'], available: number): string {
  const px = `${Math.max(0, available)}px`;
  const cap = typeof opt === 'object' ? opt.cap?.trim() : undefined;
  return cap ? `min(${cap}, ${px})` : px;
}

/**
 * Build the middleware stack in the canonical order: offset → size → flip → shift.
 * `flipEnabled` lets the caller drop `flip` after freezing (`lockPlacement: 'freeze'`).
 */
function buildMiddleware(
  opts: AnchorOptions,
  flipEnabled: boolean,
  sizes: ReturnType<typeof createSizeWriter>,
  defaultOffset: number,
): Middleware[] {
  const middleware: Middleware[] = [offsetMiddleware(opts.offset ?? defaultOffset)];

  if (opts.matchWidth) {
    const mode = opts.matchWidth;
    middleware.push(
      sizeMiddleware({
        apply({ rects }) {
          const width = `${rects.reference.width}px`;
          // 'exact' pins the width; 'min' floors it (grow for wider content);
          // 'max' caps it (shrink for narrower content).
          sizes.set(mode === 'exact' ? 'width' : mode === 'max' ? 'maxWidth' : 'minWidth', width);
        },
      }),
    );
  }

  if (flipEnabled) {
    // lockPlacement:'initial' — prefer returning to the initial placement over reordering.
    // ('freeze' flips normally on the first frame, then this rebuilds without flip.)
    middleware.push(
      flipMiddleware({
        ...(opts.lockPlacement === 'initial' ? { fallbackStrategy: 'initialPlacement' } : {}),
        ...(opts.flipPadding != null ? { padding: opts.flipPadding } : {}),
        ...(opts.fallbackPlacements ? { fallbackPlacements: opts.fallbackPlacements } : {}),
      }),
    );
  }

  const shift = opts.shift ?? 8;
  if (shift !== false) middleware.push(shiftMiddleware({ padding: shift }));

  // Height-cap (calendar / dropdown): scroll internally instead of overflowing.
  if (opts.maxHeight) {
    const padding = typeof opts.maxHeight === 'object' ? opts.maxHeight.padding : undefined;
    middleware.push(
      sizeMiddleware({
        padding,
        apply({ availableHeight }) {
          sizes.set('maxHeight', capped(opts.maxHeight, availableHeight));
        },
      }),
    );
  }

  // Width-cap (user-resizable panel): stop the floating element overflowing the
  // viewport horizontally. Mirrors maxHeight; only sets max-width.
  if (opts.maxWidth) {
    const padding = typeof opts.maxWidth === 'object' ? opts.maxWidth.padding : undefined;
    middleware.push(
      sizeMiddleware({
        padding,
        apply({ availableWidth }) {
          sizes.set('maxWidth', capped(opts.maxWidth, availableWidth));
        },
      }),
    );
  }

  // Arrow last (floating-ui requirement): it reads the final resolved coordinates.
  if (opts.arrow) middleware.push(arrowMiddleware({ element: opts.arrow.element, padding: opts.arrow.padding }));

  return middleware;
}

/**
 * Position `floating` against `reference` and keep it there. Returns a handle:
 * `update()` recomputes once, `destroy()` stops `autoUpdate`. The `floating`
 * element must already be in the document (so it can be measured); the presets
 * handle mounting.
 */
export function anchor(
  floating: HTMLElement,
  reference: Reference,
  opts: AnchorOptions = {},
): AnchorHandle {
  const strategy = opts.strategy ?? 'fixed';

  const restoreTheme = opts.inheritThemeFrom ? inheritTheme(opts.inheritThemeFrom, floating) : undefined;

  const ownPlacement = opts.shouldRestorePlacement
    ? { position: floating.style.position, left: floating.style.left, top: floating.style.top }
    : undefined;
  floating.style.position = strategy;
  floating.style.left = '0';
  floating.style.top = '0';

  const widthVar = typeof opts.referenceWidthVar === 'string' ? { name: opts.referenceWidthVar, element: floating } : opts.referenceWidthVar;
  /** The reference as an element (a virtual one's `contextElement`), when there is one. */
  const referenceElement: Element | undefined =
    reference instanceof Element ? reference : (reference as { contextElement?: Element }).contextElement;

  // `placement`/`middleware` are mutable so `lockPlacement: 'freeze'` can pin the
  // first resolved placement and drop `flip` for every subsequent frame.
  let placement = opts.placement ?? 'bottom-start';
  let flipEnabled = opts.shouldFlip ?? true;
  const sizes = createSizeWriter(floating);
  // No `offset` given: the page's field → panel gap (`--base-dropdown-offset`), read once where it opens.
  const defaultOffset = opts.offset === undefined ? readDropdownOffset(referenceElement ?? floating) : 0;
  let middleware = buildMiddleware(opts, flipEnabled, sizes, defaultOffset);
  const freeze = opts.lockPlacement === 'freeze';
  let frozen = false;

  // `shouldUseFixedContainingBlock` sugar: narrow floating-ui's offset-parent search to the
  // CB properties browsers reliably honour for `position: fixed`, resolved from the
  // FLOATING element (not the reference — see the option doc). An explicit `platform`
  // wins over the sugar.
  const useFixedCB = !!opts.shouldUseFixedContainingBlock && !opts.platform;
  const effectivePlatform: Platform | undefined =
    opts.platform ??
    (useFixedCB
      ? { ...floatingUiPlatform, getOffsetParent: () => getFixedPositionOffsetParent(floating) }
      : undefined);

  // `computePosition` resolves async — a result landing after destroy() must not
  // move the panel or fire callbacks (it may already be reused for another anchor).
  let isDestroyed = false;
  const run = (): void => {
    if (isDestroyed) return;
    if (widthVar && referenceElement) {
      widthVar.element.style.setProperty(widthVar.name, `${referenceElement.getBoundingClientRect().width}px`);
    }
    if (opts.beforeComputeCallback) runSafely(opts.beforeComputeCallback, { source: floating, message: 'anchor beforeComputeCallback threw' });
    void computePosition(reference, floating, {
      placement,
      strategy,
      middleware,
      ...(effectivePlatform ? { platform: effectivePlatform } : {}),
    }).then(({ x, y, placement: resolved, middlewareData }) => {
      if (isDestroyed) return;
      floating.style.left = `${x}px`;
      floating.style.top = `${y}px`;
      if (opts.arrow) positionArrow(opts.arrow.element, resolved, middlewareData.arrow);
      if (freeze && !frozen) {
        // Pin the placement floating-ui just chose; stop flipping from now on.
        frozen = true;
        placement = resolved;
        flipEnabled = false;
        middleware = buildMiddleware(opts, false, sizes, defaultOffset);
      }
      // Each callback is isolated: one that throws is logged and the others still run.
      const { placedCallback, computedCallback, driftCallback } = opts;
      if (placedCallback) runSafely(() => placedCallback(resolved), { source: floating, message: 'anchor placedCallback threw' });
      if (computedCallback) runSafely(() => computedCallback({ x, y, placement: resolved }), { source: floating, message: 'anchor computedCallback threw' });
      // Drift is a `position: fixed` diagnosis — an absolute panel is MEANT to sit in its offset parent.
      if (driftCallback && reference instanceof Element && strategy === 'fixed') {
        // Measure against the frame x / y were computed in: the effective platform's offset
        // parent (the fixed-CB parent with the sugar, a custom platform's answer, else
        // floating-ui's own, which already accounts for a transformed ancestor — measuring
        // against the viewport there reported a panel that sat on target, review D-29).
        // Only reports when actually drifted.
        const report = (offsetParent: unknown): void => {
          if (isDestroyed) return;
          const frame = offsetParent instanceof Element ? offsetParent : window;
          const drift = detectFixedDrift({ panel: floating, reference, expectedX: x, expectedY: y, offsetParent: frame });
          if (drift) runSafely(() => driftCallback(drift), { source: floating, message: 'anchor driftCallback threw' });
        };
        const frameSource = effectivePlatform ?? floatingUiPlatform;
        const offsetParent: unknown = frameSource.getOffsetParent ? frameSource.getOffsetParent(floating) : window;
        if (offsetParent instanceof Promise) void offsetParent.then(report, () => report(window));
        else report(offsetParent);
      }
    }).catch((error: unknown) => {
      // computePosition itself rejected (a detached reference, a throwing platform hook):
      // log it instead of leaving an unhandled rejection that bypasses the core logger.
      coreLog(floating, 'UI', 'ELEMENT').error('anchor: computing the position failed', error);
    });
  };

  let cleanup: (() => void) | undefined;
  if (opts.shouldAutoUpdate ?? true) cleanup = autoUpdate(reference, floating, run, opts.autoUpdateOptions);
  else run();

  return {
    update: run,
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      cleanup?.();
      cleanup = undefined;
      restoreTheme?.();
      sizes.restore();
      if (ownPlacement) Object.assign(floating.style, ownPlacement);
    },
  };
}
