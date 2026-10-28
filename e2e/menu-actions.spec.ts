import { test, expect, Page } from '@playwright/test';

/**
 * Context-menu model (web-treeview parity) on /test/menu-actions: built-in action names with
 * `labels` texts, custom items, dividers, `beforeActionCallback` → item `onClick` → built-in →
 * `onAction`, and the built-in targets (the selection when the clicked node is in it).
 */

const PAGE = '/test/menu-actions';

async function log(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('log').textContent()) || '[]');
}
async function expanded(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('expanded').textContent()) || '[]');
}
function row(page: Page, name: string) {
	return page.getByTestId('tree').getByText(name, { exact: true });
}
function menuItem(page: Page, text: string) {
	return page.locator('.stv__context-menu .stv__context-menu-item', { hasText: text }).first();
}
async function openMenu(page: Page, name: string) {
	await row(page, name).click({ button: 'right' });
	await expect(page.locator('.stv__context-menu')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(row(page, 'A')).toBeVisible();
});

test('built-ins render with labels texts, state and dividers; hidden items are dropped', async ({ page }) => {
	await openMenu(page, 'A');
	const items = page.locator('.stv__context-menu > .stv__context-menu-item');
	await expect(items.locator('.stv__context-menu-label')).toHaveText([
		'Kopírovat', 'Paste', 'Delete', 'Expand', 'Collapse', 'Expand subtree', 'Collapse subtree',
		'Expand all', 'Collapse all', 'Sort', 'Sort everything', 'Custom', 'More'
	]);
	await expect(menuItem(page, 'Paste')).toHaveClass(/stv__context-menu-item--disabled/);
	await expect(menuItem(page, 'Delete')).toHaveClass(/stv__context-menu-item--danger/);
	await expect(menuItem(page, 'Collapse').first()).toHaveClass(/stv__context-menu-item--disabled/);
	await expect(page.locator('.stv__context-menu > .stv__context-menu-divider')).toHaveCount(2);
	await expect(page.locator('.stv__context-menu-divider-label')).toHaveText('View');
	expect((await log(page))[0]).toBe('menu:1:root:3:ctrl');
});

test('order: beforeActionCallback → onClick → onAction; the menu closes', async ({ page }) => {
	await openMenu(page, 'B');
	await menuItem(page, 'Custom').click();
	await expect(page.locator('.stv__context-menu')).toHaveCount(0);
	const entries = (await log(page)).filter((e) => !e.startsWith('menu:'));
	expect(entries).toEqual(['before:custom:custom', 'click:custom:2', 'action:custom:custom:context-menu']);
});

test('submenu item activates', async ({ page }) => {
	await openMenu(page, 'B');
	await menuItem(page, 'More').hover();
	await menuItem(page, 'Child item').click();
	await expect.poll(async () => (await log(page)).filter((e) => !e.startsWith('menu:'))).toEqual([
		'before:custom:child', 'click:child', 'action:custom:child:context-menu'
	]);
});

test('expand-subtree expands the node and all descendants; collapse-all collapses everything', async ({ page }) => {
	await openMenu(page, 'A');
	await menuItem(page, 'Expand subtree').click();
	await expect(row(page, 'A1a')).toBeVisible();
	expect(await expanded(page)).toEqual(expect.arrayContaining(['1', '1.1']));
	expect(await log(page)).toContain('action:expand-subtree:-:context-menu');
	await openMenu(page, 'A');
	await menuItem(page, 'Collapse all').click();
	await expect(row(page, 'A1')).toHaveCount(0);
});

test('a built-in acts on the whole selection when the clicked node is in it', async ({ page }) => {
	await row(page, 'A').click({ modifiers: ['Control'] });
	await row(page, 'B').click({ modifiers: ['Control'] });
	await openMenu(page, 'A');
	await menuItem(page, 'Expand').first().click();
	await expect(row(page, 'A1')).toBeVisible();
	await expect(row(page, 'B1')).toBeVisible();
});

test('a built-in acts on the clicked node only when it is outside the selection', async ({ page }) => {
	await row(page, 'B').click({ modifiers: ['Control'] });
	await openMenu(page, 'A');
	await menuItem(page, 'Expand').first().click();
	await expect(row(page, 'A1')).toBeVisible();
	await expect(row(page, 'B1')).toHaveCount(0);
});

test('beforeActionCallback false cancels the built-in and onAction', async ({ page }) => {
	await page.getByTestId('block').click();
	await openMenu(page, 'A');
	await menuItem(page, 'Expand all').click();
	await page.waitForTimeout(100);
	expect(await expanded(page)).toEqual([]);
	const entries = (await log(page)).filter((e) => !e.startsWith('menu:'));
	expect(entries).toEqual(['before:expand-all:-']);
});

test('delete removes the node; copy + paste duplicates into the clicked node', async ({ page }) => {
	await openMenu(page, 'C');
	await menuItem(page, 'Delete').click();
	await expect(row(page, 'C')).toHaveCount(0);
	await openMenu(page, 'B');
	await menuItem(page, 'Kopírovat').click();
	await openMenu(page, 'A');
	await expect(menuItem(page, 'Paste')).not.toHaveClass(/stv__context-menu-item--disabled/);
	await menuItem(page, 'Paste').click();
	expect(await log(page)).toContain('action:paste:-:context-menu');
});
