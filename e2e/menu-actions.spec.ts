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
	return page.locator('.km-menu .km-menu__item', { hasText: text }).first();
}
async function openMenu(page: Page, name: string) {
	await row(page, name).click({ button: 'right' });
	await expect(page.locator('.km-menu:not(.km-menu--submenu)')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(row(page, 'A')).toBeVisible();
});

test('built-ins render with labels texts, state and dividers; hidden items are dropped', async ({ page }) => {
	await openMenu(page, 'A');
	const items = page.locator('.km-menu:not(.km-menu--submenu) > .km-menu__item');
	await expect(items.locator('.km-menu__label')).toHaveText([
		'Kopírovat', 'Paste', 'Delete', 'Expand', 'Collapse', 'Expand subtree', 'Collapse subtree',
		'Expand all', 'Collapse all', 'Sort', 'Sort everything', 'Custom', 'More', 'Lazy'
	]);
	await expect(menuItem(page, 'Paste')).toHaveClass(/km-menu__item--disabled/);
	await expect(menuItem(page, 'Delete')).toHaveClass(/km-menu__item--danger/);
	await expect(menuItem(page, 'Collapse').first()).toHaveClass(/km-menu__item--disabled/);
	await expect(page.locator('.km-menu:not(.km-menu--submenu) > .km-menu__divider')).toHaveCount(2);
	await expect(page.locator('.km-menu__divider--named')).toHaveText('View');
	expect((await log(page))[0]).toBe('menu:1:root:3:ctrl');
});

test('order: beforeActionCallback → onClick → onAction; the menu closes', async ({ page }) => {
	await openMenu(page, 'B');
	await menuItem(page, 'Custom').click();
	await expect(page.locator('.km-menu:not(.km-menu--submenu)')).toHaveCount(0);
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
	await expect(menuItem(page, 'Paste')).not.toHaveClass(/km-menu__item--disabled/);
	await menuItem(page, 'Paste').click();
	expect(await log(page)).toContain('action:paste:-:context-menu');
});

test('keyboard (WAI-ARIA): Enter expands / collapses, Space toggles the selection in multiple mode', async ({ page }) => {
	await row(page, 'A').click(); // expand-and-focus: selects + expands
	const content = page.locator('.stv__node[data-tree-path="1"] > .stv__node-row .stv__node-content').first();
	await expect(content).toHaveClass(/stv__node-content--selected/);
	await expect(row(page, 'A1')).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(row(page, 'A1')).toHaveCount(0);
	await expect(content).toHaveClass(/stv__node-content--selected/);
	await page.keyboard.press('Space');
	await expect(content).not.toHaveClass(/stv__node-content--selected/);
	await expect(row(page, 'A1')).toHaveCount(0);
	await page.keyboard.press('Enter');
	await expect(row(page, 'A1')).toBeVisible();
});

// ── Core openMenu (the same menu as web-treeview) ─────────────────────────────

const menuRoot = (page: Page) => page.locator('.km-menu:not(.km-menu--submenu)');
const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.textContent ?? '');

test("Shift+F10 opens the focused node's menu with the first item focused; arrows skip disabled items; Escape returns focus", async ({ page }) => {
	await row(page, 'B').click();
	await page.keyboard.press('Shift+F10');
	await expect(menuRoot(page)).toBeVisible();
	await expect(menuRoot(page)).toHaveAttribute('aria-label', 'B');
	expect(await focusedText(page)).toBe('Kopírovat');
	await page.keyboard.press('ArrowDown'); // Paste is disabled (empty clipboard) → Delete
	expect(await focusedText(page)).toBe('Delete');
	await page.keyboard.press('End');
	expect(await focusedText(page)).toBe('Lazy');
	await page.keyboard.press('Escape');
	await expect(menuRoot(page)).toHaveCount(0);
	expect(await page.evaluate(() => document.activeElement?.classList.contains('stv__container'))).toBe(true);
	// The tree keyboard works again (the menu no longer swallows keys).
	await page.keyboard.press('ArrowDown');
	await expect(page.locator('.stv__node[data-tree-path="3"] .stv__node-content').first()).toHaveClass(/stv__node-content--focused|stv__node-content--selected/);
});

test('Enter on a focused item runs it; ArrowRight opens a submenu', async ({ page }) => {
	await row(page, 'B').click();
	await page.keyboard.press('Shift+F10');
	await page.keyboard.press('End');
	await page.keyboard.press('ArrowUp'); // More
	expect(await focusedText(page)).toBe('More');
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('.km-menu--submenu')).toBeVisible();
	expect(await focusedText(page)).toBe('Child item');
	await page.keyboard.press('Enter');
	await expect(menuRoot(page)).toHaveCount(0);
	expect(await log(page)).toContain('click:child');
});

test('item shortcut is shown formatted and runs while the menu is open', async ({ page }) => {
	await openMenu(page, 'B');
	await expect(menuItem(page, 'Custom').locator('.km-menu__shortcut')).toHaveText('Ctrl+K');
	await page.keyboard.press('Control+k');
	await expect(menuRoot(page)).toHaveCount(0);
	expect(await log(page)).toContain('click:custom:2');
});

test('a lazy submenu shows the loading row (messages.loading) until getChildrenCallback resolves', async ({ page }) => {
	await openMenu(page, 'B');
	await menuItem(page, 'Lazy').hover();
	const loading = page.locator('.km-menu--submenu .km-menu__loading');
	await expect(loading).toHaveText('Loading…');
	await page.evaluate(() => (window as any).__resolveLazy());
	await expect(page.locator('.km-menu--submenu .km-menu__item', { hasText: 'Loaded item' })).toBeVisible();
	await expect(loading).toHaveCount(0);
});

test("menuPresentation='sheet': the menu opens as core's bottom sheet, titled with the node", async ({ page }) => {
	await page.getByTestId('sheet').click();
	await openMenu(page, 'B');
	const sheet = page.locator('.km-menu-sheet');
	await expect(sheet).toBeVisible();
	await expect(sheet).toHaveAttribute('role', 'dialog');
	await expect(sheet.locator('.km-menu-sheet__title')).toHaveText('B');
	await expect(sheet.locator('.km-menu-sheet__close')).toHaveAttribute('aria-label', 'Close');
	await sheet.locator('.km-menu-sheet__close').click();
	await expect(sheet).toHaveCount(0);
});
