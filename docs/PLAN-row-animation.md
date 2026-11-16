# Plan — row animation on expand / collapse (svelte-treeview + web-treeview)

Status: Step 0 (core helper) DONE in web-components-core (released in core rc24). **Phases 1 (enter) and
2 (exit) DONE in both trees (2026-11-16)** — see "Phase 1 — as built" / "Phase 2 — as
built". **On by default, no on/off property** (core motion decision 2026-11-15, below). Phase 3 (demos)
DONE (basic-page section in both, svelte IG02); open: a web-treeview integration page. The same file lives in both repos
(`svelte-treeview/docs/PLAN-row-animation.md`, `web-treeview/docs/PLAN-row-animation.md`) — edit one,
copy to the other. Parity rule applies: same API, same tokens, same visuals, mirrored in both.

## Why, and the ground rules

Before this, a node's children appeared / disappeared instantly in both trees; only the chevron,
checkbox, tooltip and drag visuals animated (all on `--*-transition-*`).

**Motion decision (core, 2026-11-15 — SPEC §12.16, rulebook C-NC-15; supersedes the opt-in design):**
`motion` (element / `data-motion` section / `window.components.motion`) is the ONE "animate or not"
switch. Every decorative animation — expand / collapse included — animates by default and is instant at
`motion="none"` or OS reduced motion. No per-feature `is…AnimationEnabled` properties. One animation is
turned off by its own duration token (`--<p>-row-animation-duration: 0s`), whose default must point at a
speed token. An app that wants no animation sets `window.components.motion = 'none'`.

Hard rules — no new paths:

1. **The suite's motion contract** (base-css-variables `docs/design-decisions.md` §12,
   `docs/variables.md` → Motion): only the four `--base-duration-*` speeds and the `--base-ease-*`
   easings, reached through the component's own variables (`--stv-transition-*` / `--wtv-transition-*`,
   which already chain to base). No one-off durations. "Snappy over animated."
2. **Motion levels + reduced motion for free**: `data-motion` / `motion` / `window.components.motion`
   and `prefers-reduced-motion` must work with zero extra code — they zero the speed tokens, so the
   animation must be timed by them and must treat a 0s duration as "no animation" (no waiting).
3. **The suite's existing enter / exit technique** — core's menu sheet (`web-components-core`
   `src/menu/styles.ts` + `open-menu.ts` `removeSheetAnimated`, commit 03ca5d7, SPEC §12.16):
   - **enter** = a CSS `animation` with `@keyframes <prefix>-…-in { from { … } }`, duration token,
     `--base-ease-out`; it plays because the element is new in the DOM;
   - **exit** = a `<block>--closing` modifier class + `inert` + `pointer-events: none`, a `forwards`
     keyframe with `--base-ease-in`; JS reads the computed duration (now core `readAnimationMs(el)`: 0 → act at once),
     waits for `animationend` (target-checked) with a `setTimeout(ms + 50)` fallback (hidden tab /
     display change), then does the real removal.
   Rows follow exactly that. web-multiselect's dropdown / our tooltip use CSS `transition` on a state
   modifier — that's the technique for elements that STAY in the DOM; rows come and go, so it's the
   sheet technique.
4. **One shared JS helper, not copies — core's `animateOut()`.** Core's rulebook check **C-CA-18**
   (core-adoption) BANS a component's own `animationend` / `transitionend` waits: the trees must call
   `animateOut()` / `readAnimationMs()` from core (web-treeview imports them; svelte-treeview vendors
   `src/dom/animate-out.ts` into `src/lib/vendor/core/dom/` + its test, and lists it in
   `scripts/core-sync.json`).

## Step 0 — done (web-components-core d88d8f9, prod, not pushed yet; tarball
`../_core-tarballs/keenmate-web-components-core-1.0.0-rc24-pre.4.tgz`)

`src/dom/animate-out.ts`, exported from core's main index (docs: core `usage.md` → "Animating something
out (animateOut)", SPEC §12.16, `src/dom/CLAUDE.md`):

| call | does |
|---|---|
| `animateOut(elements, { className, onDone, shouldSetInert, shouldSetHeightVar }) → { cancel(), finished }` | adds the closing class, makes the elements unclickable (`inert`), waits for their closing animation, then calls `onDone` |
| `readAnimationMs(el)` | the element's animation time read back from CSS (longest of several, delay counted); 0 when none |

