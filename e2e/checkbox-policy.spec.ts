import { test, expect, Page, Locator } from '@playwright/test';

/**
 * cascadeCheckPolicy on /test/checkbox-policy — the value policy that controls
 * WHICH paths the checkbox selection emits (via bindable checkedPaths) in cascade
 * mode. Orthogonal to checkboxMode (which controls the cascade BEHAVIOUR).
 *
 * Fixture tree: Fruits (1) → Apple (1.1), Banana (1.2); Vegetables (2) → Carrot
 * (2.1), Potato (2.2). Scenario: check Fruits fully + Carrot only, so the canonical
 * checked set is {1, 1.1, 1.2, 2.1}. The three policies project it differently:
 *   rolled-up → 1, 2.1
 *   leaves    → 1.1, 1.2, 2.1
 *   all       → 1, 1.1, 1.2, 2.1
 */

const PAGE = '/test/checkbox-policy';

function tree(page: Page) {
	return page.locator('.stv__container').first();
}
function checkboxLabel(page: Page, path: string): Locator {
	return tree(page)
		.locator(`.stv__node[data-tree-path="${path}"] > .stv__node-row .stv__checkbox`)
		.first();
}
function selection(page: Page) {
	return page.getByTestId('selection');
}

async function buildScenario(page: Page) {
	// Cascade-check Fruits (fills 1, 1.1, 1.2) then Carrot only (2.1).
	await checkboxLabel(page, '1').click();
	await checkboxLabel(page, '2.1').click();
}

test.describe('Cascade select policy', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PAGE);
		await page.waitForLoadState('networkidle');
		await page.locator('h1').first().waitFor();
		await expect(page.getByTestId('policy')).toHaveText('rolled-up');
	});

	test('default policy is rolled-up (fully-checked subtree collapses to root)', async ({
		page
	}) => {
		await buildScenario(page);
		// rolled-up: Fruits collapses to 1; partial Vegetables emits only Carrot.
		await expect(selection(page)).toHaveText('1,2.1');
	});

	test('checkedPaths / getCheckedNodes are folded; allCheckedPaths / getAllCheckedNodes list every ticked node (D-NC-14)', async ({
		page
	}) => {
		await buildScenario(page);
		const r = await page.evaluate(() => {
			const t = (window as any).__policyTree;
			const paths = (ns: any[]) => ns.map((n) => n.path).sort();
			return {
				nodes: paths(t.getCheckedNodes()),
				allNodes: paths(t.getAllCheckedNodes()),
				// The public controllers (the facade every ctx.controller is).
				ctls: (window as any).components['svelte-treeview'].getInstances().map((c: any) => ({ checked: [...c.checkedPaths].sort(), all: [...c.allCheckedPaths].sort() }))
			};
		});
		// rolled-up: Fruits folds to 1; Vegetables is partial (only Carrot).
		await expect(selection(page)).toHaveText('1,2.1');
		expect(r.nodes).toEqual(['1', '2.1']);
		expect(r.allNodes).toEqual(['1', '1.1', '1.2', '2.1']);
		// The public controller agrees with the prop (was: the full set — REVIEW D-NC-14).
		expect(r.ctls).toContainEqual({ checked: ['1', '2.1'], all: ['1', '1.1', '1.2', '2.1'] });
	});

	test('leaves policy emits only checked leaf nodes', async ({ page }) => {
		await buildScenario(page);
		await page.getByTestId('policy-leaves').click();
		await expect(page.getByTestId('policy')).toHaveText('leaves');
		await expect(selection(page)).toHaveText('1.1,1.2,2.1');
	});

	test('all policy emits every fully-checked node (branches + leaves)', async ({ page }) => {
		await buildScenario(page);
		await page.getByTestId('policy-all').click();
		await expect(page.getByTestId('policy')).toHaveText('all');
		await expect(selection(page)).toHaveText('1,1.1,1.2,2.1');
	});

	test('switching policy live re-projects the SAME checked state', async ({ page }) => {
		await buildScenario(page);
		// Start rolled-up.
		await expect(selection(page)).toHaveText('1,2.1');
		// → all
		await page.getByTestId('policy-all').click();
		await expect(selection(page)).toHaveText('1,1.1,1.2,2.1');
		// → leaves
		await page.getByTestId('policy-leaves').click();
		await expect(selection(page)).toHaveText('1.1,1.2,2.1');
		// → back to rolled-up, identical to the start (no state lost in the round-trip).
		await page.getByTestId('policy-rolled-up').click();
		await expect(selection(page)).toHaveText('1,2.1');
	});

	test('unchecking clears the emitted selection under every policy', async ({ page }) => {
		await buildScenario(page);
		await page.getByTestId('policy-leaves').click();
		await expect(selection(page)).toHaveText('1.1,1.2,2.1');
		// Uncheck Fruits (cascade removes 1, 1.1, 1.2) — only Carrot leaf remains.
		await checkboxLabel(page, '1').click();
		await expect(selection(page)).toHaveText('2.1');
		// Uncheck Carrot — empty under leaves.
		await checkboxLabel(page, '2.1').click();
		await expect(selection(page)).toHaveText('(empty)');
	});

	test('checking a filtered match cascades against the REAL children, not the visible subset', async ({
		page
	}) => {
		// Filter to "apple": Fruits shows with only Apple under it (Banana hidden).
		await page.getByTestId('filter-apple').click();
		await expect(tree(page).locator('.stv__node[data-tree-path="1.2"]')).toHaveCount(0);
		await expect(checkboxLabel(page, '1.1')).toBeVisible();

		await checkboxLabel(page, '1.1').click();
		// Fruits must be indeterminate (Banana is unchecked), NOT fully checked.
		await expect(checkboxLabel(page, '1')).toHaveClass(/stv__checkbox--indeterminate/);
		await expect(checkboxLabel(page, '1')).not.toBeChecked();
		await expect(selection(page)).toHaveText('1.1');

		// The check made while filtered survives clearing the filter.
		await page.getByTestId('filter-clear').click();
		await expect(checkboxLabel(page, '1.2')).toBeVisible();
		await expect(checkboxLabel(page, '1.1')).toBeChecked();
		await expect(checkboxLabel(page, '1.2')).not.toBeChecked();
		await expect(checkboxLabel(page, '1')).toHaveClass(/stv__checkbox--indeterminate/);
		await expect(selection(page)).toHaveText('1.1');
	});

	test('clicking a filtered PARENT checks only its visible matches; a second click unchecks them', async ({
		page
	}) => {
		await page.getByTestId('filter-apple').click();
		await expect(tree(page).locator('.stv__node[data-tree-path="1.2"]')).toHaveCount(0);

		// Click Fruits: only the visible Apple is checked; hidden Banana stays unchecked,
		// so Fruits itself lands at [-], not checked.
		await checkboxLabel(page, '1').click();
		await expect(checkboxLabel(page, '1.1')).toBeChecked();
		await expect(checkboxLabel(page, '1')).toHaveClass(/stv__checkbox--indeterminate/);
		await expect(selection(page)).toHaveText('1.1');

		// Second click: every visible descendant is checked → unchecks them (not stuck at [-]).
		await checkboxLabel(page, '1').click();
		await expect(checkboxLabel(page, '1.1')).not.toBeChecked();
		await expect(checkboxLabel(page, '1')).not.toHaveClass(/stv__checkbox--indeterminate/);
		await expect(selection(page)).toHaveText('(empty)');

		// Check it again, then clear the filter: Banana was never touched.
		await checkboxLabel(page, '1').click();
		await page.getByTestId('filter-clear').click();
		await expect(checkboxLabel(page, '1.2')).toBeVisible();
		await expect(checkboxLabel(page, '1.1')).toBeChecked();
		await expect(checkboxLabel(page, '1.2')).not.toBeChecked();
		await expect(checkboxLabel(page, '1')).toHaveClass(/stv__checkbox--indeterminate/);
		await expect(selection(page)).toHaveText('1.1');
	});
});

