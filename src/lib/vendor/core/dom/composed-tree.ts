/**
 * Walking the composed tree: up through shadow roots to their hosts, the way the
 * page's styles and themes actually cascade. `deepClosest` / `isDeepInside` are exported from the main
 * index; `deepParent` stays internal.
 */

/** Parent element, stepping out of a shadow root to its host. `null` at the top. */
export function deepParent(node: Node): Element | null {
  if (node.parentElement) return node.parentElement;
  const root = node.getRootNode?.();
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root.host : null;
}

/** Like `Element.closest`, but keeps going past shadow roots into the host's tree. */
export function deepClosest(el: Element, selector: string): Element | null {
  for (let node: Element | null = el; node; node = deepParent(node)) {
    if (node.matches(selector)) return node;
  }
  return null;
}

/** Whether `el` is `container` itself or inside it in the composed tree (across shadow roots). */
export function isDeepInside(el: Element, container: Element): boolean {
  for (let node: Element | null = el; node; node = deepParent(node)) {
    if (node === container) return true;
  }
  return false;
}
