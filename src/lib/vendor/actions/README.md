# vendor/actions

The shared clickable-item model (`ActionItem` / `MenuItem` / `createMenuDivider()`) and the
activation runner (`runAction`: `beforeActionCallback` → item `onClick` → built-in → `onAction`),
transferred from [`@keenmate/web-components-core`](../../../../web-components-core) — last re-synced
2026-11-14 at core 1.0.0-rc23 **dd29c43** (first copied at e472439). Tracked in
`scripts/core-sync.json`; `npm run check:core-sync` reports when core changes these files.

| file | source |
|---|---|
| `types.ts` | `src/actions/types.ts` |
| `resolve.ts` | `src/actions/resolve.ts` |
| `before-callback.ts` | `src/element/before-callback.ts` |
| `resolve.test.ts` | `src/actions/resolve.test.ts` (+ jsdom docblock; console spies → `uiLogger`) |
| `shortcut.ts` | `src/actions/shortcut.ts` (core f399f63, 2026-11-19; own core-sync group `shortcut`) — environment import → `../core/environment/environment.js` |

svelte-treeview does not depend on web-components-core, so the files are copied with the minimum
adaptation (each file's header names it):

- `coreLog(source, 'UI', …)` → the tree's `uiLogger` (`STV:UI`).
- `types.ts` declares `ComponentContext` locally as `{ controller }` (core's also has `element`;
  the Svelte tree has no host element).

Everything else is byte-for-byte. Don't hand-edit to fit this repo: fix upstream in
web-components-core and re-copy, so the copies don't diverge. The tree-specific glue (built-in
actions, labels, the `TreeMenuContext`) lives in `src/lib/core/menu.ts`.
