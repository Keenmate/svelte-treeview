import { describe, it, expect, beforeAll } from 'vitest';
import { createLTree } from './ltree.svelte.js';
import type { LTreeNode } from './ltree-node.svelte.js';

// Regression: the internal search index is keyed by the node's slot in a flat array.
// Removals used to COMPACT that array, so every hit after the removed slot resolved to
// the wrong node, and removeNode never dropped the node at all (still searchable).
// Removed slots are now tombstones (+ removed from the index); addNode indexes the new node.

type Row = { id: string; path: string; name: string };

const fixture: Row[] = [
	{ id: 'a', path: '1', name: 'alpha' },
	{ id: 'b', path: '1.1', name: 'bravo' },
	{ id: 'c', path: '1.2', name: 'charlie' },
	{ id: 'd', path: '2', name: 'delta' },
	{ id: 'e', path: '2.1', name: 'echo' },
	{ id: 'f', path: '3', name: 'foxtrot' }
];

function sortByPath({ nodes }: { nodes: LTreeNode<Row>[] }) {
	return [...nodes].sort((a, b) => a.path.localeCompare(b.path));
}

function build() {
	return createLTree<Row>(
		'id', // _idMember
		'path', // _pathMember
		undefined, // _parentPathMember
		undefined, // _levelMember
		undefined, // _hasChildrenMember
		undefined, // _isExpandedMember
		undefined, // _getIsExpandedCallback
		undefined, // _isSelectableMember
		undefined, // _getIsSelectableCallback
		undefined, // _isCheckedMember
		undefined, // _getIsCheckedCallback
		undefined, // _isDraggableMember
		undefined, // _getIsDraggableCallback
		undefined, // _isDropAllowedMember
		undefined, // _getIsDropAllowedCallback
		undefined, // _allowedDropPositionsMember
		'name', // _displayValueMember
		undefined, // _getDisplayValueCallback
		'name', // _searchValueMember
		undefined, // _getSearchValueCallback
		undefined, // _getAllowedDropPositionsCallback
		undefined, // _isCollapsibleMember
		undefined, // _getIsCollapsibleCallback
		undefined, // _orderMember
		'search-removal-tree',
		'.',
		5, // expandLevel
		true, // _shouldUseInternalSearchIndex
		undefined,
		100,
		50,
		{ sortCallback: sortByPath }
	);
}

const names = (nodes: LTreeNode<Row>[]) => nodes.map((n) => n.data?.name).sort();

async function waitFor(check: () => boolean, ms = 2000) {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > ms) throw new Error('timed out waiting for the search index');
		await new Promise((r) => setTimeout(r, 10));
	}
}

describe('search index stays correct across removals', () => {
	beforeAll(() => {
		// jsdom has no requestIdleCallback (the indexer schedules batches with it)
		const g = globalThis as any;
		if (!g.requestIdleCallback) {
			g.requestIdleCallback = (cb: (d: IdleDeadline) => void) =>
				setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0);
		}
	});

	it('removeNode drops the node + subtree from search; later hits still resolve to the right node', async () => {
		const ltree = build();
		ltree.insertArray(fixture);
		await waitFor(() => ltree.searchNodes('foxtrot').length > 0);

		expect(ltree.removeNode('1').success).toBe(true);

		expect(ltree.searchNodes('alpha')).toEqual([]);
		expect(ltree.searchNodes('bravo')).toEqual([]);
		expect(names(ltree.searchNodes('delta'))).toEqual(['delta']);
		expect(names(ltree.searchNodes('foxtrot'))).toEqual(['foxtrot']);
	});

	it('removeBranch (keepParent) leaves the parent searchable and shifts nothing', async () => {
		const ltree = build();
		ltree.insertArray(fixture);
		await waitFor(() => ltree.searchNodes('foxtrot').length > 0);

		ltree.removeBranch('2', true);

		expect(ltree.searchNodes('echo')).toEqual([]);
		expect(names(ltree.searchNodes('delta'))).toEqual(['delta']);
		expect(names(ltree.searchNodes('foxtrot'))).toEqual(['foxtrot']);
	});

	it('addNode makes the new node searchable', async () => {
		const ltree = build();
		ltree.insertArray(fixture);
		await waitFor(() => ltree.searchNodes('foxtrot').length > 0);

		ltree.addNode('3', { id: 'g', path: '', name: 'golf' });
		await waitFor(() => ltree.searchNodes('golf').length > 0);
		expect(names(ltree.searchNodes('golf'))).toEqual(['golf']);
	});
});
