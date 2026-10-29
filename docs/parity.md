# svelte-treeview ↔ web-treeview API parity

Living checklist of the public API of `@keenmate/svelte-treeview` (`<Tree>`) against its sibling
`@keenmate/web-treeview` (`<web-treeview>`) — the same content as web-treeview's `docs/parity.md`. **Any public API change must update this file and
be mirrored in the sibling library (or recorded here as intentional).**

Status: **same** = identical name, type, default and semantics · **intentional** = a deliberate
difference (the reason is given). Web names are element properties / `TreeViewConfig` keys (HTML
attribute in parentheses); svelte names are `<Tree>` props / exports. Decided 2026-10-28, synced against both codebases 2026-10-29
(parity pass: `_agent-progress/parity-brief.md`, audit `_agent-progress/treeview-parity.md`).

## 1. Data / config inputs

| web | svelte | status |
|---|---|---|
| `treeId`, `idMember`, `pathMember`, `displayValueMember`, `parentPathMember`, `levelMember`, `isExpandedMember`, `isCheckedMember`, `isDraggableMember`, `isDropAllowedMember`, `hasChildrenMember`, `searchValueMember`, `isSelectableMember`, `isCollapsibleMember`, `orderMember`, `allowedDropPositionsMember`, `iconMember`, `iconColorMember` | same | same |
| `treePathSeparator` (`'.'`), `clickBehavior` (`'expand-and-focus'`), `shouldExpandAsAccordion`, `isSortingEnabled` (`true`), `isSorted` | same | same |
| `expandLevel` (`expand-level`, default `0` = roots only) | `expandLevel` (`0`) | same |
| `shouldUseInternalSearchIndex` (`use-internal-search-index`, default `true`) | same (`true`) | same |
| `initializeIndexCallback` (JS only, `() => Index`) | same | same |
| `indexerBatchSize`, `indexerTimeout`, `searchTerm` | same (`searchTerm` `$bindable`) | same |
| `shouldHandleKeyboardShortcuts` (`handle-keyboard-shortcuts`, default `true`) | same (`true`) | same |
| `shouldAlignNodeIcons` (`align-node-icons`, default `true`) | same (`true`) | same |
| `theme`, `bodyClass`, `selectedNodeClass`, `focusedNodeClass`, `checkedNodeClass`, `dragOverNodeClass`, `draggedNodeClass` | same | same |
| `isNodeTooltipsShown`, `tooltipPlacement`, `tooltipDelay`, `tooltipOffset`, `shouldTooltipFollowCursor` | same | same |
| `iconSet`, `leafIconClass`, `toggleIconMode` | same | same |
| — (`expandIconClass` / `collapseIconClass` removed) | — (removed) | same |
| `scrollHighlightClass` (null → built-in `wtv__…`), `scrollHighlightTimeout` | `scrollHighlightClass` (`'stv__…'`), same | intentional — class prefix |
| `nodeTitleOverflow` (`node-title-overflow`: `wrap` \| `ellipsis` \| `info`, default `ellipsis`) | `nodeTitleOverflow` (default `ellipsis`) | same |
| `flatIndentSize` | `flatIndentSize` | same |
| `contextMenuXOffset`, `contextMenuYOffset`, `isLoading` | same | same |
| `dragDropMode`, `dropZoneMode`, `dropZoneLayout`, `dropZoneStart`, `dropZoneMaxWidth`, `isCopyAllowed`, `touchDragDelay`, `shouldIndicateUndraggable`, `isTreeDropZoneEnabled` | same | same |
| `shouldAutoHandleCopy`, `shouldAutoHandleMove` (`auto-handle-move`), `shouldAutoHandlePaste` | same | same |
| `labels` | `labels` | same (keys: §7) |
| `isEmptyDropPlaceholderShown`, `isFlatRenderingEnabled`, `isProgressiveRenderEnabled`, `initialBatchSize`, `maxBatchSize` | same | same |
| `isVirtualScrollEnabled`, `virtualScrollItemHeight`, `virtualScrollOverscan`, `virtualScrollContainerHeight` | same | same |
| `selectionMode`, `rangeSelectionMode`, `navigationOverrides`, `isCheckboxesShown`, `checkboxMode`, `cascadeCheckPolicy`, `shouldClickToggleCheckbox` | same | same |
| `sortCallback`, `nodeOutputTransformationCallback`, `nodeInputTransformationCallback` | same | same |
| `getCustomStylesCallback` | — | intentional — shadow-DOM style injection; svelte styles are global CSS |
| `renderer` (pluggable `TreeViewRenderer`) | — | intentional — web-only DOM renderer swap |
| core element plumbing: `defer` / `release()` / `whenReady()` / `whenSettled()` / `flush()` / `destroy()` / `isDisabled` | — | intentional — `BlissElement` lifecycle |

