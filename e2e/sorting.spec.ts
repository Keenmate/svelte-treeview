import { test, expect, type Page } from '@playwright/test';

/**
 * isSortingEnabled + sortNodes / sortAll + onNodesReorder. Targets /test/sorting
 * (orderMember="order", isSortingEnabled starts false, input order C, A, B).
 */

const PAGE = '/test/sorting';

async function goto(page: Page) {
	await page.goto(PAGE);
	await expect(page.locator('.stv__node').first()).toBeVisible();
}

/** Visible paths in DOM (= display) order. */
async function order(page: Page): Promise<string[]> {
	return page
		.locator('[data-tree-path]')
		.evaluateAll((els) =>
			els.map((e) => e.getAttribute('data-tree-path')).filter((p): p is string => !!p)
		);
}

test('isSortingEnabled=false keeps the input order; addNode appends at the end', async ({ page }) => {
	await goto(page);
	expect(await order(page)).toEqual(['3', '3.2', '3.1', '1', '2']);
	await page.getByTestId('add-node').click();
	await expect.poll(() => order(page)).toEqual(['3', '3.2', '3.1', '1', '2', '9']);
});

test('isSortingEnabled=true: an added node is auto-sorted by orderMember', async ({ page }) => {
	await goto(page);
	await page.getByTestId('sorting-enabled').check();
	await page.getByTestId('add-node').click();
	// Only the root level is re-sorted (the siblings of the added node).
	await expect.poll(() => order(page)).toEqual(['9', '1', '2', '3', '3.2', '3.1']);
});

test('sortNodes / sortAll re-render; default rule fires no reorder', async ({ page }) => {
	await goto(page);
	await page.getByTestId('sort-root').click();
	await expect.poll(() => order(page)).toEqual(['1', '2', '3', '3.2', '3.1']);
	await expect(page.getByTestId('reorders')).toHaveText('');
	await page.getByTestId('sort-all-desc').click();
	// desc with orderMember rewrites the values → reorder notifications per parent
	await expect.poll(() => order(page)).toEqual(['3', '3.2', '3.1', '2', '1']);
	await expect(page.getByTestId('reorders')).toHaveText(
		['(root): 3 30->10, 1 10->30', '3: 3.2 20->10, 3.1 10->20'].join('\n')
	);
});

test('compareCallback fires onNodesReorder; isSilent suppresses it but still re-renders', async ({
	page
}) => {
	await goto(page);
	await page.getByTestId('sort-root-compare-silent').click();
	await expect.poll(() => order(page)).toEqual(['3', '3.2', '3.1', '2', '1']);
	await expect(page.getByTestId('reorders')).toHaveText('');
	await page.getByTestId('sort-root').click(); // values already rewritten → same order
	await expect.poll(() => order(page)).toEqual(['3', '3.2', '3.1', '2', '1']);
	await page.getByTestId('sort-root-compare').click(); // nothing left to change
	await expect(page.getByTestId('reorders')).toHaveText('');
});

test('compareCallback with changes reports them', async ({ page }) => {
	await goto(page);
	await page.getByTestId('sort-root-compare').click();
	await expect.poll(() => order(page)).toEqual(['3', '3.2', '3.1', '2', '1']);
	await expect(page.getByTestId('reorders')).toHaveText('(root): 3 30->10, 1 10->30');
});
