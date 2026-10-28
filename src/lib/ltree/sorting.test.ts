import { describe, it, expect } from 'vitest';
import { createLTree } from './ltree.svelte.js';

/** isSortingEnabled (G2) + sortNodes / sortAll (G3). */

function createTree(orderMember?: string, opts: Record<string, unknown> = {}) {
	return createLTree<any>(
		'id',
		'path',
		undefined, // parentPathMember
		undefined, // levelMember
		undefined, // hasChildrenMember
		undefined, // isExpandedMember
		undefined, // getIsExpandedCallback
		undefined, // isSelectableMember
		undefined, // getIsSelectableCallback
		undefined, // isCheckedMember
		undefined, // getIsCheckedCallback
		undefined, // isDraggableMember
		undefined, // getIsDraggableCallback
		undefined, // isDropAllowedMember
		undefined, // getIsDropAllowedCallback
		undefined, // allowedDropPositionsMember
		'name', // displayValueMember
		undefined, // getDisplayValueCallback
		undefined, // searchValueMember
		undefined, // getSearchValueCallback
		undefined, // getAllowedDropPositionsCallback
		undefined, // isCollapsibleMember
		undefined, // getIsCollapsibleCallback
		orderMember,
		'test-tree',
		'.',
		3, // expandLevel
		false, // shouldUseInternalSearchIndex
		undefined, // initializeIndexCallback
		25,
		50,
		opts
	);
}

const names = (tree: any, parentPath = '') => {
	const parent = parentPath ? tree.getNodeByPath(parentPath) : tree.root;
	return Object.values(parent.children).map((n: any) => n.data.name);
};

const unsorted = () => [
	{ id: 3, path: '3', name: 'C', order: 30 },
	{ id: 1, path: '1', name: 'A', order: 10 },
	{ id: 32, path: '3.2', name: 'Item 10', order: 10 },
	{ id: 31, path: '3.1', name: 'Item 2', order: 20 },
	{ id: 2, path: '2', name: 'B', order: 20 }
];

describe('isSortingEnabled = false', () => {
	it('keeps the input order (children listed before parents still load)', () => {
		const tree = createTree(undefined, { isSortingEnabled: false });
		tree.insertArray([
			{ id: 32, path: '3.2', name: 'Item 10' },
			...unsorted().filter((r) => r.path !== '3.2')
		]);
		expect(names(tree)).toEqual(['C', 'A', 'B']);
		expect(names(tree, '3')).toEqual(['Item 10', 'Item 2']);
	});

	it('addNode appends at the end; addBranch keeps its order', () => {
		const tree = createTree(undefined, { isSortingEnabled: false });
		tree.insertArray(unsorted());
		tree.addNode('', { id: 0, name: '0-first-alphabetically' });
		expect(names(tree)).toEqual(['C', 'A', 'B', '0-first-alphabetically']);
		tree.addBranch('1', [
			{ id: 12, path: '1.12', name: 'Z' },
			{ id: 11, path: '1.11', name: 'Y' }
		]);
		expect(names(tree, '1')).toEqual(['Z', 'Y']);
	});

	it('moveNode before / after keeps the exact position; child appends', () => {
		const tree = createTree(undefined, { isSortingEnabled: false });
		tree.insertArray(unsorted());
		expect(tree.moveNode('2', '3', 'before').success).toBe(true);
		expect(names(tree)).toEqual(['B', 'C', 'A']);
		tree.moveNode('1', '3.1', 'child');
		tree.moveNode('3', '2', 'after'); // no-op order-wise
		expect(names(tree)).toEqual(['B', 'C']);
		expect(names(tree, '3')).toEqual(['Item 10', 'Item 2']);
		tree.moveNode('3.1', '3.2', 'before');
		expect(names(tree, '3')).toEqual(['Item 2', 'Item 10']);
	});

	it('with orderMember the order values are still computed between the neighbours', () => {
		const tree = createTree('order', { isSortingEnabled: false });
		tree.insertArray(unsorted());
		expect(names(tree)).toEqual(['C', 'A', 'B']); // input order, NOT by order value
		tree.moveNode('2', '1', 'before');
		expect(names(tree)).toEqual(['C', 'B', 'A']);
		expect(tree.getNodeByPath('2')!.data.order).toBe(0); // below A (10), no lower neighbour
		tree.moveNode('3', '2', 'after');
		expect(names(tree)).toEqual(['B', 'C', 'A']);
		expect(tree.getNodeByPath('3')!.data.order).toBe(5); // between B (0) and A (10)
	});

	it('the enabled default still sorts (orderMember, then numeric display value)', () => {
		const tree = createTree();
		tree.insertArray(unsorted());
		expect(names(tree)).toEqual(['A', 'B', 'C']);
		expect(names(tree, '3')).toEqual(['Item 2', 'Item 10']);
	});
});

