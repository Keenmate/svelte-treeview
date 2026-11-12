import { test, expect } from '@playwright/test';

/**
 * Search status API on /test/search-status: searchResultLimit truncation detection,
 * onSearchStatusChange, onIndexProgress, and a tree that STARTS with a searchTerm.
 * Fixture: 20 groups × 10 leaves ("Group g", "Leaf g-l") = 220 nodes.
 * status text = `${searchTerm}|${matchCount}|${isLimited}|${limit}`.
 */

test('a tree that STARTS with a searchTerm shows its matches (data must not land in the filtered view)', async ({
	page
}) => {
	await page.goto('/test/search-status?term=Group 1');
	await expect(page.getByTestId('index-complete')).toHaveText('true');
	await expect(page.locator('.stv__node').first()).toBeVisible();
	// …and typing a new term still filters against the real data.
	await page.getByTestId('term').fill('Leaf 7-3');
	await expect(page.locator('.stv__node[data-tree-path="7.3"]')).toHaveCount(1);
});

test("default limit is no longer FlexSearch's silent 100", async ({ page }) => {
	await page.goto('/test/search-status');
	await expect(page.getByTestId('index-complete')).toHaveText('true');
	await page.getByTestId('term').fill('Leaf');
	await expect(page.getByTestId('status')).toHaveText('Leaf|200|false|1000');
});

test('searchResultLimit truncates and reports isLimited', async ({ page }) => {
	await page.goto('/test/search-status');
	await expect(page.getByTestId('index-complete')).toHaveText('true');
	await page.getByTestId('term').fill('Leaf');
	await page.getByTestId('limit-5').click();
	await expect(page.getByTestId('status')).toHaveText('Leaf|5|true|5');
	await expect(page.locator('.stv__node')).toHaveCount(6); // 5 leaves + their group
	await page.getByTestId('limit-default').click();
	await expect(page.getByTestId('status')).toHaveText('Leaf|200|false|1000');
});

test('onIndexProgress reports completion with processed === total', async ({ page }) => {
	await page.goto('/test/search-status');
	await expect(page.getByTestId('index-complete')).toHaveText('true');
	await expect(page.getByTestId('index-progress')).toHaveText('220/220');
});
