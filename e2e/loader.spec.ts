import { test, expect, type Page } from '@playwright/test';

// isLoading overlay = the suite's shared loader: default .stv-loader (--stv-loader-* →
// --base-loader-*), the page-wide window.components.renderLoaderCallback, and the
// loadingPlaceholder snippet (wins). Fixture: /test/loader.

const overlay = (page: Page, id: string) => page.locator(`#${id} .stv__loading-overlay`);

test.describe('loader', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test/loader');
		await page.waitForFunction(() => !!(window as any).loaderReady);
	});

	test('default loader: role=status + labels.loading, drawn from the --stv-loader-* tokens', async ({ page }) => {
		await expect(overlay(page, 'plain')).toHaveCount(0);
		await page.evaluate(() => (window as any).setLoading(true));
		await expect(overlay(page, 'plain')).toHaveAttribute('role', 'status');
		await expect(overlay(page, 'plain')).toHaveAttribute('aria-label', 'Loading…');
		const loader = overlay(page, 'plain').locator('.stv-loader');
		await expect(loader).toBeVisible();
		const css = await loader.evaluate((n) => {
			const s = getComputedStyle(n);
			return { mask: s.maskImage, anim: s.animationName, w: s.width };
		});
		expect(css.mask).toContain('data:image/svg+xml');
		expect(css.anim).toBe('stv-loader-spin');
		await page.evaluate(() => (window as any).setLoading(false));
		await expect(overlay(page, 'plain')).toHaveCount(0);
	});

	test('the page hook replaces the default (ctx + cleanup); a throwing hook falls back to the default', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as any;
			w.hookLog = [];
			w.components = w.components ?? {};
			w.components.renderLoaderCallback = (ctx: any) => {
				w.hookLog.push(`${ctx.component}:${ctx.context}:${ctx.label}:${ctx.element.classList.contains('stv__container')}`);
				ctx.containerElement.insertAdjacentHTML('beforeend', '<i class="page-hook"></i>');
				return () => w.hookLog.push('cleanup');
			};
			w.setLoading(true);
		});
		await expect(overlay(page, 'plain').locator('.page-hook')).toHaveCount(1);
		await expect(overlay(page, 'plain').locator('.stv-loader')).toHaveCount(0);
		await expect(overlay(page, 'plain')).toHaveAttribute('role', 'status');
		await page.evaluate(() => (window as any).setLoading(false));
		await expect(overlay(page, 'plain')).toHaveCount(0);
		expect(await page.evaluate(() => (window as any).hookLog)).toEqual([
			'svelte-treeview:overlay:Loading…:true',
			'cleanup'
		]);

		await page.evaluate(() => {
			const w = window as any;
			w.components.renderLoaderCallback = () => {
				throw new Error('boom');
			};
			w.setLoading(true);
		});
		await expect(overlay(page, 'plain').locator('.stv-loader')).toHaveCount(1);
	});

	test('the loadingPlaceholder snippet beats the page hook', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as any;
			w.components = w.components ?? {};
			w.components.renderLoaderCallback = ({ containerElement }: any) =>
				containerElement.insertAdjacentHTML('beforeend', '<i class="page-hook"></i>');
			w.setSnippetLoading(true);
		});
		await expect(overlay(page, 'snippet').locator('.my-snippet')).toHaveText('wait');
		await expect(overlay(page, 'snippet').locator('.page-hook')).toHaveCount(0);
		await expect(overlay(page, 'snippet').locator('.stv-loader')).toHaveCount(0);
	});
});
