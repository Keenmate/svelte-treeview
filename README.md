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

There's a vanilla-TypeScript sibling, [`@keenmate/web-treeview`](https://github.com/KeenMate/web-treeview), built on the same LTree path-based engine. It's the same logical tree with the same API vocabulary, rendered with a different DOM strategy. Neither is "more mature"; they target different priorities.

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

- **API parity with `@keenmate/web-treeview` (BREAKING)** — tracked in [`docs/parity.md`](docs/parity.md). Expand family: `bind:expandedPaths`, `onNodeExpand` / `onNodeCollapse` / `onExpandedChange`, `beforeExpandCallback` (a Promise = lazy loading with a per-node loading state); `onFocusChange`, `onTreeChange`; the context menu takes web's model (core action items, `menuDivider()`, 13 built-in action names with `labels` texts, `beforeActionCallback` → `onClick` → built-in → `onAction`); `controller` on every callback ctx; `<Tree>` exports `getNodeRef`, `getVisibleFlatNodes`, `getTree`, `getSelectedNodes`, `isNodeSelected`, `isNodeDropAllowed`, `openContextMenu(path, x, y)`, clipboard and `nav*` methods; `scrollToPath(path, { shouldExpandAncestors, shouldHighlight, behavior, block, inline })`; `flatIndentSize`. Defaults now match: `expandLevel` 0, keyboard shortcuts on, aligned node icons, `nodeTitleOverflow: 'ellipsis'`; keyboard per WAI-ARIA (Enter expands / collapses, Space selects / toggles the selection). Custom menu renderers get a public API (`menuContext`, `menuItemDefaults`, `activateMenuItem`, `resolveMenuEntries`, `getMenuChildren`). Removed: `getExpandedPaths` / `setExpandedPaths`, `expandIconClass` / `collapseIconClass`, the old `ContextMenuContext` types.
- **One vocabulary with `@keenmate/web-treeview` (BREAKING, no aliases)** — The click set is now *selected* (`selectedPaths`, `selectNode`, `onSelectionChange`, `selectedNodeClass`, `SelectMode`) and the checkbox set *checked* (`checkedPaths`, `checkNode` / `uncheckNode` / `checkNodes` / `uncheckNodes` / `checkAll` / `uncheckAll`, `onCheckedChange`, `cascadeCheckPolicy`, `checkedNodeClass`); "highlight" is left for visual emphasis only (scroll flash). CSS follows (`.stv__node-content--selected`, `--stv-selected-*`, reads `--base-selected-*`).
- **`nodes` is input AND current state; one mutation vocabulary** — `data` → `nodes` (`bind:nodes` receives the tree's current data after a move / add / remove / paste; `getAllData()` is gone). `applyChanges` operations are `add` / `insert` / `update` / `remove`; `insertBranch(parent, rows)` → `addBranch`; new `insertNode(targetPath, data, position)` and positioned `insertBranch(targetPath, rows, position)`.
- **`labels` for the UI strings** — `labels={{ noData, noResults, dropHere, noDisplayValue, loading }}` replaces `noDataText` / `displayValueFallback`; the empty state tells "no nodes" (`noData`) from "the search matched nothing" (`noResults`); `''` renders nothing.
- **Expand API + canonical booleans** — `ExpandOptions { isExclusive, isSilent }` on `expandNodes` / `collapseNodes` / `expandAll` / `collapseAll`, new `toggleNodeExpanded(path)`; `isProgressiveRenderEnabled`, `shouldExpandAsAccordion`; `setSelectedPaths` / `setCheckedPaths` removed — assign `bind:selectedPaths` / `bind:checkedPaths` to replace a set.
- **Sorting control** — `isSortingEnabled={false}` never auto-sorts (input order kept, added nodes appended, insert / move / drop keep the exact position); new `sortNodes(paths, options?)` (one level) / `sortAll(paths?, options?)` (subtrees) with `compareCallback` / `direction` / `isSilent`, and `onNodesReorder` when a custom order rewrites `orderMember` values. `silent` → `isSilent` everywhere — it suppresses events only, the tree always re-renders.
- **Every callback takes one ctx object** — `getIsDraggableCallback({ node })`, `getNodeClassCallback({ node })` (was `nodeClass(node)`), `sortCallback({ nodes })`, transforms `({ data, ...ctx })`, `beforeCheckboxToggleCallback({ node, isChecked, affectedPaths })`; `onTreeKeydown` became `beforeKeydownCallback` (return `false` to suppress).
- **Shared KeenMate loader (BREAKING tokens)** — the `isLoading` overlay and the lazy-loading toggle draw the suite's loader from `--stv-loader-icon` / `-rotate` / `-duration` / `-size` (→ `--base-loader-*`, one page-wide knob for every component), `--stv-loader-overlay-size` / `-inline-size` / `-color`; the old `--stv-spinner-*` / `--stv-expand-spinner-*` are gone. Overlay content: `loadingPlaceholder` snippet > the page-wide `window.components.renderLoaderCallback` > the default loader; `role="status"` + `labels.loading`.
- **Remaining names aligned** — `onNodeCopy` / `onNodeCut` / `onNodePaste` / `onNodeDelete`, `onNodeDragReject` / `onNodeDropReject`, `searchTerm`, `selectionMode: 'multiple'`, `removeBranch` / `removeNodes` (programmatic) vs `runDeleteCommand` (the user Delete), `virtualScrollItemHeight` / `virtualScrollOverscan` / `virtualScrollContainerHeight`, `isCheckboxesShown` / `isNodeTooltipsShown` / `isEmptyDropPlaceholderShown` / `isTreeDropZoneEnabled` / `shouldTooltipFollowCursor`. Full rename tables in the CHANGELOG.
- **Node state styling — one look shared with web-multiselect through `--base-*` item-state tokens** — The selection (the Ctrl/Shift multi-select set) and keyboard focus now read the new `--base-selected-*` / `--base-focused-*` tokens from `@keenmate/base-css-variables`, so a highlighted tree row and a selected multiselect option on the same page are identical and one override re-themes both (inline fallbacks keep the same defaults when the base file isn't loaded). Each state owns one visual channel so they compose instead of fighting: highlight is a soft accent tint (`--stv-selected-bg`, 10%) with no outline, hover is a neutral tint suppressed under a highlighted row, and focus is a thin 1px inset outline ring (`--stv-focused-outline`). Outline is a separate paint channel from background and box-shadow, so the presets and the post-`scrollToPath` flash can't erase the ring, and drawing it inset means no layout shift and no bleed onto neighbouring rows. Focus ships this default look via `.stv__node-content--focused-default`, applied only when no `focusedNodeClass` is set; `--stv-focused-outline: none` hides it.
- **`checkedNodeClass` — completes the class-override family for checked rows** — Alongside `selectedNodeClass` and `focusedNodeClass`, the new `checkedNodeClass` prop applies a CSS class to every checked (`isChecked`) node. Checked rows deliberately carry no default row treatment (the checkbox is the signal), so this is the opt-in hook for styling them; it's threaded through `<Tree>`, `update()` and `TreeController`.
- **Lighter selection presets + breathing room next to the checkbox** — `--selected-border` and `--selected-glow` are now 1px inset hairline rings (`--stv-selected-preset-ring-color`) over the soft tint, replacing a 2px border with forced padding that made the row jump and an outer glow that bled onto neighbours; both follow `--stv-node-border-radius`. `--highlight-brackets` now keeps its `❯ label ❮` chevrons with checkboxes on. The row pill sits `--stv-checkbox-gap` clear of the checkbox, applied as a margin on the pill rather than the `<input>`, because unlayered resets like Bootstrap's reboot (`input { margin: 0 }`) and Tailwind preflight beat the library's layered rules.
- **Tooltip follow-cursor + drop-placeholder overflow fixes** — With `shouldTooltipFollowCursor`, the tooltip now tracks the pointer from the moment it enters the row, so a stationary hover no longer pins the tooltip to the row's corner. The empty-tree drop placeholder no longer triggers a horizontal scrollbar on ancestors with `overflow-x` set.

## What's New in v5.0.0-rc15

- **Drag & drop — rewritten from native HTML5 DnD to unified Pointer Events** — The whole drag now runs on `pointerdown`/`move`/`up`/`cancel` listeners on `window` with no browser drag session, so re-rendering or moving the dragged row mid-drag can no longer freeze the page (the native-DnD failure mode that also forced the old hand-rolled touch path). `Node.svelte` emits a single `onpointerdown`; the `draggable` attr and the `ondragstart`/`drop`/`touchstart` handlers are gone. Mouse/pen engage on a 5px threshold, touch keeps long-press, and edge autoscroll is reimplemented. Every `on*`/`before*` drag hook, multi-drag, and `DropGroup[]` routing is preserved; the context `event` is now a `PointerEvent`.
- **Checkbox — canonical single-`<input>` render contract shared across KeenMate components** — `.stv__checkbox` is now the styled `<input type="checkbox">` itself (`appearance:none`, the input *is* the box), with the tick/dash as a `::after` mask glyph and indeterminate as a modifier class + `aria-checked="mixed"` (not the native `.indeterminate` prop, so it survives re-render and virtual scroll). The old `<label>` + `.stv__checkbox-box` span model is gone. Box, border, and radius scale via `calc(... * --stv-checkbox-scale)` with `box-sizing:border-box` and no transform, so svelte-treeview, web-treeview, and web-multiselect render pixel-identical boxes off the shared `--base-checkbox-scale`.
- **Per-node icons — a dedicated icon element on every node, with color** — New `iconMember` / `getIconCallback` resolve a per-node icon rendered as `.stv__node-icon` on branches *and* leaves (between toggle and label, independent of `nodeTemplate`); the default render is `<i class="stv__node-icon {value}">` (FontAwesome-friendly), overridable via an `icon` snippet for SVG/unicode/markup. Per-node color comes from `iconColorMember` / `getIconColorCallback` (or `--stv-node-icon-color`), and `shouldAlignNodeIcons` reserves the column. Demo at `/examples/icons`.
- **Node tooltips — hover/focus tooltips via a snippet or callback** — `isNodeTooltipsShown` plus a `tooltip` snippet (rich) or `getNodeTooltipCallback` (plain text) drives a portaled, Floating-UI-positioned tooltip shown on hover and keyboard focus — the direct analog of web-multiselect's option tooltips. It's a reusable exported `use:tooltip` action on the `@floating-ui/dom` already shipped, portaled into `.stv__container` so the `--base-tooltip-*` tokens resolve, with `tooltipPlacement`/`tooltipDelay`/`tooltipOffset`/`shouldTooltipFollowCursor` and `--stv-tooltip-width`/`-min-width`/`-max-width` sizing. Demo at `/examples/tooltips`.
- **Render context — the render snippets now receive device + live node state** — `nodeTemplate(node, ctx)`, `icon(node, value, ctx)`, and `tooltip(node, ctx)` each get `NodeRenderContext = { deviceClass, container:{width,height}, isExpanded, isChecked, isSelected, isFocused, level, hasChildren }`, so a template can adapt to the current device/space and the node's state without re-resolving. Device/container come from the responsive signal (reusing the `environmentState`/`containerSize` bridges — no extra observers); state fields update reactively. Backward compatible — existing `(node)` snippets keep working.
- **One disclosure-glyph knob + all-Lucide icons** — The four parallel toggle-glyph CSS-class families collapsed into a single `iconSet` prop (`chevron` | `triangle` | `plus-minus` | `arrow`) that re-points one `--stv-icon-*` set via `data-icon-set`, each chaining to a shared `--base-icon-*` token. Every remaining built-in glyph (submenu arrow, drag-denied badge, scroll-highlight markers, checkbox tick/dash) is now a Lucide icon drawn via CSS `mask`, inheriting `currentColor` and reskinnable from one base token.
- **Responsive signal + clipped-label affordance** — The tree surfaces a live measure of its own container box and the device via a bindable `containerSize` and an `onContainerResize(size, deviceClass)` callback (device/viewport engine transferred from `@keenmate/web-components-core`), so consumers can adapt to available space. Separately, `nodeTitleOverflow` (`wrap` | `ellipsis` | `info`) controls the built-in label when it's wider than the row, with `info` adding a trailing ⓘ that reveals the full label — the touch/no-hover substitute for a native title tooltip.

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

Categorized `STV:*` loggers on the shared KeenMate core logger (default level `warn`):
```typescript
import { enableLogging, setCategoryLevel, enablePerfLogging } from '@keenmate/svelte-treeview';
enableLogging();                          // the tree's categories → debug
setCategoryLevel('STV:INDEX', 'debug');   // one category
enablePerfLogging();                      // STV:PERF timings

// Or from the browser console — same shape as every KeenMate web component:
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

Authored and maintained by [KeenMate](https://keenmate.com/).
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

Built with ❤️ by [KeenMate](https://github.com/keenmate)
