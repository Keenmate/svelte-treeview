import type { TreeEngineProps } from './TreeEngine.svelte.js';
import { DEFAULT_INDEXER_BATCH_SIZE } from '../ltree/indexer.js';

/**
 * THE prop table of the tree (REVIEW §3.1): every controller prop, its default and how a change
 * applies. The controller constructor and `updateProps` iterate it, Tree.svelte runs one effect per
 * key and `update()` is `controller.updateProps`. A new prop goes here (the type check below fails
 * until it does) — never into a hand-written list.
 */
type TreePropKey = keyof TreeEngineProps<unknown>;

/** Tree STATE, not options: applied through their writers, never compared or defaulted. */
export const TREE_STATE_PROPS = ['nodes', 'focusedNode', 'selectedPaths', 'checkedPaths', 'expandedPaths'] as const;
export type TreeStatePropKey = (typeof TREE_STATE_PROPS)[number];
export type TreeOptionKey = Exclude<TreePropKey, TreeStatePropKey>;

/**
 * Every option and its default — what `undefined` (or a prop that is not passed) means.
 * Listing a key with `undefined` is deliberate: the table has to name every option.
 */
export const TREE_OPTION_DEFAULTS: Record<TreeOptionKey, unknown> = {
	// Identity (init-only)
	treeId: undefined,

	// Built into the ltree — a change re-inserts the data (TREE_LTREE_OPTIONS)
	treePathSeparator: '.',
	idMember: undefined,
	pathMember: undefined,
	parentPathMember: undefined,
	levelMember: undefined,
	hasChildrenMember: undefined,
	isExpandedMember: undefined,
	getIsExpandedCallback: undefined,
	isSelectableMember: undefined,
	getIsSelectableCallback: undefined,
	isCheckedMember: undefined,
	getIsCheckedCallback: undefined,
	isDraggableMember: undefined,
	getIsDraggableCallback: undefined,
	isDropAllowedMember: undefined,
	getIsDropAllowedCallback: undefined,
	allowedDropPositionsMember: undefined,
	getAllowedDropPositionsCallback: undefined,
	isCollapsibleMember: undefined,
	getIsCollapsibleCallback: undefined,
	displayValueMember: undefined,
	getDisplayValueCallback: undefined,
	searchValueMember: undefined,
	getSearchValueCallback: undefined,
	orderMember: undefined,
	isSorted: undefined,
	sortCallback: undefined,
	expandLevel: 0,
	isInternalSearchIndexEnabled: true,
	initializeIndexCallback: undefined,
	indexerBatchSize: DEFAULT_INDEXER_BATCH_SIZE,
	indexerTimeout: 50,

	// Live
	isSortingEnabled: true,
	labels: undefined,
	translateCallback: undefined,
	clickBehavior: 'expand-and-focus',
	selectionMode: 'single',
	isCheckboxesShown: false,
	checkboxMode: 'independent',
	cascadeCheckPolicy: 'rolled-up',
	shouldClickToggleCheckbox: false,
	beforeCheckboxToggleCallback: undefined,
	rangeSelectionMode: 'visual',
	searchTerm: undefined,
	filterScope: 'matches',
	filterDescendantDepth: 1,
	shouldExpandFilterDescendants: true,
	maxSearchResultCount: undefined,
	isLoading: false,
	isProgressiveRenderEnabled: true,
	initialBatchSize: 20,
	maxBatchSize: 500,
	maxAnimatedRowCount: 50,
	onRenderStart: undefined,
	onRenderProgress: undefined,
	onRenderComplete: undefined,
	onIndexProgress: undefined,
	onSearchStatusChange: undefined,
	isVirtualScrollEnabled: false,
	virtualScrollItemHeight: undefined,
	virtualScrollOverscan: 5,
	virtualScrollContainerHeight: undefined,
	dragDropMode: 'none',
	dropZoneMode: 'glow',
	dropZoneLayout: 'around',
	dropZoneStart: 33,
	dropZoneMaxWidth: 120,
	isCopyAllowed: false,
	isTreeDropZoneEnabled: false,
	shouldAutoHandleCopy: true,
	shouldAutoHandleMove: true,
	shouldAutoHandlePaste: true,
	isKeyboardShortcutsEnabled: true,
	shouldExpandAsAccordion: false,
	onNodeClick: undefined,
	onNodeDoubleClick: undefined,
	onNodeDragStart: undefined,
	onNodeDragOver: undefined,
	onNodeDrop: undefined,
	onNodeDragReject: undefined,
	onNodeDropReject: undefined,
	onSelectionChange: undefined,
	onCheckedChange: undefined,
	onNodeExpand: undefined,
	onNodeCollapse: undefined,
	onExpandedChange: undefined,
	beforeExpandCallback: undefined,
	onFocusChange: undefined,
	onNodesChange: undefined,
	onNodesSort: undefined,
	onNodeCopy: undefined,
	onNodeCut: undefined,
	onNodePaste: undefined,
	onNodeDelete: undefined,
	beforeDeleteCallback: undefined,
	beforeScrollCallback: undefined,
	beforeDropCallback: undefined,
	beforeDragStartCallback: undefined,
	beforeCopyCallback: undefined,
	beforeCutCallback: undefined,
	beforePasteCallback: undefined,
	nodeOutputTransformationCallback: undefined,
	nodeInputTransformationCallback: undefined,
	getContextMenuItemsCallback: undefined,
	beforeActionCallback: undefined,
	onAction: undefined,
	navigationOverrides: undefined,
	hasContextMenuSnippet: false,
	bodyClass: undefined,
	selectedNodeClass: undefined,
	focusedNodeClass: undefined,
	checkedNodeClass: undefined,
	getNodeClassCallback: undefined,
	getNodeContentClassCallback: undefined,
	dragOverNodeClass: undefined,
	draggedNodeClass: undefined,
	leafIconClass: 'stv__toggle-icon--leaf',
	toggleIconMode: 'rotate',
	nodeTitleOverflow: 'ellipsis',
	flatIndentSize: 'var(--stv-indent-size)',
	isNodeTooltipsShown: false,
	getNodeTooltipCallback: undefined,
	tooltipPlacement: 'top-start',
	tooltipDelay: { show: 400, hide: 100 },
	tooltipOffset: 8,
	shouldTooltipFollowCursor: false,
	iconMember: undefined,
	getIconCallback: undefined,
	renderIconCallback: undefined,
	iconColorMember: undefined,
	getIconColorCallback: undefined,
	shouldAlignNodeIcons: true,
	scrollHighlightTimeout: 4000,
	scrollHighlightClass: 'stv__node-content--scroll-highlight',
	contextMenuXOffset: 8,
	contextMenuYOffset: 0,
	touchDragDelay: 300,
	shouldIndicateUndraggable: true
};