- Duration 0 (`motion="none"`, `data-motion="none"`, OS reduced motion) → `onDone` runs at once, no wait.
- No `animationend` (hidden tab) → gives up after duration + 50 ms.
- `cancel()` → removes the class + inert, `onDone` never runs (re-expand mid-collapse).
- `finished` → resolves `true` after `onDone`, `false` when cancelled — so a collapse called from code
  can `await` the animation (answers open question 3: yes, programmatic collapses animate and
  `await collapseNodes()` resolves after it).
- `shouldSetHeightVar` → writes each element's height to **`--km-exit-height`** (inline px,
  `EXIT_HEIGHT_VAR`) before the class goes on, so a row can shrink in place and the rows below slide up.
- The menu sheet's private copy is gone — it closes through `animateOut` too.
- Default row speed: `--<p>-transition-normal` (answers open question 2).

## API (identical in both)

| svelte prop | web property / attribute | values | default |
|---|---|---|---|
| `rowAnimationLimit` | `rowAnimationLimit` / `row-animation-limit` | number — rows animated per expand / collapse; the rest switch instantly; `0` = none (a perf cap, not an on/off switch) | `50` |

- No style values: no other suite component has a "which animation" setting — the look lives in CSS
  (command palette: `cp-fade-in` / `cp-slide-down`; core sheet: `km-menu-in-bottom`). Rows fade in while
  sliding down `--<p>-row-animation-distance`; set it to `0` for a plain fade.
- No on/off input (see the motion decision). Off (`motion="none"`, reduced motion, the token at `0s`, or
  a limit of 0) = the trees read the resolved `--<p>-row-animation-duration` before an expand and skip
  the reveal entirely, so it costs nothing.

Tokens (same names, `--stv-` / `--wtv-`; added to the shared token list in parity.md §tokens) — the
duration falls back to `--<p>-transition-normal`, as core's usage.md recommends for rows:

| token | default | note |
|---|---|---|
| `--<p>-row-animation-duration` | `var(--<p>-transition-normal)` | one duration for in + out, like core's `--km-sheet-duration` |
| `--<p>-row-animation-distance` | `calc(-0.6 * var(--<p>-rem))` | the slide offset; `0` = plain fade |

Easing is not a token (core's sheet doesn't expose one either): in = `--<p>-ease-out`, out = `--<p>-ease-in`.
`npm run check:contract` (svelte) / the web contract check must stay green — both tokens chain to
existing component tokens, no new `--base-*` fallbacks.

## Behaviour

**Animates** (when the resolved `--<p>-row-animation-duration` > 0 and the limit > 0):
- rows REVEALED by an expand — click / keyboard / `expandNodes` / `toggleNodeExpanded` / `expandAll` /
  exclusive (accordion) expand / a lazy-load's children arriving under the node that was expanded;
- rows HIDDEN by a collapse — click / keyboard / `collapseNodes` / `collapseAll` / the siblings an
  exclusive expand closes (phase 2).

**Never animates:** first render, data (re)loads (`nodes` change, `insertArray`, applyChanges),
search filter apply / clear, virtual-scroll window moves, progressive-render batches that aren't an
expand's reveal, a row re-created for a state change (svelte `_rev` re-key; web node-object swap),
drag-drop moves, paste / delete.

**Cap:** at most `rowAnimationLimit` rows animate per expand/collapse (the first N in visible order —
the top of what the user is looking at); the rest switch instantly. Keeps "expand all" on 50k nodes
free.

**Collapse timing (phase 2):** the rows animate out first, then the node really collapses
(`isExpanded` flips, `onExpandedChange` fires, `await collapseNodes()` resolves) — the core sheet does
the same (closing animation, then removal). Re-expanding during the animation cancels it. While
closing, the rows are `inert` and pointer-events-less.

## Mechanism

### Enter (phase 1)

The controller / engine records a **reveal**: `{ paths: Set<string>, generation }` — the visible
descendants an expand made visible (walk the new visible list from the expanded node while
`level > node.level`, capped). The renderer gives rows whose path is in the reveal a modifier class
`<p>__node--opening`; CSS:

```css
/* gated: the renderer only adds the modifier to rows in the current reveal */
.<p>__node--opening {
  animation: <p>-row-in var(--<p>-row-animation-duration) var(--<p>-ease-out);
}
@keyframes <p>-row-in {
  from { opacity: 0; transform: translateY(var(--<p>-row-animation-distance)); }
}
```

