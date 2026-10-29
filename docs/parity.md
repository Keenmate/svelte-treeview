# svelte-treeview ↔ web-treeview API parity

Living checklist of the public API of `@keenmate/svelte-treeview` (`<Tree>`) against its sibling
`@keenmate/web-treeview` (`<web-treeview>`) — the same table as web-treeview's `docs/parity.md`. **Any public API change must update this file and
be mirrored in the sibling library (or recorded here as intentional).**

Status: **same** = identical name, type, default and semantics · **intentional** = a deliberate
difference (the reason is given). Web names are element properties / `TreeViewConfig` keys (HTML
attribute in parentheses); svelte names are `<Tree>` props / exports. Decided 2026-10-28
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
| `nodeTitleOverflow` (`node-title-overflow`: `wrap` \| `ellipsis` \| `info`, default `ellipsis`) | `nodeTitleOverflow` (default `ellipsis`) | same — fixed row heights (virtual scroll) |
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

- Keyboard (WAI-ARIA, both): `Enter` = the node's default action (expand / collapse); `Space` = toggle selection — the checkbox when checkboxes are shown, the focused node in the selection in `multiple` mode / selects the focused node in `single` mode; Space never expands / collapses. — same
- Assigning the expanded / selected / checked set: web `el.expandedPaths = …` fires `expanded-change`; svelte assigning a `$bindable` set is silent (no `onExpandedChange` / `onSelectionChange`) — intentional: a bound value echoing a callback would loop.
- `tree-change` / `onTreeChange`: web fires it on every engine state change (selection, expand, focus included); svelte only after data / structure mutations (add / insert / move / remove / update / `applyChanges` / paste / drop / sort), once per batch, not on loading `nodes` — differs (svelte follows the parity brief's "structure changed" definition); open.
- `onExpandedChange` fires synchronously after the per-node `onNodeExpand` / `onNodeCollapse` in svelte; web emits `expanded-change` on the next state notification — intentional (timing only).
- Both: an `isSilent` expand still runs `beforeExpandCallback` (a gate, not a notification); `expandAll` flags leaves `isExpanded`, so they are in `expandedPaths`.
- svelte only: callbacks invoked while rendering (`getContextMenuItemsCallback`, per-node `get*Callback`s) must not write `$state` synchronously (Svelte's `state_unsafe_mutation`) — defer with `queueMicrotask` if needed.
- Class prefixes `wtv__` vs `stv__`, CSS custom properties `--wtv-*` vs `--stv-*` — intentional prefix.
- Neither exposes `::part()` / `<slot>` (render callbacks vs snippets) — intentional.

## 10. CSS custom properties

Maintained by the theming pass: the shared token list (`--wtv-<name>` = `--stv-<name>`) is tabled in
web-treeview's `docs/parity.md` §10; both `component-variables.manifest.json` list the same names.

Loader tokens (shared loader, 2026-10-29): `loader-icon`, `loader-rotate`, `loader-duration`,
`loader-size` (chained to `--base-loader-*`), `loader-overlay-size` (= size × 2, the `isLoading`
overlay), `loader-inline-size` (= size × 0.75, the per-node toggle loader), `loader-color` (=
accent) — same names on both sides (`--wtv-*` / `--stv-*`). Replaced in svelte: `spinner-duration`,
`spinner-size`, `spinner-track`, `spinner-color`, `expand-spinner-size` / `-width` / `-track` /
`-color`.
