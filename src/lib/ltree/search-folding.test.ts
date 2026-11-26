import { describe, it, expect, beforeAll } from 'vitest';
import { createLTree } from './ltree.svelte.js';
import type { LTreeNode } from './ltree-node.svelte.js';

// The built-in index folds text with core `normalizeSearchText` (REVIEW §4, = web-treeview's
// e2e "Search folding"): an unaccented query finds accented nodes, including the letters
// FlexSearch's own Charset.Normalize left alone (ł, ß).

type Row = { id: string; path: string; name: string };

const fixture: Row[] = [
	{ id: '1', path: '1', name: 'Český Krumlov' },
	{ id: '2', path: '2', name: 'Łódź' },
	{ id: '3', path: '3', name: 'Hauptstraße' },
	{ id: '4', path: '4', name: 'Brno' }
];

async function waitFor(check: () => boolean, ms = 2000) {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > ms) throw new Error('timed out waiting for the search index');
		await new Promise((r) => setTimeout(r, 10));
	}
}

describe('search folding (core normalizeSearchText)', () => {
	beforeAll(() => {
		const g = globalThis as any;
		if (!g.requestIdleCallback) {
			g.requestIdleCallback = (cb: (d: IdleDeadline) => void) =>
				setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0);
		}
	});

	it('an unaccented query finds accented nodes (Český, Łódź, Straße)', async () => {
		const tree = createLTree<Row>({
			idMember: 'id',
			pathMember: 'path',
			displayValueMember: 'name',
			searchValueMember: 'name',
			treeId: 'search-folding-tree',
			treePathSeparator: '.',
			isInternalSearchIndexEnabled: true,
			indexerBatchSize: 100,
			indexerTimeout: 50,
			sortCallback: ({ nodes }) => nodes
		});
		tree.insertArray(fixture);
		const names = (q: string) => tree.searchNodes(q).map((n: LTreeNode<Row>) => n.data?.name);
		await waitFor(() => names('brno').length === 1);
		expect(names('ces')).toEqual(['Český Krumlov']);
		expect(names('lodz')).toEqual(['Łódź']);
		expect(names('strasse')).toEqual(['Hauptstraße']);
		expect(names('ČESKÝ')).toEqual(['Český Krumlov']);
	});
});
