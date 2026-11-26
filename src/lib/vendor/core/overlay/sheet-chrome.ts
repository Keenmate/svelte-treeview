/**
 * The phone sheet chrome (SPEC §12.9): ONE header bar + title + close button for every
 * full-screen / bottom / side sheet a component opens (the `/menu` sheet, the multiselect and
 * daterangepicker full-screen pickers, the grid's editor sheets, the dropzone drawer …), plus two
 * panel presets: `.km-sheet` (the full-screen frame) and `.km-drawer` (an edge drawer).
 *
 * A component adds the classes to its own elements (or builds them with `createSheetHeader()`)
 * and adopts `SHEET_CHROME_CSS` into the root they live in (`adoptStyles`, §12.8). Its own BEM
 * classes stay for layout around them (a search field in the header, a merged title-less corner).
 *
 * Every value reads three layers, like `/menu` (§12.13):
 * `var(--_km-sheet-X, var(--km-sheet-X, var(--base-…, <default>)))` — the component maps its
 * per-instance variable onto the private `--_km-sheet-X` on its host with NO fallback; the page
 * sets `--km-sheet-X` on `:root`. The list ships in `component-variables.manifest.json`.
 *
 * In `@layer component`, so a component's `overrides` layer and unlayered consumer CSS win.
 */

/** `var(--_km-sheet-<name>, var(--km-sheet-<name>, <fallback>))` — the 3-layer read. */
function ks(name: string, fallback: string): string {
  return `var(--_km-sheet-${name}, var(--km-sheet-${name}, ${fallback}))`;
}

const REM = 'var(--base-rem, 10px)';
/** `calc(var(--base-<token>, <multiplier>) * var(--base-rem, 10px))`. */
function rem(token: string, multiplier: number): string {
  return `calc(var(--base-${token}, ${multiplier}) * ${REM})`;
}

/** The base-css-variables ✕ (stroke icon, drawn as a mask in `currentColor`). */
const CLOSE_ICON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23000%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M18 6 6 18%22/%3E%3Cpath d=%22m6 6 12 12%22/%3E%3C/svg%3E")';

/** Contract defaults (base-variables.css) — the fallbacks equal them, derived tokens use the contract formula. */
const MAIN_BG = 'var(--base-main-bg, light-dark(#ffffff, #1e293b))';
const TEXT_1 = 'var(--base-text-color-1, light-dark(#334155, #f1f5f9))';
const BORDER_COLOR = `var(--base-border-color, light-dark(oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l - 0.096) c h), oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l + 0.192) c h)))`;

const HEADER_GAP = ks('header-gap', rem('space-sm', 0.8));
const HEADER_PADDING_BLOCK = ks('header-padding-block', rem('space-sm', 0.8));
const HEADER_PADDING_INLINE = ks('header-padding-inline', rem('space-base', 1.6));
const CLOSE_SIZE = ks('close-size', 'var(--base-touch-target-min, 44px)');
const CLOSE_EDGE_NUDGE = ks('close-edge-nudge', rem('space-sm', 0.8));
const CLOSE_BG_HOVER = ks('close-bg-hover', `var(--base-hover-bg, light-dark(color-mix(in oklch, oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l - 0.45) c h) 14%, transparent), color-mix(in oklch, oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l + 0.45) c h) 28%, transparent)))`);

const DRAWER_SIZE = ks('drawer-size', 'min(320px, 85vw)');
const DRAWER_RADIUS = ks('drawer-border-radius', rem('border-radius-lg', 0.8));
const DRAWER_DURATION = ks('drawer-duration', 'var(--base-duration-medium, 0.25s)');
const FRAME_DURATION = ks('duration', 'var(--base-duration-medium, 0.25s)');
const EASE_OUT = 'var(--base-ease-out, cubic-bezier(0, 0, 0.2, 1))';
const EASE_IN = 'var(--base-ease-in, cubic-bezier(0.4, 0, 1, 1))';

