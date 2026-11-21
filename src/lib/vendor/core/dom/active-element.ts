/**
 * The focused element, descending into open shadow roots (`document.activeElement` stops at
 * the outermost host). `null` without a document or when nothing is focused.
 */
export function deepActiveElement(): Element | null {
  let active: Element | null = typeof document !== 'undefined' ? document.activeElement : null;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}