/** Every option key, in table order. */
export const TREE_OPTION_KEYS = Object.keys(TREE_OPTION_DEFAULTS) as TreeOptionKey[];

/** Options read once at construction; a later change is ignored with a warning (B16). */
export const TREE_INIT_ONLY_OPTIONS: ReadonlySet<TreeOptionKey> = new Set<TreeOptionKey>(['treeId']);

/**
 * Options built into the ltree (how a row becomes a node, the sort, the search index, the expand
 * seed). A change reconfigures the ltree and re-inserts the current data (B17); expansion,
 * selection, checks and focus are kept by path.
 */
export const TREE_LTREE_OPTIONS: ReadonlySet<TreeOptionKey> = new Set<TreeOptionKey>([
	'treePathSeparator',
	'idMember',
	'pathMember',
	'parentPathMember',
	'levelMember',
	'hasChildrenMember',
	'isExpandedMember',
	'getIsExpandedCallback',
	'isSelectableMember',
	'getIsSelectableCallback',
	'isCheckedMember',
	'getIsCheckedCallback',
	'isDraggableMember',
	'getIsDraggableCallback',
	'isDropAllowedMember',
	'getIsDropAllowedCallback',
	'allowedDropPositionsMember',
	'getAllowedDropPositionsCallback',
	'isCollapsibleMember',
	'getIsCollapsibleCallback',
	'displayValueMember',
	'getDisplayValueCallback',
	'searchValueMember',
	'getSearchValueCallback',
	'orderMember',
	'isSorted',
	'sortCallback',
	'expandLevel',
	'isInternalSearchIndexEnabled',
	'initializeIndexCallback',
	'indexerBatchSize',
	'indexerTimeout'
]);

