# vendor/core

Modules **transferred 1:1** from
[`@keenmate/web-components-core`](../../../../../web-components-core) `src/`, keeping core's
folder layout so imports stay as written. Every file, its core source and the commit it was
last synced against is listed in [`scripts/core-sync.json`](../../../../scripts/core-sync.json);
`npm run check:core-sync` reports drift. Process: [`docs/CORE-SYNC.md`](../../../../docs/CORE-SYNC.md).

- `logging/` — `log-core.ts` (core's vendored `loglevel` port), `create-loggers.ts`
  (`NAMESPACE:CATEGORY` colour-prefixed loggers, level layers element → type/category →
  page → `warn`), `global-logging.ts` (the page-wide `window.components.logging` switch),
  `logger-registry.ts`, `element-logger.ts` (`coreLog()`), `perf-logger.ts`, `safe-call.ts`.
  SPEC §12.1 / §12.3.
- `environment/theme.ts` — theme context (SPEC §12.10): the page / `theme-source` /
  `'closest'` dark-light signal, detected once per watched element and shared by every
  KeenMate component on the page; `setThemeMode()` forces it.
- `environment/environment.ts` — viewport / device: one ref-counted `matchMedia` + `resize`
  observable (`observeEnvironment` = discrete flips, `observeViewport` = continuous size),
  `classifyDevice()` (capability, not width), page-wide breakpoints (`configureBreakpoints`,
  `--base-breakpoint-*`, shared on `globalThis` + the `km-breakpoints-change` event).
- `environment/element-size.ts` — one element's border-box through a shared `ResizeObserver`
  (`observeElementSize`) — the container signal behind `bind:containerSize` / the render context.
- `environment/motion.ts` — motion level (SPEC §12.16): `[data-motion]` presets on the
  `--base-duration-*` tokens, page-wide `window.components.motion`. Tree.svelte's `motion` prop.
- `global/` (`shared-state`, `page-setting`), `dom/` (`composed-tree`, `once`, `throttle`,
  `frame-scheduler`, `adopt-styles`) — the helpers the above import.

Kept byte-for-byte so a later switch to a shared package is a move, not a rewrite. The
page-wide state sits on `globalThis[Symbol.for('@keenmate/web-components-core…')]`, so this
copy SHARES the logging switch, theme detection, breakpoints and motion level with every web-*
component on the same page (that's the point — one `window.components.logging.enableLogging()`,
one `setThemeMode()`, one `configureBreakpoints()`).

Tests: core's `*.test.ts` for these modules, with a `// @vitest-environment jsdom` docblock
(this repo's default is `node`). `theme.test.ts` drops core's trailing `BlissElement` block and
`motion.test.ts` isn't copied (both need BlissElement) — the Svelte wiring is covered by e2e
(`theme-context`, `motion-level`, `responsive` specs).

svelte-treeview's own surface on top: `src/lib/logger.ts` (`STV:*` bundle), `src/lib/perf-logger.ts`,
`src/lib/global-api.ts` (`window.components['svelte-treeview']`), `src/lib/core/responsive.svelte.ts`
(Svelte reactivity over environment / element-size). Don't hand-edit these files to fit this
repo: fix upstream in web-components-core and re-copy.
