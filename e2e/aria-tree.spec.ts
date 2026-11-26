import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * ARIA tree semantics (WAI-ARIA tree pattern, REVIEW B22) + screen-reader announcements — the
 * same scenarios as web-treeview's e2e/aria-tree.spec.ts + e2e/announce.spec.ts.
 *
 * Focus stays on the role="tree" .stv__container (rows are virtual / re-keyed); the active row
 * is aria-activedescendant, owned by core /a11y createActiveDescendant in ARIA-only mode — the
 * tree keeps all its own keys. Announcements go through core announce() (the page's one polite
 * [data-km-announcer] live region): a settled search, a placed drop, a refused drop.
 *
 * Fixture: /test/aria-tree (see its header for the trees).
 */

const PAGE = '/test/aria-tree';

const container = (page: Page, id: string) => page.locator(`#${id} .stv__container`);
const nodeByPath = (scope: Locator, path: string) => scope.locator(`.stv__node[data-tree-path="${path}"]`).first();
const nodeContent = (node: Locator) => node.locator('> .stv__node-row .stv__node-content').first();
const region = (page: Page) => page.locator('[data-km-announcer="polite"]');

/** The container's aria-activedescendant resolved to the row's data-tree-path (null = none / dangling). */
async function activePath(page: Page, id: string): Promise<string | null> {
	return page.evaluate((i) => {
		const c = document.querySelector(`#${i} .stv__container`)!;
		const ref = c.getAttribute('aria-activedescendant');
		if (!ref) return null;
		return document.getElementById(ref)?.getAttribute('data-tree-path') ?? null;
	}, id);
}

async function isContainerFocused(page: Page, id: string): Promise<boolean> {
	return page.evaluate((i) => document.activeElement === document.querySelector(`#${i} .stv__container`), id);
}

async function dragInto(page: Page, src: Locator, dst: Locator): Promise<void> {
	const from = (await src.boundingBox())!;
	const box = (await dst.boundingBox())!;
	const fx = from.x + from.width / 2;
	const fy = from.y + from.height / 2;
	await page.mouse.move(fx, fy);
	await page.mouse.down();
	await page.mouse.move(fx + 8, fy + 8, { steps: 3 });
	await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 10 });
	await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(nodeByPath(page.locator('#tree'), '1')).toBeVisible();
});