/** Options whose change re-seeds the expanded set from the data instead of keeping it. */
export const TREE_EXPANSION_SEED_OPTIONS: ReadonlySet<TreeOptionKey> = new Set<TreeOptionKey>([
	'expandLevel',
	'isExpandedMember',
	'getIsExpandedCallback'
]);

/** Options whose change re-seeds the checked set from the data instead of keeping it. */
export const TREE_CHECKED_SEED_OPTIONS: ReadonlySet<TreeOptionKey> = new Set<TreeOptionKey>([
	'isCheckedMember',
	'getIsCheckedCallback'
]);

/** The controller field an option is stored in, where it isn't the option's own name. */
export const TREE_OPTION_FIELDS: Partial<Record<TreeOptionKey, string>> = {
	beforeCheckboxToggleCallback: 'beforeCheckboxToggleHandler',
	onRenderStart: 'onRenderStartHandler',
	onRenderProgress: 'onRenderProgressHandler',
	onRenderComplete: 'onRenderCompleteHandler',
	onIndexProgress: 'onIndexProgressHandler',
	onSearchStatusChange: 'onSearchStatusChangeHandler',
	onNodeClick: 'onNodeClickHandler',
	onNodeDoubleClick: 'onNodeDoubleClickHandler',
	onNodeDragStart: 'onNodeDragStartHandler',
	onNodeDragOver: 'onNodeDragOverHandler',
	onNodeDrop: 'onNodeDropHandler',
	onNodeDragReject: 'onNodeDragRejectHandler',
	onNodeDropReject: 'onNodeDropRejectHandler',
	onSelectionChange: 'onSelectionChangeHandler',
	onCheckedChange: 'onCheckedChangeHandler',
	onNodeExpand: 'onNodeExpandHandler',
	onNodeCollapse: 'onNodeCollapseHandler',
	onExpandedChange: 'onExpandedChangeHandler',
	beforeExpandCallback: 'beforeExpandHandler',
	onFocusChange: 'onFocusChangeHandler',
	onNodesChange: 'onNodesChangeHandler',
	onNodesSort: 'onNodesSortHandler',
	onNodeCopy: 'onNodeCopyHandler',
	onNodeCut: 'onNodeCutHandler',
	onNodePaste: 'onNodePasteHandler',
	onNodeDelete: 'onNodeDeleteHandler',
	beforeDeleteCallback: 'beforeDeleteHandler',
	beforeScrollCallback: 'beforeScrollHandler',
	beforeDropCallback: 'beforeDropHandler',
	beforeDragStartCallback: 'beforeDragStartHandler',
	beforeCopyCallback: 'beforeCopyHandler',
	beforeCutCallback: 'beforeCutHandler',
	beforePasteCallback: 'beforePasteHandler',
	nodeOutputTransformationCallback: 'outputTransformHandler',
	nodeInputTransformationCallback: 'inputTransformHandler',
	getContextMenuItemsCallback: 'getContextMenuItemsHandler',
	beforeActionCallback: 'beforeActionHandler',
	onAction: 'onActionHandler'
};

/** An option's value with its default applied (`flatIndentSize: ''` counts as unset). */
export function resolveTreeOption(key: TreeOptionKey, value: unknown): unknown {
	if (key === 'flatIndentSize' && value === '') return TREE_OPTION_DEFAULTS.flatIndentSize;
	return value ?? TREE_OPTION_DEFAULTS[key];
}
