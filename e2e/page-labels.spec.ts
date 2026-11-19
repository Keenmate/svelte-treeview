import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Page-wide labels (vendored Keenmate core /locale, SPEC §12.24) on /test/page-labels:
 * per key the `labels` prop → window.components.locale.labels['svelte-treeview'] → English;
 * window.components.locale.formatLabelCallback formats; assigning a new object re-renders.
 */

const scenario = (page: Page, name: string): Locator => page.locator(`[data-scenario="${name}"]`);
const emptyText = (page: Page, name: string): Locator => scenario(page, name).locator('.stv__empty-state-content');
const setLocale = (page: Page, value: unknown) =>
	page.evaluate((v) => {
		(window as unknown as { components: { locale: unknown } }).components.locale = v;
	}, value);

// The empty-state text is server-rendered — wait for hydration (the registry entry) too.
const ready = (page: Page) =>
	page.waitForFunction(() => !!(window as unknown as { components?: Record<string, unknown> }).components?.['svelte-treeview']);

test.beforeEach(async ({ page }) => {
	await page.goto('/test/page-labels');
	await ready(page);
	await expect(emptyText(page, 'empty')).toHaveText('No data');
});

test('a page-wide label replaces the default live; the labels prop still wins; null restores', async ({ page }) => {
	await setLocale(page, { labels: { 'svelte-treeview': { noData: 'Žádná data', noDisplayValue: '—' } } });
	await expect(emptyText(page, 'empty')).toHaveText('Žádná data');
	await expect(emptyText(page, 'own')).toHaveText('Own empty');
	await expect(scenario(page, 'no-display').locator('.stv__node-label')).toHaveText('—');
	await expect(scenario(page, 'nodes').locator('.stv__node-label').nth(1)).toHaveText('—'); // member set, value missing

	await setLocale(page, null);
	await expect(emptyText(page, 'empty')).toHaveText('No data');
	await expect(scenario(page, 'no-display').locator('.stv__node-label')).toHaveText('[N/A]');
	await expect(scenario(page, 'nodes').locator('.stv__node-label').nth(1)).toHaveText('[N/A]');
});

test("another component's table and '' work as in core", async ({ page }) => {
	await setLocale(page, { labels: { 'web-treeview': { noData: 'not mine' }, 'svelte-treeview': { noData: '' } } });
	await expect(emptyText(page, 'empty')).toHaveCount(0); // '' = render nothing
	await setLocale(page, { labels: { 'web-treeview': { noData: 'not mine' } } });
	await expect(emptyText(page, 'empty')).toHaveText('No data');
});

test('built-in context-menu texts come from the page-wide labels', async ({ page }) => {
	await setLocale(page, { labels: { 'svelte-treeview': { copy: 'Kopírovat', expandAll: 'Rozbalit vše' } } });
	await scenario(page, 'nodes').getByText('Root', { exact: true }).click({ button: 'right' });
	const items = page.locator('.stv__context-menu > .stv__context-menu-item');
	await expect(items.nth(0)).toContainText('Kopírovat');
	await expect(items.nth(1)).toContainText('Rozbalit vše');
});

test('formatLabelCallback gets { component, key, template, locale } and its result is used', async ({ page }) => {
	await page.evaluate(() => {
		(window as unknown as { components: { locale: unknown } }).components.locale = {
			locale: 'cs-CZ',
			formatLabelCallback: (ctx: { component: string; key: string; template: string; locale: string }) =>
				`${ctx.component}/${ctx.key}/${ctx.locale}/${ctx.template}`
		};
	});
	await expect(emptyText(page, 'empty')).toHaveText('svelte-treeview/noData/cs-CZ/No data');
	await expect(emptyText(page, 'own')).toHaveText('svelte-treeview/noData/cs-CZ/Own empty');
});

test('a locale assigned before the tree loads is adopted', async ({ page }) => {
	await page.addInitScript(() => {
		(window as unknown as { components: Record<string, unknown> }).components = {
			locale: { labels: { 'svelte-treeview': { noData: 'Early' } } }
		};
	});
	await page.goto('/test/page-labels');
	await expect(emptyText(page, 'empty')).toHaveText('Early');
});

test('a live labels.noDisplayValue change re-renders the rows (the prop path)', async ({ page }) => {
	await page.evaluate(() => {
		const api = (window as unknown as { components: Record<string, { getInstances(): { labels: unknown }[] }> }).components;
		for (const c of api['svelte-treeview'].getInstances()) c.labels = { noDisplayValue: 'PROP' };
	});
	await expect(scenario(page, 'no-display').locator('.stv__node-label')).toHaveText('PROP');
});

