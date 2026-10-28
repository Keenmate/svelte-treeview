import { describe, it, expect, vi } from 'vitest';
import { createLTree } from './ltree.svelte.js';

/**
 * Verifies the single-emission guarantee for bulk subtree operations.
 *
 * addBranch / replaceBranch / removeBranch each mutate many nodes but must
 * fire _emitTreeChanged exactly once per public call. Counting per-call
 * emissions is impossible from outside the lib (there is no public hook), so
 * this is verified by spying on the internal method at the unit level.
 */

function createTree() {
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
		'name',     // displayValueMember
		undefined, // getDisplayValueCallback
		undefined, // searchValueMember
		undefined, // getSearchValueCallback
		undefined, // getAllowedDropPositionsCallback
		undefined, // isCollapsibleMember
		undefined, // getIsCollapsibleCallback
		undefined, // orderMember
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

const seed = [
	{ id: 1, path: '1', name: 'Root-A' },
	{ id: 2, path: '1.1', name: 'A-child-1' },
	{ id: 3, path: '1.2', name: 'A-child-2' },
	{ id: 4, path: '2', name: 'Root-B' },
	{ id: 5, path: '2.1', name: 'B-child-1' },
	{ id: 6, path: '2.1.1', name: 'B-grand-1' },
	{ id: 7, path: '2.1.2', name: 'B-grand-2' },
	{ id: 8, path: '3', name: 'Root-C' }
];

describe('branch operations — single-emission guarantee', () => {
	it('addBranch fires _emitTreeChanged exactly once for an N-node batch', () => {
		const tree = createTree();
		tree.insertArray(seed);

		const spy = vi.spyOn(tree, '_emitTreeChanged');

		const newNodes = [
			{ id: 100, path: '1.100', name: 'New-Root' },
			{ id: 101, path: '1.100.1', name: 'New-Child-A' },
			{ id: 102, path: '1.100.2', name: 'New-Child-B' },
			{ id: 103, path: '1.100.3', name: 'New-Child-C' }
		];
		const result = tree.addBranch('1', newNodes);

		expect(result.success).toBe(true);
		expect(result.count).toBe(4);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('replaceBranch fires _emitTreeChanged exactly once even though it deletes then inserts', () => {
		const tree = createTree();
		tree.insertArray(seed);

		const spy = vi.spyOn(tree, '_emitTreeChanged');

		// '1' has 2 existing children; replace them with 3 new ones plus a grandchild.
		const replacement = [
			{ id: 200, path: '1.200', name: 'Replaced-1' },
			{ id: 201, path: '1.201', name: 'Replaced-2' },
			{ id: 202, path: '1.202', name: 'Replaced-3' },
			{ id: 203, path: '1.200.1', name: 'Replaced-1-child' }
		];
		const result = tree.replaceBranch('1', replacement);

		expect(result.success).toBe(true);
		expect(result.count).toBe(4);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('removeBranch fires _emitTreeChanged exactly once for a multi-descendant subtree', () => {
		const tree = createTree();
		tree.insertArray(seed);

		const spy = vi.spyOn(tree, '_emitTreeChanged');

		// '2.1' has itself + 2 grandchildren = 3 nodes removed.
		const result = tree.removeBranch('2.1');

		expect(result.success).toBe(true);
		expect(result.count).toBe(3);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('removeBranch with keepParent=true still fires exactly once', () => {
		const tree = createTree();
		tree.insertArray(seed);

		const spy = vi.spyOn(tree, '_emitTreeChanged');

		const result = tree.removeBranch('2.1', true);

		expect(result.success).toBe(true);
		expect(result.count).toBe(2);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('failed bulk ops (invalid parent path) do not emit', () => {
		const tree = createTree();
		tree.insertArray(seed);

		const spy = vi.spyOn(tree, '_emitTreeChanged');

		const insRes = tree.addBranch('999.999', [
			{ id: 300, path: '999.999.1', name: 'X' }
		]);
		const repRes = tree.replaceBranch('999.999', [
			{ id: 301, path: '999.999.1', name: 'Y' }
		]);
		const delRes = tree.removeBranch('999.999');

		expect(insRes.success).toBe(false);
		expect(repRes.success).toBe(false);
		expect(delRes.success).toBe(false);
		expect(spy).not.toHaveBeenCalled();
	});
});

describe('isSilent on expand / collapse — never skips the re-render', () => {
	it('expandNodes / collapseNodes / expandAll / collapseAll with isSilent still emit the tree change', () => {
		const tree = createTree();
		tree.insertArray(seed);
		tree.collapseAll();
		const spy = vi.spyOn(tree, '_emitTreeChanged');

		tree.expandNodes('2.1', { isSilent: true });
		expect(tree.getNodeByPath('2.1')!.isExpanded).toBe(true);
		expect(spy).toHaveBeenCalledTimes(1);

		tree.collapseNodes('2.1', { isSilent: true });
		expect(tree.getNodeByPath('2.1')!.isExpanded).toBe(false);
		expect(spy).toHaveBeenCalledTimes(2);

		tree.expandAll(null, { isSilent: true });
		expect(spy).toHaveBeenCalledTimes(3);

		tree.collapseAll(null, { isSilent: true });
		expect(spy).toHaveBeenCalledTimes(4);
	});
});

describe('branch operation results (same shapes as web-treeview)', () => {
	it('replaceBranch → ReplaceBranchResult { removed, added }', () => {
		const tree = createTree();
		tree.insertArray(seed);
		const result = tree.replaceBranch('2', [{ id: 300, path: '2.300', name: 'Only' }]);
		expect(result).toMatchObject({ success: true, count: 1, removed: 3, added: 1 });
	});

	it('a missing parent / target reports error', () => {
		const tree = createTree();
		tree.insertArray(seed);
		expect(tree.addBranch('9', []).error).toBe('Parent not found: 9');
		expect(tree.insertBranch('9', [], 'after').error).toBe('Target not found: 9');
		expect(tree.replaceBranch('9', [])).toMatchObject({ success: false, removed: 0, added: 0, error: 'Parent not found: 9' });
		expect(tree.removeBranch('9')).toMatchObject({ success: false, count: 0 });
	});
});
