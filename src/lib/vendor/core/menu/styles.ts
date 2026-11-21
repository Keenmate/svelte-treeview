/**
 * The shared menu stylesheet (SPEC §12.13), adopted into the menu's host root
 * via `adoptStyles` (§12.8).
 *
 * Every value reads three layers, highest precedence first:
 *
 * ```css
 * var(--_km-menu-bg, var(--km-menu-bg, var(--base-dropdown-bg, <default>)))
 * ```
 *
 * 1. `--_km-menu-*` — PRIVATE, set only by the component that renders the menu,
 *    mapping its own per-instance variable with NO fallback
 *    (`:host { --_km-menu-bg: var(--wtv-context-menu-bg); }`). When the
 *    component variable is unset the private one is guaranteed-invalid, so the
 *    lookup falls through.
 * 2. `--km-menu-*` — PUBLIC, page-wide (`:root { --km-menu-bg: … }` themes every
 *    menu). Components never set these themselves — doing so would shadow the
 *    page-level value on their host.
 * 3. `--base-*` theme tokens, then the literal default.
 *
 * The variable list is documented in `component-variables.manifest.json` at the
 * package root (a unit test keeps it in sync with this file).
 *
 * In `@layer component`, so a component's `overrides` layer and unlayered
 * consumer CSS win over it.
 */

/** `var(--_km-menu-<name>, var(--km-menu-<name>[, <fallback>]))` — the 3-layer read. */
function km(name: string, fallback?: string): string {
  const pub = fallback === undefined ? `var(--km-menu-${name})` : `var(--km-menu-${name}, ${fallback})`;
  return `var(--_km-menu-${name}, ${pub})`;
}

const REM = 'var(--base-rem, 10px)';
/** `calc(var(--base-<token>, <multiplier>) * var(--base-rem, 10px))` — a unitless base-css-variables size. */
function rem(token: string, multiplier: number): string {
  return `calc(var(--base-${token}, ${multiplier}) * ${REM})`;
}
/** A size with no base token, still scaled by the rem base. */
function remOf(multiplier: number): string {
  return `calc(${multiplier} * ${REM})`;
}

const SPACE_XS = rem('space-xs', 0.4); // 4px
const SPACE_SM = rem('space-sm', 0.8); // 8px
const SPACE_MD = rem('space-md', 1.2); // 12px
const SPACE_BASE = rem('space-base', 1.6); // 16px
const RADIUS_SM = rem('border-radius-sm', 0.4); // 4px
const RADIUS_LG = rem('border-radius-lg', 0.8); // 8px
const SHADOW_COLOR = 'var(--base-shadow-color, rgba(0, 0, 0, 0.2))';
const BORDER_COLOR = 'var(--base-border-color, light-dark(#e0e0e0, #3d3d3d))';
const MUTED_TEXT = 'var(--base-text-color-3, light-dark(#707070, #a3a3a3))';
const ITEM_GAP = km('item-gap', SPACE_SM);
const ITEM_PADDING = km('item-padding', `${remOf(0.6)} ${SPACE_MD}`);
const DISABLED_OPACITY = km('disabled-opacity', 'var(--base-disabled-opacity, 0.65)');
const DANGER_COLOR = km('danger-color', 'var(--base-danger-color, light-dark(#d13438, #f87c86))');
const DIVIDER_COLOR = km('divider-color', BORDER_COLOR);
const Z_INDEX = km('z-index', 'calc(var(--base-z-tooltip, 9000) + 1)');
const BG = km('bg', 'var(--base-dropdown-bg, var(--base-elevated-bg, var(--base-main-bg, light-dark(#ffffff, #2b2b2b))))');
const TEXT_COLOR = km('text-color', 'var(--base-text-color-1, light-dark(#242424, #f5f5f5))');
const FONT_FAMILY = km('font-family', 'var(--base-font-family, inherit)');
const LINE_HEIGHT = km('line-height', 'var(--base-line-height-normal, 1.5)');
const HOVER_BG = km('hover-bg', 'var(--base-hover-bg, color-mix(in srgb, currentColor 8%, transparent))');
const TOUCH_TARGET = 'var(--base-touch-target-min, 44px)';
/** Open / close animation: the motion tokens only (SPEC §12.16 — `data-motion`, OS reduced motion → 0s). */
const SHEET_DURATION = km('sheet-duration', 'var(--base-duration-medium, 0.25s)');
const EASE_OUT = 'var(--base-ease-out, cubic-bezier(0, 0, 0.2, 1))';
const EASE_IN = 'var(--base-ease-in, cubic-bezier(0.4, 0, 1, 1))';
const DRAWER_RADIUS = km('drawer-border-radius', RADIUS_LG);