## 2. State

| web | svelte | status |
|---|---|---|
| `nodes` (input + live state) | `nodes` (`$bindable`) | same |
| `expandedPaths: string[]` (get / set) | `expandedPaths: Set<string>` (`$bindable`) | intentional — `string[]` vs `Set` (framework idiom) |
| `selectedPaths: string[]` (get / set) | `selectedPaths: Set<string>` (`$bindable`) | intentional — same |
| `checkedPaths: string[]` (get / set) | `checkedPaths: Set<string>` (`$bindable`) | intentional — same |
| `focusedNode` (read-only; `focusNode()` / `clearFocus()` move it) | `focusedNode` (`$bindable`, writable) | intentional — bindable in svelte |
| `insertResult` (read-only) | `insertResult` (`$bindable`) | same |
| `isRendering` (read-only) | `isRendering` (`$bindable`) | same |
| `containerSize` (read-only, `{ width, height } \| null`) | `containerSize` (`$bindable`) | same |
| `selectionAnchor` (get / set) | `selectionAnchor` (get / set) | same |

## 3. Events (web) ↔ callback props (svelte)

Every web event has an `on<Name>` twin receiving the detail; every detail / ctx carries `controller`
(svelte: `controller` too; web also `element`).

| web event (twin) | svelte prop | status |
|---|---|---|
| `node-click`, `node-double-click`, `node-expand`, `node-collapse` | `onNodeClick`, `onNodeDoubleClick`, `onNodeExpand`, `onNodeCollapse` | same |
| `node-copy`, `node-cut`, `node-paste`, `node-delete` | `onNodeCopy`, `onNodeCut`, `onNodePaste`, `onNodeDelete` | same |
| `node-drag-start`, `node-drag-over`, `node-drop`, `node-drag-reject`, `node-drop-reject` | `onNodeDragStart`, `onNodeDragOver`, `onNodeDrop`, `onNodeDragReject`, `onNodeDropReject` | same |
| `selection-change`, `checked-change` (`paths: string[]`) | `onSelectionChange`, `onCheckedChange` (`paths: Set`) | intentional — `string[]` vs `Set` |
| `focus-change` (`{ focusedNode }`) | `onFocusChange` | same |
| `expanded-change` (`{ paths }`) | `onExpandedChange` (`paths: Set`) | intentional — `string[]` vs `Set` |
| `nodes-reorder`, `tree-change`, `action` | `onNodesReorder`, `onTreeChange`, `onAction` | same |
| `render-start`, `render-progress`, `render-complete` (`{ pending, processed }`) | `onRenderStart`, `onRenderProgress`, `onRenderComplete` | same — web fires them around its progressive flat render (the only progressive path of the DOM renderer); svelte around its progressive recursive render |
| `container-resize` (`{ size, deviceClass }`) | `onContainerResize` | same |
| `ready` (core) | — | intentional — core element lifecycle |

## 4. before*Callbacks

| web | svelte | status |
|---|---|---|
| `beforeCopyCallback`, `beforeCutCallback`, `beforePasteCallback`, `beforeDeleteCallback`, `beforeDropCallback`, `beforeDragStartCallback`, `beforeCheckboxToggleCallback`, `beforeKeydownCallback`, `beforeExpandCallback`, `beforeActionCallback` | same | same |

## 5. get* callbacks / render hooks

