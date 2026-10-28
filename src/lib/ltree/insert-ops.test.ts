import { describe, it, expect } from 'vitest';
import { createLTree } from './ltree.svelte.js';

/** insertNode / positioned insertBranch / applyChanges add|insert|update|remove. */

function createTree(orderMember?: string) {
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
		{}
	);
}

const names = (tree: any, parentPath = '') => {
	const parent = parentPath ? tree.getNodeByPath(parentPath) : tree.root;
	return Object.values(parent.children).map((n: any) => n.data.name);
};

describe('insertNode', () => {
	it('without orderMember places the node directly before / after the target', () => {
		const tree = createTree();
		tree.insertArray([
			{ id: 1, path: '1', name: 'A' },
			{ id: 2, path: '2', name: 'B' },
			{ id: 3, path: '3', name: 'C' }
		]);
		expect(tree.insertNode('2', { id: 9, name: 'Z' }, 'before').success).toBe(true);
		expect(names(tree)).toEqual(['A', 'Z', 'B', 'C']);
		// NOTE: a later add/move re-sorts siblings by display value (refreshSiblings) — without
		// orderMember a direct placement only holds until the next re-sort (unless isSortingEnabled = false).
	});

	it('with orderMember computes an order value between the neighbours', () => {
		const tree = createTree('order');
		tree.insertArray([
			{ id: 1, path: '1', name: 'A', order: 10 },
			{ id: 2, path: '2', name: 'B', order: 20 },
			{ id: 3, path: '3', name: 'C', order: 30 }
		]);
		const res = tree.insertNode('2', { id: 9, name: 'Z' }, 'after');
		expect(res.success).toBe(true);
		expect(res.node!.data.order).toBe(25);
		expect(names(tree)).toEqual(['A', 'B', 'Z', 'C']);
	});

	it("'child' adds under the target; a missing target fails", () => {
		const tree = createTree();
		tree.insertArray([{ id: 1, path: '1', name: 'A' }]);
		expect(tree.insertNode('1', { id: 9, name: 'Z' }, 'child').node!.path).toBe('1.9');
		expect(tree.insertNode('404', { id: 8, name: 'Y' }, 'before').success).toBe(false);
	});
});

describe('insertBranch (positioned)', () => {
	it('places the block next to the target, keeping its internal order', () => {
		const tree = createTree();
		tree.insertArray([
			{ id: 1, path: '1', name: 'A' },
			{ id: 2, path: '2', name: 'B' }
		]);
		const res = tree.insertBranch(
			'1',
			[
				{ id: 7, path: '7', name: 'Q' },
				{ id: 6, path: '6', name: 'P' },
				{ id: 71, path: '7.71', name: 'Q-child' }
			],
			'after'
		);
		expect(res.success).toBe(true);
		expect(names(tree)).toEqual(['A', 'Q', 'P', 'B']);
		expect(names(tree, '7')).toEqual(['Q-child']);
	});

	it('with orderMember spreads order values between the neighbours', () => {
		const tree = createTree('order');
		tree.insertArray([
			{ id: 1, path: '1', name: 'A', order: 10 },
			{ id: 2, path: '2', name: 'B', order: 40 }
		]);
		tree.insertBranch(
			'2',
			[
				{ id: 7, path: '7', name: 'Q' },
				{ id: 6, path: '6', name: 'P' }
			],
			'before'
		);
		expect(names(tree)).toEqual(['A', 'Q', 'P', 'B']);
		expect(tree.getNodeByPath('7')!.data.order).toBe(20);
		expect(tree.getNodeByPath('6')!.data.order).toBe(30);
	});
});

describe('applyChanges operations', () => {
	it('add / insert / update / remove', () => {
		const tree = createTree();
		tree.insertArray([
			{ id: 1, path: '1', name: 'A' },
			{ id: 2, path: '2', name: 'B' }
		]);
		const result = tree.applyChanges([
			{ operation: 'add', parentPath: '1', data: { id: 3, name: 'A-child' } },
			{ operation: 'insert', targetPath: '2', position: 'before', data: { id: 4, name: 'Z' } },
			{ operation: 'update', path: '1', data: { name: 'A2' } },
			{ operation: 'remove', path: '2' },
			{ operation: 'remove', path: '404' }
		]);
		expect(result.successful).toBe(4);
		expect(result.failed).toEqual([
			expect.objectContaining({ changeIndex: 4, operation: 'remove', path: '404' })
		]);
		expect(names(tree)).toEqual(['A2', 'Z']);
		expect(names(tree, '1')).toEqual(['A-child']);
	});
});
