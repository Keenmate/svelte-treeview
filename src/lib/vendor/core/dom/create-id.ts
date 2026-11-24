/**
 * Unique ids (SPEC §12.20): for `aria-labelledby` / `aria-controls` / `aria-activedescendant` targets, a
 * field's `for`, log instance tags, a new node's key. `<prefix>-<counter><random>`: the counter keeps one copy
 * of core collision-free, the random part keeps two bundled copies on one page apart. Components had their own
 * `Math.random()` / `Date.now()` mixes.
 */
let counter = 0;

function randomPart(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0]!.toString(36);
  return Math.random().toString(36).slice(2, 9);
}

/** A page-unique id: `createId('ms-option')` → `'ms-option-1k3j9x2'`. Valid as an HTML id and CSS ident. */
export function createId(prefix = 'km'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}${randomPart()}`;
}
