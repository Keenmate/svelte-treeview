import { test, expect, Page } from '@playwright/test';

/**
 * <Tree> instance exports added for web-treeview parity on /test/tree-api: getNodeRef,
 * getVisibleFlatNodes, getTree, getSelectedNodes / isNodeSelected, isNodeDropAllowed, the
 * clipboard methods, navNext / navPrev (+ the nav* family), openContextMenu(path) — and the
 * `controller` on every callback ctx (non-enumerable, like web's component context).
 */

const PAGE = '/test/tree-api';

async function run(page: Page, id: string): Promise<unknown> {
	await page.getByTestId(id).click();
	return JSON.parse((await page.getByTestId('out').textContent()) || 'null');
}
async function ctxLog(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('ctx-log').textContent()) || '[]');
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(page.locator('.stv__node[data-tree-path="1.1"]')).toBeVisible();
});

test('lookups: getNodeRef, getVisibleFlatNodes, getTree', async ({ page }) => {
	expect(await run(page, 'ref')).toEqual(['1.1', '1', 1]);
	expect(await run(page, 'visible')).toEqual(['1', '1.1', '2', '3']);
	expect(await run(page, 'tree')).toBe(true);
});

test('selection: getSelectedNodes / isNodeSelected', async ({ page }) => {
	expect(await run(page, 'select')).toEqual([['1', '3'], true, false]);
});

test('isNodeDropAllowed(path) evaluates getIsDropAllowedCallback (with controller in its ctx)', async ({ page }) => {
	expect(await run(page, 'drop')).toEqual([true, false, false]);
	expect(await ctxLog(page)).toContain('getIsDropAllowed:ctrl:hidden');
});

test('clipboard: copy / paste / cut / cancelCut / hasClipboardContent / getClipboardOperation', async ({ page }) => {
	expect(await run(page, 'clip')).toEqual([true, 'copy', true, 'cut', false]);
	const log = await ctxLog(page);
	expect(log).toContain('beforeCopy:ctrl:hidden');
	expect(log).toContain('onNodeCopy:ctrl:hidden');
	expect(log).toContain('onNodePaste:ctrl:hidden');
});

test('navNext / navPrev move through the visible nodes', async ({ page }) => {
	expect(await run(page, 'nav')).toEqual(['1.1', '2']);
});

test('openContextMenu(path, x, y) opens the menu for that node', async ({ page }) => {
	await page.getByTestId('menu').click();
	await expect(page.locator('.stv__context-menu .stv__context-menu-label')).toHaveText('Menu for 3');
});

test('event ctxs carry a non-enumerable controller', async ({ page }) => {
	await page.getByTestId('tree-host').getByText('C', { exact: true }).click();
	await expect.poll(() => ctxLog(page)).toEqual(expect.arrayContaining(['onNodeClick:ctrl:hidden', 'onSelectionChange:ctrl:hidden']));
});

test('flatIndentSize sets the per-level indent in flat rendering', async ({ page }) => {
	const ml = await page.locator('.stv__node[data-tree-path="1.1"]').evaluate((el) => getComputedStyle(el).marginLeft);
	expect(ml).toBe('24px');
});
