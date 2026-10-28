import { test, expect, type Page } from '@playwright/test';

/**
 * Motion is CSS only: the --stv-transition-* speeds chain to the contract's
 * --base-duration-*, prefers-reduced-motion sets them to 0s, and 0s turns motion
 * off (no prop). Disabled dimming chains to --base-disabled-opacity.
 *
 * Fixture: src/routes/test/contract-parity/+page.svelte
 */
const HOST = '#parity .stv__container';
const SPEEDS = ['--stv-transition-fast', '--stv-transition-normal', '--stv-transition-medium', '--stv-transition-slow'];

const read = (page: Page, names: string[]) =>
	page.locator(HOST).evaluate((el, n) => n.map((x) => getComputedStyle(el).getPropertyValue(x).trim()), names);

const toggleDuration = (page: Page) =>
	page.locator(HOST).evaluate((el) => getComputedStyle(el.querySelector('.stv__toggle-icon')!).transitionDuration);

test.beforeEach(async ({ page }) => {
	await page.goto('/test/contract-parity');
	await page.waitForSelector(`${HOST} .stv__toggle-icon`);
});

test('the four speeds are the contract defaults standalone; the toggle turns at normal', async ({ page }) => {
	expect(await read(page, SPEEDS)).toEqual(['0.1s', '0.15s', '0.25s', '0.3s']);
	expect(await toggleDuration(page)).toBe('0.15s');
});

test('--base-duration-* re-times the tree; 0s turns motion off', async ({ page }) => {
	await page.evaluate(() => document.documentElement.style.setProperty('--base-duration-normal', '0.25s'));
	expect(await toggleDuration(page)).toBe('0.25s');
	await page.locator(HOST).evaluate((el) => (el as HTMLElement).style.setProperty('--stv-transition-normal', '0s'));
	expect(await toggleDuration(page)).toBe('0s');
});

test('prefers-reduced-motion: every speed is 0s', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(await read(page, SPEEDS)).toEqual(['0s', '0s', '0s', '0s']);
	expect(await toggleDuration(page)).toBe('0s');
});

test('disabled opacity follows --base-disabled-opacity (0.65 standalone)', async ({ page }) => {
	expect(await read(page, ['--stv-disabled-opacity'])).toEqual(['0.65']);
	await page.evaluate(() => document.documentElement.style.setProperty('--base-disabled-opacity', '0.4'));
	expect(await read(page, ['--stv-disabled-opacity'])).toEqual(['0.4']);
});
