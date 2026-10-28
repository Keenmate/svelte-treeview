import { test, expect, Page } from '@playwright/test';

/**
 * Expand family (web-treeview parity) on /test/state-events: bind:expandedPaths,
 * onNodeExpand / onNodeCollapse / onExpandedChange, beforeExpandCallback (sync veto +
 * async lazy load with the loading state), isSilent.
 */

const PAGE = '/test/state-events';

async function log(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('log').textContent()) || '[]');
}
async function expanded(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('expanded').textContent()) || '[]');
}
function toggle(page: Page, path: string) {
	return page
		.getByTestId('tree')
		.locator(`.stv__node[data-tree-path="${path}"] > .stv__node-row .stv__toggle-icon`)
		.first();
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(page.locator('.stv__node[data-tree-path="1"]')).toBeVisible();
	await page.getByTestId('clear-log').click();
});

test('toggle click fires before → expand → changed; collapse fires collapse → changed', async ({ page }) => {
	await toggle(page, '1').click();
	await expect.poll(() => log(page)).toEqual(['before:1:ctrl', 'expand:1', 'changed:1']);
	expect(await expanded(page)).toEqual(['1']);
	await page.getByTestId('clear-log').click();
	await toggle(page, '1').click();
	await expect.poll(() => log(page)).toEqual(['collapse:1', 'changed:']);
	expect(await expanded(page)).toEqual([]);
});

test('expandNodes opens collapsed ancestors and fires expand for each', async ({ page }) => {
	await page.getByTestId('expand-1').click();
	await expect.poll(() => log(page)).toEqual(['before:1.1:ctrl', 'expand:1', 'expand:1.1', 'changed:1,1.1']);
	await page.getByTestId('clear-log').click();
	await page.getByTestId('collapse-1').click();
	await expect.poll(() => log(page)).toEqual(['collapse:1', 'changed:1.1']);
});

test('beforeExpandCallback false keeps the node collapsed', async ({ page }) => {
	await toggle(page, '3').click();
	await expect.poll(() => log(page)).toEqual(['before:3:ctrl']);
	expect(await expanded(page)).toEqual([]);
	await expect(page.locator('.stv__node[data-tree-path="3.1"]')).toHaveCount(0);
});

test('async beforeExpandCallback shows the loading state, then expands with the loaded children', async ({ page }) => {
	await toggle(page, '4').click();
	const row = page.locator('.stv__node[data-tree-path="4"]');
	await expect(row).toHaveAttribute('aria-busy', 'true');
	await expect(toggle(page, '4')).toHaveClass(/stv__toggle-icon--loading/);
	// A repeated toggle while pending is ignored.
	await toggle(page, '4').click();
	await page.getByTestId('release-lazy').click();
	await expect(row).not.toHaveAttribute('aria-busy', 'true');
	await expect(page.getByTestId('tree').getByText('Loaded')).toBeVisible();
	expect(await expanded(page)).toEqual(['4']);
	const entries = await log(page);
	expect(entries.filter((e) => e.startsWith('before:'))).toEqual(['before:4:ctrl']);
	expect(entries).toContain('expand:4');
});

test('async beforeExpandCallback resolving false keeps it collapsed and clears the loading state', async ({ page }) => {
	await toggle(page, '4').click();
	const row = page.locator('.stv__node[data-tree-path="4"]');
	await expect(row).toHaveAttribute('aria-busy', 'true');
	await page.getByTestId('reject-lazy').click();
	await expect(row).not.toHaveAttribute('aria-busy', 'true');
	expect(await expanded(page)).toEqual([]);
	expect(await log(page)).toEqual(['before:4:ctrl']);
});

test('expandAll / collapseAll fire only onExpandedChange (no gate, no per-node events)', async ({ page }) => {
	await page.getByTestId('expand-all').click();
	// Like web-treeview, expandAll flags leaves expanded too (they are in the set).
	await expect.poll(() => expanded(page)).toEqual(['1', '1.1', '1.1.1', '1.2', '2', '2.1', '3', '3.1', '4']);
	expect(await log(page)).toEqual(['changed:1,1.1,1.1.1,1.2,2,2.1,3,3.1,4']);
	await page.getByTestId('clear-log').click();
	await page.getByTestId('collapse-all').click();
	await expect.poll(() => log(page)).toEqual(['changed:']);
});

test('isSilent updates expandedPaths without events (the before* gate still runs, like web)', async ({ page }) => {
	await page.getByTestId('expand-silent').click();
	await expect.poll(() => expanded(page)).toEqual(['2']);
	await page.waitForTimeout(100);
	expect(await log(page)).toEqual(['before:2:ctrl']);
});

test('assigning bind:expandedPaths replaces the expanded state silently', async ({ page }) => {
	await page.getByTestId('assign-expanded').click();
	await expect(page.locator('.stv__node[data-tree-path="2.1"]')).toBeVisible();
	await page.waitForTimeout(100);
	expect(await log(page)).toEqual([]);
});

test('accordion collapses the expanded sibling and fires collapse for it', async ({ page }) => {
	await page.getByTestId('accordion').click();
	await toggle(page, '1').click();
	await page.getByTestId('clear-log').click();
	await toggle(page, '2').click();
	await expect.poll(() => log(page)).toEqual(['before:2:ctrl', 'collapse:1', 'expand:2', 'changed:2']);
});

async function log2(page: Page): Promise<string[]> {
	return JSON.parse((await page.getByTestId('log2').textContent()) || '[]');
}

test('onFocusChange: focusNode / clearFocus fire, isSilent does not, same node does not repeat', async ({ page }) => {
	await page.getByTestId('focus-2').click();
	await expect.poll(() => log2(page)).toEqual(['focus:2:ctrl']);
	await page.getByTestId('focus-2').click();
	await page.getByTestId('focus-1-silent').click();
	await page.getByTestId('clear-focus').click();
	await expect.poll(() => log2(page)).toEqual(['focus:2:ctrl', 'focus:null:ctrl']);
});

test('onFocusChange fires on a node click', async ({ page }) => {
	await page.getByTestId('tree').getByText('B', { exact: true }).click();
	await expect.poll(() => log2(page)).toEqual(['focus:2:ctrl']);
});

test('onTreeChange fires once per mutation batch (add, add+remove, sort)', async ({ page }) => {
	await page.getByTestId('add-node').click();
	await expect.poll(() => log2(page)).toEqual(['tree:ctrl']);
	await page.getByTestId('batch').click();
	await expect.poll(() => log2(page)).toEqual(['tree:ctrl', 'tree:ctrl']);
	await page.getByTestId('sort-all').click();
	await expect.poll(() => log2(page)).toEqual(['tree:ctrl', 'tree:ctrl', 'tree:ctrl']);
});
