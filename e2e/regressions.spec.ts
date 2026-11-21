import { test, expect, type Page } from '@playwright/test';

/**
 * Regressions from the 2026-11-19 review (docs/REVIEW-2026-11-19.md — R… / B… ids) on
 * /test/regressions. Main tree: Alpha (1) → Beta (1.1) → Gamma (1.1.1), Delta (1.1.2);
 * Eta match (1.2); Epsilon (2) → Zeta match (2.1). Cascade checkboxes, internal search,
 * an id-minting input transform, a callback context menu with F2 / Del shortcuts.
 */

const PAGE = '/test/regressions';

const main = (page: Page) => page.getByTestId('main-section');
const row = (page: Page, path: string) => main(page).locator(`.stv__node[data-tree-path="${path}"]`).first();
const box = (page: Page, path: string) => row(page, path).locator('.stv__checkbox').first();
const label = (page: Page, path: string) => row(page, path).locator('.stv__node-label').first();
const call = (page: Page, tree: string, fn: string, ...args: unknown[]) =>
	page.evaluate(([tree, fn, args]) => (window as any)[tree][fn](...(args as unknown[])), [tree, fn, args] as const);
const setSearch = (page: Page, term: string) => page.evaluate((t) => (window as any).__setSearch(t), term);

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await page.waitForFunction(() => !!(window as any).__main && !!(window as any).__input);
	await expect(row(page, '1.1.1')).toBeVisible();
});

test.describe('checkbox state', () => {
	test('R1: uncheckAll clears a [-] branch too', async ({ page }) => {
		await box(page, '1.1.1').click();
		await expect(box(page, '1.1')).toHaveClass(/stv__checkbox--indeterminate/);
		await call(page, '__main', 'uncheckAll');
		for (const p of ['1', '1.1', '1.1.1']) {
			await expect(box(page, p), p).not.toHaveClass(/stv__checkbox--indeterminate/);
			await expect(box(page, p), p).not.toBeChecked();
		}
	});
});

test.describe('clipboard', () => {
	test('R2: pasting a 3-level subtree with an id-minting transform keeps the grandchildren', async ({ page }) => {
		await call(page, '__main', 'copyNodes', ['1']);
		const result = await call(page, '__main', 'pasteNodes', '2');
		expect(result).toMatchObject({ success: true, skipped: 0 });
		await expect
			.poll(() => page.evaluate(() => (window as any).__nodes().filter((n: any) => n.name === 'Gamma').length))
			.toBe(2);
		const copies = await page.evaluate(() =>
			(window as any).__nodes().filter((n: any) => n.id >= 100).map((n: any) => n.name).sort()
		);
		expect(copies).toEqual(['Alpha', 'Beta', 'Delta', 'Eta match', 'Gamma']);
	});
});

test.describe('while filtered', () => {
	test('R3: a node removed while filtered stays removed when the filter clears', async ({ page }) => {
		await setSearch(page, 'match');
		await expect(row(page, '1.1')).toHaveCount(0);
		await expect(row(page, '2.1')).toBeVisible();
		await call(page, '__main', 'removeNode', '2.1');
		await expect(row(page, '2.1')).toHaveCount(0);
		await setSearch(page, '');
		await expect(row(page, '1.1')).toBeVisible();
		await expect(row(page, '2')).toBeVisible();
		await expect(row(page, '2.1')).toHaveCount(0);
	});

	test('R5: a node selected while filtered stays selected when the filter clears', async ({ page }) => {
		await setSearch(page, 'match');
		await expect(row(page, '1.1')).toHaveCount(0);
		await label(page, '2.1').click();
		await setSearch(page, '');
		await expect(row(page, '1.1')).toBeVisible();
		await expect(row(page, '2.1').locator('.stv__node-content')).toHaveClass(/stv__node-content--selected/);
	});
});

test('R4: assigning expandedPaths updates the expand arrow of a still-visible row', async ({ page }) => {
	await page.evaluate(() => (window as any).__setExpanded(['2']));
	await expect(row(page, '1.1')).toHaveCount(0);
	await expect(row(page, '1').locator('.expanded')).toHaveCount(0);
	await expect(row(page, '2').locator('.expanded')).toHaveCount(1);
});

