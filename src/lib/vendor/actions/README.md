# vendor/actions

The shared clickable-item model (`ActionItem` / `MenuItem` / `menuDivider()`) and the
activation runner (`runAction`: `beforeActionCallback` → item `onClick` → built-in → `onAction`),
transferred from [`@keenmate/web-components-core`](../../../../web-components-core) **v1.0.0-rc14**:

| file | source |
|---|---|
| `types.ts` | `src/actions/types.ts` |
| `resolve.ts` | `src/actions/resolve.ts` |
| `before-callback.ts` | `src/element/before-callback.ts` |

svelte-treeview does not depend on web-components-core, so the files are copied with the minimum
adaptation (each file's header names it):

- `coreLog(source, 'UI', …)` → the tree's `uiLogger` (`LTREE:UI`).
- `types.ts` declares `ComponentContext` locally as `{ controller }` (core's also has `element`;
  the Svelte tree has no host element).

Everything else is byte-for-byte. Don't hand-edit to fit this repo: fix upstream in
web-components-core and re-copy, so the copies don't diverge. The tree-specific glue (built-in
actions, labels, the `TreeMenuContext`) lives in `src/lib/core/menu.ts`.
