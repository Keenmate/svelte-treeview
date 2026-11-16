# What we take from web-components-core — and how to keep it current

svelte-treeview doesn't depend on `@keenmate/web-components-core` (a Svelte library shouldn't pull a
custom-element runtime), but it shares the suite's page-wide machinery — logging, theme context,
breakpoints, motion, the loader hook, the global API — so a page with web-* components and a
svelte tree behaves as one. That machinery is **copied** (vendored) or **mirrored** (re-implemented
in Svelte), and both go stale silently. This file + a manifest make it checkable.

## The pieces

| Kind | What | Where |
|---|---|---|
| **manifest** | every vendored file / mirrored behaviour, its core source, the core commit it was last synced or reviewed against | [`scripts/core-sync.json`](../scripts/core-sync.json) |
| **check** | compares against `../web-components-core` (git checkout) | `npm run check:core-sync` (`--verbose` also lists commits behind an identical copy) |

The manifest's three modes:

- **identical** — `src/lib/vendor/core/**`: byte-for-byte copies. Any difference from core HEAD
  is drift. Fix = re-copy.
- **adapted** — copies with documented local edits (`vendor/actions`, the vendored tests). Flagged
  when core changed the source since `baseline`. Fix = re-copy, re-apply the edits in the group's
  `note`.
- **mirror** — Svelte re-implementations with no shared file (tooltip action, info popover,
  loader hook, global API, context menu). Flagged when the core source changed since
  `baseline`. Fix = read the listed core commits, port what applies (or record in
  [`parity.md`](parity.md) why not).

## Routine (each core release, or before an rc of this package)

1. `git -C ../web-components-core pull` and `npm run check:core-sync`.
2. For each `CHECK` group: re-sync / port as above, run the tests the group names
   (`npx vitest run src/lib/vendor`, the e2e specs), then **bump the group's `baseline`** to the
   core commit you compared against. Bumping is the "reviewed" stamp — bump only after looking.
3. Hands-on check: `/examples/integration` puts the tree next to a real `<web-multiselect>` (its own
   bundled core, `static/vendor/web-multiselect` — re-copy it from `../web-multiselect/dist` after a core
   release) and flips each page-wide switch — theme mode, motion, breakpoints, loader hook, logging. If
   one stops reaching both, the shared state drifted.
4. Public API changes that come with it follow the parity rule (CLAUDE.md): update
   `docs/parity.md`, CHANGELOG.
5. Adding a new vendored file or mirror: add it to the manifest in the same commit.

## Status (2026-11-14, core 1.0.0-rc23 @ dd29c43)

- **In sync:** logging, environment (theme / viewport / element-size / motion — re-synced today
  from the rc09-era `vendor/environment`, now `vendor/core/environment`), helpers, vendored tests,
  global API, `actions` (re-synced today from e472439: core's fixes + `createMenuDivider`),
  loader hook (now `renderLoadingCallback` + the old name as a fallback, default `.stv__loader`;
  the `loadingPlaceholder` snippet stays first and never needs `window.components`).
- **Behind — to do:**
  - **info popover** — core's scroll-close rules (close only once the reference moved, ignore
    the browser's focus scroll, 3px threshold) and `reference-removed` close; parity.md already
    lists the scroll part as "to mirror".
  - **tooltip action** — core positioning fixes since rc12 (modal-dialog mounting, option
    callback renames) to review.
  - **context menu** — core's phone presentations (bottom sheet, drawer, `menu-presentation`
    inputs), sheet chrome, Back gesture, scroll-close sharing; web-treeview has them.
