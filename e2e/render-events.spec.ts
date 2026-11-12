import { test, expect } from '@playwright/test';

/**
 * onRenderStart / onRenderProgress / onRenderComplete + bindable isRendering fire
 * around FLAT progressive rendering (/test/render-events). They used to come only
 * from the removed recursive renderer's RenderCoordinator.
 * Fixture: 20 groups × 20 leaves, all expanded = 420 rows, initialBatchSize 10.
 */

const ROWS = 420;

test('a progressive pass fires start → progress… → complete once, covering every row', async ({
	page
}) => {
	await page.goto('/test/render-events');
	await expect(page.getByTestId('completes')).toHaveText('1');
	await expect(page.getByTestId('starts')).toHaveText('1');
	await expect(page.getByTestId('processed')).toHaveText(String(ROWS));
	await expect(page.getByTestId('is-rendering')).toHaveText('false');
	await expect(page.getByTestId('rendering-at-start')).toHaveText('true');
	expect(Number(await page.getByTestId('progress').textContent())).toBeGreaterThan(1);
	await expect(page.locator('.stv__node')).toHaveCount(ROWS);
});

test('replacing the data runs a second pass', async ({ page }) => {
	await page.goto('/test/render-events');
	await expect(page.getByTestId('completes')).toHaveText('1');
	await page.getByTestId('reload').click();
	await expect(page.getByTestId('completes')).toHaveText('2');
	await expect(page.getByTestId('starts')).toHaveText('2');
	await expect(page.getByTestId('processed')).toHaveText(String(ROWS));
	await expect(page.locator('.stv__node')).toHaveCount(ROWS);
	await expect(page.locator('.stv__node', { hasText: 'Reloaded 20-20' })).toHaveCount(1);
});
