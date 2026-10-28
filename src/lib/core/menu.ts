/**
 * Context-menu model — the same as `@keenmate/web-treeview` (core `/actions`, vendored in
 * `../vendor/actions`). `getContextMenuItemsCallback(ctx)` returns entries: action items
 * (`{ id, text, icon, isDisabled, isDanger, isToggled, isVisible, children, onClick }`),
 * dividers (`menuDivider(text?)`) and built-in action names (`'copy'`, `{ action: 'copy', … }`).
 * Activation order: `beforeActionCallback` → item `onClick` → built-in → `onAction`.
 */
import type { LTreeNode } from '../ltree/ltree-node.svelte.js';
import type { NodeRef, TreeCallbackContext } from './TreeController.svelte.js';
import type { ActionEventDetail, MenuEntry, MenuItem } from '../vendor/actions/types.js';

export type {
	ActionEventDetail,
	ActionInvocation,
	ActionItem,
	ActionSource,
	MenuDivider,
	MenuEntry,
	MenuItem,
	ResolvedActionItem
} from '../vendor/actions/types.js';
export { menuDivider, isMenuDivider } from '../vendor/actions/resolve.js';

/**
 * The surface ctx of the context menu: the node it opened on, with its live parent and
 * siblings, + `controller`. Built once per open; every item callback and `onClick` gets it.
 */
export interface TreeMenuContext<T = any> extends NodeRef<T>, TreeCallbackContext<T> {
	node: LTreeNode<T>;
}

/**
 * Built-in context-menu actions — act on the node, or on the whole selection when the node is
 * in it. `expand` / `collapse` = one level (ancestors opened); `expand-subtree` /
 * `collapse-subtree` = the targets and all their descendants; `expand-all` / `collapse-all` =
 * the whole tree. `sort` = the targets' children (one level, the tree's sort rule);
 * `sort-subtree` = the targets' children at every depth; `sort-all` = the whole tree.
 * `paste` pastes into the clicked node. Texts come from `labels`.
 */
export type TreeAction =
	| 'copy'
	| 'cut'
	| 'paste'
	| 'delete'
	| 'expand'
	| 'collapse'
	| 'expand-subtree'
	| 'collapse-subtree'
	| 'expand-all'
	| 'collapse-all'
	| 'sort'
	| 'sort-subtree'
	| 'sort-all';

/** A context-menu item (core `MenuItem`): text, icon, shortcut, `get*Callback(ctx)`, `onClick(detail)`, children. */
export type TreeMenuItem<T = any> = MenuItem<TreeMenuContext<T>, TreeAction>;
/** A menu item, a divider (`menuDivider(text?)`) or a built-in action name. */
export type TreeMenuEntry<T = any> = MenuEntry<TreeMenuContext<T>, TreeAction> | TreeAction;
/** Detail of `onAction` / an item's `onClick` / `beforeActionCallback`. */
export type TreeActionEventDetail<T = any> = ActionEventDetail<TreeMenuContext<T>, TreeAction>;
