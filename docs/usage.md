# Usage / API reference

Full Props, Methods, Events, and Snippets reference for `@keenmate/svelte-treeview`.

## Tree component props

### Core properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `T[]` | **required** | The tree's data objects (flat, ltree paths). Bindable: input AND current state — after a mutation `bind:nodes` receives the tree's current data |
| `idMember` | `string` | **required** | Property name for unique identifiers |
| `pathMember` | `string` | **required** | Property name for hierarchical paths |
| `sortCallback` | `(ctx: SortContext<T>) => LTreeNode<T>[]` (ctx = `{ nodes }`) | `undefined` | Function to sort tree nodes |

### Data mapping properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `parentPathMember` | `string \| null` | `null` | Property name for parent path references |
| `levelMember` | `string \| null` | `null` | Property name for node level |
| `isExpandedMember` | `string \| null` | `null` | Property name for expanded state |
| `isCheckedMember` | `string \| null` | `null` | Property name for selected state |
| `isDraggableMember` | `string \| null` | `null` | Property name for draggable state |
| `isDropAllowedMember` | `string \| null` | `null` | Property name for drop allowed state |
| `allowedDropPositionsMember` | `string \| null` | `null` | Property name for allowed drop positions array |
| `isCollapsibleMember` | `string \| null` | `null` | Property name for collapsible state |
| `getIsCollapsibleCallback` | `({ node }) => boolean` | `undefined` | Callback to determine if a node is collapsible |
| `getIsDraggableCallback` | `({ node }) => boolean` | `undefined` | Callback to determine if a node is draggable |
| `hasChildrenMember` | `string \| null` | `null` | Property name for children existence |
| `isSorted` | `boolean \| null` | `null` | Hint: the input is already sorted (skip the initial sort) |
| `isSortingEnabled` | `boolean` | `true` | `false` = never auto-sort — input order kept, added nodes appended, positioned inserts / moves / drops keep the exact position. See [Sorting & positions](#sorting--positions) |

### Display & search properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `displayValueMember` | `string \| null` | `null` | Property name for display text |
| `getDisplayValueCallback` | `({ node }) => string` | `undefined` | Function to get display value |
| `searchValueMember` | `string \| null` | `null` | Property name for search indexing |
| `getSearchValueCallback` | `({ node }) => string` | `undefined` | Function to get search value |
| `shouldUseInternalSearchIndex` | `boolean` | `true` | Enable built-in search functionality |
| `initializeIndexCallback` | `() => Index` | `undefined` | Function to initialize search index |
| `searchTerm` | `string` (bindable) | `undefined` | Current search text |

**Note**: When `shouldUseInternalSearchIndex` is enabled, node indexing is performed asynchronously using `requestIdleCallback` (with fallback to `setTimeout`). This ensures the tree renders immediately while search indexing happens during browser idle time, providing better performance for large datasets.

**Important**: For internal search indexing to work, you must:
1. Set `shouldUseInternalSearchIndex={true}`
2. Provide either `searchValueMember` (property name) or `getSearchValueCallback` (function)

Without both requirements, no search indexing will occur.

**Performance tuning**:
- `indexerBatchSize` controls how many nodes are processed per idle callback. Lower values (10-25) provide smoother UI performance but slower indexing, while higher values (50-100) index faster but may cause brief UI pauses. Default: 25.
- `indexerTimeout` sets the maximum wait time before forcing indexing when the browser is busy. Lower values (25-50ms) ensure more responsive indexing, while higher values (100-200ms) give more time for genuine idle periods. Default: 50ms.

### Tree configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `treeId` | `string \| null` | auto-generated | Unique identifier for the tree |
| `treePathSeparator` | `string \| null` | `"."` | Separator character for hierarchical paths (e.g., "." for "1.2.3" or "/" for "1/2/3") |
| `focusedNode` | `LTreeNode<T>` (bindable) | `undefined` | Currently focused node (single-focus family; click / arrow keys) |
| `expandedPaths` | `Set<string>` (bindable) | `new Set()` | Paths of the expanded nodes — read it to save the expanded state, assign it to restore (replaces the state silently; given before the data it applies after the first load, overriding `expandLevel`). Replaces `getExpandedPaths()` / `setExpandedPaths()` |
| `insertResult` | `InsertArrayResult<T>` (bindable) | `undefined` | Result of the last data insertion including failed nodes |

### Behavior properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `expandLevel` | `number \| null` | `0` | Automatically expand nodes up to this level (`0` = only the roots are visible, nothing expanded) |
| `shouldHandleKeyboardShortcuts` | `boolean` | `true` | Built-in clipboard / delete shortcuts (Ctrl/Cmd+C/X/V, Delete, Esc, Ctrl+Insert / Shift+Insert / Shift+Delete), focus-scoped to the tree. `false` = opt out |
| `shouldAlignNodeIcons` | `boolean` | `true` | Reserve the icon column so labels align on rows without an icon |
| `clickBehavior` | `ClickBehavior` | `'expand-and-focus'` | Node click behavior: `'select'` (click selects, dblclick expands), `'expand'` (click expands only), `'expand-and-focus'` (click selects + expands) |
| `isCheckboxesShown` | `boolean` | `false` | Show selection checkboxes before each node. Clicking a checkbox toggles the node's selection (same as Ctrl+click). |
| `orderMember` | `string \| null` | `null` | Property name for sort order (enables before/after positioning in drag-drop) |
| `indexerBatchSize` | `number \| null` | `25` | Number of nodes to process per batch during search indexing |
| `indexerTimeout` | `number \| null` | `50` | Maximum time (ms) to wait for idle callback before forcing indexing |
| `isLoading` | `boolean` | `false` | Show loading placeholder instead of tree content |
| `labels` | `Partial<TreeLabels>` | English defaults | UI strings merged per key: `noData` "No data" (no nodes), `noResults` "No results found" (search filter matched nothing), `dropHere` "Drop here", `noDisplayValue` "[N/A]" (node without a display value), `loading` "Loading…" (overlay aria-label), `showFullLabel` "Show full label" (the `nodeTitleOverflow: 'info'` button), and the built-in menu texts `copy` `cut` `paste` `delete` `expand` `collapse` `expandSubtree` `collapseSubtree` `expandAll` `collapseAll` `sort` `sortSubtree` `sortAll`. `''` = render nothing. Defaults: `DEFAULT_LABELS` |

### Rendering properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isFlatRenderingEnabled` | `boolean` | `true` | Use flat rendering mode (faster for large trees) |
| `isProgressiveRenderEnabled` | `boolean` | `true` | Progressively render nodes in batches |
| `initialBatchSize` | `number` | `20` | First batch size for progressive rendering |
| `maxBatchSize` | `number` | `500` | Maximum batch size cap |
| `isVirtualScrollEnabled` | `boolean` | `false` | Enable virtual scrolling (flat mode only, renders visible + overscan rows) |
| `virtualScrollItemHeight` | `number` | auto | Explicit row height in px (auto-measured from first row if not set) |
| `virtualScrollOverscan` | `number` | `5` | Extra rows rendered above/below viewport |
| `virtualScrollContainerHeight` | `string` | auto/`'400px'` | CSS height for scroll container (auto-detected from parent if not set) |
| `isRendering` | `boolean` (bindable) | `false` | Whether the tree is currently rendering (useful for progress indicators) |
| `onRenderStart` | `() => void` | `undefined` | Called when progressive rendering begins |
| `onRenderProgress` | `(rendered: number, total: number) => void` | `undefined` | Called after each batch with progress info |
| `onRenderComplete` | `() => void` | `undefined` | Called when progressive rendering finishes |

### Drag & drop properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dragDropMode` | `DragDropMode` | `'none'` | Controls allowed drag operations: `'none'`, `'self'`, `'cross'`, `'both'` |
| `dropZoneMode` | `string` | `'glow'` | Drop indicator style: `'floating'` or `'glow'` |
| `dropZoneLayout` | `string` | `'around'` | Zone arrangement: `'around'`, `'before'` (row above the node), `'after'` (row below the node), `'wave'`, `'wave2'` |
| `dropZoneStart` | `number \| string` | `33` | Where zones start horizontally (number=%, string=CSS value) |
| `dropZoneMaxWidth` | `number` | `120` | Max width in pixels for wave layouts |
| `isCopyAllowed` | `boolean` | `false` | Enable Ctrl+drag to copy instead of move |
| `shouldAutoHandleCopy` | `boolean` | `true` | Auto-handle same-tree copies (false for external DB/API) |
| `allowedDropPositionsMember` | `string \| null` | `null` | Property name for allowed drop positions array |
| `getAllowedDropPositionsCallback` | `({ node }) => DropPosition[] \| null` | `undefined` | Callback returning allowed drop positions per node |
| `beforeDropCallback` | `(dropNode, draggedNode, position, event, operation) => ...` | `undefined` | Async-capable callback to validate/modify drops |

### Event handler properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
Every `on*` event, `before*Callback` and per-node `get*Callback` ctx also carries **`controller`** (the `TreeController`, non-enumerable — destructure it; JSON / spread skip it). Every `on*` event receives a **single context object** mirroring the clipboard callbacks. The shared shape is `NodeRef<T> = { path, node, parent, siblings }` — the node the event is about plus the relational context the tree already resolved (`parent` node and `siblings`, the children of that parent), so you never need a `getNodeByPath(node.parentPath)` round-trip. `node`/`parent`/`siblings` are `null`/`[]` when the node isn't reachable (cross-tree, or removed by a cut). `NodeRef`, `NodeEventContext`, `NodeDragContext`, `NodeDropContext`, `ClipboardEventContext`, and `SelectionChangeContext` are exported from the package.

> **Drag/drop is single-origin.** A drag has one DOM origin, so `onNodeDragStart` / `onNodeDragOver` / `onNodeDrop` each fire **once**, even when multiple nodes are selected. `ctx.dragged` (on all three) carries the full top-level dragged set — the multi-selection, or a single-item array for a plain drag — so you never have to read `controller.selectedPaths` yourself. This holds **cross-tree too**: the source publishes its top-level set on drag start, so a cross-tree drop's `ctx.dragged` still lists every dragged path (as path-only refs — `node`/`parent` are `null` cross-tree). `source` (drop) is just the lead node of that set. Note the library only *auto-places* the lead node on a cross-tree drop; use `ctx.dragged` to fan out the rest yourself.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onNodeClick` | `(ctx: NodeRef<T>) => void` | `undefined` | Node click. `ctx.node` is the clicked node (`ctx.parent` / `ctx.siblings` also resolved). |
| `getNodeClassCallback` | `({ node }) => string \| null \| undefined` | `undefined` | Data-driven per-row class hook. Returned class(es) are applied to `.stv__node`. Recomputes when the node's `_rev` changes. |
| `getNodeContentClassCallback` | `({ node }) => string \| null \| undefined` | `undefined` | Like `getNodeClassCallback`, but applied to `.stv__node-content`. |
| `onNodeDoubleClick` | `(ctx: NodeRef<T>) => void` | `undefined` | Node double-click. Fires for every `clickBehavior` (detection is manual on the controller, so it's reliable in flat mode where the native `dblclick` is not — see [FLAT_MODE_PERFORMANCE.md](./FLAT_MODE_PERFORMANCE.md#double-click-detection-and-why-not-native-dblclick)). In `clickBehavior="select"` a double-click also toggles expand/collapse. |
| `onNodeDragStart` | `(ctx: NodeDragContext<T>) => void` | `undefined` | Drag start. `ctx` is the grabbed node's `NodeRef` + `{ event, dragged }`. `dragged` is the full top-level set in flight (see below). |
| `onNodeDragOver` | `(ctx: NodeDragContext<T>) => void` | `undefined` | Drag over. `ctx.node` is the **hovered** node; `ctx.dragged` is the in-flight set. |
| `onNodeDrop` | `(ctx: NodeDropContext<T>) => void` | `undefined` | Drop event. `ctx = { source, target, dragged, dropped, position, operation, event }`. `source` is the lead dragged node's `NodeRef`; `target` is the drop node's `NodeRef` **or `null`** (empty tree/root). `dragged` is the **full top-level dragged set** — a drop fires once even for a multi-drag, so this is how you see the whole set. `dropped` is the nodes the **library** placed (move: the moved nodes; copy: the fresh copies), or **`null`** when the library didn't place them (cross-tree drop, or `shouldAutoHandleMove`/`Copy=false`) and the consumer owns insertion. Position is `'before'`/`'after'`/`'child'`; operation is `'move'`/`'copy'`. Symmetric with `NodeTransformContext`. (Its twin `beforeDropCallback` remains the older 5-arg positional signature.) |
| `onSelectionChange` | `(ctx: SelectionChangeContext<T>) => void` | `undefined` | UI multi-select set (`selectedPaths`) changed. `ctx = { paths: Set<string>, nodes }`. Suppressed by `{ isSilent: true }` mutations. |
| `onCheckedChange` | `(ctx: SelectionChangeContext<T>) => void` | `undefined` | Checkbox set (`checkedPaths`) changed. Same shape as `onSelectionChange`. Suppressed by `{ isSilent: true }`. |
| `onNodeExpand` | `(ctx: NodeRef<T> & { controller }) => void` | `undefined` | A node expanded (toggle, keyboard, `expandNodes` — collapsed ancestors included —, after any `beforeExpandCallback` load). NOT `expandAll` / expand-level seeding. Suppressed by `isSilent`. |
| `onNodeCollapse` | `(ctx: NodeRef<T> & { controller }) => void` | `undefined` | A node collapsed (toggle, keyboard, `collapseNodes`, an accordion sibling). NOT `collapseAll`. Suppressed by `isSilent`. |
| `onExpandedChange` | `(ctx: ExpandedChangeContext<T>) => void` | `undefined` | The expanded set changed (any cause: toggle, keyboard, expand/collapse methods, `expandAll` / `collapseAll`, accordion, data changes). `ctx = { paths: Set<string>, controller }` — the whole new set (same as `expandedPaths`). Fires after the per-node events. Not fired for `isSilent` operations nor for assigning `bind:expandedPaths`. |
| `beforeExpandCallback` | `(ctx: BeforeExpandContext<T>) => boolean \| void \| Promise<boolean \| void>` | `undefined` | Runs before a collapsed node with children expands (toggle, keyboard, `expandNodes` — not `expandAll` / seeding / accordion; it also runs for `isSilent`). `false` keeps it collapsed. A **Promise defers the expand**: the node shows its loading state (spinner toggle, `aria-busy` + `data-loading` on the row; repeat toggles are ignored) until it settles — lazy loading: `ctx.controller.addBranch(ctx.path, children)` then resolve. A throw / rejection keeps it collapsed and is logged. `ctx` = the node's `NodeRef` + `controller`. |
| `onFocusChange` | `(ctx: FocusChangeContext<T>) => void` | `undefined` | The focused node changed (click, keyboard, `focusNode` / `clearFocus`, removal of the focused node). `ctx = { focusedNode: LTreeNode<T> \| null, controller }`. Not fired for `{ isSilent: true }` nor for assigning `bind:focusedNode`. |
| `onTreeChange` | `(ctx: { controller }) => void` | `undefined` | The tree's data / structure changed through a mutation (add / insert / move / remove / update / `applyChanges` / paste / drop / sort) — once per batch, on the microtask after `nodes` was re-collected. Not fired for loading new `nodes`. |
| `onNodesReorder` | `(ctx: NodesReorderContext<T>) => void` | `undefined` | `sortNodes` / `sortAll` rewrote one parent's `orderMember` values (custom `compareCallback` or `direction: 'desc'`). `ctx = { parentPath, nodes, changes: [{ path, oldOrder, newOrder }] }` — persist `changes`. Suppressed by `{ isSilent: true }`. |
| `onNodeCopy` | `(ctx: ClipboardEventContext<T>) => void` | `undefined` | Fired after `controller.copyNodes()` succeeds. `ctx = { operation: 'copy', paths, nodes }` (nodes live). |
| `onNodeCut` | `(ctx: ClipboardEventContext<T>) => void` | `undefined` | Fired after `controller.cutNodes()` succeeds. `ctx = { operation: 'cut', paths, nodes }` (nodes still live — cut only dims until paste). |
| `onNodeDelete` | `(ctx: ClipboardEventContext<T>) => void` | `undefined` | Fired after the built-in Delete (or `controller.runDeleteCommand()`) removes nodes. `ctx = { paths, nodes }` — `nodes` are **pre-removal snapshots** (captured before removal, since the tree no longer holds them). |
| `onNodePaste` | `(result: PasteResult) => void` | `undefined` | Fired after `controller.pasteNodes()` runs, with the paste result (`success`, `count`, `skipped`, `error`). |

### Context menu

Same model as `@keenmate/web-treeview` (core `/actions`, vendored). No menu by default — the menu is what the callback returns.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `getContextMenuItemsCallback` | `(ctx: TreeMenuContext<T>) => TreeMenuEntry<T>[]` | `undefined` | The menu for the node it opened on. `ctx = { node, path, parent, siblings, controller }`. Entries: action items (`{ id, text, icon, tooltip, shortcut, cssClass, isVisible, isDisabled, isDanger, isToggled, get*Callback(ctx), children / getChildrenCallback, onClick(detail), shouldCloseOnClick }`), `menuDivider(text?)`, and **built-in action names** (`'copy' 'cut' 'paste' 'delete' 'expand' 'collapse' 'expand-subtree' 'collapse-subtree' 'expand-all' 'collapse-all' 'sort' 'sort-subtree' 'sort-all'`, or `{ action: 'copy', …overrides }`). Built-ins take their text from `labels`, act on the **selection when the clicked node is in it, else on the clicked node** (`paste` pastes into the clicked node; `delete` = `runDeleteCommand`, `isDanger`; `paste` disabled with an empty clipboard; expand / collapse / sort disabled when nothing applies). |
| `beforeActionCallback` | `(detail: TreeActionEventDetail<T>) => boolean \| void \| Promise<…>` | `undefined` | Runs before an item activates; `false` cancels (no `onClick`, built-in or `onAction`). |
| `onAction` | `(detail: TreeActionEventDetail<T>) => void` | `undefined` | An item ran — after its `onClick` and the built-in. `detail` = the menu ctx + `{ action ('custom' for consumer items), id, item, source: 'context-menu', sourceEvent, triggerElement, dataset }`. |

Order: `beforeActionCallback` → item `onClick(detail)` → built-in → `onAction(detail)`. The menu closes after an item runs (`shouldCloseOnClick: false` keeps it open — close with `ctx.controller.closeContextMenu()`). A matching item `shortcut` (e.g. `'Ctrl+D'`) activates while the menu is open.

### Clipboard interceptor properties

The clipboard operations live on the `TreeController` (`copyNodes` / `cutNodes` / `pasteNodes` / `cancelCut`). Built-in key bindings are on by default (`shouldHandleKeyboardShortcuts`, set `false` to opt out), or wire your own via `beforeKeydownCallback(ctx)` (ctx = `{ event, focusedNode, selectedNodes, controller }`). The `before*` interceptors can rewrite or block an operation; `onNodeCopy` / `onNodeCut` / `onNodePaste` above are the post-operation notifications.

> **Keyboard shortcuts are focus-scoped.** Both the built-in shortcuts and `beforeKeydownCallback` are bound to the tree's `.stv__container` (which is `tabindex="0"`), so they only fire when focus is **inside** the tree — the standard DOM keyboard model for a component-scoped widget (there is no OS-clipboard fallback; it's a synthetic `keydown` handler). If the user touches a control *outside* the tree first (a toolbar button, checkbox, search box, dropdown), or hasn't clicked into the tree yet, a following `Ctrl/Cmd+C/X/V` or `Delete` never reaches the tree and silently does nothing. To make shortcuts work regardless of where the user last clicked, either (1) re-focus the container (`containerEl.focus()`) after your external control's handler, (2) auto-focus on hover/pointer-down — this ships for the empty-tree case via `isEmptyDropPlaceholderShown`, or (3) attach your own document/window-level `keydown` and forward to `controller.copyNodes` / `pasteNodes` / `runDeleteCommand` (you then own deciding whether a given key is meant for the tree).

The two per-node transforms are **operation-neutral** and defined by DIRECTION, not by copy/cut: `nodeOutputTransformationCallback` fires as a node LEAVES the source (egress — Ctrl+C/X snapshot and the capture side of a copy-drop), `nodeInputTransformationCallback` fires as a duplicate LANDS in a destination (ingress — Ctrl+V paste and the insert side of a copy-drop, same- or cross-tree). A plain move fires neither. Both share **one** context type, `NodeTransformContext<T>` = `{ operation, phase: 'output'|'input', isRoot, rootIndex, position: 'child'|'before'|'after'|null, source: { path, node, parent, siblings }, target: { path, node, parent, siblings } | null }`. `source` and `target` are **symmetric** — the same field means the same thing on each side: `node` is the node in question (source = the node leaving; target = the node you aimed at, `null` at the tree root), `parent` its parent, `siblings` its neighbours. `target` and `position` are `null` during the output phase (no destination chosen yet); `position` (mirroring `DropPosition`) says how the roots land relative to `target.node`. For collision names, the roots' landing neighbours are `target.node`'s children on a `'child'` paste, else `target.siblings` (all LIVE + batch-aware): `const landing = ctx.position === 'child' && ctx.target?.node ? Object.values(ctx.target.node.children) : (ctx.target?.siblings ?? []);`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `beforeCopyCallback` | `(ctx: BeforeCopyContext<T>) => string[] \| false \| void` | `undefined` | Runs before copy. `ctx = { operation, paths, nodes }`. Return a new path list to change the set, `false` to block |
| `beforeCutCallback` | `(ctx: BeforeCopyContext<T>) => string[] \| false \| void` | `undefined` | Runs before cut. Same shape as `beforeCopyCallback` |
| `beforePasteCallback` | `(ctx: BeforePasteContext<T>) => { targetPath?, position? } \| false \| void` | `undefined` | Runs before paste. `ctx = { operation, target: { path, node }, entries }` (entries are readonly snapshots). Redirect the target/position or return `false` to block |
| `beforeDeleteCallback` | `(ctx: BeforeDeleteContext<T>) => string[] \| false \| void` | `undefined` | Runs before the built-in Delete. `ctx = { paths, nodes }`. Return a narrowed path list or `false` to block |
| `nodeOutputTransformationCallback` | `({ data, ...ctx }: NodeTransformCallbackContext<T>) => T` | `undefined` | OUTPUT/egress — per-node clean/redact as a node leaves the source (phase `'output'`, `target` + `position` null). Fires on Ctrl+C/X and the capture side of a copy-drop |
| `nodeInputTransformationCallback` | `({ data, ...ctx }: NodeTransformCallbackContext<T>) => T \| null` | `undefined` | INPUT/ingress — per-node derive ids/values/names as a duplicate lands (phase `'input'`); return `null` to skip. Fires on paste and the insert side of a copy-drop |

### Visual styling properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `bodyClass` | `string \| null` | `undefined` | CSS class for tree body |
| `focusedNodeClass` | `string \| null` | `undefined` | CSS class applied to the focused node |
| `dragOverNodeClass` | `string \| null` | `undefined` | CSS class for nodes being dragged over |
| `iconSet` | `'chevron' \| 'triangle' \| 'plus-minus' \| 'arrow'` | `'chevron'` | Disclosure glyph — one knob that re-points the `--stv-icon-*` set (chains to `--base-icon-*`). See [theming](./theming.md#disclosure-glyph-iconset). |
| `toggleIconMode` | `'rotate' \| 'swap'` | `'rotate'` | Whether the glyph rotates or swaps to the collapse glyph on expand (`plus-minus` always swaps) |
| `leafIconClass` | `string \| null` | `"stv__toggle-icon--leaf"` | CSS class for leaf node icons |
| `flatIndentSize` | `string \| null` | `var(--stv-indent-size)` | Indent per level in flat rendering (a CSS length, e.g. `'24px'`) |
| `nodeTitleOverflow` | `'wrap' \| 'ellipsis' \| 'info'` | `'ellipsis'` | A built-in label wider than the row: `ellipsis` clips on one line (fixed row heights — what virtual scroll needs), `wrap` grows the row, `info` = ellipsis + a trailing ⓘ on clipped rows that reveals the full label (accessible name: `labels.showFullLabel`) |
| `scrollHighlightTimeout` | `number \| null` | `4000` | Duration (ms) for scroll highlight animation |
| `scrollHighlightClass` | `string \| null` | `'stv__scroll-highlight'` | CSS class to apply for scroll highlight effect |

### Snippets

| Snippet | Parameters | Description |
|---------|------------|-------------|
| `nodeTemplate` | `(node)` | Custom node template |
| `treeHeader` | | Tree header content |
| `treeFooter` | | Tree footer content |
| `noData` | | Content shown when tree has no data (falls back to `labels.noData` "No data", or `labels.noResults` "No results found" when the search filter matched nothing) |
| `dropPlaceholder` | | Content shown in empty drop target tree |
| `loadingPlaceholder` | | Content shown while `isLoading` is true |
| `contextMenu` | `(node, closeMenu)` | Context menu template (an alternative to `getContextMenuItemsCallback`; use `ContextMenuItemC` / `ContextMenuDividerC`) |

## Public methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `expandNodes` | `paths: string \| string[], opts?: ExpandOptions` | Expand the nodes one level (ancestors opened) |
| `collapseNodes` | `paths: string \| string[], opts?: ExpandOptions` | Collapse the nodes (one level) |
| `toggleNodeExpanded` | `path: string, opts?: ExpandOptions` | Expand a collapsed node / collapse an expanded one (the toggle UI path: accordion + `beforeExpandCallback`; leaves / non-collapsible / pending nodes are ignored). The expand methods return a Promise that settles after an async `beforeExpandCallback` |
| `expandAll` | `paths?: string \| string[] \| null, opts?: ExpandOptions` | Whole tree (`null`/omitted), or the given nodes + all descendants |
| `collapseAll` | `paths?: string \| string[] \| null, opts?: ExpandOptions` | Whole tree (`null`/omitted), or the given nodes + all descendants |
| `filterNodes` | `searchTerm: string, searchOptions?: SearchOptions` | Filter the tree display using internal search index with optional FlexSearch options |
| `searchNodes` | `searchTerm: string \| null \| undefined, searchOptions?: SearchOptions` | Search nodes using internal search index and return matching nodes with optional FlexSearch options |
| `scrollToPath` | `path: string, options?: ScrollToPathOptions` | Scroll to and highlight a specific node |
| `update` | `updates: Partial<Props>` | Programmatically update component props from external JavaScript |
| `addNode` | `parentPath: string, data: T, pathSegment?: string` | Add a new node under the specified parent |
| `insertNode` | `targetPath: string, data: T, position: 'before' \| 'after' \| 'child'` | Insert a node next to (or under) the target; `orderMember` → order value between the neighbours |
| `addBranch` | `parentPath: string, data: T[]` | Add a subtree (flat rows with ltree paths) under the parent, one emission |
| `insertBranch` | `targetPath: string, data: T[], position` | Insert a subtree block before / after / under the target (block keeps its order) |
| `moveNode` | `sourcePath: string, targetPath: string, position: 'before' \| 'after' \| 'child'` | Move a node to a new location |
| `moveNodes` | `paths: string[], targetPath: string, position: DropPosition` | Batch-move a complete manifest; a descendant omitted from the manifest is left behind (re-homed to its moved root's old parent). Returns `{ success, movedNodes, leftBehind }` |
| `duplicateNodes` | `paths: string[], targetPath: string, position: DropPosition, transform?, sourceTree?` | Batch-copy the copy-side twin of `moveNodes`; an omitted descendant is simply not copied. `sourceTree` copies another tree's nodes in (cross-tree). Returns `{ success, copiedNodes, skipped }` |
| `removeNode` | `path: string, includeDescendants?: boolean` | Remove a node (and optionally its descendants) |
| `removeNodes` | `paths: string[]` | Remove several subtrees programmatically (no `beforeDeleteCallback`, no `onNodeDelete`). The user Delete command is `controller.runDeleteCommand(paths?)` (veto + event) |
| `getNodeByPath` | `path: string` | Get a node by its path |
| `getChildren` | `parentPath: string` | Get direct children of a node |
| `getSiblings` | `path: string` | Get siblings of a node (including itself) |
| `updateNode` | `path: string, data: Partial<T>` | Update a node's data properties |
| `copyNodeWithDescendants` | `sourcePath: string, targetPath: string, position: DropPosition` | Copy a node and its subtree to a new location |
| `refreshNode` | `path: string` | Force re-render of a specific node |
| `refreshSiblings` | `parentPath: string` | Re-sort a parent's children by the tree's rule (= `sortNodes(parentPath)`) |
| `sortNodes` | `paths: string \| string[], options?: SortOptions` | Sort the children of each node — one level (`''` = root level) |
| `sortAll` | `paths?: string \| string[] \| null, options?: SortOptions` | Sort whole subtrees (`null` / omitted = the whole tree) |
| `applyChanges` | `changes: TreeChange<T>[]` | Batch: `add` {parentPath, data, pathSegment?} / `insert` {targetPath, position, data} / `update` {path, data} / `remove` {path} |
| `closeContextMenu` | | Programmatically close the context menu |
| `openContextMenu` | `path: string, x: number, y: number` | Open the context menu for the node at `path` at viewport coordinates (offsets applied; unknown path = no-op) |
| `getNodeRef` | `nodeOrPath: LTreeNode<T> \| string` | `{ path, node, parent, siblings }` (node / parent `null` for an unknown path) |
| `getVisibleFlatNodes` | | The visible nodes in display order (expanded + search filter) |
| `getTree` | | The underlying LTree (advanced) |
| `isNodeDropAllowed` | `path: string` | Whether the node accepts drops (`getIsDropAllowedCallback` > `isDropAllowedMember`); `false` for an unknown path |
| `copyNodes` / `cutNodes` | `paths?: string[]` | Copy / cut `paths` (default: the selection) — `before*Callback`, `onNodeCopy` / `onNodeCut` |
| `pasteNodes` | `targetPath, transform?, position = 'child'` | Paste the clipboard → `PasteResult` (`beforePasteCallback`, `onNodePaste`) |
| `cancelCut` / `hasClipboardContent` / `getClipboardOperation` | | Clipboard state (page-wide clipboard) |
| `navTo(path)`, `navNext`, `navPrev`, `navNextSibling`, `navPrevSibling`, `navInto`, `navOut`, `navBackOut`, `navToggle`, `navFirst`, `navLast`, `navPageDown`, `navPageUp`, `navSelectNext`, `navSelectPrev`, `navSelectFirst`, `navSelectLast`, `navSelectPageDown`, `navSelectPageUp` | | Keyboard navigation — what the built-in keys call (overridable via `navigationOverrides`). `navNext` / `navPrev` = next / previous visible node (flat order) |

`ExpandOptions = { isExclusive?: boolean; isSilent?: boolean }` — `isExclusive` (expand only) collapses every open branch off the targets' spine; `isSilent` suppresses events / callbacks only — the tree always re-renders (svelte-treeview has no expand callbacks, so it is accepted for API parity).

### Sorting & positions

Siblings are ordered by one rule: **`sortCallback`** (if set — it may use the order field itself)
→ **`orderMember`** (display value breaks ties) → the display value compared with `Intl.Collator(undefined, { numeric: true })` (`'Item 2'` before
`'Item 10'`). The tree re-sorts **only the siblings of the affected parent** — on the initial load
(unless `isSorted`), `addNode` / `addBranch`, `moveNode` / drop, `insertNode` / `insertBranch`
(with `orderMember`), and `updateNode` when it changes the order value.

An exact before / after position therefore needs **`orderMember`** (the moved / inserted node gets an
order value between its neighbours, so the re-sort keeps it there) **or `isSortingEnabled={false}`**
(no auto-sort at all: input order kept, `addNode` appends at the end, positioned operations place
the node exactly — with `orderMember` the order values are still computed for persistence). Without
either, a direct placement only lasts until the next re-sort of that parent.

`sortNodes` / `sortAll` sort explicitly (also when auto-sorting is off). `SortOptions =
{ compareCallback?: ({ a, b }) => number; direction?: 'asc' | 'desc'; isSilent?: boolean }` —
`compareCallback` is an ascending comparator over two sibling `LTreeNode`s; `direction: 'desc'`
reverses whichever rule applies. With `orderMember` set, a custom compare (or `'desc'`) rewrites the
order values to 10, 20, 30… and fires `onNodesReorder` once per affected parent; `isSilent`
suppresses that callback (the tree always re-renders).

```ts
treeRef.sortAll(null, { compareCallback: ({ a, b }) => a.data.size - b.data.size, direction: 'desc' });
```

### Selection / checked / focus methods

Three independent concerns, each with the same method shape. `opts` is always `TreeMutationOptions = { isSilent?: boolean }` — pass `{ isSilent: true }` to mutate state without firing the change callbacks (e.g. restoring state from a URL). Keep the verbs straight: **`select*`** drives the UI multi-select set (`selectedPaths`), **`check*`** drives the checkbox/data set (`checkedPaths`), **`focus*`** drives the single cursor (`focusedNode`).

| Method | Parameters | Description |
|--------|------------|-------------|
| `selectNode` | `path: string, mode?: SelectMode, opts?` | Select one node. `mode`: `'replace'` (plain click, default), `'toggle'` (Ctrl+click), `'range'` (Shift+click from cursor) |
| `selectNodes` | `paths: string[], opts?` | Add nodes to the selection (**additive**) |
| `selectAll` | `opts?` | Select every visible node (Ctrl+A) |
| `clearSelection` | `paths?: string[], opts?` | Clear the given paths, or all when omitted |
| `checkNode` | `path: string, opts?` | Check one node (cascades to descendants in cascade mode) |
| `checkNodes` | `paths: string[], opts?` | Check nodes (**additive**) |
| `checkAll` | `opts?` | Check every selectable node |
| `uncheckNode` | `path: string, opts?` | Uncheck one node (cascades in cascade mode) |
| `uncheckNodes` | `paths: string[], opts?` | Uncheck nodes (cascades in cascade mode) |
| `uncheckAll` | `opts?` | Uncheck every node |
| `getSelectedNodes` | | The selected nodes (`selectedPaths`, resolved) |
| `isNodeSelected` | `path: string` | Whether the node is in the selection |
| `focusNode` | `path: string, opts?` | Move focus to a node (fires `onFocusChange` unless `{ isSilent: true }`) |
| `clearFocus` | `opts?` | Clear the focused node |

Read-side helpers: `getSelectedNodes()` / `isNodeSelected(path)` / `getCheckedNodes()` / `isNodeChecked(path)`.

### ScrollToPath options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shouldExpandAncestors` | `boolean` | `true` | Expand the node's collapsed ancestors first so its row exists |
| `shouldHighlight` | `boolean` | `false` | Flash `scrollHighlightClass` (for `scrollHighlightTimeout`) on the row |
| `behavior` | `ScrollBehavior` | `'smooth'` | Native `ScrollIntoViewOptions.behavior` |
| `block` | `ScrollLogicalPosition` | `'center'` | Native `ScrollIntoViewOptions.block` |
| `inline` | `ScrollLogicalPosition` | `'nearest'` | Native `ScrollIntoViewOptions.inline` |

`ScrollToPathOptions` is the same as web-treeview's. Returns `Promise<boolean>` (`false` when the path doesn't exist).

```typescript
// Basic usage — scroll to path with default options
await tree.scrollToPath('1.2.3');

// Custom options
await tree.scrollToPath('1.2.3', {
  shouldExpandAncestors: false, // the row must already be visible
  shouldHighlight: true,        // flash scrollHighlightClass
  behavior: 'instant',
  block: 'start'
});
```

```svelte
<!-- Default background highlight -->
<Tree
  nodes={data}
  idMember="path"
  pathMember="path"
  scrollHighlightClass="stv__scroll-highlight"
  scrollHighlightTimeout={5000}
/>

<!-- Red arrow highlight -->
<Tree
  nodes={data}
  idMember="path"
  pathMember="path"
  scrollHighlightClass="stv__scroll-highlight--arrow"
  scrollHighlightTimeout={3000}
/>
```

**Available built-in highlight classes:**
- `stv__scroll-highlight` — background glow with primary color (default)
- `stv__scroll-highlight--arrow` — red left arrow indicator

## Statistics

The tree provides real-time statistics about the loaded data:

| Property | Type | Description |
|----------|------|-------------|
| `statistics` | `{ nodeCount: number; maxLevel: number; filteredNodeCount: number; isIndexing: boolean; pendingIndexCount: number }` | Current node count, maximum depth level, filtered nodes count, indexing status, and pending index count |

```typescript
const { nodeCount, maxLevel, filteredNodeCount, isIndexing, pendingIndexCount } = tree.statistics;
console.log(`Tree has ${nodeCount} nodes with maximum depth of ${maxLevel} levels`);
if (filteredNodeCount > 0) {
  console.log(`Currently showing ${filteredNodeCount} filtered nodes`);
}
if (isIndexing) {
  console.log(`Search indexing in progress: ${pendingIndexCount} nodes pending`);
}
```

## External updates (vanilla JavaScript)

The `update()` method allows you to programmatically update component props from external JavaScript code (outside of Svelte's reactivity system). This is particularly useful for HTML/JavaScript integration or dynamic configuration from non-Svelte code.

```javascript
// Get reference to the tree component
const treeElement = document.querySelector('#my-tree');

// Update multiple props at once
treeElement.update({
  searchTerm: 'Production',
  expandLevel: 3,
  data: newDataArray,
  contextMenuXOffset: 10
});

// Update single prop
treeElement.update({ searchTerm: 'new search' });
```

**Updatable properties** — all Tree props can be updated except snippets/templates, including:
- Data and state: `data`, `searchTerm`, `focusedNode`, `expandLevel`
- Members: `idMember`, `pathMember`, `displayValueMember`, `searchValueMember`
- Callbacks: `sortCallback`, `getDisplayValueCallback`, `onNodeClick`, etc.
- Visual: `bodyClass`, `focusedNodeClass`, `iconSet`, etc.
- Context menu: `getContextMenuItemsCallback`, `beforeActionCallback`, `onAction`, `contextMenuXOffset`, `contextMenuYOffset`
- Behavior: `clickBehavior`, `shouldUseInternalSearchIndex`, etc.

## Debug logging

There is no in-tree debug panel. Turn on the category loggers instead:

```typescript
import { enableLogging, setCategoryLevel } from '@keenmate/svelte-treeview';

enableLogging();                            // everything
setCategoryLevel('LTREE:DATA', 'debug');    // or just one category
```

Categories cover data mapping/sorting, filtering and search, tree structure changes, indexer progress and drag-and-drop.
