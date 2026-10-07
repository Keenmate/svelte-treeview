# @keenmate/svelte-treeview

A high-performance, feature-rich hierarchical tree view component for Svelte 5 with drag & drop support, search functionality, and flexible data structures using LTree.

## What is it

`@keenmate/svelte-treeview` is a hierarchical tree-view component for Svelte 5 apps. It renders flat, path-keyed data (`"1"`, `"1.2"`, `"1.2.3"`) into an expandable tree with built-in drag & drop, three-level selection (focus / multi-highlight / checkboxes), context menus, integrated FlexSearch filtering, and virtual scrolling for 50,000+ nodes.

It's aimed at Svelte 5 developers building file browsers, org charts, navigation trees, settings dialogs, or any UI that displays hierarchical data. The core (data structure, expand/collapse, search, drag-and-drop logic) is decoupled from the renderer via `TreeProvider` + `TreeController`, so you can plug in custom HTML, Canvas, or SVG renderers on the same engine.

The component ships standalone with sensible light/dark defaults and integrates cleanly with [Pure Admin](https://pureadmin.io/) and the wider `@keenmate/*` design-token suite via the `--base-*` CSS variable contract.

### How it differs from `@keenmate/web-treeview`

There's a vanilla-TypeScript sibling — [`@keenmate/web-treeview`](https://github.com/KeenMate/web-treeview) — built on the same LTree path-based engine. Same logical tree, different DOM strategy. Neither is "more mature"; they target different priorities.

| | svelte-treeview | web-treeview |
|---|---|---|
| Framework | Svelte 5 | Vanilla TS web component |
| Rendering modes | Recursive (default) + flat | Flat only |
| Children DOM | `.stv__children` wrapper (recursive mode) | None — siblings under `.wtv__tree` |
| Indent math | `level × indent` | `(level − 1) × indent` (root at zero offset) |
| Virtual scroll | Flat mode only | Built-in (three-div spacer / `translateY`) |
| Label markup | `<span class="stv__node-label">` by default — replace via `nodeTemplate` snippet | `<span class="wtv__node-label">` by default — replace via `renderNodeCallback` |
| Checkbox | Canonical single styled `<input class="stv__checkbox">` (shared KeenMate render contract) | Bare native `<input type="checkbox">` |
| Update mechanism | Svelte 5 runes + per-node `_rev` keyed `{#each}` | Imperative reconciler diffing `data-rev` / `data-expanded` attributes |

svelte-treeview is broader (two rendering modes, easier vertical guide lines via `.stv__children`); web-treeview is purpose-built for virtual scrolling over large datasets with a flatter DOM.

## Live Demo

Browse interactive code examples and the full API reference at **[svelte-treeview.keenmate.dev](https://svelte-treeview.keenmate.dev)**

## What's New in v5.0.0-rc15

- **Drag & drop — rewritten from native HTML5 DnD to unified Pointer Events** — The whole drag now runs on `pointerdown`/`move`/`up`/`cancel` listeners on `window` with no browser drag session, so re-rendering or moving the dragged row mid-drag can no longer freeze the page (the native-DnD failure mode that also forced the old hand-rolled touch path). `Node.svelte` emits a single `onpointerdown`; the `draggable` attr and the `ondragstart`/`drop`/`touchstart` handlers are gone. Mouse/pen engage on a 5px threshold, touch keeps long-press, and edge autoscroll is reimplemented. Every `on*`/`before*` drag hook, multi-drag, and `DropGroup[]` routing is preserved; the context `event` is now a `PointerEvent`.
- **Checkbox — canonical single-`<input>` render contract shared across KeenMate components** — `.stv__checkbox` is now the styled `<input type="checkbox">` itself (`appearance:none`, the input *is* the box), with the tick/dash as a `::after` mask glyph and indeterminate as a modifier class + `aria-checked="mixed"` (not the native `.indeterminate` prop, so it survives re-render and virtual scroll). The old `<label>` + `.stv__checkbox-box` span model is gone. Box, border, and radius scale via `calc(... * --stv-checkbox-scale)` with `box-sizing:border-box` and no transform, so svelte-treeview, web-treeview, and web-multiselect render pixel-identical boxes off the shared `--base-checkbox-scale`.
- **Per-node icons — a dedicated icon element on every node, with color** — New `iconMember` / `getIconCallback` resolve a per-node icon rendered as `.stv__node-icon` on branches *and* leaves (between toggle and label, independent of `nodeTemplate`); the default render is `<i class="stv__node-icon {value}">` (FontAwesome-friendly), overridable via an `icon` snippet for SVG/unicode/markup. Per-node color comes from `iconColorMember` / `getIconColorCallback` (or `--stv-node-icon-color`), and `shouldAlignNodeIcons` reserves the column. Demo at `/examples/icons`.
- **Node tooltips — hover/focus tooltips via a snippet or callback** — `shouldShowNodeTooltips` plus a `tooltip` snippet (rich) or `getNodeTooltipCallback` (plain text) drives a portaled, Floating-UI-positioned tooltip shown on hover and keyboard focus — the direct analog of web-multiselect's option tooltips. It's a reusable exported `use:tooltip` action on the `@floating-ui/dom` already shipped, portaled into `.stv__container` so the `--base-tooltip-*` tokens resolve, with `tooltipPlacement`/`tooltipDelay`/`tooltipOffset`/`tooltipFollowCursor` and `--stv-tooltip-width`/`-min-width`/`-max-width` sizing. Demo at `/examples/tooltips`.
- **Render context — the render snippets now receive device + live node state** — `nodeTemplate(node, ctx)`, `icon(node, value, ctx)`, and `tooltip(node, ctx)` each get `NodeRenderContext = { deviceClass, container:{width,height}, isExpanded, isSelected, isHighlighted, isFocused, level, hasChildren }`, so a template can adapt to the current device/space and the node's state without re-resolving. Device/container come from the responsive signal (reusing the `environmentState`/`containerSize` bridges — no extra observers); state fields update reactively. Backward compatible — existing `(node)` snippets keep working.
- **One disclosure-glyph knob + all-Lucide icons** — The four parallel toggle-glyph CSS-class families collapsed into a single `iconSet` prop (`chevron` | `triangle` | `plus-minus` | `arrow`) that re-points one `--stv-icon-*` set via `data-icon-set`, each chaining to a shared `--base-icon-*` token. Every remaining built-in glyph (submenu arrow, drag-denied badge, scroll-highlight markers, checkbox tick/dash) is now a Lucide icon drawn via CSS `mask`, inheriting `currentColor` and reskinnable from one base token.
- **Responsive signal + clipped-label affordance** — The tree surfaces a live measure of its own container box and the device via a bindable `containerSize` and an `onContainerResize(size, deviceClass)` callback (device/viewport engine transferred from `@keenmate/web-components-core`), so consumers can adapt to available space. Separately, `nodeTitleOverflow` (`wrap` | `ellipsis` | `info`) controls the built-in label when it's wider than the row, with `info` adding a trailing ⓘ that reveals the full label — the touch/no-hover substitute for a native title tooltip.

## What's New in v5.0.0-rc14

- **Touch drag & drop — works again under touch emulation; native `draggable` no longer eats the gesture** — Touch drag was effectively dead wherever the browser synthesizes touch events (most visibly Chrome DevTools device mode): the long-press engaged and the ghost appeared, but the first finger move delivered no `touchmove`/`touchend`, because Chrome tried to route a `draggable=true` element through its mouse-driven native HTML5 drag engine — which never starts under emulation while also suppressing the touch stream. `Node.svelte` now clears `draggable` synchronously on `touchstart` (before the move that triggers the hijack) and restores it on `touchend`/`touchcancel`, so the touch-drag handlers get the full stream. It's scoped to real touch gestures, so mouse-drag on a touchscreen laptop is untouched.
- **Drag & drop — "can't do that" feedback for locked nodes and refused drops** — Long-pressing a non-draggable node used to do nothing at all; now it plays a clear blocked-action reaction: a 🚫 no-entry badge that stays on the row for as long as you hold it, a gently pulsing tint, and a distinct haptic double-buzz. The same 🚫 flashes briefly on a drop target that refuses the drop. Two new fire-and-forget events, `onNodeDragDenied` (source side) and `onNodeDropDenied` (target side), carry the node's `NodeRef` so you can raise your own toast/snackbar; both fire regardless of the built-in visual, which you can disable with `shouldIndicateUndraggable={false}`.
- **`touchDragDelay` — the long-press hold before a touch-drag engages is configurable** — Previously hardcoded at 300 ms, the hold duration is now a prop threaded through `<Tree>` and `update()`, so you can dial in a snappier 150 ms or a more deliberate, iOS/Android-like 500 ms feel.
- **`displayValueFallback` — configurable placeholder for nodes with no display value** — `getNodeDisplayValue` falls back to a placeholder when neither `displayValueMember` nor `getDisplayValueCallback` resolves (a dataless node, or a tree that labels only via a `nodeTemplate` snippet) — and that placeholder, previously a hardcoded `[N/A]` that also surfaced in the touch-drag ghost, is now overridable per tree (pass `""` to render nothing). It's reactive, so changing it at runtime re-renders the affected labels; a live demo sits in `/examples/data`.
- **`cascadeSelectPolicy` — control which paths a cascade selection emits, independent of how it cascades** — `checkboxMode` decides whether checking a branch fills its subtree; this new knob decides what `bind:selectedPaths`/`onSelectionChange` actually report, without changing what's checked on screen. Three policies: `'rolled-up'` (minimal cover — a fully-checked subtree collapses to its root), `'leaves'` (only checked leaves), and `'all'` (every fully-checked node). Only applies in cascade mode. Heads up: the default is now `'rolled-up'`, so cascade consumers who previously read the full flattened set from `selectedPaths` should pass `cascadeSelectPolicy="all"` to keep the old output.
- **Virtual scroll — the last rows are reachable again, and near-bottom jitter is gone** — In virtual mode the scroll spacer is sized as `count × rowHeight`, which assumes uniform rows; a 2px `flatGap` margin on every level-transition row (invisible to `getBoundingClientRect`) meant the spacer under-counted real content, so the final rows fell past the scroll range and scrolling near the bottom snapped back. The gap is now forced off in the virtual-scroll branch (kept in flat/recursive, which aren't virtualized), making the spacer exact. Fixed-height virtualization still needs uniform row content, so keep rows single-line or set `virtualRowHeight` if labels can wrap.

## v5.0: Core/Renderer Split + Virtual Scroll

> [!IMPORTANT]
> **In version 5, the tree core (data structure, expand/collapse, search, drag & drop logic) has been completely separated from the renderer.** The architecture is open for you to build your own custom renderers on top of the same core via `TreeProvider` and `TreeController`.

**Key changes in v5:**
- **Core/Renderer split**: Use the built-in HTML `Tree` renderer, or create custom visualizations (Canvas, WebGL, SVG) via `TreeProvider` + `TreeController`
- **Virtual scroll**: Render 50,000+ node trees smoothly with `isVirtualScrollEnabled={true}` — only ~50 DOM nodes at any time
- **Canvas companion**: For canvas rendering, install [`@keenmate/svelte-treeview-canvas`](https://github.com/keenmate/svelte-treeview-canvas)
- **Drop position naming**: `'above'`/`'below'` renamed to `'before'`/`'after'` (CSS classes and events updated accordingly)

### Rendering Modes

| Mode | Props | DOM Nodes | Best For |
|------|-------|-----------|----------|
| Recursive | `isFlatRenderingEnabled={false}` | All | Small trees (<100 nodes) |
| Flat (default) | `isFlatRenderingEnabled={true}` | All | Medium trees (100–10K) |
| Virtual | `isVirtualScrollEnabled={true}` | ~50 | Large trees (10K+) |

```svelte
<!-- Virtual scroll for large trees -->
<Tree {data} isVirtualScrollEnabled={true} virtualContainerHeight="500px" />

<!-- Flat mode (default) with progressive batching -->
<Tree {data} isProgressiveRender={true} initialBatchSize={20} maxBatchSize={500} />
```

## Features

- **Svelte 5 Native**: Built specifically for Svelte 5 with full support for runes and modern Svelte patterns
- **High Performance**: Flat rendering with progressive loading, virtual scroll for 50,000+ nodes
- **Drag & Drop**: Built-in drag and drop with position control (before/after/child), touch support, and async validation
- **Tree Editing**: Built-in methods for add, move, remove operations with automatic path management
- **Search & Filter**: Integrated FlexSearch for fast, full-text search capabilities
- **Flexible Data Sources**: Works with any hierarchical data structure
- **Multi-Select**: Ctrl+click toggle, Shift+click range select (visual or logical mode), `selectedPaths` bindable, selection-aware context menus
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
  {data}
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

## Demos & docs

- 🚀 [Live demo](https://svelte-treeview.keenmate.dev) — interactive examples and the full feature gallery
- 📘 [Usage / API reference](./docs/usage.md) — every Prop, Method, Event, and Snippet
- 🎨 [Theming contract](./docs/theming.md) — `--base-*` tokens, `--stv-*` variables, dark mode, cascade layers
- 📚 [Examples / cookbook](./docs/examples.md) — node templates, search, drag & drop, tree editing, context menus
- ♿ [Accessibility](./docs/accessibility.md) — keyboard navigation, focus management, selection model
- 📒 [Release history](./CHANGELOG.md)

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
const sortCallback = (items: LTreeNode<T>[]) => {
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
  {data}
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
- **Flat Rendering Mode**: Single `{#each}` loop instead of recursive components (default, ~12x faster initial render)
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
  {data}
  isVirtualScrollEnabled={true}
  virtualContainerHeight="500px"
  virtualOverscan={5}
/>
```

Virtual scroll auto-measures row height from the first rendered node. Override with `virtualRowHeight={32}` if needed. Requires flat rendering mode (the default).

### Performance Logging

Built-in performance measurement for debugging:
```typescript
import { enablePerfLogging } from '@keenmate/svelte-treeview';
enablePerfLogging();

// Or from browser console:
window.components['svelte-treeview'].perf.enable()
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
