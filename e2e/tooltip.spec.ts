import { test, expect, Page } from '@playwright/test';

/**
 * Coverage for the node tooltip API (shouldShowNodeTooltips + getNodeTooltipCallback
 * + the `tooltip` snippet) at /test/tooltip. Two trees: callback (plain text) and
 * snippet (rich content). tooltipDelay=0 so hover shows immediately.
 */

const row = (page: Page, testid: string, path: string) =>
	page.getByTestId(testid).locator(`[data-tree-path="${path}"] .stv__node-content`).first();

test.describe('node tooltip', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test/tooltip');
		await page.waitForLoadState('networkidle');
		await expect(row(page, 'tree-callback', '1')).toBeVisible();
	});

	test('callback: hover shows a portaled .stv__tooltip with the text; leave hides it', async ({
		page
	}) => {
		await expect(page.locator('.stv__tooltip')).toHaveCount(0);

		await row(page, 'tree-callback', '1').hover();
		const tip = page.locator('.stv__tooltip.stv__tooltip--visible');
		await expect(tip).toBeVisible();
		await expect(tip).toHaveText('Sweet edible plant fruits');
		// Portaled into the .stv__container (so the --stv-tooltip-* / --base-* tokens
		// resolve) — NOT a descendant of the node row it describes.
		const inContainer = await tip.evaluate((el) => !!el.closest('.stv__container'));
		expect(inContainer).toBe(true);
		const insideRow = await tip.evaluate((el) => !!el.closest('.stv__node-content'));
		expect(insideRow).toBe(false);
		// And it has a real (non-transparent) background now.
		const bg = await tip.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(bg).not.toBe('rgba(0, 0, 0, 0)');
		expect(bg).not.toBe('transparent');

		// Move away → hidden (element removed).
		await page.mouse.move(0, 0);
		await expect(page.locator('.stv__tooltip')).toHaveCount(0);
	});

	test('callback: a node with empty text gets no tooltip', async ({ page }) => {
		await row(page, 'tree-callback', '1.2').hover();
		// Give it a beat; nothing should appear.
		await page.waitForTimeout(100);
		await expect(page.locator('.stv__tooltip')).toHaveCount(0);
	});

	test('snippet: hover shows the rich content', async ({ page }) => {
		await row(page, 'tree-snippet', '1.1').hover();
		const tip = page.locator('.stv__tooltip.stv__tooltip--visible');
		await expect(tip).toBeVisible();
		await expect(tip.getByTestId('tip-content')).toBeVisible();
		await expect(tip).toContainText('Apple');
		await expect(tip).toContainText('Crisp orchard fruit');
	});

	test('disabled: no tooltip when shouldShowNodeTooltips is off', async ({ page }) => {
		await page.getByTestId('toggle').click(); // off
		await row(page, 'tree-callback', '1').hover();
		await page.waitForTimeout(100);
		await expect(page.locator('.stv__tooltip')).toHaveCount(0);
	});
});