| web | svelte | status |
|---|---|---|
| `getDisplayValueCallback`, `getSearchValueCallback`, `getIsExpandedCallback`, `getIsCheckedCallback`, `getIsSelectableCallback`, `getIsDraggableCallback`, `getIsDropAllowedCallback`, `getIsCollapsibleCallback`, `getAllowedDropPositionsCallback`, `getIconCallback`, `getIconColorCallback`, `getNodeClassCallback`, `getNodeContentClassCallback` | same | same |
| `getNodeTooltipCallback` (→ `string \| HTMLElement`) | `getNodeTooltipCallback` (→ `string`) + `tooltip` snippet | intentional — rich content is a snippet in svelte |
| `getContextMenuItemsCallback(ctx)` — ctx `{ node, path, parent, siblings, controller }`; entries = core action items + `menuDivider()` + built-in names `copy cut paste delete expand collapse expand-subtree collapse-subtree expand-all collapse-all sort sort-subtree sort-all`; order `beforeActionCallback` → item `onClick` → built-in → `action` | same model (vendored core types + runner) | same — **no default menu in either** (the menu is what the callback returns) |
| `renderNodeCallback`, `renderIconCallback`, `renderEmptyStateCallback`, `renderEmptyZoneCallback`, `renderLoadingCallback`, `renderHeaderCallback`, `renderFooterCallback`, `renderContextMenuCallback`, `renderContextMenuItemCallback` | snippets `nodeTemplate`, `icon`, `noData`, `dropPlaceholder`, `loadingPlaceholder`, `treeHeader`, `treeFooter`, `contextMenu` (+ exported `ContextMenuItem`) | intentional — render callbacks vs Svelte snippets |
| `isLoading` overlay = the suite's shared loader (core `renderLoader`, context `'overlay'`): `renderLoadingCallback` > page-wide `window.components.renderLoaderCallback` > default `.wtv-loader`; container `role="status"` + `aria-label` = label `loading` | `loadingPlaceholder` snippet > page-wide `window.components.renderLoaderCallback` (read without core: `window.components` / `Symbol.for('@keenmate/web-components-core:loader')`; ctx `{ component: 'svelte-treeview', context: 'overlay', containerElement, element: .stv__container, label }`, cleanup honoured, a throwing hook → default) > default `.stv-loader`; same `role` / `aria-label` | same precedence (snippet in place of the instance hook) |
| per-node lazy-load loader (async `beforeExpandCallback`): the loader shape in the toggle, CSS-only (row `aria-busy` + `data-loading`, no hook, no `role="status"`) | same | same |

## 6. Methods (web: element + `el.controller`; svelte: `<Tree>` exports + controller)

