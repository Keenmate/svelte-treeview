import { test, expect, type Page } from '@playwright/test';

/**
 * REVIEW-2026-11-19 "plausible, not proven" list — the component-level ones (the ltree-level ones
 * are src/lib/ltree/plausible-bugs.test.ts). Fixture: /test/plausible.
 */

const PAGE = '/test/plausible';
const row = (page: Page, tree: string, path: string) =>
	page.locator(`#${tree} .stv__node[data-tree-path="${path}"]`).first();

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(row(page, 'preset', '1.1')).toBeVisible();
});

test('checkedPaths / selectedPaths set before mount set the node flags (checkbox, aria, selected class)', async ({ page }) => {
	await expect(row(page, 'preset', '1.1').locator('.stv__checkbox').first()).toBeChecked();
	await expect(row(page, 'preset', '1.1')).toHaveAttribute('aria-checked', 'true');
	await expect(row(page, 'preset', '1.2').locator('.stv__checkbox').first()).not.toBeChecked();
	await expect(row(page, 'preset', '2')).toHaveAttribute('aria-selected', 'true');
	await expect(row(page, 'preset', '1')).toHaveAttribute('aria-selected', 'false');
});

test('a `nodes` array assigned inside onNodesChange is applied, not swallowed by the echo guard', async ({ page }) => {
	await expect(row(page, 'echo', '1')).toContainText('Alpha');
	// A mutation → onNodesChange → the parent replaces the whole data set.
	await page.evaluate(() => (window as any).__echo.addNode('', { id: 'c', path: '9', name: 'Gamma' }, '9'));
	await expect.poll(() => page.evaluate(() => (window as any).__echoNodes())).toEqual(['Replaced X', 'Replaced Y', 'Replaced Z']);
	await expect(row(page, 'echo', '3')).toContainText('Replaced Z');
	await expect(row(page, 'echo', '1')).toContainText('Replaced X');
	await expect(row(page, 'echo', '9')).toHaveCount(0);
});
