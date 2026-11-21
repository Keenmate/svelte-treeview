/**
 * The page's field → panel gap: `--base-dropdown-offset` (`@keenmate/base-css-variables` 2.0.1+,
 * `4px`), read where the panel opens — the reference element, else the panel — so a page can set
 * it per section or per component (`web-multiselect { --base-dropdown-offset: 6px }`; custom
 * properties inherit into the shadow root). Plain px. `4` when it is unset or unreadable.
 */
export const DEFAULT_DROPDOWN_OFFSET = 4;

export function readDropdownOffset(el: Element | null | undefined): number {
  if (!el || typeof getComputedStyle !== 'function') return DEFAULT_DROPDOWN_OFFSET;
  const style = getComputedStyle(el) as Partial<CSSStyleDeclaration> | null;
  const value = typeof style?.getPropertyValue === 'function' ? parseFloat(style.getPropertyValue('--base-dropdown-offset')) : NaN;
  return Number.isFinite(value) ? value : DEFAULT_DROPDOWN_OFFSET;
}
