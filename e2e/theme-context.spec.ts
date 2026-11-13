import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Theme context (vendored KeenMate core, SPEC §12.10) on /test/theme-context:
 * Tree mirrors the detected dark/light signal onto .stv__container as
 * data-context-theme, and dark-mode.css flips color-scheme on it.
 * Guards the old ancestor-selector bug: a light PAGE signal used to beat a NEARER
 * dark section (later rule won at equal specificity) — now themeSource="closest"
 * makes the nearest signal win, and the default reads the page only.
 */

const tree = (page: Page, scenario: string): Locator =>
	page.locator(`[data-scenario="${scenario}"] .stv__container`).first();

const scheme = (loc: Locator) => loc.evaluate((el) => getComputedStyle(el).colorScheme);

async function gotoWithPageTheme(page: Page, theme: 'light' | 'dark' | null) {
	await page.goto('/test/theme-context');
	await page.evaluate((t) => {
		if (t) document.documentElement.dataset.theme = t;
		else delete document.documentElement.dataset.theme;
	}, theme);
	await expect(tree(page, 'page')).toBeVisible();
}

test('default (no themeSource) follows the PAGE signal, not a dark wrapper', async ({ page }) => {
	await gotoWithPageTheme(page, 'light');
	await expect(tree(page, 'page')).toHaveAttribute('data-context-theme', 'light');
	expect(await scheme(tree(page, 'page'))).toBe('light');

	await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
	await expect(tree(page, 'page')).toHaveAttribute('data-context-theme', 'dark');
});

test('no signal anywhere → no data-context-theme (inherited color-scheme applies)', async ({ page }) => {
	await gotoWithPageTheme(page, null);
	await expect(tree(page, 'page')).not.toHaveAttribute('data-context-theme', /.+/);
});

test('themeSource="closest": the nearest signal wins over a light page (the old bug)', async ({ page }) => {
	await gotoWithPageTheme(page, 'light');
	await expect(tree(page, 'closest')).toHaveAttribute('data-context-theme', 'dark');
	expect(await scheme(tree(page, 'closest'))).toBe('dark');
	// A light sub-section inside the dark section is nearer still.
	await expect(tree(page, 'closest-nested')).toHaveAttribute('data-context-theme', 'light');
	expect(await scheme(tree(page, 'closest-nested'))).toBe('light');
});

test('themeSource="closest" re-resolves when an ancestor gains / loses its signal', async ({ page }) => {
	await gotoWithPageTheme(page, 'light');
	await page.getByTestId('dark-section').evaluate((el) => el.setAttribute('data-theme', 'light'));
	await expect(tree(page, 'closest')).toHaveAttribute('data-context-theme', 'light');
	await page.getByTestId('dark-section').evaluate((el) => el.removeAttribute('data-theme'));
	// No section signal → falls back to the page (light).
	await expect(tree(page, 'closest')).toHaveAttribute('data-context-theme', 'light');
	await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
	await expect(tree(page, 'closest')).toHaveAttribute('data-context-theme', 'dark');
});

test('per-instance theme wins over the detected context', async ({ page }) => {
	await gotoWithPageTheme(page, 'dark');
	const t = tree(page, 'instance');
	await expect(t).toHaveAttribute('data-context-theme', 'dark');
	await expect(t).toHaveAttribute('data-theme', 'light');
	expect(await scheme(t)).toBe('light');
});

test('a selector themeSource reads that element (first match when not an ancestor)', async ({ page }) => {
	await gotoWithPageTheme(page, 'light');
	await expect(tree(page, 'selector')).toHaveAttribute('data-context-theme', 'dark');
});

test('setThemeMode() forces every tree; auto resumes detection', async ({ page }) => {
	await gotoWithPageTheme(page, 'light');
	await page.waitForFunction(() => '__setThemeMode' in window);
	await page.evaluate(() => (window as unknown as { __setThemeMode(m: string): void }).__setThemeMode('dark'));
	await expect(tree(page, 'page')).toHaveAttribute('data-context-theme', 'dark');
	await expect(tree(page, 'closest-nested')).toHaveAttribute('data-context-theme', 'dark');
	await page.evaluate(() => (window as unknown as { __setThemeMode(m: string): void }).__setThemeMode('auto'));
	await expect(tree(page, 'page')).toHaveAttribute('data-context-theme', 'light');
	await expect(tree(page, 'closest-nested')).toHaveAttribute('data-context-theme', 'light');
});