The reveal is cleared after `readAnimationMs(row)` + 50 ms (and replaced by the next expand), so a row that
re-mounts later (re-key, scroll back into view) does NOT replay. Duration 0 → no reveal recorded.
`transform` is on `.<p>__node` (the row); drag visuals transform `.…__node-content`, no clash.

### Exit (phase 2)

Collapse = the controller / engine picks the soon-hidden rows (same cap) and calls core's
`animateOut(rows, { className: '<p>__node--closing', shouldSetInert: true, shouldSetHeightVar: true,
onDone: () => <real collapse> })`; it keeps the handle per collapsed node — a re-expand calls
`handle.cancel()`; a programmatic `collapseNodes()` awaits `handle.finished`. Duration 0 → `onDone`
runs at once (no special case in the trees). CSS:

```css
.<p>__node--closing {
  pointer-events: none;
  overflow: hidden;
  animation: <p>-row-out var(--<p>-row-animation-duration) var(--<p>-ease-in) forwards;
}
@keyframes <p>-row-out {
  from { height: var(--km-exit-height); }  /* written inline by animateOut({ shouldSetHeightVar }) */
  to { height: 0; opacity: 0; transform: translateY(var(--<p>-row-animation-distance)); }
}
```

The rows stay REAL rows in the list until the collapse applies — nothing lingers outside the
renderer's bookkeeping (web's index-based `_reconcileNodes` ordering and path lookups stay correct),
and because the closing rows shrink in normal flow, the rows below slide up with them (no FLIP).
`--km-exit-height` is the only JS-written value (core measures each row — rows can wrap).

## Phase 1 — as built (2026-11-15)

Both trees, same shape:

- **No on/off input.** `_isRowAnimationOn()` reads the container's resolved
  `--<p>-row-animation-duration` (and the limit) before each expand; 0 → plain expand, no before-set.
- **Reveal = a before/after diff of the visible list**, not a walk under the expanded node:
  `_withReveal(apply)` wraps `_expandWithEvents` (→ `expandNodes`, keyboard, lazy-load apply),
  `_toggleExpandApply` (toggle + accordion) and `expandAll`; nested calls record once. It takes the
  visible paths before, runs the expand, keeps the first `rowAnimationLimit` new paths in visible
  order.
- svelte: `controller.revealedPaths` (`$state.raw`, reassigned) → `NodeConfig.revealedPaths` →
  `Node.svelte` `isOpening` → `class:stv__node--opening`. web: snapshot field `revealedPaths`
  (a `ReadonlySet`, not the `rowMotion` object sketched below); the renderer adds
  `wtv__node--opening` only in `_createNodeElement` and only removes it from reused rows.
- Clearing: after the render (svelte `tick()`, web `setTimeout(0)` past the state-change microtask)
  the first `--opening` row's `readAnimationMs()` + 50 ms → reveal emptied (generation-guarded).
  0 under motion off / reduced motion → cleared at once.
- CSS: `.…__node--opening { animation: …-row-in var(--…-row-animation-duration) var(--…-ease-out) }`,
  keyframes in svelte `animations.css` / web `tree.css`; tokens in `variables.css` + both
  `component-variables.manifest.json`; parity.md §1 + §10 (197 shared names).
- svelte vendors core `src/dom/animate-out.ts` + test (core-sync `helpers` / `vendored tests`, baseline
  bcb4db5 — includes the `className: (el) => string` form). web imports `readAnimationMs` from core
  `^1.0.0-rc24` (published).
- Tests: `e2e/row-animation.spec.ts` (8 each, mirrored) on `/test/row-animation` /
  `test/row-animation.html`: first render, off, capped reveal + cleared, focus click no replay,
  expandAll, reload, `motion="none"`, reduced motion; the "off" scenario is the token at `0s`.
- svelte `/examples/integration` IG02: the tree's rows follow the Page / Section / Tree selects
  (smooth 0.25s, snappy 0.08s, none instant); its text says what the tree animates.

## Phase 2 — as built (2026-11-16)

Both trees, same shape (svelte `TreeController`, web `TreeEngine`):

- `collapseNodes()` and `collapseAll()` go through `_animateCollapse(targets, apply)` and **return a
  Promise** that settles once the collapse applied. Targets = the expanded nodes that close
  (`collapseAll(null)` = every expanded root). Nothing to animate (duration 0s, limit 0, no rendered row)
  → `apply()` at once, as before.
