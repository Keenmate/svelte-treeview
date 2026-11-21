/**
 * `data-theme` inheritance for portaled layers (C-CS-10) — shared by `anchor()` and the
 * `/menu` phone sheet (which is not anchored). A file of its own so tests that mock
 * `anchor.js` keep it.
 */
import { composedClosest, isAtOrBelow } from '../dom/composed-tree.js';

/**
 * The attributes a portaled layer inherits from the nearest element carrying each (self or
 * ancestor, across shadow roots): the page's theme (pure-css / Keenmate's `data-theme`,
 * Bootstrap's `data-bs-theme`), and what core itself mirrors onto a component host — the
 * EFFECTIVE scheme `data-context-theme` (a Tailwind `.dark` class, `setThemeMode()`,
 * `theme-source`; SPEC §12.10) and the motion level `data-motion` (SPEC §12.16). A panel moved
 * to `<body>` would otherwise lose both.
 */
const THEME_ATTRIBUTES = ['data-theme', 'data-bs-theme', 'data-context-theme', 'data-motion'] as const;

/** The per-instance switches: read only up to the component host once core has resolved it. */
const INSTANCE_THEME_ATTRIBUTES: ReadonlySet<string> = new Set(['data-theme', 'data-bs-theme']);

/**
 * Copy the nearest theme attributes from `source` onto `target` (self or ancestor, across
 * shadow roots). Returns a restore: the panel element is often reused across opens, so its
 * own attributes come back when the anchor is destroyed (a theme removed meanwhile must
 * not stick to it).
 *
 * Above the nearest host carrying `data-context-theme`, a `data-theme` / `data-bs-theme` is
 * NOT copied: core already folded the page / section signal into that host's context, and the
 * panel's per-instance rules win over its context rules — a section's `data-theme="dark"` would
 * turn the panel dark next to a light component. Without such a host the nearest one is copied.
 */
export function inheritTheme(source: HTMLElement, target: HTMLElement): () => void {
  const restores: (() => void)[] = [];
  const contextHost = composedClosest(source, '[data-context-theme]');
  for (const name of THEME_ATTRIBUTES) {
    let themed = composedClosest(source, `[${name}]`);
    if (themed && contextHost && INSTANCE_THEME_ATTRIBUTES.has(name) && !isAtOrBelow(themed, contextHost)) {
      themed = null;
    }
    const theme = themed?.getAttribute(name);
    if (theme == null) continue;
    const previous = target.getAttribute(name);
    target.setAttribute(name, theme);
    restores.push(() => (previous === null ? target.removeAttribute(name) : target.setAttribute(name, previous)));
  }
  return () => {
    for (const restore of restores) restore();
  };
}
