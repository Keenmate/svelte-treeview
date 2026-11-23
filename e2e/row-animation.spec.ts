import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Row animation (docs/PLAN-row-animation.md) on /test/row-animation: on by default — part of
 * core `motion`, no on/off prop (SPEC §12.16). The rows an expand reveals get
 * stv__node--opening (the first rowAnimationLimit in visible order), cleared after the CSS
 * duration (read back with core readAnimationMs). Never on first render, a re-key (focus
 * click) or a data reload; motion="none", reduced motion or --stv-row-animation-duration: 0s
 * → no reveal at all.
 */

const scenario = (page: Page, name: string): Locator => page.locator(`[data-scenario="${name}"]`);
const row = (page: Page, name: string, path: string): Locator =>
	scenario(page, name).locator(`.stv__node[data-tree-path="${path}"]`);
const opening = (page: Page, name: string) =>
	scenario(page, name).locator('.stv__node--opening').evaluateAll((els) => els.map((el) => el.getAttribute('data-tree-path')));
const toggle = (page: Page, name: string, path: string) =>
	row(page, name, path).locator(':scope > .stv__node-row > .stv__toggle-icon').click();

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/test/row-animation');
	await expect(row(page, 'on', '3.1')).toBeVisible();
});

test('first render: no row animates', async ({ page }) => {
	for (const name of ['off', 'on', 'none', 'plain']) expect(await opening(page, name)).toEqual([]);
});

test('--stv-row-animation-duration: 0s turns off just the rows', async ({ page }) => {
	await toggle(page, 'off', '1');
	await expect(row(page, 'off', '1.1')).toBeVisible();
	expect(await opening(page, 'off')).toEqual([]);
});

test('default (no prop): exactly the revealed rows animate, capped at rowAnimationLimit, then the class goes', async ({ page }) => {
	await toggle(page, 'on', '1');
	await expect(row(page, 'on', '1.5')).toBeVisible();
	expect(await opening(page, 'on')).toEqual(['1.1', '1.2', '1.3']);
	const anim = await row(page, 'on', '1.1').evaluate((el) => getComputedStyle(el).animationName);
	expect(anim).toBe('stv-row-in');
	// 1s duration (fixture) + 50ms → cleared.
	await expect.poll(() => opening(page, 'on'), { timeout: 3000 }).toEqual([]);
});

test('on: a focus click after the reveal re-keys the row but does not replay', async ({ page }) => {
	await toggle(page, 'on', '2');
	await expect.poll(() => opening(page, 'on')).toEqual(['2.1', '2.2']);
	await expect.poll(() => opening(page, 'on'), { timeout: 3000 }).toEqual([]);
	await row(page, 'on', '2.1').locator('.stv__node-content').first().click();
	await expect(row(page, 'on', '2.1').locator('.stv__node-content').first()).toHaveClass(/focused/);
	expect(await opening(page, 'on')).toEqual([]);
});

test('on: expandAll animates what it reveals (capped)', async ({ page }) => {
	await page.getByTestId('expand-all').click();
	await expect(row(page, 'on', '2.2')).toBeVisible();
	expect(await opening(page, 'on')).toEqual(['1.1', '1.2', '1.3']);
});

test('on: a data reload re-renders without animating', async ({ page }) => {
	await page.getByTestId('reload').click();
	await expect(row(page, 'on', '1')).toBeVisible();
	await page.waitForTimeout(100);
	expect(await opening(page, 'on')).toEqual([]);
});

test('motion="none": no reveal at all', async ({ page }) => {
	await toggle(page, 'none', '1');
	await expect(row(page, 'none', '1.1')).toBeVisible();
	expect(await opening(page, 'none')).toEqual([]);
});

test('reduced motion: no reveal at all', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await toggle(page, 'plain', '1');
	await expect(row(page, 'plain', '1.1')).toBeVisible();
	expect(await opening(page, 'plain')).toEqual([]);
});

// ── Collapse half: rows animate out (core animateOut), then the node collapses ──

const closing = (page: Page, name: string) =>
	scenario(page, name).locator('.stv__node--closing').evaluateAll((els) => els.map((el) => el.getAttribute('data-tree-path')));

