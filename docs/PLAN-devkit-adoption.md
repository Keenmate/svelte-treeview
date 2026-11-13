# Plan: adopt the web-components devkit in the svelte-treeview showcase

Status (2026-11-13): D1–D5 DONE (shell + every example page on the kit). Open: D6 page-check spec, D7 canvas, §5 upstream. Decisions: keep the
purple accent; local shims first, upstream later; landing = kit index markup rendered in Svelte.

## Handoff (2026-11-13, before compaction)
Last commit pushed: 2538b1d (core logger + theme). UNCOMMITTED on feature/core-render-split (user hasn't asked to commit):
- SF04 (/examples/search): new divisions 1.4 Marketing (5 deep), 1.5 Operations (4), 1.6 HR (3) + description/comment;
  Clear button; Legend (`h3.subsection` + `table.reference-table`, per-mode rows, live tree-depth threshold).
- devkit rc14 adopted (2026-11-13): first-column nowrap now upstream (local `.scope-legend` rule dropped); layout calls
  `attachStackedTables` (phone card stacking) + `attachDemoCopyButtons`; build-time Shiki highlighting of all 52
  `.code-block[data-language]` blocks via the shim's pre-transform (see "Done — rc14" below).
- Double-scrollbar fix: `(showcase)/examples-local.css` `.tree-container:has(.stv__virtual-scroll) { max-height:none;
  overflow:visible }`; `.tree-container-vs` REMOVED (user: one solution only); SF04 `.scope-tree:has(.stv__virtual-scroll)
  { height:auto }`. Web follow-up noted in docs/PLAN-search-filter-render.md.
- Library quirk found (not changed): virtual-scroll height auto-detect reads `.stv__container`, which is sized by the
  400px fallback scroller → always 400px (TreeController ~line 1697).
- tree-depth explained to user: x = how far above the tree's max depth a match may sit; on the ragged SF04 chart
  "Team" (level 3–5) qualifies for any x ≥ 1, so it looks like `descendants`.

## Done — rc14 (2026-11-13)
- `^1.0.0-rc14`. Code highlighting: `scripts/kmwc-sveltekit.ts` `kmwc-sveltekit:code-highlight` (enforce `pre`, before
  vite-plugin-svelte) rewrites every `<pre>{`…`}</pre>` inside `<div class="code-block" data-language="ts|svelte|css|…">`
  into Shiki HTML (the devkit's own `loadCodeHighlighter`, kit theme → `--kmwc-code-*` vars). Live `${expr}` holes go
  through Shiki as sentinel identifiers and come back as Svelte `{expr}`, so reactive blocks stay reactive AND coloured;
  `${"<"}` constants are inlined. A block may hold several `<pre>`s (`{#if}` tabs). Unknown language / non-literal
  `<pre>` = build error. Rule for new blocks: `<div class="code-block" data-language="…"><pre>{`…`}</pre></div>`.
- `attachDemoCopyButtons()` (Copy on every tagged block) + `attachStackedTables()` (`.reference-table` → cards < 768px,
  `data-label` from `<thead>`) in `(showcase)/+layout.svelte` afterNavigate, in kit.js order. Tables added later
  (inside `{#if}`) would miss labels — none today.

## Done — D1–D4 (shell)
- `@keenmate/web-components-devkit@^1.0.0-rc13` devDep; `package.json#kmwc` (title, tagline, prefix `stv`, purple accent).
- `src/routes/(showcase)/` route group holds `/` + `/examples/*` (URLs unchanged). `/test` + `/dev` got their own
  `+layout.svelte` with Bootstrap + legacy `static/examples-shared.css` (moved out of app.html / root layout) — e2e fixtures untouched.
- `app.html`: `@layer kmwc, reset, variables, component, overrides;`. Verified: tree checkboxes keep the library look.
- `scripts/kmwc-sveltekit.ts` (Vite plugin): `__KMWC_PAGE_CONFIG__` from the devkit's `getKmwcConfig()`, `virtual:kmwc-chapters`
  from the registry's route sources (82 chapters), devkit excluded from optimizeDeps. Needs `@types/node` (added).
- `(showcase)/+layout.svelte`: kit CSS + `examples-local.css`, head (theme bootstrap from the kit's exported constants,
  `window.__KMWC__`, accent), `afterNavigate` → kit `attachCopyLinks`/`mountChapterNav`/`attachChapterLinks`/`mountSpotlight`/
  `renderVersionBadges`/`mountThemeSwitch`; on leaving the showcase removes `html[data-theme]`.
- `(showcase)/examples/+layout.svelte`: `.container` + kit page footer (`renderFooterLineHtml`). Pages KEEP their inline
  `<header>` (already the kit's markup; the earlier ExampleHeader component was deliberately removed) — so D3's
  "remove the 14 headers" is dropped. Each page's own `<div class="container">` is now nested (harmless; drop in D5).
- Landing = kit `kmwc-index__*` markup in Svelte from `(showcase)/examples-registry.ts`. `ChapterNav.svelte` deleted.
- `(showcase)/examples-local.css`: web-treeview's `.tree-container*` / `.search-*` + svelte-only leftovers on tokens.
- Verified: svelte-check 0/0; Playwright 395/395; `vite build` OK (head injection in prerendered HTML);
  all 15 pages light+dark, no console errors; spotlight search + `#sf04` deep links work.
- Found during the sweep (→ D5): horizontal overflow at 390/320px on custom-layout (Explorer columns), search (a select),
  tree-editor (tree-section). Pre-existing build warning: adapter-static `fallback: 'index.html'` overwrites the prerendered landing.

Goal: the showcase (`/` + `/examples/*`) looks and behaves like every other web-* examples site — same tokens,
header, footer, chapter nav, spotlight, theme switch, class vocabulary — by **using** `@keenmate/web-components-devkit`
(`../web-components`), not by re-implementing it. Rewrite in Svelte only what can't run in SvelteKit, keeping the kit's
markup + class names so the kit CSS styles it.

## 1. What the devkit is (relevant parts)

| Piece | Form | Usable in SvelteKit? |
|---|---|---|
| `examples/style.css` — tokens (`--kmwc-*` on `--base-*`, `light-dark()`), base/header/footer, native form controls (`:where()`), tables, widgets, chapter nav, spotlight, theme switch, index page | plain CSS in `@layer kmwc` | **Yes, as-is** |
| `mountChapterNav`, `attachCopyLinks`, `attachChapterLinks` (#bu03 deep links), `mountSpotlight`, `mountThemeSwitch`, `applyTheme`, `renderVersionBadges`, `attachControlsPersistence`, `appendLogLine`, `renderFooterLineHtml` | framework-free DOM functions, idempotent / remountable (`mountExamplesKit()` is documented as "call again after rendering") | **Yes**, call from `afterNavigate` |
| Page composer: fragment pages, `kmwc:*` meta, generated `<header>`, `<kmwc-include>`, `<kmwc-demo>` | Vite `transformIndexHtml` on **root `*.html`** | **No** — SvelteKit routes never pass through it |
| Head injection: no-flash theme script, `window.__KMWC__` page config, accent `<style>`, Plausible | same hook | **No** — re-provide by hand (small) |
| `virtual:kmwc-chapters` (spotlight's site-wide h2 index) | built by the plugin from root `*.html` | **No** — needs our own tiny Vite plugin |
| `mountPageFooter` | appends to `body > .container` | **No** (SvelteKit body child is the app div) — render the footer in Svelte with `renderFooterLineHtml` / kit classes |
| CLI `doctor`, `check-pages`, `sync`, rulebook `example-pages.checks.sh` | assume `defineComponentConfig` + root `*.html` + `dist-examples` | **No** (doctor errors on vite config; page checks pass vacuously) |

Versions: npm latest `1.0.0-rc09`, local repo `rc13`, web-treeview/multiselect pin `^1.0.0-rc12`.

## 2. Where svelte-treeview is today

- `static/examples-shared.css` (1,120 lines) — a fork of the same web-grid ancestor the kit grew from: same vocabulary
  (`.container .card .controls .note .output .code-block .grid .log-panel .reference-table .muted .badge.new`) but
  **no tokens** (116 hardcoded hex colours), **no dark mode**, unlayered.
- `ChapterNav.svelte` — Svelte port of the *old* web-multiselect chapter nav (`.chapter-nav*` classes; kit now uses `kmwc-chapter-nav*`).
- No global header/footer/theme switch/spotlight; every page hand-writes `<header>` + back-link; landing page has its
  own registry, header card and footer.
- ~2,665 lines of per-page `<style>` across 14 example pages (custom-layout 1,122, theming 613, tree-editor 231,
  search 200, data 149, performance 136, theme-comparison 120, …) and 61 inline `style=`.
- Root `+layout.svelte` loads the shared CSS for **every** route, including `/test/*` e2e fixtures and `/dev/*`.

Classes in examples-shared.css with **no kit equivalent**: `.tree-container(-tall)`, `.search-*`, `.trees-side-by-side`
(→ tree-local, web-treeview already has the same in its `examples-local.css`), `.tabs/.tab`, `.metric(s)/.perf-card`,
`.log-entries/.log-entry/.empty-log` (kit has `.log-line*`), `.unsaved-badge`, `.status`, `.hint`, `.controls-label`,
`.threshold-control`, landing-page (`.cards/.card-link/.header-card/.version-badge` → kit `kmwc-index__*`), `.chapter-nav*`
(→ kit). Everything else maps 1:1.

## 3. Approach

**Use:** kit CSS (all of it), kit runtime helpers, kit markup/class contracts, section-code convention (already in place).
**Re-provide in Svelte (thin):** the page shell (header/back-link/footer), head bootstrap, chapter index for spotlight.
**Don't use:** page composer, `kmwc-demo`/`kmwc-include` macros, `defineComponentConfig`, `kmwc sync` (Docker/Makefile),
doctor/check-pages — until the devkit learns about SvelteKit (§5).

## 4. Steps

### D1 — install + layering + route scoping
- `npm i -D @keenmate/web-components-devkit` (version: see open question 1).
- **Layer order is critical**: kit native-control rules sit in `@layer kmwc`; the library's in `variables, component,
  overrides`. Whichever layer is *declared later* wins, regardless of specificity — kit loaded after the library would
  restyle the tree's checkbox `<input class="stv__checkbox">`. Declare once, first: `@layer kmwc, variables, component, overrides;`
  (in `app.html` `<style>` or the first imported CSS). Verify on /examples/interaction checkboxes in both themes.
- Move showcase routes into a route group `src/routes/(showcase)/` (`/` + `/examples/*`; URLs unchanged) whose layout
  imports the kit CSS + local CSS. `/test/*` and `/dev/*` keep a bare layout — e2e fixtures must not inherit kit styling of
  native inputs (geometry assertions). `/dev/logging` is linked from the landing page → either move it under examples or
  give it the showcase layout too.

### D2 — head bootstrap + page config
- `app.html`: inline the kit's theme bootstrap (output of `renderThemeBootstrapScript()` — same localStorage key
  `kmwc:examples:theme`, so the choice is shared with the other web-* sites on the same origin) and
  `window.__KMWC__ = { id:'svelte-treeview', title, version, packageName, repository, homepage, devkitVersion, storagePrefix, canonicalOrigin, isSpotlightEnabled }`
  — generate from `package.json` in `scripts/generate-constants` (already produces `constants.generated.ts`) or a
  `transformPageChunk` in `hooks.server.ts` (prerender-safe).
- Accent: `:root { --kmwc-accent-color; --kmwc-accent-end-color }` with the treeview accent (current purple
  `#667eea → #764ba2`, or adopt web-treeview's green `#059669 → #065f46` for family consistency — open question 2).

### D3 — Svelte shell (keeps kit markup/classes)
- `ExamplesPage.svelte` (or the showcase `+layout.svelte` reading `page.data`): `<div class="container"><header><a class="back-link">← Back to Examples</a><h1/><p class="subtitle"/></header>{children}<footer class="kmwc-page-footer">…</footer></div>`
  — exactly the composer's output. Title/subtitle from one **registry** (`src/routes/(showcase)/examples.ts`:
  `{ href, icon, title, subtitle, description, badge, code }`), which also feeds the landing cards, chapter-nav cross-page
  items and the spotlight index. Remove the 14 hand-written `<header>`s.
- Landing page: either call kit `renderExamplesIndex()` into a container in `onMount` (zero markup ownership, but
  client-only/no prerendered HTML) or render the same `kmwc-index__*` markup in Svelte (prerendered; recommended).
- Runtime kit in the showcase layout: `afterNavigate(() => { attachCopyLinks(); mountChapterNav({ indexHref:'/' }); attachChapterLinks(); mountSpotlight(); mountThemeSwitch(); renderVersionBadges(); })`
  and unmount on destroy. Kit DOM additions (copy-link buttons inside `h2`, section ids) live inside Svelte-owned elements;
  fine as long as `h2` text is static (it is). Delete `ChapterNav.svelte` + `.chapter-nav*` CSS.
  Fallback if the kit's DOM mutation fights Svelte hydration/re-render: port chapter nav to Svelte keeping `kmwc-chapter-nav*`
  markup (the user-sanctioned "rewrite JS, keep visuals" path).

### D4 — spotlight chapter index
- Small Vite plugin in `vite.config.ts` that resolves `virtual:kmwc-chapters` by regex-scanning
  `src/routes/(showcase)/examples/*/+page.svelte` for `<h2>` (strip `{…}` expressions), emitting the same entry shape as
  devkit `chapter-index.js` (`{ pageHref, pageTitle, chapters:[{code,title,label,anchor}] }`). Reuse the devkit's
  `getHeadingText`/`generateSlug`/`getChapterCode` where exported.
- Risk: spotlight's `getCurrentPageHref()` / link building assume flat `examples-x.html` hrefs (`location.pathname.split('/').pop()`).
  Verify with `/examples/basic`-style hrefs; if broken → small devkit fix (accept absolute hrefs).

### D5 — CSS migration (the bulk)
1. Delete `static/examples-shared.css`. Create `src/routes/(showcase)/examples-local.css` (unlayered, tokens only) =
   web-treeview's `examples-local.css` (`.tree-container*`, `.search-*`) + svelte-only leftovers (`.trees-side-by-side`,
   `.metrics`, `.tabs`, `.unsaved-badge`, …) rewritten on `--kmwc-*` tokens. Anything a 2nd component also needs → propose
   to the devkit instead ("if a second component needs a pattern, it belongs in the devkit").
2. Rename shared classes to kit names where they differ (`.btn`/`.btn-secondary` → native button + `.secondary`/`.btn-outline`,
   `.log-entry` → `.log-line*` / `appendLogLine`, `.hint` → `.muted`/`.form-text`, `.css-readout-name/-value` → kit's).
3. Per-page `<style>` triage, page by page (smallest first): replace with kit classes / tokens; inline `style=` → `.w-*`,
   `.mt-1`, `.push-end`. **Keep** genuinely demo-specific visuals (custom-layout's iOS/dendrogram/Explorer skins, theming's
   brand themes, theme-comparison themes) but move hardcoded colours to tokens or mark `/* kmwc-fixed-colors: why */`.
4. `RenderModeSwitch.svelte`: drop its 33 lines of gradient CSS, use the kit's segmented/button styling.
5. Dark mode: the kit switch sets `html[data-theme]`; the library already honours `[data-theme]` ancestors, so trees flip
   with the page for free. **Conflict:** /examples/theming radios write `color-scheme` on `<html>` and simulate
   `[data-theme]` ancestor signals — scope those demos to a wrapper element so they don't fight the global switch.
6. Check every page in light + dark + 390px (kit is responsive; current CSS has 2 media queries).

### Done — D5 (2026-11-13)
All 14 example pages migrated per the rules below: outer `.container` + duplicate per-page footers removed, kit classes
(`.secondary`/`.btn-outline`, `.controls`, `.control-row`/`.control-group`, `.demo-card`, `.field-row`, `.reference-table`,
`.pill`, `.note.*`, `.display-sliders`, `.css-readout`, `.w-*`, `.muted`/`.form-text`), every hand-rolled log → `<LogPanel>`
(tone-coded `logLine` entries), colours on `--kmwc-*` tokens; product skins (iOS Files, Windows Explorer, theming brand
themes, theme-comparison) keep marked `kmwc-fixed-colors` literals and now have dark variants via `light-dark()`.
Rough size: page `<style>` ≈2,665 → ≈1,600 lines (custom-layout 1,122 → 862 is most of what's left), inline `style=` 61 → ~8
(all demo-driven or `--grid-min`). Narrow-width overflow fixed (search, tree-editor, custom-layout incl. a container-query
Explorer layout). Theming: the scheme / ancestor-signal demos are scoped to a wrapper (`.th-scheme-scope`) instead of `<html>`.
Verified: svelte-check 0/0, Playwright 395/395, all 15 pages × light/dark × 1440/390/320 → no overflow, no console errors; build OK.

Findings to act on:
- **FIXED 2026-11-13** (core theme context vendored, `themeSource` prop, ancestor selectors removed; workarounds in theming +
  theme-comparison replaced by `themeSource="closest"`). Was — **Library (dark-mode.css):** `[data-theme="light"] .stv__container` comes after the dark rule, so ANY light ancestor beats a
  NEARER dark one (no nearest-ancestor-wins). The kit's `html[data-theme]` now triggers it on every page; theming +
  theme-comparison work around it with `.stv__container:not([data-theme]) { color-scheme: inherit }` inside their scopes.
  Fix in the library (e.g. `@scope`, or don't treat `html[data-theme]` as forcing).
- **Kit (upstream candidates):** ~~reference-table first-column nowrap~~ (shipped in rc14); `.card p` outranks `.note-title` colour; `.note > :last-child { margin-bottom: 0 }`; copy-link
  button wraps under a long `h2` on phones; a "skin reset" for `<button>`s inside custom-UI demos (kit min-height/fill leak —
  custom-layout resets it twice); maybe `.demo-canvas` (dot grid), numbered steps, busy overlay, clickable result list, tinted `.metric`.
- **Library gotcha for demos:** `--stv-*` overrides must target `.stv__container` (declared there) — setting them on an ancestor
  does nothing (Explorer's density vars never applied before this migration).

### D5 rules (per-page migration — the checklist each page follows)
Goal: example pages use the devkit kit's vocabulary; per-page `<style>` keeps ONLY genuinely unique demo visuals.
1. **Wrapper:** delete the page's outer `<div class="container">` — `(showcase)/examples/+layout.svelte` provides it.
   Keep the inline `<header>` (`.back-link`, `h1`, `.subtitle`, `<RenderModeSwitch />`).
2. **Kit vocabulary first** (see the devkit README "Examples kit" + `node_modules/@keenmate/web-components-devkit/src/examples/css/*.css`):
   sections `.card` (+ `h2` code `XX01 · Title`, `h3.subsection`), `.description`, `.muted`, `.mono`; `.controls` (switch rows),
   `.control-row` + `.control-group` (label over field), `.check-list`, `.toggle-label`, `.form-group`/`.form-text`, `.field-row`/`.field-grow`;
   `.demo-area`, `.demo-card`, `.demo-label`; `.grid` / `.grid-2` / `.card-grid` (+ `style="--grid-min: 240px"` allowed), `.col-span-full`;
   `.note` (+ `.info|.success|.warning|.danger`, `.note-title`); `.output` + `.output-label` + `<pre>`; `.code-block`; `kbd`, `mark`, `code`;
   tables: any `<table>`, `.reference-table`, `.table-full|-bordered|-striped|-compact`, `tr.is-highlight`, `.num`;
   `.pill(--ok|--info|--warn|--err|--muted)`, `.status-dot(--…)`, `.badge(.new)`;
   buttons: native `<button>` (primary), `.secondary`/`.btn-secondary`, `.btn-outline`, `.btn-danger`; native inputs/selects/checkboxes/radios/
   ranges need NO class; utilities `.w-xs|-sm|-md|-lg`, `.mt-1`, `.push-end`; `.display-sliders`, `.css-readout` (`code > b` value, `.is-gap`).
   Showcase-local (`(showcase)/examples-local.css`): `.tree-container(-sm|-lg|-tall|-vs)`, `.trees-side-by-side`, `.search-bar` family,
   `.tabs`/`.tab.active`, `.metrics`/`.metric`, `.perf-card`, `.status`, `.hint`, `.controls-label`, `.threshold-control`, `.unsaved-badge`.
3. **Event logs:** `<LogPanel entries={log} />` (`(showcase)/LogPanel.svelte`) — the kit's `.log-panel`/`.log-line` markup; entries are
   strings or `logLine(name, detail?, variant?)` timeline lines. No hand-rolled log CSS.
4. **Colours:** `--kmwc-*` tokens only (they follow light/dark/auto). A genuine demo skin (custom-layout's Explorer/iOS/dendrogram, theming's
   brand themes, theme-comparison themes) may keep literals, marked `/* kmwc-fixed-colors: <why> */`.
5. **Inline `style=`:** only for values the demo drives (bound CSS variables, measured sizes) or `--grid-min`. Static spacing/width → utilities
   or a page class.
6. **Never** change: section codes/headings (deep links + spotlight), `data-testid`s, ids/classes e2e specs use, demo behaviour, console logging.
7. **Done =** no horizontal overflow at 1440/390/320; light + dark both readable; svelte-check 0/0; the page's e2e specs pass.

### D6 — checks we lose and how to replace them
- Add `e2e/showcase-pages.spec.ts`: iterate the registry at widths 1440/390/320, fail on console/page errors, HTTP ≥400,
  horizontal overflow (= `kmwc check-pages`, minus the shadow-root rule which doesn't apply to a light-DOM Svelte tree).
  Note: this targets `/examples/*`, a sanctioned exception to "e2e hits /test pages" since the pages themselves are the subject.
- Lint-ish check (optional): grep test for hardcoded hex in showcase `<style>` without the fixed-colors marker.

### D7 — follow-ups
- Same treatment for `../svelte-treeview-canvas` examples (it would reuse D2–D4 verbatim → strong argument for D-upstream).
- CLAUDE.md EXAMPLES section rewrite once done.

## 5. Devkit changes worth proposing upstream (instead of local workarounds)
Two Svelte repos (treeview + canvas) would carry the same shim, which by the devkit's own rule belongs in the devkit:
- export `renderThemeBootstrapScript` + a `getKmwcHeadHtml(config)` (bootstrap + `__KMWC__` + accent) for non-Vite-MPA hosts;
- `getPageChapters`/chapter-index builder that accepts a list of `{ href, file }` (so a SvelteKit plugin feeds routes);
- spotlight: absolute/path hrefs;
- `kmwc doctor` / `check-pages`: a `kmwc.examples.framework: 'sveltekit'` mode — skip the vite-preset check, take the page
  list from config (`kmwc.examples.pages` or a URL list) instead of root `*.html`.
- export `loadCodeHighlighter` from `@keenmate/web-components-devkit/vite` (not in the package exports — the shim imports
  `src/vite/code-highlighter.js` by file path), or ship the Svelte `.code-block` pre-transform itself;
- optionally a `@keenmate/web-components-devkit/svelte` with `<ExamplesShell>` — only if canvas adoption proves the shape.

## 6. Open questions
1. ~~Devkit version~~ — RESOLVED 2026-11-12: `1.0.0-rc13` is on npm (`latest` + `rc` tags), source identical to
   `../web-components` HEAD (e520900). Use `npm i -D @keenmate/web-components-devkit@^1.0.0-rc13`.
   Note: since `/examples` statically imports `spotlight.js`, which does `import('virtual:kmwc-chapters')`, the D4 plugin
   must exist before the first build (or Vite's import analysis fails on the unresolved id).
   Note: rc13 doctor runs the rulebook `release-notes` suite (`release-notes/<version>.md` per rc) — relevant only once
   doctor can run here (§5).
2. Accent colour: keep svelte-treeview purple or match web-treeview green?
3. Upstream (§5) first, or local shims first and upstream later?
4. Landing page: kit `renderExamplesIndex()` (client-rendered) vs Svelte markup with kit classes (prerendered)?

## 7. Order / size
D1+D2+D3+D4 (shell, ~1 day) → D5 page by page (bulk, each page independently shippable) → D6 → D7.