- Hidden rows = visible rows with a target ancestor (path prefix walk), first `rowAnimationLimit`;
  core `animateOut(rows, { className: '<p>__node--closing', shouldSetInert: true, shouldSetHeightVar:
  true, onDone: apply })`. `apply` = the real collapse + `onNodeCollapse` / `node-collapse` +
  `onExpandedChange` / `expanded-change`. Toggle → `collapseNodes`, so clicks / keyboard / menu animate too.
- Pending collapses: `path → { handle, apply, targets }`. A second collapse of a closing node awaits
  the same handle. **Before any expand** (`expandNodes`, toggle, `expandAll`) `_settleClosing(paths)`:
  a pending collapse of exactly that ONE node is cancelled (re-expand — it stays open, no events); any
  other related one (same / ancestor / descendant; `expandAll(null)` = all) is cancelled AND applied now,
  so `collapseAll(); expandNodes(x)` ends exactly as without motion. Unrelated collapses keep animating.
  A toggle that cancels logs `Node re-expanded mid-collapse` (UI category).
- svelte: `closingPaths` (`$state.raw`) → `NodeConfig` → `Node.svelte` `class:stv__node--closing` +
  `inert`, so a `_rev` re-key mid-animation keeps the state; `onDone` applies first, then clears it (one
  flush — no snap-back). web: rows are reused, the class core adds survives re-renders.
- CSS `.…__node--closing { pointer-events: none; overflow: hidden; min-height: 0; animation:
  …-row-out var(--…-row-animation-duration) var(--…-ease-in) forwards }`, keyframes `from { height:
  var(--km-exit-height) } to { height: 0; opacity: 0; transform: translateY(distance) }`.
