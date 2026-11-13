/**
 * Page-wide state shared by every copy of core on the page.
 *
 * Each Keenmate component bundles its own copy of core, so a module-level variable
 * exists once PER COPY: two components would each keep their own registry, lock
 * count or cache and silently disagree. State that must be one per page lives on
 * `globalThis` under a `Symbol.for(key)` — the realm-wide symbol registry gives
 * every copy the same symbol for the same key.
 *
 * Keys: `@keenmate/web-components-core:<name>`. A key, once published, is a
 * contract with every other copy (and with non-core code such as pure-css for
 * `km-scroll-lock` / `km-overlay-all-groups`): never rename it. When the SHAPE of a
 * state changes incompatibly, use a new key with a version suffix
 * (`…:<name>@2`), so an older copy keeps its own state instead of corrupting the
 * newer one's.
 */

/** The `Symbol.for` key of the core state `name`: `@keenmate/web-components-core:<name>`. */
export function sharedStateKey(name: string): string {
  return `@keenmate/web-components-core:${name}`;
}

/**
 * The page-wide state under `key` (a full `Symbol.for` key — use {@link sharedStateKey}
 * for core's own), created with `init()` by whichever copy of core asks first.
 */
export function sharedState<T>(key: string, init: () => T): T {
  const g = globalThis as unknown as Record<symbol, T | undefined>;
  const symbol = Symbol.for(key);
  let state = g[symbol];
  if (state === undefined) {
    state = init();
    g[symbol] = state;
  }
  return state;
}