| web | svelte | status |
|---|---|---|
| `expandNodes`, `collapseNodes`, `toggleNodeExpanded` (sync) | same (async — await `tick`) | intentional — svelte returns a Promise |
| `expandAll`, `collapseAll`, `sortNodes`, `sortAll` | same | same |
| `filterNodes(term, searchOptions?)`, `searchNodes(term, searchOptions?)` | same | same |
| `scrollToPath(path, { shouldExpandAncestors = true, shouldHighlight = false, behavior?, block?, inline? }): Promise<boolean>` | same | same |
| `getNodeByPath`, `getChildren`, `getSiblings`, `getNodeRef(path)`, `getVisibleFlatNodes()`, `getTree()` | same | same |
| `refreshNode(path)`, `refreshSiblings(parentPath)` | same | same |
| `isNodeDropAllowed(path): boolean` | same | same |
| `addNode`, `insertNode`, `updateNode`, `removeNode`, `removeNodes`, `moveNode`, `moveNodes`, `duplicateNodes(…, transform?, sourceTree?)`, `applyChanges`, `copyNodeWithDescendants` | same | same |
| `addBranch` / `insertBranch` → `InsertBranchResult`; `replaceBranch` → `ReplaceBranchResult`; `removeBranch` → `RemoveBranchResult` (`{ success, count, error? }`) | same (exported types identical) | same |
| `selectNode`, `selectNodes`, `selectAll`, `clearSelection`, `getSelectedNodes`, `isNodeSelected`, `toggleFocusedSelect()` | same | same |
| `checkNode(s)`, `checkAll`, `uncheckNode(s)`, `uncheckAll`, `getCheckedNodes`, `isNodeChecked` | same | same |
| `focusNode`, `clearFocus` (honour `isSilent`) | same | same |
| `openContextMenu(path, x, y)`, `closeContextMenu()` | same | same |
| `activateMenuItem(item, ctx, trigger?, event?)` (element + controller) — for `renderContextMenuCallback`, whose ctx carries the resolved `entries` | `controller.activateMenuItem(item, ctx, trigger?, event?)` + `controller.menuContext(node \| null)`, `controller.menuItemDefaults(item, ctx)` — activation = the built-in menu's path (`beforeActionCallback` veto → `onClick` → built-in → `onAction`); a node-less ctx (`menuContext(null)`, menus over empty space) runs only the node-free built-ins | same activator. Intentional svelte-only: `menuContext` / `menuItemDefaults` and node-less menus (headless controller + custom renderers, e.g. svelte-treeview-canvas); web hands its renderer pre-resolved `ctx.entries` |
| `navTo`, `navNext`, `navPrev`, `navNextSibling`, `navPrevSibling`, `navInto`, `navOut`, `navBackOut`, `navToggle`, `navFirst`, `navLast`, `navPageDown`, `navPageUp`, `navSelectNext`, `navSelectPrev`, `navSelectFirst`, `navSelectLast`, `navSelectPageDown`, `navSelectPageUp` | same | same |
| `copyNodes`, `cutNodes`, `pasteNodes`, `cancelCut`, `hasClipboardContent`, `getClipboardOperation` | same | same |
| `update(props)` (element) / `WebTreeView.update` | `<Tree>` `update(partial)` | same |
| `release`, `whenReady`, `whenSettled`, `flush`, `destroy` (core) | — (`destroy` on the controller) | intentional — core element lifecycle |

## 7. Labels (`labels` input, partial, English defaults)

| key | web | svelte | status |
|---|---|---|---|
| `noData`, `noResults`, `noDisplayValue`, `loading`, `dropHere` | ✓ | ✓ | same |
| `copy`, `cut`, `paste`, `delete`, `expand`, `collapse`, `expandSubtree`, `collapseSubtree`, `expandAll`, `collapseAll`, `sort`, `sortSubtree`, `sortAll` | ✓ | ✓ | same |
| `showFullLabel` ("Show full label" — aria-label of the `nodeTitleOverflow: 'info'` button) | ✓ | ✓ | same |
| export `DEFAULT_LABELS`, type `TreeViewLabels` | ✓ | `DEFAULT_LABELS`, type `TreeLabels` | intentional — type named after each library's component |

## 8. Exports

| web | svelte | status |
|---|---|---|
| `menuDivider`, `DEFAULT_LABELS`, `resolveLabel`, `RemoveBranchResult`, `ReplaceBranchResult`, `InsertBranchResult`, `NodeTitleOverflow`, `RenderStats`, `ScrollToPathOptions` | same | same |
| menu types `TreeMenuContext`, `TreeMenuItem`, `TreeMenuEntry`, `TreeViewAction`, `TreeViewActionEventDetail` | `TreeMenuContext`, `TreeMenuItem`, `TreeMenuEntry`, `TreeAction`, `TreeActionEventDetail` | intentional — named after each library's component (like `TreeViewLabels` / `TreeLabels`) |
| ctx `controller` + `element` (core component context, non-enumerable) | ctx `controller` (non-enumerable) | intentional — no host element in svelte |
| `createLTree`, `TreeEngine`, `EventEmitter`, `DomRenderer`, `createRenderCoordinator`, clipboard / drag-set registry helpers, per-category loggers | — | intentional — web is renderer-pluggable / headless-capable |
| `getMenuChildren`, `ResolvedMenuEntry` (re-exported from core `/actions`) | `resolveMenuEntries`, `getMenuChildren`, `ResolvedMenuEntry` (vendored core `/actions` resolvers) | `getMenuChildren` / `ResolvedMenuEntry` same; `resolveMenuEntries` svelte-only (web resolves for its renderer — `ctx.entries`; or import it from `@keenmate/web-components-core/actions`) |
| — | `TreeProvider`, `createTreeController`, `TreeController`, `ContextMenuItem` / divider components, `tooltip` action, environment helpers | intentional — Svelte framework exports |