export const SHEET_CHROME_CSS = `
@layer component {
.km-sheet-header {
  display: flex;
  flex: none;
  align-items: center;
  gap: ${HEADER_GAP};
  box-sizing: border-box;
  min-height: ${ks('header-min-height', `calc(5.6 * ${REM})`)};
  padding: ${HEADER_PADDING_BLOCK} ${HEADER_PADDING_INLINE};
  background: ${ks('header-bg', 'transparent')};
  border-bottom: ${ks('header-border', `var(--base-border-width, 1px) solid ${BORDER_COLOR}`)};
}

.km-sheet-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${ks('title-color', 'inherit')};
  font-size: ${ks('title-font-size', rem('font-size-lg', 1.8))};
  font-weight: ${ks('title-font-weight', 'var(--base-font-weight-semibold, 600)')};
}

/* A fixed-size chip (round and borderless by default; the bg / border / radius turn it into a
   bordered button), slid toward the trailing edge by the edge nudge. */
.km-sheet-close {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: ${CLOSE_SIZE};
  height: ${CLOSE_SIZE};
  margin-inline-start: auto;
  margin-inline-end: calc(-1 * ${CLOSE_EDGE_NUDGE});
  padding: 0;
  color: ${ks('close-color', 'inherit')};
  background: ${ks('close-bg', 'transparent')};
  border: ${ks('close-border', 'none')};
  border-radius: ${ks('close-border-radius', '50%')};
  font: inherit;
  cursor: pointer;
}

/* The tap target reaches past the chip into the sheet's top-trailing corner (the easiest place
   to hit), without growing the chip or covering the first row below the header. */
.km-sheet-close::after {
  content: "";
  position: absolute;
  inset-block-start: calc(-1 * ${CLOSE_SIZE});
  inset-block-end: calc(-1 * ${HEADER_PADDING_BLOCK});
  inset-inline-end: calc(-1 * ${HEADER_PADDING_INLINE});
  inset-inline-start: calc(-1 * ${HEADER_GAP});
}

.km-sheet-close::before {
  content: "";
  display: block;
  width: ${ks('close-icon-size', `calc(2 * ${REM})`)};
  height: ${ks('close-icon-size', `calc(2 * ${REM})`)};
  background-color: currentColor;
  -webkit-mask: ${ks('close-icon', `var(--base-icon-close, ${CLOSE_ICON})`)} center / contain no-repeat;
  mask: ${ks('close-icon', `var(--base-icon-close, ${CLOSE_ICON})`)} center / contain no-repeat;
}

/* Hover only with a real pointer: on touch :hover sticks after a tap, and a sheet opening under a
   resting mouse would show the tint at once. :active is the press feedback on touch. */
@media (hover: hover) {
  .km-sheet-close:hover {
    background: ${CLOSE_BG_HOVER};
  }
}

.km-sheet-close:active {
  background: ${CLOSE_BG_HOVER};
}

.km-sheet-close:focus-visible {
  outline: 2px solid ${ks('close-focus-color', 'var(--base-primary-color, #3b82f6)')};
  outline-offset: -2px;
}

/* ── Drawer preset (SPEC §12.9, B14): a non-anchored panel on one edge of the viewport ──────────────
   The component adds .km-drawer + a side (--start / --end follow the writing direction, --top / --bottom)
   to its panel and runs it through startModalSession(panel, { backdrop: true, dismissCallback }). Closing:
   animateOut(panel, { className: 'km-drawer--closing' }). The modal tier, safe areas, motion tokens. */
.km-drawer {
  position: fixed;
  z-index: var(--base-z-modal, 7000);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: auto;
  overscroll-behavior: contain;
  background: ${ks('drawer-bg', `var(--base-elevated-bg, light-dark(oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l - 0.03) c h), oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l + 0.06) c h)))`)};
  color: ${ks('drawer-color', TEXT_1)};
  box-shadow: ${ks('drawer-shadow', '0 0 24px var(--base-shadow-color, light-dark(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.4)))')};
  animation: ${DRAWER_DURATION} ${EASE_OUT} both;
}

.km-drawer--start,
.km-drawer--end {
  inset-block: 0;
  inline-size: ${DRAWER_SIZE};
  max-inline-size: 100vw;
  padding-block: env(safe-area-inset-top) env(safe-area-inset-bottom);
}

.km-drawer--start {
  inset-inline-start: 0;
  padding-inline-start: env(safe-area-inset-left);
  border-start-end-radius: ${DRAWER_RADIUS};
  border-end-end-radius: ${DRAWER_RADIUS};
  animation-name: km-drawer-in-left;
}

.km-drawer--end {
  inset-inline-end: 0;
  padding-inline-end: env(safe-area-inset-right);
  border-start-start-radius: ${DRAWER_RADIUS};
  border-end-start-radius: ${DRAWER_RADIUS};
  animation-name: km-drawer-in-right;
}

.km-drawer--start:dir(rtl) { animation-name: km-drawer-in-right; }
.km-drawer--end:dir(rtl) { animation-name: km-drawer-in-left; }

.km-drawer--top,
.km-drawer--bottom {
  inset-inline: 0;
  max-block-size: ${ks('drawer-max-height', '85dvh')};
  padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
}

.km-drawer--top {
  inset-block-start: 0;
  padding-block-start: env(safe-area-inset-top);
  border-end-start-radius: ${DRAWER_RADIUS};
  border-end-end-radius: ${DRAWER_RADIUS};
  animation-name: km-drawer-in-top;
}

.km-drawer--bottom {
  inset-block-end: 0;
  padding-block-end: env(safe-area-inset-bottom);
  border-start-start-radius: ${DRAWER_RADIUS};
  border-start-end-radius: ${DRAWER_RADIUS};
  animation-name: km-drawer-in-bottom;
}

.km-drawer.km-drawer--closing {
  pointer-events: none;
  animation-timing-function: ${EASE_IN};
  animation-direction: reverse;
}

/* A reversed animation only replays when its name changes: the closing state uses twin keyframes. */
.km-drawer--closing.km-drawer--start { animation-name: km-drawer-out-left; }
.km-drawer--closing.km-drawer--end { animation-name: km-drawer-out-right; }
.km-drawer--closing.km-drawer--start:dir(rtl) { animation-name: km-drawer-out-right; }
.km-drawer--closing.km-drawer--end:dir(rtl) { animation-name: km-drawer-out-left; }
.km-drawer--closing.km-drawer--top { animation-name: km-drawer-out-top; }
.km-drawer--closing.km-drawer--bottom { animation-name: km-drawer-out-bottom; }

@keyframes km-drawer-in-left { from { transform: translateX(-100%); } }
@keyframes km-drawer-in-right { from { transform: translateX(100%); } }
@keyframes km-drawer-in-top { from { transform: translateY(-100%); } }
@keyframes km-drawer-in-bottom { from { transform: translateY(100%); } }
@keyframes km-drawer-out-left { from { transform: translateX(-100%); } }
@keyframes km-drawer-out-right { from { transform: translateX(100%); } }
@keyframes km-drawer-out-top { from { transform: translateY(-100%); } }
@keyframes km-drawer-out-bottom { from { transform: translateY(100%); } }

/* ── Full-screen frame (SPEC §12.9, Q8): the phone full-screen sheet panel ──────────────────────────────
   The component adds .km-sheet to its panel (header = createSheetHeader(), then .km-sheet-body — or its own
   scrolling column) and runs it through startModalSession(panel, { dismissCallback, shouldFitToVisibleViewport:
   true }). Pinned by top / inline-start + 100dvw x 100dvh, NOT inset: 0 — the keyboard inset
   (fitToVisibleViewport) writes an inline height / top, which a pinned bottom would defeat. Full-bleed
   background, content padded out of the safe areas, the modal tier, motion tokens. Closing:
   animateOut(panel, { className: 'km-sheet--closing' }). */
.km-sheet {
  position: fixed;
  top: 0;
  inset-inline-start: 0;
  z-index: ${ks('z-index', 'var(--base-z-modal, 7000)')};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100dvw;
  height: 100dvh;
  min-width: 0;
  min-height: 0;
  max-width: 100dvw;
  max-height: 100dvh;
  margin: 0;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  overflow: hidden;
  overscroll-behavior: contain;
  border: none;
  border-radius: 0;
  box-shadow: none;
  resize: none;
  background: ${ks('bg', `var(--base-elevated-bg, light-dark(oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l - 0.03) c h), oklch(from var(--base-main-bg, light-dark(#ffffff, #1e293b)) calc(l + 0.06) c h)))`)};
  color: ${ks('color', TEXT_1)};
  animation: km-sheet-in ${FRAME_DURATION} ${EASE_OUT} both;
}

.km-sheet:focus {
  outline: none;
}

/* The scrolling column under the header (a component with its own list scroller can skip it). */
.km-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.km-sheet.km-sheet--closing {
  pointer-events: none;
  animation-name: km-sheet-out;
  animation-timing-function: ${EASE_IN};
  animation-direction: reverse;
}

@keyframes km-sheet-in { from { opacity: 0; transform: translateY(${ks('enter-offset', `calc(3.2 * ${REM})`)}); } }
@keyframes km-sheet-out { from { opacity: 0; transform: translateY(${ks('enter-offset', `calc(3.2 * ${REM})`)}); } }

@media (forced-colors: active) {
  .km-drawer {
    border: 1px solid CanvasText;
  }

  .km-sheet-close::before {
    background-color: ButtonText;
    forced-color-adjust: none;
  }
}
}
`;

export interface SheetHeaderOptions {
  /** Title text; `null` / omitted = no title element (a header holding a search field, say). */
  title?: string | null;
  /**
   * Your own controls between the title and the close button (a search field, a match navigator); they
   * get the space the title would take when there is no title.
   */
  content?: Node | readonly Node[];
  /** The close button's accessible name (from the component's `labels`). */
  closeLabel: string;
  /** Runs on a close-button click. */
  closeCallback: () => void;
}

export interface SheetHeader {
  header: HTMLDivElement;
  title: HTMLSpanElement | null;
  close: HTMLButtonElement;
}

/**
 * Builds `.km-sheet-header` > [`.km-sheet-title`] + [your `content`] + `.km-sheet-close` (a `type=button` with an
 * `aria-label`, no text: the ✕ is the CSS mask). Add your own classes / children as needed;
 * adopt `SHEET_CHROME_CSS` into the root it ends up in.
 */
export function createSheetHeader(opts: SheetHeaderOptions): SheetHeader {
  const header = document.createElement('div');
  header.className = 'km-sheet-header';
  let title: HTMLSpanElement | null = null;
  if (opts.title != null) {
    title = document.createElement('span');
    title.className = 'km-sheet-title';
    title.textContent = opts.title;
    header.append(title);
  }
  if (opts.content) header.append(...(Array.isArray(opts.content) ? opts.content : [opts.content as Node]));
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'km-sheet-close';
  close.setAttribute('aria-label', opts.closeLabel);
  close.addEventListener('click', () => opts.closeCallback());
  header.append(close);
  return { header, title, close };
}
