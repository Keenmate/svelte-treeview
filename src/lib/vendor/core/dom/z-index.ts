/**
 * Stacking tiers (SPEC §12.18): the `--base-z-*` tokens from base-css-variables, each with the same
 * fallback everywhere, so a component's CSS and core's JS-written CSS agree without the theme loaded.
 *
 * Which tier an overlay uses:
 * - `modalBackdrop` / `modal` — anything that takes over the screen: a dialog, a phone full-screen sheet,
 *   a drawer. Everything opened from INSIDE it (dropdown, popover, toast, tooltip) is a higher tier, so it
 *   stacks above with no special case.
 * - `dropdown` — a panel anchored to a field (picker list, calendar dropdown).
 * - `popover` — a floating panel that is not a field's dropdown (filter panel, info card).
 * - `toast` — notifications; above a dialog so they stay visible.
 * - `tooltip` — hover / focus hints; the top tier.
 *
 * Within one tier, add `calc(<tier> + 1)` for a component's own sub-layer (an option tooltip over its own
 * dropdown) — never a bare number like `9999`.
 */
export const Z_INDEX = {
  modalBackdrop: 'var(--base-z-modal-backdrop, 6000)',
  modal: 'var(--base-z-modal, 7000)',
  dropdown: 'var(--base-z-dropdown, 7500)',
  popover: 'var(--base-z-popover, 7600)',
  toast: 'var(--base-z-toast, 8000)',
  tooltip: 'var(--base-z-tooltip, 9000)',
} as const;

/** A stacking tier name (see {@link Z_INDEX}). */
export type ZIndexTier = keyof typeof Z_INDEX;
