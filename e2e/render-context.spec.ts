import { test, expect, Page } from '@playwright/test';

/**
 * NodeRenderContext passed as the last arg to the render snippets (icon/tooltip/
 * nodeTemplate). The fixture's `icon` snippet stamps ctx fields onto data-attributes.
 * Fixture: /test/render-context.
 */

const ctx = (page: Page, path: string) =>
	page.locator(`[data-tree-path="${path}"] [data-testid="ctx"]`).first();

test.beforeEach(async ({ page }) => {
	await page.goto('/test/render-context');
	await page.waitForLoadState('networkidle');
	await expect(ctx(page, '1')).toBeVisible();
});

test('node-state fields reflect each node', async ({ page }) => {
	// Root: branch, expanded, level 1.
	const root = ctx(page, '1');
	await expect(root).toHaveAttribute('data-haschildren', 'true');
	await expect(root).toHaveAttribute('data-expanded', 'true');
	await expect(root).toHaveAttribute('data-level', '1');

	// Leaf: no children, deeper level.
	const leaf = ctx(page, '1.1.1');
	await expect(leaf).toHaveAttribute('data-haschildren', 'false');
	await expect(leaf).toHaveAttribute('data-level', '3');
});

test('device + container fields are populated', async ({ page }) => {
	const root = ctx(page, '1');
	// deviceClass is one of the valid values (headless chromium → desktop).
	const device = await root.getAttribute('data-device');
	expect(['mobile', 'tablet', 'desktop']).toContain(device);
	// container width is measured (> 0) from the tree's box.
	const cw = Number(await root.getAttribute('data-cw'));
	expect(cw).toBeGreaterThan(0);
});

test('isExpanded updates reactively on collapse', async ({ page }) => {
	await expect(ctx(page, '1')).toHaveAttribute('data-expanded', 'true');
	// Collapse the root via its toggle; the snippet re-renders with the new ctx.
	await page.locator('[data-tree-path="1"] .stv__toggle-icon').first().click();
	await expect(ctx(page, '1')).toHaveAttribute('data-expanded', 'false');
});

test('isSelected flips when the checkbox is toggled', async ({ page }) => {
	const leaf = ctx(page, '1.1.1');
	await expect(leaf).toHaveAttribute('data-selected', 'false');
	await page.locator('[data-tree-path="1.1.1"] .stv__checkbox').first().click();
	await expect(leaf).toHaveAttribute('data-selected', 'true');
});

test('isHighlighted + isFocused flip when a row is clicked', async ({ page }) => {
	const leaf = ctx(page, '1.1.1');
	await expect(leaf).toHaveAttribute('data-highlighted', 'false');
	await expect(leaf).toHaveAttribute('data-focused', 'false');
	// Plain click on the row (multi-select mode) highlights + focuses it.
	await page.locator('[data-tree-path="1.1.1"] .stv__node-content').first().click();
	await expect(leaf).toHaveAttribute('data-focused', 'true');
	await expect(leaf).toHaveAttribute('data-highlighted', 'true');
});