## 9. Behaviour notes

- Keyboard (WAI-ARIA, both): `Enter` = the node's default action (expand / collapse); `Space` = toggle selection — the checkbox when checkboxes are shown, the focused node in the selection in `multiple` mode, selects the focused node in `single` mode; `Space` never expands / collapses — same.
- Assigning the expanded / selected / checked set (`expandedPaths` / `selectedPaths` / `checkedPaths`; web: also the values held before the first build) is silent in both — no `expanded-change` / `selection-change` / `checked-change` / `focus-change` / `tree-change`. The methods (`expandNodes`, `selectNodes`, `checkNodes`, …) and user interaction announce (unless `{ isSilent: true }`) — same.
- `expanded-change` / `onExpandedChange` from the expand / collapse methods (and toggle / keyboard) fires synchronously, after that call's `node-expand` / `node-collapse`; after a data change it follows on the next microtask — same.
- `tree-change` / `onTreeChange`: only after data / structure mutations (add / insert / update / move / remove / `applyChanges` / branch ops / paste / drop / duplicate / sort), one per change (coalesced on a microtask), never for expand / select / check / focus nor for loading `nodes` — same.
- An `isSilent` expand still runs `beforeExpandCallback` (a gate, not a notification); `expandAll` flags leaves `isExpanded`, so they are in `expandedPaths` — same.
- svelte only: callbacks invoked while rendering (`getContextMenuItemsCallback`, per-node `get*Callback`s) must not write `$state` synchronously (Svelte's `state_unsafe_mutation`) — defer with `queueMicrotask` if needed. Intentional (framework rule).
- Class prefixes `wtv__` vs `stv__`, CSS custom properties `--wtv-*` vs `--stv-*` — intentional prefix.
- Neither exposes `::part()` / `<slot>` (render callbacks vs snippets) — intentional.
- Loader (`isLoading` overlay, per-node lazy-load toggle): web draws the shared KeenMate loader — a `currentColor` mask from `--wtv-loader-*` → `--base-loader-*` (one look across components, slows under reduced motion, never stops); the overlay is `role="status"` + `aria-label` = `labels.loading` while loading, removed after — same in svelte (`--stv-loader-*`). Sizes: `loader-size` (→ `--base-loader-size`), the overlay `loader-overlay-size` (2×) and the per-node `loader-inline-size` (0.75×, CSS-only, `aria-busy` on the row) — same.
- Scrolling — keyboard moves (`navTo`: arrows, PageUp / PageDown, Home / End, Shift range moves; virtual scroll included) **always scroll instantly** (`behavior: 'auto'`), never with the token, so a held key never lags behind an animation — same (KeenMate rule, 2026-10-29). Programmatic jumps — `scrollToPath` with no `behavior` passed — read `--*-scroll-behavior` (→ `--base-scroll-behavior`: `smooth`, `auto` under reduced motion); an explicit `behavior` always wins — same.
- Keyboard scroll position: web brings the row in with `block: 'nearest'` (no scroll while it is visible); svelte centres it in the tree's scroll container (`block: 'center'`) — differs; open.
- Paste into a node: web expands it and reveals the first pasted node (a programmatic jump — the token); svelte neither expands nor scrolls — differs; open.
- Indent: `--*-indent-size` = `calc(var(--base-tree-indent, 1.6) * var(--*-rem))` — a 16px visual step per level in both (web: flat rows padded (level − 1) × it; svelte: flat rows the same, recursive mode nests each child with a margin of it — the toggle column sits inside every row, so the margin is the whole step, measured by an e2e test in each repo).

## 10. CSS custom properties

One token list for both libraries — `--wtv-<name>` (web) = `--stv-<name>` (svelte). 195 shared names; the few library-only names belong to a feature only that library renders. Every token chains to `--base-*` the same way (checked by `npm run check:contract` and the `contract-parity` e2e spec in each repo); both `component-variables.manifest.json` list the same names. Motion: only `--*-transition-fast | -normal | -medium | -slow` (→ `--base-duration-*`) and `--*-ease-*`; `prefers-reduced-motion` sets the speeds to `0s`; motion off = `--*-transition-*: 0s` (no prop / attribute).

### Shared names

| group | names |
|---|---|
| sizing | `rem` |
| color | `accent-color`, `accent-color-hover`, `active-bg`, `danger-color`, `danger-text-color`, `hover-bg`, `main-bg`, `shadow-color`, `success-color`, `text-color-1`, `text-color-3`, `text-color-on-accent` |
| surface | `elevated-bg`, `focused-bg`, `node-info-reveal-bg`, `node-info-reveal-border-color`, `node-info-reveal-text-color`, `selected-bg`, `selected-bg-hover`, `selected-fill-bg` |
| border | `border-color`, `border-radius-lg`, `border-radius-sm`, `border-width`, `input-border-color`, `selected-preset-ring-color` |
| state | `disabled-opacity`, `focused-outline`, `focused-text-color`, `selected-fill-text-color`, `selected-outline`, `selected-text-color` |
| typography | `font-family`, `font-size`, `font-size-sm`, `font-size-xs`, `font-weight-medium`, `font-weight-semibold` |
| spacing | `spacing-lg`, `spacing-md`, `spacing-sm`, `spacing-xl`, `spacing-xs` |
| animation | `ease-in`, `ease-out`, `ease-standard`, `node-transition`, `scroll-behavior`, `toggle-icon-transition`, `transition-fast`, `transition-medium`, `transition-normal`, `transition-slow` |
| tree | `focused-outline-offset`, `icon-collapse`, `icon-expand`, `icon-leaf`, `icon-rotate-collapsed`, `icon-rotate-expanded`, `icon-size-glyph`, `indent-size`, `node-bg-active`, `node-bg-hover`, `node-border-radius`, `node-icon-color`, `node-icon-margin-right`, `node-icon-width`, `node-info-bg-hover`, `node-info-color`, `node-info-color-hover`, `node-padding`, `scroll-highlight-box-shadow`, `toggle-icon-color`, `toggle-icon-size`, `toggle-icon-width` |
| icon | `icon-info` |
| checkbox | `checkbox-bg`, `checkbox-border-color`, `checkbox-border-radius`, `checkbox-border-width`, `checkbox-checked-bg`, `checkbox-checked-bg-hover`, `checkbox-checked-border-color`, `checkbox-checkmark-color`, `checkbox-focus-box-shadow`, `checkbox-focus-ring-color`, `checkbox-focus-ring-width`, `checkbox-gap`, `checkbox-scale`, `checkbox-size`, `icon-check`, `icon-check-size`, `icon-indeterminate` |
| dnd | `drag-denied-flash-bg`, `drag-over-bg`, `drag-over-border`, `drag-over-box-shadow`, `drag-over-highlight-bg`, `drag-over-highlight-border`, `dragged-opacity`, `dragged-scale`, `drop-arrow-after-image`, `drop-arrow-after-rotation`, `drop-arrow-before-image`, `drop-arrow-before-rotation`, `drop-arrow-child-image`, `drop-arrow-child-rotation`, `drop-arrow-position`, `drop-arrow-size`, `drop-glow-after-color`, `drop-glow-before-color`, `drop-glow-child-bg`, `drop-glow-child-color`, `drop-glow-size`, `drop-invalid-bg`, `drop-invalid-border-color`, `drop-valid-bg`, `drop-valid-border-color`, `drop-zone-after-bg`, `drop-zone-after-bg-active`, `drop-zone-after-box-shadow-active`, `drop-zone-after-text-color`, `drop-zone-after-text-color-active`, `drop-zone-before-bg`, `drop-zone-before-bg-active`, `drop-zone-before-box-shadow-active`, `drop-zone-before-text-color`, `drop-zone-before-text-color-active`, `drop-zone-border-radius`, `drop-zone-child-bg`, `drop-zone-child-bg-active`, `drop-zone-child-box-shadow-active`, `drop-zone-child-text-color`, `drop-zone-child-text-color-active`, `scroll-highlight-bg`, `touch-ghost-bg`, `touch-ghost-box-shadow`, `touch-ghost-text-color` |
| empty | `drop-placeholder-bg`, `drop-placeholder-bg-hover`, `drop-placeholder-border`, `drop-placeholder-border-color-hover`, `drop-placeholder-border-radius`, `drop-placeholder-box-shadow-hover`, `drop-placeholder-color`, `drop-placeholder-min-height`, `drop-placeholder-scale-hover` |
| tooltip | `tooltip-bg`, `tooltip-border-radius`, `tooltip-box-shadow`, `tooltip-font-size`, `tooltip-max-width`, `tooltip-min-width`, `tooltip-padding`, `tooltip-text-color`, `tooltip-width`, `tooltip-z-index` |
| context-menu | `context-menu-bg`, `context-menu-bg-hover`, `context-menu-border`, `context-menu-border-radius`, `context-menu-box-shadow`, `context-menu-danger-bg-hover`, `context-menu-danger-color`, `context-menu-disabled-opacity`, `context-menu-divider-color`, `context-menu-divider-label-color`, `context-menu-divider-margin`, `context-menu-font-size`, `context-menu-icon-font-size`, `context-menu-icon-width`, `context-menu-item-gap`, `context-menu-item-padding`, `context-menu-min-width`, `context-menu-padding`, `context-menu-shortcut-color`, `context-menu-shortcut-font-size`, `context-menu-text-color`, `context-menu-text-color-hover`, `context-menu-toggled-color`, `context-menu-z-index` |
| loading | `loader-color`, `loader-duration`, `loader-icon`, `loader-inline-size`, `loader-overlay-size`, `loader-rotate`, `loader-size`, `loading-bg`, `loading-color` |
| z-index | `z-index-drop-zones`, `z-index-dropdown`, `z-index-ghost`, `z-index-overlay` |

**Context menu:** the names are the same; web's are unset inputs mapped onto web-components-core's `--_km-menu-*` (defaults live in core, a page-wide `--km-menu-*` reaches the tree), svelte renders its own menu and declares them with defaults.

### Same name, different default

Kept as each library looked before (aligning them changes one library's look — open).

| name | why |
|---|---|
| `drop-placeholder-min-height` | same 60px; web reads --wtv-tree-min-height |
| `node-icon-margin-right` | web 4px, svelte 6px |
| `node-padding` | svelte pill hugs the label (4px / 4px), web 4px / 8px — kept, both libraries look as before |
| `toggle-icon-size` | web glyph 12px in a 24px column; svelte 16px glyph, slot = glyph + 1px |
| `toggle-icon-width` | see toggle-icon-size |

### Library-only names

| name | library: why |
|---|---|
| `children-margin-top` | svelte: nested children container (web renders flat rows) |
| `context-menu-arrow-font-size` | web: core's menu draws the submenu arrow as a text glyph (svelte: a mask icon) |
| `cut-opacity` | web: dims cut nodes; svelte keeps `cutPaths` but does not render the dimming yet (API gap) |
| `drag-denied-badge-color` | svelte: the no-entry badge is a mask icon (web: a text glyph) |
| `drop-zone-max-width` | svelte: width cap of a side drop zone (web: sized by JS) |
| `icon-arrow-left` | svelte: arrows of the scrollToPath highlight |
| `icon-arrow-right` | svelte: arrows of the scrollToPath highlight |
| `icon-ban` | svelte: the no-entry badge is a mask icon (web: a text glyph) |
| `icon-chevron-right` | svelte: submenu arrow mask of its own menu |
| `node-height` | web: min row height — the virtual scroller needs a fixed row |
| `node-path-color` | svelte: the path shown next to the label |
| `node-path-font-size` | svelte: the path shown next to the label |
| `scroll-highlight-arrow-color` | svelte: arrows of the scrollToPath highlight |
| `text-color-4` | svelte: its own menu's faint text (web: core's menu) |
| `toggle-icon-margin-right` | svelte: gap after the toggle (web: the toggle column has a fixed width) |
| `tree-min-height` | web: min height of the empty / loading tree (svelte sizes the drop placeholder only) |
