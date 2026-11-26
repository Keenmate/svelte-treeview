import { test, expect, type Page } from '@playwright/test';

/**
 * beforeScrollCallback + scrollToPath's shouldRevealContainer (REVIEW §4 scroll-container; = web-treeview's
 * e2e/before-scroll.spec.ts): /test/before-scroll — 60 children in a 200px scroll box (#box) below a 1600px
 * spacer (the tree starts off-screen). `window.scrollCtx` records each ctx; `window.scrollAnswer` is returned.
 */

const PAGE = '/test/before-scroll';

type Recorded = {
	source: string;
	path: string;
	nodePath: string;
	container: string | null;
	options: { block: string; inline: string; behavior: string; shouldRevealContainer: boolean };
	hasController: boolean;
};

const nodeByPath = (page: Page, path: string) => page.locator(`.stv__node[data-tree-path="${path}"]`).first();
const nodeContent = (page: Page, path: string) => nodeByPath(page, path).locator('.stv__node-content').first();
const ctxs = (page: Page): Promise<Recorded[]> => page.evaluate(() => (window as any).scrollCtx);
const boxScrollTop = (page: Page): Promise<number> => page.evaluate(() => (window as any).box.scrollTop);
const pageScrollY = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);
const answer = (page: Page, value: unknown) =>
	page.evaluate((v) => {
		(window as any).scrollAnswer = v;
	}, value);
const scrollToPath = (page: Page, path: string, options?: object): Promise<boolean> =>
	page.evaluate(([p, o]) => (window as any).tree.scrollToPath(p, o), [path, options] as const);
const focusedPath = (page: Page): Promise<string | null> =>
	page.evaluate(() => {
		const c = document.querySelector('.stv__container')!;
		const id = c.getAttribute('aria-activedescendant');
		return id ? (document.getElementById(id)?.getAttribute('data-tree-path') ?? null) : null;
	});

async function load(page: Page) {
	await page.goto(PAGE);
	await expect(nodeByPath(page, '1.60')).toHaveCount(1);
	await page.evaluate(() => window.scrollTo(0, 0));
}

test('scrollToPath: ctx shape + defaults (center, token behavior, reveal on)', async ({ page }) => {
	await load(page);
	expect(await scrollToPath(page, '1.40')).toBe(true);
	const [ctx] = await ctxs(page);
	expect(ctx).toEqual({
		source: 'scroll-to-path',
		path: '1.40',
		nodePath: '1.40',
		container: 'box',
		options: { block: 'center', inline: 'nearest', behavior: 'auto', shouldRevealContainer: true },
		hasController: true
	});
});

test('shouldRevealContainer brings the off-screen tree into view; false leaves the page alone', async ({ page }) => {
	await load(page);
	expect(await pageScrollY(page)).toBe(0);
	await scrollToPath(page, '1.40', { shouldRevealContainer: false });
	expect(await pageScrollY(page)).toBe(0);
	expect(await boxScrollTop(page)).toBeGreaterThan(0);

	await scrollToPath(page, '1.10');
	await expect.poll(() => pageScrollY(page)).toBeGreaterThan(0);
	await expect(page.locator('#box')).toBeInViewport({ ratio: 1 });
	await expect(nodeByPath(page, '1.10')).toBeInViewport();
});

test('returning false skips the scroll; scrollToPath still resolves true', async ({ page }) => {
	await load(page);
	await answer(page, false);
	expect(await scrollToPath(page, '1.50')).toBe(true);
	expect(await boxScrollTop(page)).toBe(0);
	expect(await pageScrollY(page)).toBe(0);
});

test('returning { block: "start" } aligns the row to the top of the box', async ({ page }) => {
	await load(page);
	await answer(page, { block: 'start', shouldRevealContainer: false });
	await scrollToPath(page, '1.30');
	const delta = await page.evaluate(() => {
		const row = document.querySelector('.stv__node[data-tree-path="1.30"] .stv__node-content')!;
		const box = (window as any).box as HTMLElement;
		return row.getBoundingClientRect().top - (box.getBoundingClientRect().top + box.clientTop);
	});
	expect(Math.abs(delta)).toBeLessThan(2);
});

test('keyboard: source "keyboard", nearest + instant, no reveal; false keeps the box still', async ({ page }) => {
	await load(page);
	await page.locator('#box').scrollIntoViewIfNeeded();
	await nodeContent(page, '1.1').click();
	await page.keyboard.press('PageDown');
	await expect.poll(async () => (await ctxs(page)).length).toBeGreaterThan(0);
	const ctx = (await ctxs(page)).at(-1)!;
	expect(ctx.source).toBe('keyboard');
	expect(ctx.container).toBe('box');
	expect(ctx.options).toEqual({ block: 'nearest', inline: 'nearest', behavior: 'auto', shouldRevealContainer: false });
	await expect.poll(() => boxScrollTop(page)).toBeGreaterThan(0);

	await answer(page, false);
	const before = await boxScrollTop(page);
	await page.keyboard.press('End');
	await expect.poll(() => focusedPath(page)).not.toBe('1.11');
	await page.waitForTimeout(150);
	expect(await boxScrollTop(page)).toBe(before);
});

test('paste into a node: source "paste", nearest', async ({ page }) => {
	await load(page);
	await page.evaluate(async () => {
		const tree = (window as any).tree;
		await tree.collapseAll(['2']);
		tree.copyNodes(['1.5']);
		await tree.pasteNodes('2', undefined, 'child');
	});
	await expect.poll(async () => (await ctxs(page)).map((c) => c.source)).toContain('paste');
	const ctx = (await ctxs(page)).find((c) => c.source === 'paste')!;
	expect(ctx.options.block).toBe('nearest');
	expect(ctx.options.shouldRevealContainer).toBe(false);
	expect(ctx.path.startsWith('2.')).toBe(true);
});
