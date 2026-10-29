import { test, expect, Page } from '@playwright/test';

/**
 * Custom menu renderer on /test/custom-menu: a consumer-rendered menu over the public API
 * (menuContext / menuItemDefaults / activateMenuItem + resolveMenuEntries / getMenuChildren)
 * runs the same activation path as the built-in menu — a veto is not bypassable.
 */

const PAGE = '/test/custom-menu';

async function log(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('log').textContent()) || '[]');
}
function item(page: Page, text: string) {
	return page.getByTestId('item').filter({ hasText: text });
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(page.getByTestId('menu')).toBeVisible();
});

test('resolveMenuEntries + menuItemDefaults: built-in texts / state, dividers', async ({ page }) => {
	await expect(page.getByTestId('item')).toHaveText(['Paste', 'Delete', 'Expand', 'Custom', 'More']);
	await expect(item(page, 'Paste')).toBeDisabled(); // empty clipboard
	await expect(item(page, 'Delete')).toHaveClass(/danger/);
	await expect(item(page, 'Expand')).toBeDisabled(); // B has no children
	await expect(page.getByTestId('divider')).toHaveCount(1);
});

test('activateMenuItem: beforeActionCallback → onClick → onAction', async ({ page }) => {
	await item(page, 'Custom').click();
	await expect.poll(() => log(page)).toEqual([
		'before:custom:custom',
		'click:custom:2',
		'action:custom:custom:context-menu',
		'result:true'
	]);
});

test('activateMenuItem runs the built-in action', async ({ page }) => {
	await page.getByTestId('target-1').click();
	await item(page, 'Expand').click();
	await expect.poll(() => log(page)).toEqual([
		'before:expand:-',
		'expand:1',
		'action:expand:-:context-menu',
		'result:true'
	]);
});

test('a beforeActionCallback veto cancels onClick, the built-in and onAction', async ({ page }) => {
	await page.getByTestId('block').click();
	await item(page, 'Custom').click();
	await item(page, 'Delete').click();
	await expect.poll(() => log(page)).toEqual([
		'before:custom:custom',
		'result:false',
		'before:delete:-',
		'result:false'
	]);
	// not blocked: the built-in delete runs
	await page.getByTestId('block').click();
	await item(page, 'Delete').click();
	await expect.poll(async () => (await log(page)).slice(4)).toEqual([
		'before:delete:-',
		'delete:2',
		'action:delete:-:context-menu',
		'result:true'
	]);
});

test('getMenuChildren resolves an async submenu with the ctx', async ({ page }) => {
	await item(page, 'More').click();
	await expect.poll(async () => JSON.parse((await page.getByTestId('submenu').textContent()) || '[]')).toEqual(['Child of 2']);
});