test.describe('ARIA tree', () => {
	test('the container is a labelled tree; aria-multiselectable only in multiple mode', async ({ page }) => {
		await expect(container(page, 'tree')).toHaveAttribute('role', 'tree');
		await expect(container(page, 'tree')).toHaveAttribute('aria-label', 'Tree');
		await expect(container(page, 'tree')).not.toHaveAttribute('aria-multiselectable', /.*/);
		await expect(container(page, 'multi')).toHaveAttribute('aria-multiselectable', 'true');
		await expect(container(page, 'multi')).toHaveAttribute('aria-label', 'Food');
		// A labels change applies live.
		await page.evaluate(() => (window as any).__setTreeLabels({ 'ariaLabels.tree': 'Pantry' }));
		await expect(container(page, 'tree')).toHaveAttribute('aria-label', 'Pantry');
	});

	test('rows are treeitems with level, set position, expanded (parents only) and selected', async ({ page }) => {
		const t = page.locator('#tree');
		const fruit = nodeByPath(t, '1');
		const banana = nodeByPath(t, '1.2');
		const leaf = nodeByPath(t, '3');
		await expect(fruit).toHaveAttribute('role', 'treeitem');
		await expect(fruit).toHaveAttribute('aria-level', '1');
		await expect(fruit).toHaveAttribute('aria-posinset', '1');
		await expect(fruit).toHaveAttribute('aria-setsize', '3');
		await expect(fruit).toHaveAttribute('aria-expanded', 'true');
		await expect(nodeByPath(t, '2')).toHaveAttribute('aria-expanded', 'true');
		await expect(banana).toHaveAttribute('aria-level', '2');
		await expect(banana).toHaveAttribute('aria-posinset', '2');
		await expect(banana).toHaveAttribute('aria-setsize', '3');
		await expect(leaf).toHaveAttribute('aria-posinset', '3');
		await expect(leaf).not.toHaveAttribute('aria-expanded', /.*/);
		await expect(banana).not.toHaveAttribute('aria-expanded', /.*/);
		// No checkboxes → no aria-checked.
		await expect(banana).not.toHaveAttribute('aria-checked', /.*/);

		await expect(banana).toHaveAttribute('aria-selected', 'false');
		await page.evaluate(() => (window as any).__trees.tree.selectNode('1.2'));
		await expect(banana).toHaveAttribute('aria-selected', 'true');
		await page.evaluate(() => (window as any).__trees.tree.selectNode('3'));
		await expect(banana).toHaveAttribute('aria-selected', 'false');
		await expect(leaf).toHaveAttribute('aria-selected', 'true');

		// Collapsing updates aria-expanded; the hidden children leave the DOM.
		await page.evaluate(() => (window as any).__trees.tree.collapseNodes('1'));
		await expect(fruit).toHaveAttribute('aria-expanded', 'false');
		await expect(nodeByPath(t, '1.2')).toHaveCount(0);
	});

	test('aria-activedescendant follows ArrowDown / ArrowRight while focus stays on the container', async ({ page }) => {
		const t = page.locator('#tree');
		await nodeContent(nodeByPath(t, '1')).click();
		await expect.poll(() => activePath(page, 'tree')).toBe('1');
		expect(await isContainerFocused(page, 'tree')).toBe(true);

		// ArrowDown = next node at the same level.
		await page.keyboard.press('ArrowDown');
		await expect.poll(() => activePath(page, 'tree')).toBe('2');
		// Collapse Veg with Enter, then ArrowRight expands it and moves to its first child.
		await page.keyboard.press('Enter');
		await expect(nodeByPath(t, '2')).toHaveAttribute('aria-expanded', 'false');
		await expect.poll(() => activePath(page, 'tree')).toBe('2');
		await page.keyboard.press('ArrowRight');
		await expect(nodeByPath(t, '2')).toHaveAttribute('aria-expanded', 'true');
		await expect.poll(() => activePath(page, 'tree')).toBe('2.1');
		expect(await isContainerFocused(page, 'tree')).toBe(true);
	});

	test('virtual scroll: posinset / setsize count all siblings, not the rendered window', async ({ page }) => {
		const big = page.locator('#big');
		await expect(nodeByPath(big, '1')).toBeVisible();
		// Scroll to ~ row 2000 (root 21 is visible-row 2000 = 20 × 100).
		await page.evaluate(() => {
			const b = document.querySelector('#big .stv__virtual-scroll') as HTMLElement;
			// The spacer's per-row height (5000 visible rows), not a rendered row's offsetHeight.
			b.scrollTop = 2000 * (b.scrollHeight / 5000);
		});
		const root = nodeByPath(big, '21');
		await expect(root).toBeAttached();
		await expect(root).toHaveAttribute('aria-posinset', '21');
		await expect(root).toHaveAttribute('aria-setsize', '50');
		await expect(root).toHaveAttribute('aria-level', '1');
		const child = nodeByPath(big, '21.5');
		await expect(child).toHaveAttribute('aria-posinset', '5');
		await expect(child).toHaveAttribute('aria-setsize', '99');
		await expect(child).toHaveAttribute('aria-level', '2');
		// The first rows are no longer rendered.
		await expect(nodeByPath(big, '1')).toHaveCount(0);

		// End reveals the last row; aria-activedescendant points at it.
		await nodeContent(root).click();
		await expect.poll(() => activePath(page, 'big')).toBe('21');
		await page.keyboard.press('End');
		await expect.poll(() => activePath(page, 'big')).toBe('50.99');
		await expect(nodeByPath(big, '50.99')).toHaveAttribute('aria-posinset', '99');
	});

	test('checkboxes: aria-checked true / false / mixed (cascade)', async ({ page }) => {
		const c = page.locator('#checks');
		const fruit = nodeByPath(c, '1');
		const apple = nodeByPath(c, '1.1');
		await expect(fruit).toHaveAttribute('aria-checked', 'false');
		await expect(apple).toHaveAttribute('aria-checked', 'false');

		await apple.locator('.stv__checkbox').first().click();
		await expect(apple).toHaveAttribute('aria-checked', 'true');
		await expect(fruit).toHaveAttribute('aria-checked', 'mixed');
		await expect(nodeByPath(c, '1.2')).toHaveAttribute('aria-checked', 'false');

		await nodeByPath(c, '1.2').locator('.stv__checkbox').first().click();
		await nodeByPath(c, '1.3').locator('.stv__checkbox').first().click();
		await expect(fruit).toHaveAttribute('aria-checked', 'true');

		await fruit.locator('.stv__checkbox').first().click();
		await expect(fruit).toHaveAttribute('aria-checked', 'false');
		await expect(apple).toHaveAttribute('aria-checked', 'false');
	});

	test('a pasted copy keeps its source id but gets its own row id; aria-activedescendant hits the right row', async ({ page }) => {
		const t = page.locator('#tree');
		// Copy Banana (id 12) into Veg — no transform, so the copy keeps node id 12.
		const result = await page.evaluate(async () => {
			const tree = (window as any).__trees.tree;
			tree.copyNodes(['1.2']);
			const r = await tree.pasteNodes('2');
			return r.success ? null : r.error ?? 'failed';
		});
		expect(result).toBeNull();
		const rows = t.locator('.stv__node').filter({ hasText: 'Banana' });
		await expect(rows).toHaveCount(2);
		const info = await rows.evaluateAll((els) => els.map((e) => ({ id: e.id, path: e.getAttribute('data-tree-path')! })));
		const original = info.find((r) => r.path === '1.2')!;
		const copy = info.find((r) => r.path !== '1.2')!;
		expect(original.id).toBeTruthy();
		expect(copy.id).toBeTruthy();
		expect(copy.id).not.toBe(original.id);
		// Every rendered row id is unique.
		const ids = await t.locator('.stv__node').evaluateAll((els) => els.map((e) => e.id));
		expect(new Set(ids).size).toBe(ids.length);

		await nodeContent(nodeByPath(t, copy.path)).click();
		await expect.poll(() => activePath(page, 'tree')).toBe(copy.path);
		await expect(container(page, 'tree')).toHaveAttribute('aria-activedescendant', copy.id);
		await nodeContent(nodeByPath(t, '1.2')).click();
		await expect.poll(() => activePath(page, 'tree')).toBe('1.2');
		await expect(container(page, 'tree')).toHaveAttribute('aria-activedescendant', original.id);
	});
});

