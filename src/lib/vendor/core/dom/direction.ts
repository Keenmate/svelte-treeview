/**
 * Writing direction of an element (SPEC §12.20): the effective CSS `direction` — so `dir` on the element, an
 * ancestor, `<html>`, across shadow roots, or a CSS `direction` rule all count. Without a layout engine (jsdom)
 * or while detached, the nearest `dir` attribute on the composed tree answers instead.
 *
 * One answer for every component and core module (`BlissElement.isRtl`, `/menu`); components had three:
 * the host's computed style, the host's own `dir` only, and `document.dir` only.
 */
import { deepClosest } from './composed-tree.js';

/** `true` when `el` resolves to right-to-left. `false` for `null` / SSR. */
export function isRtl(el: Element | null | undefined): boolean {
  if (!el) return false;
  const view = el.ownerDocument?.defaultView;
  const computed = el.isConnected && view ? view.getComputedStyle(el).direction : '';
  if (computed === 'rtl' || computed === 'ltr') return computed === 'rtl';
  return deepClosest(el, '[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl';
}
