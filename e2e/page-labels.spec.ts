import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Labels (vendored Keenmate core /locale, SPEC §12.24) on /test/page-labels. Keys are flat
 * `<elementType>.<name>`; per key: the `labels` prop (short or full key) → the tree's own
 * `translateCallback` → window.components.locale.translateCallback → the page-wide flat dictionary
 * window.components.locale.labels['svelte-treeview.<key>'] → English. Assigning a new page object
 * re-renders.
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
	await setLocale(page, {
		labels: { 'svelte-treeview.messages.noData': 'Žádná data', 'svelte-treeview.labels.noDisplayValue': '—' }
	});
	await expect(emptyText(page, 'empty')).toHaveText('Žádná data');
	await expect(emptyText(page, 'own')).toHaveText('Own empty');
	await expect(emptyText(page, 'own-full-key')).toHaveText('Own full');
	await expect(scenario(page, 'no-display').locator('.stv__node-label')).toHaveText('—');
	await expect(scenario(page, 'nodes').locator('.stv__node-label').nth(1)).toHaveText('—'); // member set, value missing

	await setLocale(page, null);
	await expect(emptyText(page, 'empty')).toHaveText('No data');
	await expect(scenario(page, 'no-display').locator('.stv__node-label')).toHaveText('[N/A]');
	await expect(scenario(page, 'nodes').locator('.stv__node-label').nth(1)).toHaveText('[N/A]');
});

test('assigning the page locale inside a consumer $effect does not loop', async ({ page }) => {
	// The tree's locale listener runs synchronously inside the assigning effect; it used to
	// READ its revision counter there (`++`) → effect_update_depth_exceeded, page dead.
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.reload();
	await ready(page);
	await scenario(page, 'effect').getByRole('button', { name: 'cs' }).click();
	await expect(emptyText(page, 'effect')).toHaveText('Z efektu');
	expect(errors).toEqual([]);
});

test("another component's key and '' work as in core; a nested per-tag table is ignored", async ({ page }) => {
	await setLocale(page, {
		labels: { 'web-treeview.messages.noData': 'not mine', 'svelte-treeview.messages.noData': '' }
	});
	await expect(emptyText(page, 'empty')).toHaveCount(0); // '' = render nothing
	await setLocale(page, { labels: { 'web-treeview.messages.noData': 'not mine' } });
	await expect(emptyText(page, 'empty')).toHaveText('No data');
	// The old nested form (labels['svelte-treeview'] = { … }) is dropped with a warning.
	await setLocale(page, { labels: { 'svelte-treeview': { 'messages.noData': 'nested' } } });
	await expect(emptyText(page, 'empty')).toHaveText('No data');
});

test('built-in context-menu texts come from the page-wide labels', async ({ page }) => {
	await setLocale(page, {
		labels: { 'svelte-treeview.menuItems.copy': 'Kopírovat', 'svelte-treeview.menuItems.expandAll': 'Rozbalit vše' }
	});
	await scenario(page, 'nodes').getByText('Root', { exact: true }).click({ button: 'right' });
	const items = page.locator('.km-menu:not(.km-menu--submenu) > .km-menu__item');
	await expect(items.nth(0)).toContainText('Kopírovat');
	await expect(items.nth(1)).toContainText('Rozbalit vše');
});

test('the page translateCallback gets { component, key (full), template, locale }; never a key the prop set', async ({ page }) => {
	await page.evaluate(() => {
		(window as unknown as { components: { locale: unknown } }).components.locale = {
			locale: 'cs-CZ',
			translateCallback: (ctx: { component: string; key: string; template: string; locale: string }) =>
				`${ctx.component}/${ctx.key}/${ctx.locale}/${ctx.template}`
		};
	});
	await expect(emptyText(page, 'empty')).toHaveText('svelte-treeview/svelte-treeview.messages.noData/cs-CZ/No data');
	await expect(emptyText(page, 'own')).toHaveText('Own empty');
});

test("the tree's own translateCallback beats the page-wide one; null passes on", async ({ page }) => {
	await expect(emptyText(page, 'translate')).toHaveText('element');
	await page.evaluate(() => {
		(window as unknown as { components: { locale: unknown } }).components.locale = {
			translateCallback: ({ key }: { key: string }) => `page:${key}`,
			labels: { 'svelte-treeview.messages.noData': 'dictionary' }
		};
	});
	await expect(emptyText(page, 'translate')).toHaveText('element');
	await expect(emptyText(page, 'empty')).toHaveText('page:svelte-treeview.messages.noData');
	// The own callback answering null for every key → the page-wide callback decides.
	await page.evaluate(() => {
		const trees = (window as unknown as { __labelTrees: { translate: { update(u: object): void } } }).__labelTrees;
		trees.translate.update({ translateCallback: () => null });
	});
	await expect(emptyText(page, 'translate')).toHaveText('page:svelte-treeview.messages.noData');
});

test('a locale assigned before the tree loads is adopted', async ({ page }) => {
	await page.addInitScript(() => {
		(window as unknown as { components: Record<string, unknown> }).components = {
			locale: { labels: { 'svelte-treeview.messages.noData': 'Early' } }
		};
	});
	await page.goto('/test/page-labels');
	await expect(emptyText(page, 'empty')).toHaveText('Early');
});

test('a live labels change re-renders the rows (the prop path)', async ({ page }) => {
	await page.evaluate(() => {
		const trees = (window as unknown as { __labelTrees: { noDisplay: { update(u: object): void } } }).__labelTrees;
		trees.noDisplay.update({ labels: { 'labels.noDisplayValue': 'PROP' } });
	});
	await expect(scenario(page, 'no-display').locator('.stv__node-label')).toHaveText('PROP');
});

test('no "No data" before a tree got its nodes: server HTML has no empty-state text; an empty tree shows it once hydrated', async ({ page, request }) => {
	// Trees WITH data are server-rendered before their nodes reach the engine (an $effect):
	// the empty state stays blank there instead of claiming "No data".
	const html = await (await request.get('/test/basic')).text();
	expect(html).toContain('stv__container');
	expect(html).not.toContain('stv__empty-state-content');
	// A really empty tree still says so after hydration.
	await expect(emptyText(page, 'empty')).toHaveText('No data');
});
