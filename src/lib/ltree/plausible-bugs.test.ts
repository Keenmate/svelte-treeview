import { describe, it, expect, beforeAll } from 'vitest';
import { createLTree } from './ltree.svelte.js';
import type { LTreeNode } from './ltree-node.svelte.js';

// Retests of REVIEW-2026-11-19's "plausible, not proven" list (ltree-level ones).

type Row = { id: string; path: string; name: string };

async function waitFor(check: () => boolean, ms = 2000) {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > ms) throw new Error('timed out');
		await new Promise((r) => setTimeout(r, 10));
	}
}

beforeAll(() => {
	const g = globalThis as any;
	if (!g.requestIdleCallback) {
		g.requestIdleCallback = (cb: (d: IdleDeadline) => void) =>
			setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0);
	}
});

function build(rows: Row[], extra: Record<string, unknown> = {}) {
	const tree = createLTree<Row>({
		idMember: 'id',
		pathMember: 'path',
		displayValueMember: 'name',
		searchValueMember: 'name',
		treeId: 'plausible-' + Math.random().toString(36).slice(2),
		treePathSeparator: '.',
		expandLevel: 5,
		isInternalSearchIndexEnabled: true,
		indexerBatchSize: 100,
		indexerTimeout: 50,
		sortCallback: ({ nodes }: { nodes: LTreeNode<Row>[] }) => [...nodes].sort((a, b) => a.path.localeCompare(b.path)),
		...extra
	} as any);
	const result = tree.insertArray(rows);
	return { tree, result };
}

describe('plausible: filtered rows keep TREE order, not search relevance', () => {
	it('a better-ranked match later in the tree does not jump ahead', async () => {
		// 'apple' (path 3) is the exact match — FlexSearch ranks it above 'apple pie' / 'green apple tree'
		const rows: Row[] = [
			{ id: 'a', path: '1', name: 'green apple tree' },
			{ id: 'b', path: '2', name: 'apple pie' },
			{ id: 'c', path: '3', name: 'apple' },
			{ id: 'd', path: '4', name: 'banana' }
		];
		const { tree } = build(rows);
		await waitFor(() => tree.searchNodes('banana').length === 1);
		const order = tree.searchNodes('apple').map((n) => n.path);
		tree.filterNodes('apple');
		const visible = tree.visibleFlatNodes.map((n) => n.path);
		// record what the index returned, then require tree order in the view
		expect({ searchOrder: order, visible }).toMatchObject({ visible: ['1', '2', '3'] });
	});

	it('nested matches keep tree order under their parent', async () => {
		const rows: Row[] = [
			{ id: 'p', path: '1', name: 'fruit' },
			{ id: 'a', path: '1.1', name: 'red apple sauce' },
			{ id: 'b', path: '1.2', name: 'apple' },
			{ id: 'c', path: '1.3', name: 'apple jam' }
		];
		const { tree } = build(rows);
		await waitFor(() => tree.searchNodes('fruit').length === 1);
		tree.filterNodes('apple');
		expect(tree.visibleFlatNodes.map((n) => n.path)).toEqual(['1', '1.1', '1.2', '1.3']);
	});
});

describe('plausible: a sibling-only sortCallback on the initial load', () => {
	it('sorting the whole flat dataset by name (child before its parent) still inserts every row', () => {
		const rows: Row[] = [
			{ id: 'z', path: '1', name: 'Zoo' },
			{ id: 'a', path: '1.1', name: 'Apple' },
			{ id: 'm', path: '2', name: 'Mid' }
		];
		const { tree, result } = build(rows, {
			sortCallback: ({ nodes }: { nodes: LTreeNode<Row>[] }) =>
				[...nodes].sort((a, b) => (a.data?.name ?? '').localeCompare(b.data?.name ?? ''))
		});
		expect(result.failed.map((f: any) => f.node?.path ?? f.originalData?.path)).toEqual([]);
		expect(tree.getNodeByPath('1.1')).not.toBeNull();
	});
});

describe('plausible: moveNode segment suffix in a batch', () => {
	it('two moved nodes whose segment AND id both collide do not overwrite each other', () => {
		// Target 1 already has children with segment '1' and segment 's'; the two sources have
		// segment '1' and the duplicated id 's' (a pasted copy keeps its source id) → both fall
		// back to the `${segment}_${Date.now()}` suffix in the same millisecond.
		const rows: Row[] = [
			{ id: 't', path: '1', name: 'Target' },
			{ id: 'k1', path: '1.1', name: 'Existing one' },
			{ id: 's', path: '1.s', name: 'Existing s' },
			{ id: 'p2', path: '2', name: 'Source parent 2' },
			{ id: 's', path: '2.1', name: 'Mover A' },
			{ id: 'p3', path: '3', name: 'Source parent 3' },
			{ id: 's', path: '3.1', name: 'Mover B' }
		];
		const { tree } = build(rows);
		const realNow = Date.now;
		Date.now = () => 1700000000000; // both moves in the same millisecond
		let a, b;
		try {
			a = tree.moveNode('2.1', '1', 'child');
			b = tree.moveNode('3.1', '1', 'child');
		} finally {
			Date.now = realNow;
		}
		expect(a.success && b.success).toBe(true);
		const names = Object.values(tree.getNodeByPath('1')!.children).map((n) => n.data?.name).sort();
		expect(names).toEqual(['Existing one', 'Existing s', 'Mover A', 'Mover B']);
	});
});