test.describe('context menu', () => {
	test('R6: the menu opens at cursor + contextMenuXOffset (8px), not twice the offset', async ({ page }) => {
		const r = (await label(page, '1.1').boundingBox())!;
		const x = Math.round(r.x + 10);
		const y = Math.round(r.y + 5);
		await page.mouse.click(x, y, { button: 'right' });
		const menu = (await main(page).locator('.km-menu:not(.km-menu--submenu)').boundingBox())!;
		expect(Math.round(menu.x - x)).toBe(8);
	});

	test('R7: named-key item shortcuts fire (F2, Del alias)', async ({ page }) => {
		await label(page, '1.1').click({ button: 'right' });
		await expect(main(page).locator('.km-menu:not(.km-menu--submenu)')).toBeVisible();
		await page.keyboard.press('F2');
		await expect(page.getByTestId('shortcut-hits')).toHaveText('F2;');
		await label(page, '1.1').click({ button: 'right' });
		await page.keyboard.press('Delete');
		await expect(page.getByTestId('shortcut-hits')).toHaveText('F2;Del;');
	});

	test('B4: Escape closes a snippet (contextMenu) menu', async ({ page }) => {
		const section = page.getByTestId('snippet-section');
		await section.locator('.stv__node[data-tree-path="1"] .stv__node-label').click({ button: 'right' });
		await expect(section.locator('.km-menu:not(.km-menu--submenu)')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(section.locator('.km-menu:not(.km-menu--submenu)')).toHaveCount(0);
	});
});

test('B1: onNodeDelete reports the removed paths when one in the middle fails', async ({ page }) => {
	const result = await call(page, '__main', 'runDeleteCommand', ['1.2', '9.9', '2.1']);
	expect(result).toEqual({ removed: 2, blocked: 1 });
	await expect(page.getByTestId('deleted')).toHaveText('1.2,2.1');
});

test('B13: search works without requestIdleCallback (Safari)', async ({ page }) => {
	await page.addInitScript(() => {
		delete (window as any).requestIdleCallback;
	});
	await page.goto(PAGE);
	await page.waitForFunction(() => !!(window as any).__main);
	expect(await page.evaluate(() => typeof (window as any).requestIdleCallback)).toBe('undefined');
	await setSearch(page, 'zeta');
	await expect(row(page, '2.1')).toBeVisible();
	await expect(row(page, '1.1')).toHaveCount(0);
});

test('B14: the drag ghost lives inside the tree container and is styled', async ({ page }) => {
	const from = (await label(page, '1.2').boundingBox())!;
	await page.mouse.move(from.x + 10, from.y + 5);
	await page.mouse.down();
	await page.mouse.move(from.x + 40, from.y + 40, { steps: 8 });
	const ghost = main(page).locator('.stv__container .stv__touch-ghost');
	await expect(ghost).toHaveCount(1);
	const bg = await ghost.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(bg).not.toBe('rgba(0, 0, 0, 0)');
	await page.keyboard.press('Escape');
	await page.mouse.up();
	await expect(page.locator('.stv__touch-ghost')).toHaveCount(0);
});

test('B6: a drag released on nothing restores the selection the grab replaced', async ({ page }) => {
	await label(page, '2').click();
	await expect(row(page, '2').locator('.stv__node-content')).toHaveClass(/--selected/);
	const from = (await label(page, '1.2').boundingBox())!;
	await page.mouse.move(from.x + 10, from.y + 5);
	await page.mouse.down();
	await page.mouse.move(from.x + 40, from.y + 40, { steps: 8 });
	await expect(row(page, '1.2').locator('.stv__node-content')).toHaveClass(/--selected/);
	// release far outside any tree
	await page.mouse.move(900, 20, { steps: 8 });
	await page.mouse.up();
	await expect(row(page, '2').locator('.stv__node-content')).toHaveClass(/--selected/);
	await expect(row(page, '1.2').locator('.stv__node-content')).not.toHaveClass(/--selected/);
});

test('B18: Delete typed in an input inside a row edits the input, not the tree', async ({ page }) => {
	const section = page.getByTestId('input-section');
	await section.locator('.stv__node[data-tree-path="1"] .stv__node-content').click();
	const input = section.getByTestId('row-input');
	await input.click();
	await input.press('End');
	await input.press('Backspace');
	await input.press('Delete');
	await input.press('Home');
	await input.press('Delete');
	await expect(input).toHaveValue('ex');
	await expect(section.locator('.stv__node[data-tree-path="1"]')).toHaveCount(1);
});

test('one-entry drag manifest still leaves its hole behind (beforeDragStartCallback)', async ({ page }) => {
	// Solo (1) has one child Key (1.1); the callback omits Key → manifest ['1'] (ONE entry).
	// Used to take the single-node moveNode path, which carried Key along.
	const section = page.getByTestId('hole-section');
	const src = section.locator('.stv__node[data-tree-path="1"] .stv__node-content').first();
	const dst = section.locator('.stv__node[data-tree-path="2"] .stv__node-content').first();
	const from = (await src.boundingBox())!;
	const to = (await dst.boundingBox())!;
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 8, { steps: 3 });
	await page.mouse.move(to.x + to.width * 0.8, to.y + to.height / 2, { steps: 10 }); // 'child'
	await page.mouse.up();
	await expect
		.poll(() =>
			page.evaluate(() =>
				Object.fromEntries((window as any).__holeNodes().map((n: any) => [n.name, n.path]))
			)
		)
		// Solo moved under Target; Key stayed at the root (segment '1' was still taken → its id).
		.toEqual({ Target: '2', Solo: '2.1', Key: '11' });
});
