import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Motion level (vendored KeenMate core, SPEC §12.16) on /test/motion: the `motion` prop
 * writes data-motion on .stv__container; the presets only set --base-duration-*, which
 * --stv-transition-* read, so the closest level wins through inheritance:
 * the tree's own prop → the nearest data-motion section → window.components.motion
 * (core mirrors it onto <html data-motion>) → the tree's own speeds.
 */

const tree = (page: Page, scenario: string): Locator =>
	page.locator(`[data-scenario="${scenario}"] .stv__container`).first();

const speed = (loc: Locator) =>
	loc.evaluate((el) => getComputedStyle(el).getPropertyValue('--stv-transition-normal').trim());

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/test/motion');
	await expect(tree(page, 'default')).toBeVisible();
});

test('default: no data-motion, the tree keeps its own speed', async ({ page }) => {
	await expect(tree(page, 'default')).not.toHaveAttribute('data-motion', /.+/);
	await expect.poll(() => speed(tree(page, 'default'))).toBe('0.15s');
});

test('motion="none" zeroes the tree’s transitions', async ({ page }) => {
	await expect(tree(page, 'none')).toHaveAttribute('data-motion', 'none');
	await expect.poll(() => speed(tree(page, 'none'))).toBe('0s');
});

test('a data-motion section reaches a tree without the prop; the prop wins inside it', async ({ page }) => {
	await expect.poll(() => speed(tree(page, 'section'))).toBe('0.25s'); // smooth
	await expect(tree(page, 'section-override')).toHaveAttribute('data-motion', 'snappy');
	await expect.poll(() => speed(tree(page, 'section-override'))).toBe('0.08s');
});

test('window.components.motion sets the page level; closer levels still win', async ({ page }) => {
	// The tree publishes the hook after mount (an earlier plain assignment would be adopted too).
	await page.waitForFunction(() => {
		const components = (window as unknown as { components?: object }).components;
		return !!components && !!Object.getOwnPropertyDescriptor(components, 'motion')?.get;
	});
	await page.evaluate(() => {
		(window as unknown as { components: { motion: string } }).components.motion = 'snappy';
	});
	await expect(page.locator('html')).toHaveAttribute('data-motion', 'snappy');
	await expect.poll(() => speed(tree(page, 'default'))).toBe('0.08s');
	await expect.poll(() => speed(tree(page, 'none'))).toBe('0s');
	await expect.poll(() => speed(tree(page, 'section'))).toBe('0.25s');

	await page.evaluate(() => {
		(window as unknown as { components: { motion: string } }).components.motion = 'auto';
	});
	await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.+/);
	await expect.poll(() => speed(tree(page, 'default'))).toBe('0.15s');
});

test('prefers-reduced-motion beats every level', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect.poll(() => speed(tree(page, 'section-override'))).toBe('0s');
	await expect.poll(() => speed(tree(page, 'section'))).toBe('0s');
});
