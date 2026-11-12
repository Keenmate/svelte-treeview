// Reexport your entry components here
export {default as Tree} from "./components/Tree.svelte"
export {default as TreeProvider} from "./components/TreeProvider.svelte"
export {default as ContextMenuItemC} from "./components/ContextMenuItem.svelte"
export {default as ContextMenuDividerC} from "./components/ContextMenuDivider.svelte"

// Core layer (headless controller)
export { TreeController } from "./core/TreeController.svelte"
export type { TreeControllerProps, PasteResult, NodeTransformContext, NodeTransformCallbackContext, NodeTransformCallback, BeforeCheckboxToggleContext, KeydownContext, BeforePasteContext, BeforeCopyContext, BeforeDeleteContext, NodeRef, NodeEventContext, NodeDragContext, DragStartContext, BeforeDropContext, DropGroup, NodeDropContext, ClipboardEventContext, SelectionChangeContext, ExpandedChangeContext, BeforeExpandContext, TreeCallbackContext, FocusChangeContext, TreeChangeContext, ScrollToPathOptions } from "./core/TreeController.svelte"
export { createTreeController } from "./core/createTreeController.js"

// Export types
export type { LTreeNode, NodeId, VisualState } from "./ltree/ltree-node.svelte"
export type { Ltree, DropPosition, DragDropMode, DropOperation, ToggleIconMode, IconSet, NodeTitleOverflow, TooltipPlacement, TooltipDelay, NodeRenderContext, ClickBehavior, CheckboxMode, CascadeCheckPolicy, FilterScope, IndexProgress, SearchStatus, SelectionMode, SelectMode, TreeMutationOptions, ExpandOptions, InsertPosition, NodeContext, SortContext, SortCompareContext, SortOptions, NodesReorderContext, InsertArrayResult, InsertBranchResult, ReplaceBranchResult, RemoveBranchResult, TreeChange, ApplyChangesResult } from "./ltree/types.js"

// Tooltip action (use:tooltip) — the hover/focus tooltip primitive the Tree uses
// internally; exported so consumers can reuse it on their own markup.
export { tooltip } from "./actions/tooltip.js"
export type { TooltipParams } from "./actions/tooltip.js"

// Clipboard types & utilities
export type { ClipboardEntry, TreeClipboard } from "./core/clipboard.js"
export { setClipboard, getClipboard, clearClipboard, hasClipboard, getClipboardOperation, uniqueName } from "./core/clipboard.js"
export type { TreeNavigation, TreeNavigationOverrides } from "./core/navigation.js"
export type { RenderStats } from "./ltree/types.js"
export { DEFAULT_LABELS, resolveLabel } from "./core/labels.js"
// Context-menu model (same as @keenmate/web-treeview; core /actions vendored)
export { menuDivider, isMenuDivider } from "./core/menu.js"
// Custom menu renderers: resolve a level's entries / a submenu the same way the built-in menu does
export { resolveMenuEntries, getMenuChildren } from "./vendor/actions/resolve.js"
export type { ResolvedMenuEntry } from "./vendor/actions/resolve.js"
export type { TreeMenuContext, TreeMenuItem, TreeMenuEntry, TreeAction, TreeActionEventDetail, ActionItem, MenuItem, MenuEntry, MenuDivider, ActionEventDetail, ActionInvocation, ActionSource, ResolvedActionItem } from "./core/menu.js"
export type { TreeLabels } from "./core/labels.js"
export type { LoaderRenderContext, RenderLoaderCallback } from "./core/loader.js"
export type { NodeCallbacks, NodeConfig, SelectionModifiers } from "./core/TreeController.svelte"

// Export logging utilities
export { enableLogging, disableLogging, setLogLevel, setCategoryLevel, LOGGING_CATEGORIES } from "./logger.js"

// Export performance logging utilities
export {
    enablePerfLogging,
    disablePerfLogging,
    setPerfThreshold,
    isPerfLoggingEnabled,
    perfStart,
    perfEnd,
    perfMeasure,
    perfSummary
} from "./perf-logger.js"

// Responsive / device / container-size signal (transferred 1:1 from
// @keenmate/web-components-core; see src/lib/vendor/environment/README.md). The
// tree renders inline and does not change its own behaviour on these — they're
// exposed so a consumer can adapt settings to the space (AB10-style). The
// runes-friendly `containerSize`/`environmentState` bridges are for use inside a
// Svelte component; the raw observers are for app-level (non-Svelte) code.
export { containerSize, environmentState } from "./core/responsive.svelte.js"
export type { ReactiveSize, ReactiveEnvironment } from "./core/responsive.svelte.js"
export {
    observeEnvironment,
    observeViewport,
    getEnvironment,
    classifyDevice,
    configureBreakpoints,
    TABLET_MIN_SHORT_SIDE
} from "./vendor/environment/environment.js"
export type {
    EnvironmentSnapshot,
    EnvironmentListener,
    ObserveOptions,
    PointerType,
    Orientation,
    OS,
    BreakpointMap,
    DeviceClass
} from "./vendor/environment/environment.js"
export { observeElementSize } from "./vendor/environment/element-size.js"
export type { ElementSize, ElementSizeListener, ObserveElementSizeOptions } from "./vendor/environment/element-size.js"

// Export global API type and ensure registration runs
export type { GlobalTreeviewAPI } from "./global-api.js"
import "./global-api.js"
