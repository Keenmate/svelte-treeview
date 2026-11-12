import { test, expect, Page } from '@playwright/test';

/**
 * EXPERIMENTAL filterScope on /test/filter-scope — which DESCENDANTS of a filter match
 * stay visible (ancestors always do). Ragged org chart: Sales is 6 levels deep
 * (Acme → Sales Division → Sales Europe/Americas → Sales <country> → Team → person),
 * IT and Finance only 3 (Acme → IT Division → Team → person).
 *
 * "Division" matches Sales Division (subtree height 4) and IT Division (height 2).
 * With x = 2:
 *   matches        → Acme + 2 divisions                                   = 3
 *   descendants    → + both whole subtrees (19 + 6)                       = 28
 *   tree-depth     → threshold level >= 6 - 2 = 4; divisions are level 2  = 3
 *   subtree-height → IT (height 2 <= 2) yes, Sales (4) no: 3 + 6          = 9
 *   levels-below   → 2 levels under each: Sales +5, IT +6                 = 14
 */

const visibleRows = (page: Page) => page.locator('.stv__container .stv__node');

async function filterTo(page: Page, scope: string, term: string, extra = '') {
	await page.goto(`/test/filter-scope?scope=${scope}&x=2${extra}`);
	await page.waitForLoadState('networkidle');
	await page.getByTestId('term').fill(term);
}

const cases: [string, number][] = [
	['matches', 3],
	['descendants', 28],
	['tree-depth', 3],
	['subtree-height', 9],
	['levels-below', 14]
];

for (const [scope, expected] of cases) {
	test(`filterScope=${scope}, x=2: "Division" shows ${expected} rows`, async ({ page }) => {
		await filterTo(page, scope, 'Division');
		await expect(visibleRows(page)).toHaveCount(expected);
	});
}

test('tree-depth reaches deep matches: "Team" shows the Sales teams people, not IT/Finance people', async ({
	page
}) => {
	// Sales teams sit at level 5 (>= 4) → whole subtree; IT/Finance teams at level 3 → none.
	await filterTo(page, 'tree-depth', 'Team');
	await expect(page.locator('.stv__node[data-tree-path="1.1.1.1.1.1"]')).toHaveCount(1); // Anna Weber
	await expect(page.locator('.stv__node[data-tree-path="1.2.1.1"]')).toHaveCount(0); // Petr Novak
});

test('shouldExpandFilterDescendants=false: added subtrees start collapsed, matches stay expanded', async ({
	page
}) => {
	// The matched divisions stay expanded so their direct children show; those ADDED
	// children are collapsed: Acme + 2 divisions + Sales Europe/Americas + Platform/Support.
	await filterTo(page, 'descendants', 'Division', '&expand=0');
	await expect(visibleRows(page)).toHaveCount(3 + 4);
	await expect(page.locator('.stv__node[data-tree-path="1.1.1.1"]')).toHaveCount(0); // Sales Germany
});