- Menu built-ins `collapse` / `collapse-subtree` / `collapse-all` await the collapse, so the action
  event fires after it (web `runBuiltInAction` became async; core's runner awaits it).
- **Behaviour change for code:** a collapse is no longer applied synchronously when rows animate —
  read `expandedPaths` / visible rows after `await collapseNodes()` / `await collapseAll()`. Existing
  e2e specs that read right after a collapse now poll / await (svelte + web `expand-collapse`, web
  `events` (the sync test runs with the token at 0s), `interaction-model`, `lazy-load`).
- Not animated: the siblings an accordion expand closes and the others an exclusive expand closes
  (they change inside the expand itself) — they switch instantly.
- Tests: 6 more per spec (closing + inert + event after, re-expand cancels, `await collapseNodes()`
  ≥ the duration with rows gone, `collapseAll` capped, instant at `motion="none"` / token 0s, call
  order `collapseAll(); expandNodes(x)`).

## Per library

### svelte-treeview

- **Where rows mount:** `Tree.svelte` flat / virtual `{#each controller.flatNodesToRender as node
  (node.id|path|hasChildren|_rev)}` — `_rev` bumps (focus, select, check…) destroy + recreate a row,
  so "animate on mount" alone would replay on every click: the reveal set is what gates it.
- **Controller:** `revealedPaths = $state.raw(new Set())` + `closingPaths`, reassigned wholesale
  (same pattern as `draggedPaths`); set in `expandNodes` / `toggleNodeExpanded` / `expandAll` (and the
  click / keyboard paths that call them) after `tree.expandNodes`; flows to rows through `NodeConfig`
  like `draggedPaths`; `Node.svelte` derives its own `isOpening` / `isClosing`.
- **Virtual scroll:** window moves only re-slice `allFlatNodes` → no reveal → no animation. Closing rows
  shrink inside the translated window; the spacer catches up when the collapse applies.
- **Progressive render:** an expand's reveal can arrive over several batches — rows still in the
  reveal set when their batch lands animate (within the cap), later ones don't (reveal cleared).
- **Filter:** `filterNodes` doesn't go through expand → no reveal. Expand inside a filtered tree works
  (paths are the same on the filter copies).
- **No Svelte `in:` / `out:` transitions** — they'd fire on every `_rev` re-key and keep outroing rows
  in the `{#each}`; the class + keyframes + `animateOut` route is the suite's and works in both renderers.
- **Closing state across re-keys:** `animateOut` adds the class to the DOM element; a `_rev` re-key mid-
  collapse would drop it — so `Node.svelte` also renders `--closing` from `closingPaths` (the handle
  still owns timing / cancel). Check this in the spike.
- **Vendoring:** copy core `src/dom/animate-out.ts` (+ test, jsdom docblock) into
  `src/lib/vendor/core/dom/`, add it to the `helpers` group of `scripts/core-sync.json`.

### web-treeview

- **Where rows mount:** `DomRenderer._reconcileNodes` (dom-renderer.ts ~1254-1346), keyed by path,
  reuses rows; create branch ~1324, remove loop ~1338; same path + new node object (filter, reload) →
  row recreated (~1280).
- **Engine:** add a snapshot field `rowMotion: { generation, opening: string[], closing: string[] } | null`
  set in `_expandWithEvents`, `_toggleExpandApply`, `expandAll` / `collapseAll`, `collapseNodes`
  (tree-engine.ts ~1111-1291); `getSnapshot()` (~4466) carries it. Today the snapshot has no delta or
  cause — this is the one new field.
- **Core:** bump to core rc24 (tarball `_core-tarballs/keenmate-web-components-core-1.0.0-rc24-pre.4.tgz`
  until it's published) and import `animateOut` / `readAnimationMs`.
- **Renderer:** apply `--opening` / `--closing` only from `_onStateChange` (not from
  `_performScrollUpdate`, the scroll-window path ~1000-1038) and only for paths in the field; stamp
  rows with the generation (`data-motion-gen`) so a reused row doesn't replay.
- **Progressive render** (engine `_updateProgressiveRendering`, initial batch 20): same rule as svelte —
  rows of the reveal that land while it's current animate.
- **Filter / data reload:** recreate rows through the node-object-mismatch branch with no `rowMotion` →
  no animation.

## Tests

- New fixtures `/test/row-animation` (svelte) + `test/row-animation.html` (web), mirrored specs
  `e2e/row-animation.spec.ts`:
  - `--…-row-animation-duration: 0s` / `motion="none"` / reduced motion: no `--opening` / `--closing` ever, rows switch instantly;
  - expand → exactly the revealed rows get `--opening`, capped at `rowAnimationLimit`; gone after the duration;
  - NOT on: first render, focus / select click (svelte re-key), filter, data reload, virtual-scroll
    scroll, progressive batches outside a reveal;
  - collapse → rows `--closing` + `inert`, `onExpandedChange` only after the animation, re-expand cancels;
  - `motion="none"` / `prefers-reduced-motion` / `data-motion="none"` → instant, no class, no wait;
  - virtual scroll on: expand / collapse still land on the right rows, no blank window.
- Existing suites: rows animate by default now — both full suites stayed green (svelte 417, web 639
  chromium) with phase 1 on.
- Unit: `animateOut` / `readAnimationMs` are core's (10 tests there); svelte vendors the test with the file.

## Phases

0. **Core helper — DONE** (d88d8f9): `animateOut()` + `readAnimationMs()`; menu sheet adopted; rulebook
   C-CA-18. Remaining: core pushes / publishes rc24; web-treeview adopts the tarball / release, svelte
   vendors the file.
1. **Enter**, both libs: API + tokens + reveal + CSS + fixtures/specs + parity.md rows + docs
   (usage / theming / CHANGELOG / CLAUDE.md).
2. **Exit** — DONE (2026-11-16), see "Phase 2 — as built".
3. **Demos — DONE (2026-11-16)** except the web integration page: svelte `/examples/basic` BU08, web
   `examples-basic.html` BU07 (· Row Animation: duration normal / slow / 0s, plain fade, limit, `motion`,
   `await collapseAll()`). Planned as: an "RA · Row animation" section (basic or interaction page, both showcases) showing the
   duration token at `0s`, the distance at `0` (plain fade) and the limit; IG02 — DONE in svelte
   (2026-11-16: rows follow the motion selects, text says what the tree animates); web-treeview has no
   integration page yet.

## Decisions (2026-11-15)

1. Names: no on/off input (`motion` is the switch — the 2026-11-15 `isRowAnimationEnabled` was dropped
   2026-11-16) + `rowAnimationLimit`; modifiers `__node--opening` / `__node--closing`;
   keyframes `<p>-row-in` / `<p>-row-out` (core sheet: `--closing`, `km-menu-in-*` / `-out-*`).
2. Speed: `--<p>-transition-normal` (core usage.md).
3. Programmatic collapses animate; `await collapseNodes()` resolves after the animation.
4. Cap default 50.
5. Both phases — enter first, then exit. Both done 2026-11-16.
