/**
 * Where a portaled panel (popover, tooltip) mounts by default. Normally
 * `document.body`, but a trigger inside a modal `<dialog>` (or an open popover) lives in
 * the browser's TOP LAYER: a panel on `<body>` renders underneath it and is inert. So the
 * panel goes into the nearest open top-layer element around the trigger instead — found
 * on the composed tree, so a trigger in a component's shadow root inside the dialog
 * counts too. Resolved when the panel opens (the dialog may open after the panel was set up).
 */
import { deepParent } from '../dom/composed-tree.js';

/** The nearest open modal `<dialog>` / `:popover-open` element around `trigger`, else `document.body`. */
export function findOverlayContainer(trigger: Element | null | undefined): HTMLElement {
  const doc = trigger?.ownerDocument ?? document;
  for (let node: Node | null = trigger ?? null; node; node = deepParent(node)) {
    if (node instanceof Element && isOpenTopLayer(node)) return node as HTMLElement;
  }
  return doc.body;
}

function isOpenTopLayer(el: Element): boolean {
  try {
    if (el.localName === 'dialog' && el.matches(':modal')) return true;
    if (el.matches(':popover-open')) return true;
  } catch {
    // An engine without `:modal` / `:popover-open` — it has no top layer for them either.
  }
  return false;
}