/**
 * Three levels: World (1) → Europe (1.1) → Czechia (1.1.1), Germany (1.1.2); Asia (1.2) → Japan.
 * Check Czechia → Europe + World [-]. Then check World → EVERY descendant is fully checked —
 * the middle branch (Europe) used to keep its stale [-] (only the clicked node and its
 * ancestors were re-derived, not the descendants the cascade just checked).
 */
test.describe('Cascade over three levels', () => {
	const geo = (page: Page, path: string) =>
		page
			.getByTestId('geo-tree')
			.locator(`.stv__node[data-tree-path="${path}"] > .stv__node-row .stv__checkbox`)
			.first();
	const isIndeterminate = (box: Locator) =>
		box.evaluate((el) => el.classList.contains('stv__checkbox--indeterminate'));

	async function expectAllChecked(page: Page) {
		for (const path of ['1', '1.1', '1.1.1', '1.1.2', '1.2', '1.2.1']) {
			await expect(geo(page, path), path).toBeChecked();
			expect(await isIndeterminate(geo(page, path)), `${path} indeterminate`).toBe(false);
			await expect(geo(page, path)).not.toHaveAttribute('aria-checked', 'mixed');
		}
		await expect(page.getByTestId('geo-selection')).toHaveText('1,1.1,1.1.1,1.1.2,1.2,1.2.1');
	}
	async function expectNoneChecked(page: Page) {
		for (const path of ['1', '1.1', '1.1.1', '1.1.2', '1.2', '1.2.1']) {
			await expect(geo(page, path), path).not.toBeChecked();
			expect(await isIndeterminate(geo(page, path)), `${path} indeterminate`).toBe(false);
		}
		await expect(page.getByTestId('geo-selection')).toHaveText('(empty)');
	}
	async function checkCountry(page: Page) {
		await geo(page, '1.1.1').click();
		expect(await isIndeterminate(geo(page, '1.1'))).toBe(true);
		expect(await isIndeterminate(geo(page, '1'))).toBe(true);
	}

	test.beforeEach(async ({ page }) => {
		await page.goto(PAGE);
		await page.waitForLoadState('networkidle');
		await expect(geo(page, '1.1.1')).toBeVisible();
	});

	test('click: check a leaf, then the root → the middle branch is checked, not [-]', async ({ page }) => {
		await checkCountry(page);
		await geo(page, '1').click();
		await expectAllChecked(page);
		// …and unchecking the root clears every level again
		await geo(page, '1').click();
		await expectNoneChecked(page);
	});

	test('API: checkNode / uncheckNode on the root re-derive the middle branch', async ({ page }) => {
		await checkCountry(page);
		await page.getByTestId('geo-api-check-root').click();
		await expectAllChecked(page);
		await page.getByTestId('geo-api-uncheck-root').click();
		await expectNoneChecked(page);
	});
});