describe('sortNodes / sortAll', () => {
	it('sortNodes sorts one level by the default rule, even with sorting disabled', () => {
		const tree = createTree(undefined, { isSortingEnabled: false });
		tree.insertArray(unsorted());
		expect(tree.sortNodes('')).toEqual([]);
		expect(names(tree)).toEqual(['A', 'B', 'C']);
		expect(names(tree, '3')).toEqual(['Item 10', 'Item 2']); // one level only
		tree.sortNodes(['3'], { direction: 'desc' });
		expect(names(tree, '3')).toEqual(['Item 10', 'Item 2']);
		tree.sortNodes('3');
		expect(names(tree, '3')).toEqual(['Item 2', 'Item 10']);
	});

	it('sortAll sorts every level of the subtree / whole tree', () => {
		const tree = createTree(undefined, { isSortingEnabled: false });
		tree.insertArray(unsorted());
		tree.sortAll('3', { direction: 'desc' });
		expect(names(tree)).toEqual(['C', 'A', 'B']); // only the subtree of 3
		expect(names(tree, '3')).toEqual(['Item 10', 'Item 2']);
		tree.sortAll(null);
		expect(names(tree)).toEqual(['A', 'B', 'C']);
		expect(names(tree, '3')).toEqual(['Item 2', 'Item 10']);
	});

	it('default rule with orderMember sorts by the order values (no rewrite)', () => {
		const tree = createTree('order', { isSortingEnabled: false });
		tree.insertArray(unsorted());
		expect(tree.sortAll()).toEqual([]);
		expect(names(tree)).toEqual(['A', 'B', 'C']);
		expect(names(tree, '3')).toEqual(['Item 10', 'Item 2']); // order 10, 20
	});

	it('compareCallback + orderMember rewrites the order values and reports the changes', () => {
		const tree = createTree('order');
		tree.insertArray(unsorted());
		const reorders = tree.sortNodes('', {
			compareCallback: ({ a, b }: any) => b.data.name.localeCompare(a.data.name)
		});
		expect(names(tree)).toEqual(['C', 'B', 'A']);
		expect(tree.getNodeByPath('3')!.data.order).toBe(10);
		expect(tree.getNodeByPath('2')!.data.order).toBe(20);
		expect(tree.getNodeByPath('1')!.data.order).toBe(30);
		expect(reorders).toHaveLength(1);
		expect(reorders[0].parentPath).toBe('');
		expect(reorders[0].nodes.map((n: any) => n.path)).toEqual(['3', '2', '1']);
		// B keeps 20 → not a change
		expect(reorders[0].changes).toEqual([
			{ path: '3', oldOrder: 30, newOrder: 10 },
			{ path: '1', oldOrder: 10, newOrder: 30 }
		]);
		// The rewritten values persist through the next auto-sort.
		tree.addNode('', { id: 4, name: 'D', order: 25 });
		expect(names(tree)).toEqual(['C', 'B', 'D', 'A']);
	});

	it('desc with orderMember rewrites too; compareCallback without orderMember reports nothing', () => {
		const tree = createTree('order');
		tree.insertArray(unsorted());
		const reorders = tree.sortAll('3', { direction: 'desc' });
		expect(names(tree, '3')).toEqual(['Item 2', 'Item 10']);
		expect(reorders).toEqual([
			expect.objectContaining({
				parentPath: '3',
				changes: [
					{ path: '3.1', oldOrder: 20, newOrder: 10 },
					{ path: '3.2', oldOrder: 10, newOrder: 20 }
				]
			})
		]);

		const plain = createTree();
		plain.insertArray(unsorted());
		const none = plain.sortNodes('', {
			compareCallback: ({ a, b }: any) => b.data.name.localeCompare(a.data.name)
		});
		expect(none).toEqual([]);
		expect(names(plain)).toEqual(['C', 'B', 'A']);
	});
});

describe('sibling rule precedence', () => {
	it('sortCallback wins over orderMember (auto re-sort and sortNodes default)', () => {
		// by name, descending — ignores the order field
		const byNameDesc = ({ nodes }: any) =>
			[...nodes].sort((a: any, b: any) => b.data.name.localeCompare(a.data.name));
		const tree = createTree('order', { isSorted: true, sortCallback: byNameDesc });
		tree.insertArray([
			{ id: 1, path: '1', name: 'A', order: 10 },
			{ id: 2, path: '2', name: 'B', order: 20 }
		]);
		tree.addNode('', { id: 3, name: 'C', order: 30 });
		expect(names(tree)).toEqual(['C', 'B', 'A']);
		tree.sortNodes('', { direction: 'asc' });
		expect(names(tree)).toEqual(['C', 'B', 'A']);
		tree.refreshSiblings('');
		expect(names(tree)).toEqual(['C', 'B', 'A']);
	});
});
