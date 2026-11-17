# @keenmate/svelte-treeview

A high-performance, feature-rich hierarchical tree view component for Svelte 5 with drag & drop support, search functionality, and flexible data structures using LTree.

## Demos & docs

- 🚀 [Live demo](https://svelte-treeview.keenmate.dev) — interactive examples and the full feature gallery
- 📘 [Usage / API reference](./docs/usage.md) — every Prop, Method, Event, and Snippet
- 🎨 [Theming contract](./docs/theming.md) — `--base-*` tokens, `--stv-*` variables, dark mode, cascade layers
- 📚 [Examples / cookbook](./docs/examples.md) — node templates, search, drag & drop, tree editing, context menus
- ♿ [Accessibility](./docs/accessibility.md) — keyboard navigation, focus management, selection model
- 📒 [Release history](./CHANGELOG.md)

## What is it

`@keenmate/svelte-treeview` is a hierarchical tree-view component for Svelte 5 apps. It renders flat, path-keyed data (`"1"`, `"1.2"`, `"1.2.3"`) into an expandable tree with built-in drag & drop, three-level selection (focus / multi-highlight / checkboxes), context menus, integrated FlexSearch filtering, and virtual scrolling for 50,000+ nodes.

It's aimed at Svelte 5 developers building file browsers, org charts, navigation trees, settings dialogs, or any UI that displays hierarchical data. The core (data structure, expand/collapse, search, drag-and-drop logic) is decoupled from the renderer via `TreeProvider` + `TreeController`, so you can plug in custom HTML, Canvas, or SVG renderers on the same engine.

The component ships standalone with sensible light/dark defaults and integrates cleanly with [Pure Admin](https://pureadmin.io/) and the wider `@keenmate/*` design-token suite via the [`--base-*` CSS variable contract](https://github.com/Keenmate/base-css-variables).

### How it differs from `@keenmate/web-treeview`

There's a vanilla-TypeScript sibling, [`@keenmate/web-treeview`](https://github.com/Keenmate/web-treeview), built on the same LTree path-based engine. It's the same logical tree with the same API vocabulary, rendered with a different DOM strategy. Neither is "more mature"; they target different priorities.

**Shared between the two:** path-keyed data, the three-level selection model (`focusedNode` / `selectedPaths` / `checkedPaths`) with cascade checkboxes, the `selectedNodeClass` / `focusedNodeClass` / `checkedNodeClass` override family and the default state looks (soft highlight tint + thin focus ring, both from the shared `--base-selected-*` / `--base-focused-*` tokens), the canonical single-`<input>` checkbox, per-node icons, node tooltips, render context, clipboard, context menus, and the `--base-*` design tokens. Indentation is `(level − 1) × indent` in both, with the root at zero offset.

| | svelte-treeview | web-treeview |
|---|---|---|
| Framework | Svelte 5 component | Vanilla TS web component (any framework or none) |
| Rendering modes | Flat (+ progressive / virtual) | Flat (+ progressive / virtual) |
| Children DOM | None; siblings sit under `.stv__tree` | None; siblings sit under `.wtv__tree` |
| Virtual scroll | `isVirtualScrollEnabled` | Built in (three-div spacer / `translateY`) |
| Custom node markup | `nodeTemplate` / `icon` / `tooltip` snippets | `renderNodeCallback` / `renderIconCallback` |
| Drag & drop | Unified Pointer Events (no native drag session, so mid-drag re-renders can't freeze it) | Native HTML5 DnD + a long-press touch path |
| Update mechanism | Svelte 5 runes + per-node `_rev` keyed `{#each}` | Imperative reconciler diffing `data-rev` / `data-expanded` attributes |

Pick svelte-treeview in a Svelte 5 app, or when you want the Svelte ecosystem around it (e.g. the Canvas renderer in `@keenmate/svelte-treeview-canvas`, built on the same headless `TreeController`). Pick web-treeview outside Svelte, or when the job is mainly virtual scrolling over very large datasets with a flat DOM.

## What's New in v5.0.0-rc16

Upgrade guide: the [5.0.0-rc16 release notes](release-notes/5.0.0-rc16.md); full list: the
[CHANGELOG 5.0.0-rc16 section](CHANGELOG.md).

- **API parity with `@keenmate/web-treeview` (BREAKING)** — svelte-treeview now has web-treeview's API, tracked in [`docs/parity.md`](docs/parity.md). Expand family: `bind:expandedPaths`, `onNodeExpand` / `onNodeCollapse` / `onExpandedChange`, and `beforeExpandCallback`, where returning a Promise lazy-loads with a per-node loading state. Also new: `onFocusChange`, `onTreeChange`, and `ExpandOptions { isExclusive, isSilent }` plus `toggleNodeExpanded(path)`. The context menu takes web's model: core action items, `createMenuDivider()`, 13 built-in actions, and `beforeActionCallback` → `onClick` → built-in → `onAction`, with a public API for custom menu renderers. `<Tree>` exports web's element methods (`getNodeRef`, `getVisibleFlatNodes`, `openContextMenu`, clipboard and `nav*`). `scrollToPath` takes `{ shouldExpandAncestors, shouldHighlight, behavior, block, inline }`, and every callback ctx carries `controller`. Defaults match web: `expandLevel` 0, keyboard shortcuts on, aligned node icons, `nodeTitleOverflow: 'ellipsis'`, and WAI-ARIA keys (Enter expands / collapses, Space toggles the selection).
- **One vocabulary and one callback shape (BREAKING, no aliases)** — The click set is now *selected* (`selectedPaths`, `selectNode`, `onSelectionChange`, `selectedNodeClass`, `SelectMode`) and the checkbox set *checked* (`checkedPaths`, `checkNode` / `uncheckNode` / `checkAll` / `uncheckAll`, `onCheckedChange`, `cascadeCheckPolicy`). "Highlight" now means only the visual flash. Every callback takes one ctx object: `getIsDraggableCallback({ node })`, `getNodeClassCallback({ node })`, `sortCallback({ nodes })`, transforms `({ data, ...ctx })`. `onTreeKeydown` became `beforeKeydownCallback`, which returns `false` to suppress the key. `silent` is `isSilent` everywhere: it skips the change callbacks only, and the tree always re-renders. The remaining names follow web (`onNodeCopy` / `onNodeDelete`, `removeBranch` vs `runDeleteCommand`, `virtualScroll*`, `is…Shown` / `should…`); the CHANGELOG has the full rename tables.
- **`nodes` is input and current state; mutations, labels and sorting** — `data` is now `nodes`, and `bind:nodes` receives the tree's current data after a move, add, remove or paste; `getAllData()` is gone. `applyChanges` operations are `add` / `insert` / `update` / `remove`; `insertBranch(parent, rows)` became `addBranch`, and the new `insertNode` / `insertBranch` take a target path and position. `labels={{ noData, noResults, dropHere, noDisplayValue, loading }}` replaces `noDataText` / `displayValueFallback`, and the empty state now tells "no nodes" from "the search matched nothing". With `isSortingEnabled={false}` the tree keeps input order and exact insert / drop positions. `sortNodes` / `sortAll` sort on demand, and `onNodesReorder` reports rewritten `orderMember` values.
- **Row animation on expand / collapse — on by default, `motion` is the switch** — Rows an expand reveals fade and slide in. Rows a collapse hides shrink and fade out through core's `animateOut()` before the node really collapses, so `onNodeCollapse` fires afterwards. There is no on/off prop, per the suite's motion rule. Any of these makes it instant: the new `motion` prop (`'auto' | 'none' | 'snappy' | 'smooth'`), a `data-motion` section, the page-wide `window.components.motion`, or OS reduced motion. `--stv-row-animation-duration: 0s` turns off just the rows, and `rowAnimationLimit` (50) caps the rows animated per expand. `collapseNodes()` / `collapseAll()` now return a Promise; `await` it before reading `expandedPaths`.
- **One flat renderer, a faster indexer, honest search results** — The recursive renderer, `isFlatRenderingEnabled`, `RenderCoordinator` and the `.stv__children` wrapper are gone. Rows render flat (plain, progressive or virtual scroll), and `onRenderStart` / `onRenderProgress` / `onRenderComplete` fire around that pass. The search indexer runs in time-boxed idle slots: 55k nodes now take ~2 s instead of ~125 s, and `onIndexProgress` reports progress. `searchResultLimit` (1000) replaces FlexSearch's silent 100-match cap, and `onSearchStatusChange` reports `matchCount` / `isLimited`. An experimental `filterScope` decides which descendants of a match stay visible. A tree that started with a `searchTerm` no longer shows "No results" forever.
- **Theming shared with the suite — node states, presets, loader (BREAKING tokens)** — The CSS token list is now shared with web-treeview. Selection and focus read the `--base-selected-*` / `--base-focused-*` tokens, so a selected tree row and a selected web-multiselect option look identical and one override re-themes both. Each state owns one paint channel: selection is a soft tint, hover a neutral tint, and focus a 1px inset outline ring, so they compose without layout shift. The new `checkedNodeClass` completes the class-override family. `--selected-border` / `--selected-glow` are now inset hairline rings. The `isLoading` overlay and the lazy-load toggle draw the suite's loader from `--stv-loader-*` (→ `--base-loader-*`), replacing `--stv-spinner-*`. A `loadingPlaceholder` snippet wins over the page-wide `window.components.renderLoadingCallback`.
- **Keenmate core logger + theme context** — Logging moved from `loglevel` to the vendored core logger, with namespace `STV` and default level `warn`. It is set per tree or page-wide via `window.components.logging`, and `window.components['svelte-treeview']` has core's registry shape (`version()`, `config`, `logging`, `getInstances()`). Dark mode follows core's theme context. The new `themeSource` prop (`'closest'` | selector | Element) picks the signal, the result lands on `.stv__container[data-context-theme]`, and a light page no longer beats a nearer dark section. `setThemeMode` / `getThemeContext` / `observeThemeContext` are exported and shared with the web-* components on the page.
- **Fixes worth knowing** — Silent `selectNode` / `selectNodes` / `selectAll` no longer fire `onFocusChange`. A master / detail page that restores a node from the URL now gets no callback at all, so the detail doesn't reload and flicker. With `shouldTooltipFollowCursor` the tooltip tracks the pointer from the moment it enters a row. Tooltip width now matches web-treeview, because a page's `border-box` reset no longer shrinks it. The empty-tree drop placeholder no longer adds a horizontal scrollbar.

## What's New in v5.0.0-rc15

- **Drag & drop — rewritten from native HTML5 DnD to unified Pointer Events** — The whole drag now runs on `pointerdown`/`move`/`up`/`cancel` listeners on `window` with no browser drag session, so re-rendering or moving the dragged row mid-drag can no longer freeze the page (the native-DnD failure mode that also forced the old hand-rolled touch path). `Node.svelte` emits a single `onpointerdown`; the `draggable` attr and the `ondragstart`/`drop`/`touchstart` handlers are gone. Mouse/pen engage on a 5px threshold, touch keeps long-press, and edge autoscroll is reimplemented. Every `on*`/`before*` drag hook, multi-drag, and `DropGroup[]` routing is preserved; the context `event` is now a `PointerEvent`.
- **Checkbox — canonical single-`<input>` render contract shared across Keenmate components** — `.stv__checkbox` is now the styled `<input type="checkbox">` itself (`appearance:none`, the input *is* the box), with the tick/dash as a `::after` mask glyph and indeterminate as a modifier class + `aria-checked="mixed"` (not the native `.indeterminate` prop, so it survives re-render and virtual scroll). The old `<label>` + `.stv__checkbox-box` span model is gone. Box, border, and radius scale via `calc(... * --stv-checkbox-scale)` with `box-sizing:border-box` and no transform, so svelte-treeview, web-treeview, and web-multiselect render pixel-identical boxes off the shared `--base-checkbox-scale`.
- **Per-node icons — a dedicated icon element on every node, with color** — New `iconMember` / `getIconCallback` resolve a per-node icon rendered as `.stv__node-icon` on branches *and* leaves (between toggle and label, independent of `nodeTemplate`); the default render is `<i class="stv__node-icon {value}">` (FontAwesome-friendly), overridable via an `icon` snippet for SVG/unicode/markup. Per-node color comes from `iconColorMember` / `getIconColorCallback` (or `--stv-node-icon-color`), and `shouldAlignNodeIcons` reserves the column. Demo at `/examples/icons`.
- **Node tooltips — hover/focus tooltips via a snippet or callback** — `isNodeTooltipsShown` plus a `tooltip` snippet (rich) or `getNodeTooltipCallback` (plain text) drives a portaled, Floating-UI-positioned tooltip shown on hover and keyboard focus — the direct analog of web-multiselect's option tooltips. It's a reusable exported `use:tooltip` action on the `@floating-ui/dom` already shipped, portaled into `.stv__container` so the `--base-tooltip-*` tokens resolve, with `tooltipPlacement`/`tooltipDelay`/`tooltipOffset`/`shouldTooltipFollowCursor` and `--stv-tooltip-width`/`-min-width`/`-max-width` sizing. Demo at `/examples/tooltips`.
- **Render context — the render snippets now receive device + live node state** — `nodeTemplate(node, ctx)`, `icon(node, value, ctx)`, and `tooltip(node, ctx)` each get `NodeRenderContext = { deviceClass, container:{width,height}, isExpanded, isChecked, isSelected, isFocused, level, hasChildren }`, so a template can adapt to the current device/space and the node's state without re-resolving. Device/container come from the responsive signal (reusing the `environmentState`/`containerSize` bridges — no extra observers); state fields update reactively. Backward compatible — existing `(node)` snippets keep working.
- **One disclosure-glyph knob + all-Lucide icons** — The four parallel toggle-glyph CSS-class families collapsed into a single `iconSet` prop (`chevron` | `triangle` | `plus-minus` | `arrow`) that re-points one `--stv-icon-*` set via `data-icon-set`, each chaining to a shared `--base-icon-*` token. Every remaining built-in glyph (submenu arrow, drag-denied badge, scroll-highlight markers, checkbox tick/dash) is now a Lucide icon drawn via CSS `mask`, inheriting `currentColor` and reskinnable from one base token.
- **Responsive signal + clipped-label affordance** — The tree surfaces a live measure of its own container box and the device via a bindable `containerSize` and an `onContainerResize(size, deviceClass)` callback (device/viewport engine transferred from `@keenmate/web-components-core`), so consumers can adapt to available space. Separately, `nodeTitleOverflow` (`wrap` | `ellipsis` | `info`) controls the built-in label when it's wider than the row, with `info` adding a trailing ⓘ that reveals the full label — the touch/no-hover substitute for a native title tooltip.

Earlier releases: [CHANGELOG](CHANGELOG.md).

## v5.0: Core/Renderer Split + Virtual Scroll

> [!IMPORTANT]
> **In version 5, the tree core (data structure, expand/collapse, search, drag & drop logic) has been completely separated from the renderer.** The architecture is open for you to build your own custom renderers on top of the same core via `TreeProvider` and `TreeController`.

**Key changes in v5:**
- **Core/Renderer split**: Use the built-in HTML `Tree` renderer, or create custom visualizations (Canvas, WebGL, SVG) via `TreeProvider` + `TreeController`
- **Virtual scroll**: Render 50,000+ node trees smoothly with `isVirtualScrollEnabled={true}` — only ~50 DOM nodes at any time
- **Canvas companion**: For canvas rendering, install [`@keenmate/svelte-treeview-canvas`](https://github.com/keenmate/svelte-treeview-canvas)
- **Drop position naming**: `'above'`/`'below'` renamed to `'before'`/`'after'` everywhere: the `DropPosition` a drop reports (events, callbacks, `.stv__drop-zone--*` classes) and the `dropZoneLayout` values that place the floating zone row (`'before'` = row above the node, `'after'` = row below; `.stv__drop-zones--before` / `--after`)

### Rendering Modes

| Mode | Props | DOM Nodes | Best For |
|------|-------|-----------|----------|
| Flat (default) | — | All | Small/medium trees (up to ~10K) |
| Flat + progressive | `isProgressiveRenderEnabled={true}` | All, mounted in rAF batches | Medium trees, no UI freeze on load |
| Virtual | `isVirtualScrollEnabled={true}` | ~50 | Large trees (10K+) |

```svelte
<!-- Virtual scroll for large trees -->
<Tree nodes={data} isVirtualScrollEnabled={true} virtualScrollContainerHeight="500px" />

<!-- Flat mode (default) with progressive batching -->
<Tree nodes={data} isProgressiveRenderEnabled={true} initialBatchSize={20} maxBatchSize={500} />
```

## Features

- **Svelte 5 Native**: Built specifically for Svelte 5 with full support for runes and modern Svelte patterns
- **High Performance**: Flat rendering with progressive loading, virtual scroll for 50,000+ nodes
- **Drag & Drop**: Built-in drag and drop with position control (before/after/child), touch support, and async validation
- **Tree Editing**: Built-in methods for add, move, remove operations with automatic path management
- **Search & Filter**: Integrated FlexSearch for fast, full-text search capabilities
- **Flexible Data Sources**: Works with any hierarchical data structure
- **Multi-Select**: Ctrl+click toggle, Shift+click range select (visual or logical mode), `checkedPaths` bindable, selection-aware context menus
- **Context Menus**: Dynamic right-click menus with shortcuts, submenus, named dividers, and two API approaches (callback or Svelte components)
- **Visual Customization**: Extensive styling options and icon customization
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Accessibility**: Built with accessibility in mind

## Installation

```bash
npm install @keenmate/svelte-treeview
```

### Importing Styles

The component requires CSS to display correctly. Import the styles in your app:

**JavaScript import** (in your main.js/main.ts or Vite/Webpack entry):
```javascript
import '@keenmate/svelte-treeview/styles.css';
```

**Svelte component import:**
```svelte
<style>
  @import '@keenmate/svelte-treeview/styles.css';
</style>
```

## Quick Start

```svelte
<script lang="ts">
  import { Tree } from '@keenmate/svelte-treeview';

  const data = [
    { path: '1', name: 'Documents', type: 'folder' },
    { path: '1.1', name: 'Projects', type: 'folder' },
    { path: '1.1.1', name: 'Project A', type: 'folder' },
    { path: '1.1.2', name: 'Project B', type: 'folder' },
    { path: '2', name: 'Pictures', type: 'folder' },
    { path: '2.1', name: 'Vacation', type: 'folder' }
  ];
</script>

<Tree
  nodes={data}
  idMember="path"
  pathMember="path"
  displayValueMember="name"
/>
```

> [!TIP]
> **Performance tip:** When passing large arrays (1000+ items) to the Tree component, use `$state.raw()` instead of `$state()` to avoid severe performance issues. Svelte 5's `$state()` creates deep proxies — with thousands of items this causes up to 5,000x slowdown. The array itself remains reactive; only individual items lose deep reactivity (which Tree doesn't need).
> ```typescript
> // BAD - Each item becomes a Proxy
> let treeData = $state<TreeNode[]>([])
>
> // GOOD - Items remain plain objects
> let treeData = $state.raw<TreeNode[]>([])
> ```

## Data Structure

The component expects hierarchical data with path-based organization:

```typescript
interface NodeData {
  path: string;          // e.g., "1.2.3" for hierarchical positioning
  // ... your custom properties
}
```

### Path Examples

- Root level: `"1"`, `"2"`, `"3"`
- Second level: `"1.1"`, `"1.2"`, `"2.1"`
- Third level: `"1.1.1"`, `"1.2.1"`, `"2.1.1"`

### Sorting Requirements

**Important:** For proper tree construction, your `sortCallback` must sort by **level first** to ensure parent nodes are inserted before their children:

```typescript
const sortCallback = (ctx: SortContext<T>) => {
  return items.sort((a, b) => {
    // First, sort by level (shallower levels first)
    const aLevel = a.path.split('.').length;
    const bLevel = b.path.split('.').length;
    if (aLevel !== bLevel) {
      return aLevel - bLevel;
    }

    // Then sort by your custom criteria
    return (a.data?.name ?? '').localeCompare(b.data?.name ?? '');
  });
};
```

**Why this matters:** If deeper level nodes are processed before their parents, you'll get "Could not find parent node" errors during tree construction. Level-first sorting ensures hierarchical integrity and enables progressive rendering for large datasets.

### Insert Result Information

The tree provides detailed information about data insertion through the `insertResult` bindable property:

```typescript
interface InsertArrayResult<T> {
  successful: number;     // Number of nodes successfully inserted
  failed: Array<{        // Nodes that failed to insert
    node: LTreeNode<T>;  // The processed tree node
    originalData: T;     // The original data object
    error: string;       // Error message (usually "Could not find parent...")
  }>;
  total: number;         // Total number of nodes processed
}
```

#### Usage Example

```svelte
<script lang="ts">
  import { Tree } from '@keenmate/svelte-treeview';

  let insertResult = $state();

  const data = [
    { id: '1', path: '1', name: 'Root' },
    { id: '1.2', path: '1.2', name: 'Child' },    // Missing parent "1.1"
    { id: '1.1.1', path: '1.1.1', name: 'Deep' } // Missing parent "1.1"
  ];

  // Check results after tree processes data
  $effect(() => {
    if (insertResult) {
      console.log(`${insertResult.successful} nodes inserted successfully`);
      console.log(`${insertResult.failed.length} nodes failed to insert`);

      insertResult.failed.forEach(failure => {
        console.log(`Failed: ${failure.originalData.name} - ${failure.error}`);
      });
    }
  });
</script>

<Tree
  nodes={data}
  idMember="id"
  pathMember="path"
  displayValueMember="name"
  bind:insertResult
/>
```

#### Benefits

- **Data Validation**: Identify missing parent nodes in hierarchical data
- **Debugging**: Clear error messages with node paths like "Node: 1.1.1 - Could not find parent node: 1.1"
- **Data Integrity**: Handle incomplete datasets gracefully
- **Search Accuracy**: Failed nodes are excluded from search index, ensuring search results match visible tree
- **User Feedback**: Inform users about data issues with detailed failure information

## Performance

The component is optimized for large datasets:

- **Virtual Scroll**: Renders only visible rows (~50 DOM nodes) for trees with 50,000+ nodes
- **Flat Rendering**: Single `{#each}` loop over the visible rows (the recursive renderer was removed)
- **Progressive Rendering**: Batched rendering prevents UI freeze during initial load
- **Async Search Indexing**: Uses `requestIdleCallback` for non-blocking search index building
- **LTree**: Efficient hierarchical data structure with FlexSearch integration

### Performance Benchmarks (5500 nodes)

| Operation | Time |
|-----------|------|
| Initial render (flat) | ~25ms |
| Initial render (virtual) | ~5ms |
| Expand/collapse | ~100-150ms |
| Search filtering | <50ms |
| insertArray | <100ms |

### Virtual Scroll

For trees with 10,000+ nodes, enable virtual scroll to keep DOM size constant:

```svelte
<Tree
  nodes={data}
  isVirtualScrollEnabled={true}
  virtualScrollContainerHeight="500px"
  virtualScrollOverscan={5}
/>
```

Virtual scroll auto-measures row height from the first rendered node. Override with `virtualScrollItemHeight={32}` if needed. Requires flat rendering mode (the default).

### Logging & Performance Logging

Categorized `STV:*` loggers on the shared Keenmate core logger (default level `warn`):
```typescript
import { enableLogging, setCategoryLevel, enablePerfLogging } from '@keenmate/svelte-treeview';
enableLogging();                          // the tree's categories → debug
setCategoryLevel('STV:INDEX', 'debug');   // one category
enablePerfLogging();                      // STV:PERF timings

// Or from the browser console — same shape as every Keenmate web component:
window.components['svelte-treeview'].logging.enableLogging()
window.components.logging.enableLogging('debug')   // page-wide: every component
```

**Important**: See the [$state.raw() tip](#quick-start) above - using `$state()` instead of `$state.raw()` for tree data can cause 5,000x slowdown!

## CanvasTree (Canvas-Based Rendering)

Canvas rendering is available as a separate companion package: [`@keenmate/svelte-treeview-canvas`](https://github.com/keenmate/svelte-treeview-canvas)

It renders trees on HTML5 Canvas for high-performance visualization with multiple layout modes (tree, balanced, fishbone, radial, box), keyboard navigation, drag & drop, and custom node rendering. Install it separately:

```bash
npm install @keenmate/svelte-treeview-canvas
```

## Development Setup & Contributing

For developers working on the project, you can use either standard npm commands or the provided Makefile:

```bash
# Using Makefile (recommended for consistency)
make setup      # or make install
make dev

# Or using standard npm commands
npm install
npm run dev
```

We welcome contributions! Please see our contributing guidelines for details.

> **For AI Agents / LLMs**: Comprehensive documentation is available in the `ai/` folder with topic-specific files (basic-setup.txt, drag-drop.txt, performance.txt, etc.). Start with `ai/INDEX.txt` for navigation.

## About

Authored and maintained by [Keenmate](https://keenmate.com/).
The component ships standalone with sensible light/dark defaults;
when mounted inside [Pure Admin](https://pureadmin.io/) — or any
host that publishes the `--base-*` taxonomy via
[`@keenmate/theme-designer`](https://www.npmjs.com/package/@keenmate/theme-designer) — it adopts the host's colors,
typography, and sizing automatically. There is no runtime
dependency on Pure Admin; the integration is opt-in via CSS
variables.

## Built with BlissFramework

Follows the [BlissFramework component guidelines](https://blissframework.dev/)
for structure, theming, color-scheme, and accessibility.

## License

MIT License - see LICENSE file for details.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/keenmate/svelte-treeview/issues)
- **Live demo & docs**: [svelte-treeview.keenmate.dev](https://svelte-treeview.keenmate.dev)

---

Built with ❤️ by [Keenmate](https://github.com/keenmate)
