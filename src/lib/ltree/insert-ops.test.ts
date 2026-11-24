import { describe, it, expect } from 'vitest';
import { createLTree } from './ltree.svelte.js';

/** insertNode / positioned insertBranch / processChanges add|insert|update|remove. */

function createTree(orderMember?: string) {
	return createLTree<any>({
		idMember: 'id',
		pathMember: 'path',
		displayValueMember: 'name',
		orderMember,
		treeId: 'test-tree',
		treePathSeparator: '.',
		expandLevel: 3,
		isInternalSearchIndexEnabled: false,
		indexerBatchSize: 25,
		indexerTimeout: 50
	});
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

describe('processChanges operations', () => {
	it('add / insert / update / remove', () => {
		const tree = createTree();
		tree.insertArray([
			{ id: 1, path: '1', name: 'A' },
			{ id: 2, path: '2', name: 'B' }
		]);
		const result = tree.processChanges([
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

describe('insert / remove bookkeeping (review 2026-11-19 B19 / B20)', () => {
	it('a duplicate path is reported as a failure, with the failing row as originalData', () => {
		const tree = createTree();
		const dup = { id: 3, path: '1', name: 'Again' };
		const result = tree.insertArray([{ id: 2, path: '2', name: 'B' }, { id: 1, path: '1', name: 'A' }, dup]);
		expect(result.successful).toBe(2);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0].error).toMatch(/Duplicate path/);
		expect(result.failed[0].originalData).toBe(dup);
		expect(names(tree)).toEqual(['A', 'B']);
	});

	it('removeNode drops the whole subtree from nodeCount', () => {
		const tree = createTree();
		tree.insertArray([
			{ id: 1, path: '1', name: 'A' },
			{ id: 2, path: '1.1', name: 'A1' },
			{ id: 3, path: '1.1.1', name: 'A1a' },
			{ id: 4, path: '2', name: 'B' }
		]);
		expect(tree.statistics.nodeCount).toBe(4);
		tree.removeNode('1');
		expect(tree.statistics.nodeCount).toBe(1);
	});
});

describe('edits while a filter is active (review 2026-11-19 R3)', () => {
	it('removeNode on the filtered view removes the REAL node', async () => {
		const tree = createTree();
		tree.insertArray([
			{ id: 1, path: '1', name: 'A' },
			{ id: 2, path: '1.1', name: 'match one' },
			{ id: 3, path: '1.2', name: 'other' }
		]);
		// Build the filtered view by hand (no search index in this tree).
		tree.createFilteredTree(['1.1']);
		expect(tree.isFiltered).toBe(true);
		expect(tree.removeNode('1.1').success).toBe(true);
		expect(tree.getNodeByPath('1.1', tree.root)).toBeNull();
		tree.filterNodes('');
		expect(names(tree, '1')).toEqual(['other']);
	});
});

describe('moveNode order values (§3.7: the same rule as insertNode / _placeNextTo)', () => {
	it('adjacent whole numbers get a fraction, never a duplicate', () => {
		const tree = createTree('order');
		tree.insertArray([
			{ id: 1, path: '1', name: 'A', order: 3 },
			{ id: 2, path: '2', name: 'B', order: 4 },
			{ id: 3, path: '3', name: 'C', order: 10 }
		]);
		expect(tree.moveNode('3', '2', 'before').success).toBe(true);
		expect(tree.getNodeByPath('3')!.data.order).toBe(3.5);
		expect(names(tree)).toEqual(['A', 'C', 'B']);
	});

	it('a wide gap still gets a whole number', () => {
		const tree = createTree('order');
		tree.insertArray([
			{ id: 1, path: '1', name: 'A', order: 10 },
			{ id: 2, path: '2', name: 'B', order: 20 },
			{ id: 3, path: '3', name: 'C', order: 30 }
		]);
		tree.moveNode('3', '1', 'after');
		expect(tree.getNodeByPath('3')!.data.order).toBe(15);
		expect(names(tree)).toEqual(['A', 'C', 'B']);
	});
});
