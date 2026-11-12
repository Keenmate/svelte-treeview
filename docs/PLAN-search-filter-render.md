# Plan — search/filter/indexing + removal of recursive rendering (2026-11-12)

Working branch: `feature/core-render-split`. NOTHING COMMITTED yet, in either repo.

## Done (svelte-treeview, uncommitted)

- **Checkbox + filter**: cascade math uses REAL nodes (`_realNode`, `_syncFilteredCheckState`); runtime
  `checkboxMode` reaches rows (nodeConfig sync); filtered cascade click acts on VISIBLE matches only
  (all visible checked → uncheck, else check; branches re-derived deepest-first); `checkAll` keeps hidden
  checks. SF01 demo: checkboxes, Check mode + Cascade reports selectors, Checked list.
- **Indexer (B)**: time-boxed batches (16 ms idle / 8 ms forced), default `indexerBatchSize` 1000
  (was 25), read-cursor queue (no `shift()`), generation counter. 55k nodes: 125 s → 1.8 s.
  `onIndexProgress({ processed, total, isComplete })` + `controller.indexProgress`.
- **Search (C)**: `searchResultLimit` (default 1000, replaces FlexSearch's silent 100; limit+1 →
  `isLimited`); `onSearchStatusChange({ searchTerm, matchCount, isLimited, limit, isIndexing })` +
  `controller.searchStatus`; handlers run under `untrack()` (else effect loop). Fixed: tree STARTING with
  a searchTerm inserted its data into the filtered view (`insertTreeNode` now resolves against real
  `root`; `insertArray` clears stale filtered copies).
- **filterScope (EXPERIMENTAL)**: `matches | descendants | tree-depth | subtree-height | levels-below`
  + `filterDescendantDepth` + `shouldExpandFilterDescendants`. Demo SF04 (5 trees side by side).
- Tests: e2e `search-status`, `filter-scope`, checkbox additions; fixtures `/test/search-status`,
  `/test/filter-scope`, `/test/filter-scope-perf` (bench). Full suite 392 e2e + 140 unit green.
- Docs: CLAUDE.md, docs/parity.md (§1, §3, §9), docs/usage.md.

## Done (web-treeview, uncommitted)

- Checkbox/filter port (earlier) + search limit/status, index progress, faster indexer, filterScope,
  re-filter on index completion (its starting-searchTerm bug). 626 e2e green, tsc clean.

## Done — A) recursive rendering removed (svelte-treeview + canvas json-loader, uncommitted)

- Tree.svelte recursive `{#key}` branch, Node.svelte child rendering (`childrenArray`, `childrenToRender`,
  `renderBatchSize`, `flatMode`, `isProgressiveRenderEnabled` prop), `RenderCoordinator.svelte.ts` (deleted),
  `isFlatRenderingEnabled` (prop/controller/types), `NodeConfig.loadingLabel`, `.stv__children` +
  `--stv-children-margin-top` + `.stv__loading-more` CSS.
- onRender* + `isRendering` ported to flat progressive (`_beginRenderPass` / `_finishRenderPass`, mirrors
  web). `RenderStats` moved to `ltree/types.ts` (still exported). New e2e `render-events` + `/test/render-events`.
- Examples: RenderModeSwitch = Flat / Progressive / Virtual (default Flat); performance pages drop
  Recursive; perf example indexer default 1000. Canvas json-loader "Use Flat Rendering" toggle removed.
- Docs: CLAUDE.md, parity.md, usage.md, README, FLAT_MODE_PERFORMANCE.md, CHANGELOG (rc16 section).
- e2e/performance.spec: waits for hydration (first Generate click was lost → 25 s retry per test); 4 min → 22 s.

## AFTER svelte-treeview is finished — investigate / discuss (web-treeview "things to know")

- **Web indexes slower**: ~21 s for 55k at the new default (vs ~122 s at batch 25) — svelte does ~2 s.
  Agent's unconfirmed guess: its fixture renders 5,050 expanded rows progressively, competing for idle
  time. Measure properly.
- **No null reset**: `el.searchResultLimit = null` is rejected (core `toInt` has no nullable mode, same
  for all int inputs) — reset by removing the attribute / assigning 1000. Decide if core needs nullable ints.
- **Not run in web**: `kmwc doctor`, `check:pages`, regenerate `custom-elements.json` / `web-types.json`.
- **Vestigial `isFlatRenderingEnabled` in web** (engine/types/treeview/web-component/docs/tests) — parity.md
  marks it "pending removal"; remove to match svelte.
- **web docs (uncommitted, reviewed 2026-11-12)**: parity.md/usage.md fixed (stale recursive lines, duplicate
  indexerBatchSize row, wrong ~2 s indexing claim, event-table order). svelte parity.md is now synced FROM web's
  newer copy; web's copy still says `createMenuDivider` is "same" — svelte exports `menuDivider` (row added in
  svelte's copy as "to mirror"); copy that row back to web.
- **Mixed uncommitted work in web**: search/index port sits on top of the earlier (also uncommitted)
  checkbox-filter port — commit in sensible chunks.

## Other open items (both libs)

- Selection + focus state is still written onto filter COPIES (lost when the filter clears) — same
  root cause as the checkbox bug; cleaner fix = filtered view references real nodes instead of copies.
- Mutations other than insert (moveNode, addNode at a path, …) while filtered still resolve via the
  filtered view.
- `tree-depth` re-measures tree height each keystroke (~5 ms on 55k) — cache if it matters.
- Optional: minimum search-term length; a hard cap on nodes added by filterScope.
