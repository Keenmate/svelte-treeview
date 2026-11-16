/**
 * Publish a page-wide setting on `window.components` as a NON-enumerable accessor
 * (enumerating `window.components` still yields component tags only; tag names
 * always contain a hyphen, so a setting name can't clash). A value the page
 * assigned earlier as a plain property is handed to `set` first, so
 * `window.components = { motion: 'none' }` before any component loads still works.
 * Idempotent (an accessor already installed — by any copy of core — is kept);
 * SSR-safe.
 *
 * The state behind `get` / `set` must itself be page-wide (`sharedState`), because
 * whichever copy of core publishes first owns the accessor.
 *
 * Limitation: a page that REPLACES `window.components` after load drops the
 * accessors until core publishes again (the next `registerComponent()` or a read
 * through core). Assign keys on the existing object instead.
 */
export function publishPageSetting(key: string, accessor: { get(): unknown; set(value: unknown): void }): void {
  if (typeof window === 'undefined') return;
  const components = (window.components ??= {}) as object;
  const existing = Object.getOwnPropertyDescriptor(components, key);
  if (existing?.get) return; // already an accessor
  if (existing) accessor.set(existing.value);
  Object.defineProperty(components, key, {
    enumerable: false,
    configurable: true,
    get: accessor.get,
    set: accessor.set,
  });
}
