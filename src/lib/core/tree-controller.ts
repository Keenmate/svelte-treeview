import { createControllerFacade } from '../vendor/core/element/controller-facade.js';
import type { TreeEngine } from './TreeEngine.svelte.js';

/**
 * The public controller (core SPEC §12.34, same model as web-treeview's `TreeViewController`):
 * what every callback / event ctx carries as `controller` and what
 * `window.components['svelte-treeview'].getInstances()` lists. A frozen facade over the
 * {@link TreeEngine} — the imperative API and read-only state, never the engine's internals
 * (`_private` methods, render state, Node wiring). The engine itself is for renderers
 * (`<Tree>`, `TreeProvider`, svelte-treeview-canvas, a custom layout via `createTreeEngine`).
 */

/** Every method the controller forwards to the engine (the same set `<Tree>` exports, minus `update`). */
export const TREE_CONTROLLER_METHODS = [
	// expand / collapse
	'expandNodes', 'collapseNodes', 'toggleNodeExpanded', 'expandAll', 'collapseAll',
	// search / sort / reads
	'filterNodes', 'searchNodes', 'sortNodes', 'sortAll', 'scrollToPath', 'getNodeByPath', 'getChildren',
	'getSiblings', 'getNodeRef', 'getVisibleFlatNodes', 'getTree', 'refreshNode', 'refreshSiblings',
	'isNodeDropAllowed',
	// mutations
	'addNode', 'insertNode', 'updateNode', 'removeNode', 'removeNodes', 'deleteNodes', 'moveNode',
	'moveNodes', 'duplicateNode', 'duplicateNodes', 'processChanges', 'addBranch', 'insertBranch',
	'replaceBranch', 'removeBranch',
	// selection / checked / focus
	'selectNode', 'selectNodes', 'selectAll', 'clearSelection', 'getSelectedNodes', 'isNodeSelected',
	'checkNode', 'checkNodes', 'checkAll', 'uncheckNode', 'uncheckNodes', 'uncheckAll', 'getCheckedNodes', 'getAllCheckedNodes',
	'isNodeChecked', 'focusNode', 'clearFocus',
	// keyboard navigation
	'focusAndSelectNode', 'focusNext', 'focusPrevious', 'focusNextAtLevel', 'focusPreviousAtLevel',
	'focusFirstChild', 'focusParent', 'collapseParent', 'toggleFocusedNodeExpanded', 'focusFirst',
	'focusLast', 'focusNextPage', 'focusPreviousPage', 'extendSelectionNext', 'extendSelectionPrevious',
	'extendSelectionToFirst', 'extendSelectionToLast', 'extendSelectionNextPage',
	'extendSelectionPreviousPage',
	// clipboard
	'copyNodes', 'cutNodes', 'pasteNodes', 'cancelCut', 'hasClipboardContent', 'getClipboardOperation',
	// context menu
	'openContextMenu', 'closeContextMenu', 'activateMenuItem'
] as const satisfies readonly (keyof TreeEngine<unknown>)[];

/** Read-only state the controller answers live from the engine. */
export const TREE_CONTROLLER_STATE = [
	'treeId', 'nodes', 'focusedNode', 'selectedPaths', 'checkedPaths', 'allCheckedPaths', 'expandedPaths', 'cutPaths',
	'insertResult', 'searchTerm', 'searchStatus', 'indexProgress', 'isRendering'
] as const satisfies readonly (keyof TreeEngine<unknown>)[];

/** State the controller may also set (forwarded to the engine). */
export const TREE_CONTROLLER_WRITABLE = ['selectionAnchor'] as const satisfies readonly (keyof TreeEngine<unknown>)[];

/** The public controller of one tree — see the module comment. */
export type TreeController<T> = Pick<TreeEngine<T>, (typeof TREE_CONTROLLER_METHODS)[number]> &
	Readonly<Pick<TreeEngine<T>, (typeof TREE_CONTROLLER_STATE)[number]>> &
	Pick<TreeEngine<T>, (typeof TREE_CONTROLLER_WRITABLE)[number]>;

/** @internal Build the controller over `engine` (`TreeEngine.controller` — one per engine). */
export function createTreeController<T>(engine: TreeEngine<T>): TreeController<T> {
	return createControllerFacade<TreeController<T>>(engine, {
		methods: TREE_CONTROLLER_METHODS,
		state: Object.fromEntries(TREE_CONTROLLER_STATE.map((name) => [name, undefined])),
		writable: TREE_CONTROLLER_WRITABLE
	});
}