test.describe('announcements', () => {
	const search = (page: Page, id: string, term: string) =>
		page.evaluate(([i, t]) => (window as any).__search(i, t), [id, term]);

	test('a settled search says the match count; no match says "No results found"', async ({ page }) => {
		await expect(nodeByPath(page.locator('#ann'), '1.1')).toBeVisible();
		await search(page, 'ann', 'Ap');
		await expect(region(page)).toHaveText('Results: 2');
		await search(page, 'ann', 'Banana');
		await expect(region(page)).toHaveText('Results: 1');
		await search(page, 'ann', 'zzz');
		await expect(region(page)).toHaveText('No results found');
	});

	test('labels read the spot context ({ctx.*}); translateCallback gets it as params.ctx', async ({ page }) => {
		await page.evaluate(() => (window as any).__setAnnLabels({ 'ariaLabels.searchResults': '{ctx.searchTerm}: {ctx.count}' }));
		await search(page, 'ann', 'Ap');
		await expect(region(page)).toHaveText('Ap: 2');
		await page.evaluate(() => {
			(window as any).__setAnnLabels({});
			(window as any).__setAnnTranslate(({ key, params }: any) =>
				key === 'svelte-treeview.ariaLabels.searchResults'
					? `${params.ctx.count === 1 ? 'one' : 'many'} (${params.ctx.searchTerm})`
					: null
			);
		});
		await search(page, 'ann', 'Banana');
		await expect(region(page)).toHaveText('one (Banana)');
	});

	test('a placed drop says what moved where', async ({ page }) => {
		const t = page.locator('#ann');
		await dragInto(page, nodeContent(nodeByPath(t, '1.1')), nodeContent(nodeByPath(t, '2')));
		await expect(region(page)).toHaveText('Apricot moved into Banana');
	});

	test('a refused drop says why', async ({ page }) => {
		const t = page.locator('#ann');
		await dragInto(page, nodeContent(nodeByPath(t, '2')), nodeContent(nodeByPath(t, '3')));
		await expect(region(page)).toHaveText('Cannot drop here: Locked does not accept dropped items');
	});

	test("labels set to '' stay silent", async ({ page }) => {
		const s = page.locator('#silent');
		await dragInto(page, nodeContent(nodeByPath(s, '2')), nodeContent(nodeByPath(s, '3')));
		await dragInto(page, nodeContent(nodeByPath(s, '1.1')), nodeContent(nodeByPath(s, '2')));
		await expect(nodeByPath(s, '2.1')).toBeAttached(); // the drop happened
		await search(page, 'silent', 'Ap');
		await expect(nodeByPath(s, '3')).toHaveCount(0); // the search applied
		await page.waitForTimeout(300);
		expect((await region(page).count()) === 0 || (await region(page).textContent()) === '').toBe(true);
	});
});
