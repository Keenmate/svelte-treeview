import { test, expect, Page } from '@playwright/test';

/**
 * Per-node icons (iconMember/getIconCallback + iconColorMember + the `icon` snippet),
 * rendered as a dedicated .stv__node-icon element on EVERY node (branch + leaf).
 * Fixture: /test/node-icons.
 */

const iconAt = (page: Page, treeId: string, path: string) =>
	page.getByTestId(treeId).locator(`[data-tree-path="${path}"] .stv__node-icon`).first();

test.beforeEach(async ({ page }) => {
	await page.goto('/test/node-icons');
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('tree-default').locator('[data-tree-path="1"]')).toBeVisible();
});

test('default: icon value becomes a class on <i> for BOTH branch and leaf nodes', async ({ page }) => {
	// Branch (Region, has children) — the old behavior gave branches no icon.
	// (Assert class + tag, not visual visibility: the empty <i> has no rendered glyph
	// because the FontAwesome font isn't loaded in the test env, so it's zero-height.)
	const branch = iconAt(page, 'tree-default', '1');
	await expect(branch).toHaveClass(/fa-sitemap/);
	const tag = await branch.evaluate((el) => el.tagName);
	expect(tag).toBe('I');

	// Leaf (Employee)
	const leaf = iconAt(page, 'tree-default', '1.1.1');
	await expect(leaf).toHaveClass(/fa-user/);
});

test('default: per-node color from iconColorMember is applied inline', async ({ page }) => {
	const branch = iconAt(page, 'tree-default', '1'); // color #7c3aed
	const color = await branch.evaluate((el) => (el as HTMLElement).style.color);
	expect(color).toBe('rgb(124, 58, 237)');

	// A node with no color → no inline color (inherits currentColor).
	const noColor = iconAt(page, 'tree-default', '1.1.1'); // Employee, no color
	const c2 = await noColor.evaluate((el) => (el as HTMLElement).style.color);
	expect(c2).toBe('');
});

test('snippet: the icon snippet renders and receives the resolved value', async ({ page }) => {
	const icon = iconAt(page, 'tree-snippet', '1');
	await expect(icon).toBeVisible();
	const inner = icon.getByTestId('snippet-icon');
	await expect(inner).toHaveText('★');
	await expect(inner).toHaveAttribute('data-value', 'fa-sitemap');
});
