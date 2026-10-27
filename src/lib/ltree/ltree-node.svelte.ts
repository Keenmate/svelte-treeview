export type NodeId = string | number;
export type DropPosition = 'before' | 'after' | 'child';

export enum VisualState {
	indeterminate = "indeterminate",
	checked = "true",
	unchecked = "false",
}

export interface LTreeNode<T> {
	treeId: string;
	id: NodeId;
	path: string;
	pathSegment: string;
	parentPath: string | null | undefined;
	level: number | null | undefined;

	children: Record<string, LTreeNode<T>>;
	hasChildren: boolean;
	data: T | null | undefined;

	isDraggable: boolean;
	isCollapsible: boolean;
	isDropAllowed: boolean;
	allowedDropPositions: DropPosition[] | null | undefined;

	visualState: VisualState;
	isExpanded: boolean;
	isFocused: boolean;
	isSelected: boolean;
	isChecked: boolean;

	isSelectable: boolean;

	_rev: number;
}

export function createLTreeNode<T>(data?: Partial<LTreeNode<T>>): LTreeNode<T> {
	return {
		treeId: "",
		path: "",
		pathSegment: "",
		parentPath: undefined,
		level: undefined,
		id: -1,

		children: {},
		hasChildren: false,
		data: undefined,

		isDraggable: false,
		isCollapsible: true,
		isDropAllowed: false,
		allowedDropPositions: undefined,
		visualState: VisualState.unchecked,
		isExpanded: false,
		isFocused: false,
		isSelected: false,
		isChecked: false,

		isSelectable: true,

		_rev: 0,
		...data
	};
}