export const MENU_CSS = `
@layer component {
.km-menu {
  position: fixed;
  z-index: ${Z_INDEX};
  box-sizing: border-box;
  min-width: ${km('min-width', '160px')};
  max-width: ${km('max-width', 'none')};
  overflow-y: auto;
  padding: ${km('padding', `${SPACE_XS} 0`)};
  background: ${BG};
  border: ${km('border', `var(--base-dropdown-border, 1px solid ${BORDER_COLOR})`)};
  border-radius: ${km('border-radius', RADIUS_SM)};
  box-shadow: ${km('shadow', 'var(--base-dropdown-box-shadow, 0 8px 16px rgba(0, 0, 0, 0.15))')};
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${km('font-size', rem('font-size-sm', 1.4))};
  line-height: ${LINE_HEIGHT};
  outline: none;
}

.km-menu__item {
  display: flex;
  align-items: center;
  gap: ${ITEM_GAP};
  padding: ${ITEM_PADDING};
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  outline: none;
}

.km-menu__item:hover,
.km-menu__item:focus,
.km-menu__item[aria-expanded="true"] {
  background: ${HOVER_BG};
}

/* Hover text colour: zero specificity, so the danger / toggled colours keep
   theirs; unset (the default) leaves the colour unchanged (inherited). */
:where(.km-menu__item:not(.km-menu__item--disabled)):where(:hover, :focus, [aria-expanded="true"]) {
  color: ${km('hover-color')};
}

.km-menu__item--disabled {
  opacity: ${DISABLED_OPACITY};
  cursor: not-allowed;
}

.km-menu__item--disabled:hover,
.km-menu__item--disabled:focus {
  background: transparent;
}

.km-menu__item--danger {
  color: ${DANGER_COLOR};
}

.km-menu__item--danger:hover,
.km-menu__item--danger:focus {
  background: ${km('danger-hover-bg', `var(--base-danger-bg-subtle, color-mix(in srgb, ${DANGER_COLOR} 10%, transparent))`)};
}

.km-menu__item--toggled {
  color: ${km('toggled-color', 'var(--base-primary-color, #0078d4)')};
}

.km-menu__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${km('icon-size', remOf(1.6))};
  font-size: ${km('icon-font-size', 'inherit')};
}

.km-menu__label {
  flex: 1 1 auto;
  min-width: 0;
}

.km-menu__shortcut {
  flex-shrink: 0;
  margin-left: auto;
  padding-left: ${ITEM_GAP};
  color: ${km('shortcut-color', MUTED_TEXT)};
  font-size: ${km('shortcut-font-size', '0.9em')};
}

.km-menu__item--has-submenu::after {
  content: ${km('submenu-arrow', '"\\25B8"')};
  flex-shrink: 0;
  margin-left: auto;
  padding-left: ${ITEM_GAP};
  font-size: ${km('arrow-font-size', '0.8em')};
  opacity: 0.6;
}

.km-menu__divider {
  height: 1px;
  margin: ${km('divider-margin', `${SPACE_XS} 0`)};
  background: ${DIVIDER_COLOR};
}

.km-menu__divider--named {
  display: flex;
  align-items: center;
  gap: ${ITEM_GAP};
  height: auto;
  padding: ${km('divider-label-padding', `0 ${SPACE_MD}`)};
  background: none;
  color: ${km('divider-label-color', MUTED_TEXT)};
  font-size: ${km('divider-label-font-size', '0.8em')};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.km-menu__divider--named::before,
.km-menu__divider--named::after {
  content: "";
  flex: 1;
  height: 1px;
  background: ${DIVIDER_COLOR};
}

.km-menu__loading {
  padding: ${ITEM_PADDING};
  opacity: ${DISABLED_OPACITY};
  font-style: italic;
}

/* ── Phone bottom sheet (presentation 'sheet' / 'auto' on a phone) ──────────────
   Full width at the bottom over a backdrop; dvh + safe areas; one level shown at a
   time (submenus drill in, a Back row on top); rows at least the touch target. */
.km-menu-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX};
  background: ${km('backdrop', 'var(--base-overlay-bg, rgba(0, 0, 0, 0.4))')};
  animation: km-menu-fade-in ${SHEET_DURATION} ${EASE_OUT};
}

.km-menu-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${Z_INDEX};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: ${km('sheet-max-height', '85dvh')};
  padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  overscroll-behavior: contain;
  background: ${BG};
  border-radius: ${km('sheet-border-radius', `${RADIUS_LG} ${RADIUS_LG} 0 0`)};
  box-shadow: ${km('sheet-shadow', `0 -8px 24px ${SHADOW_COLOR}`)};
  color: ${TEXT_COLOR};
  font-family: ${FONT_FAMILY};
  font-size: ${km('sheet-font-size', rem('font-size-base', 1.6))};
  line-height: ${LINE_HEIGHT};
  animation: km-menu-in-bottom ${SHEET_DURATION} ${EASE_OUT};
}

/* ── Side drawer (presentation 'drawer'): the same sheet, full height on one edge ── */
.km-menu-sheet--drawer {
  top: 0;
  bottom: 0;
  width: ${km('drawer-width', 'min(320px, 85vw)')};
  max-height: none;
  box-shadow: ${km('drawer-shadow', `0 0 24px ${SHADOW_COLOR}`)};
}

.km-menu-sheet--drawer.km-menu-sheet--left {
  left: 0;
  right: auto;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom) env(safe-area-inset-left);
  border-radius: 0 ${DRAWER_RADIUS} ${DRAWER_RADIUS} 0;
  animation-name: km-menu-in-left;
}

.km-menu-sheet--drawer.km-menu-sheet--right {
  left: auto;
  right: 0;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) 0;
  border-radius: ${DRAWER_RADIUS} 0 0 ${DRAWER_RADIUS};
  animation-name: km-menu-in-right;
}

/* Closing: played out, then removed by openMenu (inert meanwhile). */
.km-menu-sheet.km-menu-sheet--closing {
  pointer-events: none;
  animation: km-menu-out-bottom ${SHEET_DURATION} ${EASE_IN} forwards;
}

.km-menu-sheet--closing.km-menu-sheet--left {
  animation-name: km-menu-out-left;
}

.km-menu-sheet--closing.km-menu-sheet--right {
  animation-name: km-menu-out-right;
}

.km-menu-sheet-backdrop.km-menu-sheet-backdrop--closing {
  pointer-events: none;
  animation: km-menu-fade-out ${SHEET_DURATION} ${EASE_IN} forwards;
}

@keyframes km-menu-fade-in { from { opacity: 0; } }
@keyframes km-menu-fade-out { to { opacity: 0; } }
@keyframes km-menu-in-bottom { from { transform: translateY(100%); } }
@keyframes km-menu-out-bottom { to { transform: translateY(100%); } }
@keyframes km-menu-in-left { from { transform: translateX(-100%); } }
@keyframes km-menu-out-left { to { transform: translateX(-100%); } }
@keyframes km-menu-in-right { from { transform: translateX(100%); } }
@keyframes km-menu-out-right { to { transform: translateX(100%); } }

/* The header (title + close) is the shared sheet chrome: SHEET_CHROME_CSS, --km-sheet-* (SPEC §12.9). */

.km-menu.km-menu--sheet {
  position: static;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  max-width: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  font-size: inherit;
}

.km-menu.km-menu--sheet[hidden] {
  display: none;
}

.km-menu--sheet .km-menu__item {
  box-sizing: border-box;
  min-height: ${km('sheet-item-min-height', TOUCH_TARGET)};
  padding: ${km('sheet-item-padding', `${SPACE_SM} ${SPACE_BASE}`)};
  white-space: normal;
}

/* No keyboard-shortcut hints on the touch presentation (the keys still work). */
.km-menu--sheet .km-menu__shortcut {
  display: none;
}

/* A tap focuses the row it lands on; no lingering highlight unless it's keyboard focus. */
.km-menu--sheet .km-menu__item:focus:not(:focus-visible):not(:hover) {
  background: transparent;
}

.km-menu__item--back::before {
  content: ${km('back-arrow', '"\\2039"')};
  flex-shrink: 0;
  opacity: 0.6;
}
}
`;
