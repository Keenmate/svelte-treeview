# vendor/core

Logging + theme-context modules **transferred 1:1** from
[`@keenmate/web-components-core`](../../../../../web-components-core) `src/`
(v1.0.0-rc22, commit 6c4c2e2), keeping core's folder layout so imports stay as written:

- `logging/` — `log-core.ts` (core's vendored `loglevel` port), `create-loggers.ts`
  (`NAMESPACE:CATEGORY` colour-prefixed loggers, level layers element → type/category →
  page → `warn`), `global-logging.ts` (the page-wide `window.components.logging` switch),
  `logger-registry.ts`, `element-logger.ts` (`coreLog()` — used by `theme.ts`), `perf-logger.ts`.
  SPEC §12.1 / §12.3.
- `environment/theme.ts` — theme context (SPEC §12.10): the page / `theme-source` /
  `'closest'` dark-light signal, detected once per watched element and shared by every
  KeenMate component on the page; `setThemeMode()` forces it.
- `global/shared-state.ts`, `dom/composed-tree.ts`, `dom/once.ts` — their helpers.

Kept byte-for-byte so a later switch to a shared package is a move, not a rewrite. The
page-wide state sits on `globalThis[Symbol.for('@keenmate/web-components-core…')]`, so this
copy SHARES the logging switch and the theme detection with every web-* component on the
same page (that's the point — one `window.components.logging.enableLogging()`, one
`setThemeMode()`).

Tests: `create-loggers` / `perf-logger` / `cross-copy` / `theme` `*.test.ts` are core's, with a
`// @vitest-environment jsdom` docblock (this repo's default is `node`); `theme.test.ts` drops
core's trailing `BlissElement` integration block (there's no BlissElement here — the Svelte
wiring is `Tree.svelte`'s `themeSource`, covered by e2e).

svelte-treeview's own surface on top: `src/lib/logger.ts` (`STV:*` bundle), `src/lib/perf-logger.ts`,
`src/lib/global-api.ts` (`window.components['svelte-treeview']`, the `registerComponent` entry shape
without the custom-element bits). To update: re-copy the files from core and re-run the tests.