test('collapse: the hidden rows animate out (inert), then the node collapses and the event fires', async ({ page }) => {
	await toggle(page, 'on', '3');
	await expect.poll(() => closing(page, 'on')).toEqual(['3.1']);
	await expect(row(page, 'on', '3.1')).toHaveAttribute('inert', '');
	expect(await row(page, 'on', '3.1').evaluate((el) => getComputedStyle(el).animationName)).toBe('stv-row-out');
	await expect(page.getByTestId('collapse-log')).toHaveText('');
	await expect(row(page, 'on', '3.1')).toHaveCount(0, { timeout: 3000 });
	await expect(page.getByTestId('collapse-log')).toHaveText('3');
	expect(await closing(page, 'on')).toEqual([]);
});

test('collapse: toggling again mid-animation cancels it — the node stays open, no event', async ({ page }) => {
	await toggle(page, 'on', '3');
	await expect.poll(() => closing(page, 'on')).toEqual(['3.1']);
	await toggle(page, 'on', '3');
	expect(await closing(page, 'on')).toEqual([]);
	await page.waitForTimeout(1300);
	await expect(row(page, 'on', '3.1')).toBeVisible();
	await expect(row(page, 'on', '3.1')).not.toHaveAttribute('inert', '');
	await expect(page.getByTestId('collapse-log')).toHaveText('');
});

test('collapse: await collapseNodes() settles after the animation, with the rows gone', async ({ page }) => {
	await page.getByTestId('collapse-code').click();
	await expect(page.getByTestId('await-result')).not.toHaveText('', { timeout: 3000 });
	const [ms, rowsLeft] = (await page.getByTestId('await-result').textContent())!.split('|').map(Number);
	expect(ms).toBeGreaterThanOrEqual(900);
	expect(rowsLeft).toBe(0);
});

test('collapseAll: animates the first rowAnimationLimit rows out, then collapses everything', async ({ page }) => {
	await page.getByTestId('expand-all').click();
	await expect.poll(() => opening(page, 'on'), { timeout: 3000 }).toEqual([]);
	await page.getByTestId('collapse-all').click();
	await expect.poll(() => closing(page, 'on')).toEqual(['1.1', '1.2', '1.3']);
	await expect(row(page, 'on', '2.1')).toHaveCount(0, { timeout: 3000 });
	await expect(row(page, 'on', '1.1')).toHaveCount(0);
});

test('collapse with motion="none" / the token at 0s: instant, never a closing row', async ({ page }) => {
	for (const name of ['none', 'off']) {
		await toggle(page, name, '3');
		expect(await closing(page, name)).toEqual([]);
		await expect(row(page, name, '3.1')).toHaveCount(0, { timeout: 200 });
	}
});

test('call order is kept: collapseAll(); expandNodes(x) in one tick ends as it would without motion', async ({ page }) => {
	await page.getByTestId('expand-all').click();
	await expect.poll(() => opening(page, 'on'), { timeout: 3000 }).toEqual([]);
	await page.evaluate(() => {
		const t = (window as any).__onTree;
		t.collapseAll();
		t.expandNodes('2');
	});
	const paths = () => scenario(page, 'on').locator('.stv__node').evaluateAll((els) => els.map((el) => el.getAttribute('data-tree-path')));
	await expect.poll(paths, { timeout: 3000 }).toEqual(['1', '2', '2.1', '2.2', '3']);
});

// B11: a non-collapsible root stays open — only what really collapses under it animates out.
test('collapseAll under a non-collapsible root: only the rows that hide animate, the root stays open', async ({ page }) => {
	await expect(row(page, 'pinned', '1.1.1')).toBeVisible();
	await page.getByTestId('pinned-collapse-all').click();
	await expect.poll(() => closing(page, 'pinned')).toEqual(['1.1.1']);
	await expect(row(page, 'pinned', '1.1.1')).toHaveCount(0, { timeout: 3000 });
	await expect(row(page, 'pinned', '1.1')).toBeVisible();
	await expect(row(page, 'pinned', '1.2')).toBeVisible();
	expect(await closing(page, 'pinned')).toEqual([]);
});

test('collapseNodes on a non-collapsible node: nothing animates, nothing collapses, no event', async ({ page }) => {
	await page.getByTestId('pinned-collapse-root').click();
	expect(await closing(page, 'pinned')).toEqual([]);
	await page.waitForTimeout(1300);
	await expect(row(page, 'pinned', '1.1')).toBeVisible();
	await expect(row(page, 'pinned', '1.1.1')).toBeVisible();
	await expect(page.getByTestId('pinned-log')).toHaveText('');
});
