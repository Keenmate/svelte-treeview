import { test, expect, Page } from '@playwright/test';

/**
 * E2E coverage for keyboard clipboard (Ctrl/Cmd + C / X / V) + multi-select on the
 * /test/clipboard fixture. Also the regression guard for the
 * structuredClone→$state.snapshot fix in TreeController._collectClipboardEntry:
 * the fixture uses PLAIN $state data, so copy walks a Svelte reactive proxy —
 * which structuredClone could not clone (it threw "could not be cloned" and the
 * copy silently failed). With $state.snapshot the copy succeeds and paste adds nodes.
 */

const PAGE = '/test/clipboard';

function tree(page: Page) {
	return page.locator('.stv__container').first();
}

function nodeByName(page: Page, name: string) {
	return tree(page).locator('.stv__node-content', { hasText: new RegExp(`\\b${name}\\b`) }).first();
}

function countByName(page: Page, name: string) {
	return tree(page).locator(`.stv__node-content span[data-name="${name}"]`).count();
}

async function clickNode(page: Page, name: string) {
	await nodeByName(page, name).click();
	await tree(page).focus();
}

test.describe('Clipboard — Ctrl/Cmd + C / X / V', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PAGE);
		await page.waitForLoadState('networkidle');
		await page.locator('h1').first().waitFor();
	});

	test('copy a node, then paste under a folder, duplicates it', async ({ page }) => {
		expect(await countByName(page, 'A-child-1')).toBe(1);

		// Copy A-child-1.
		await clickNode(page, 'A-child-1');
		await page.keyboard.press('Control+c');
		await expect(page.getByTestId('last-log')).toHaveText('copied 1');

		// Focus Folder B and paste.
		await clickNode(page, 'Folder B');
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		// Now two A-child-1 nodes exist (original under A, copy under B).
		await expect.poll(() => countByName(page, 'A-child-1')).toBe(2);
	});

	test('pasting INTO a collapsed node expands it and reveals the first pasted node (the --stv-scroll-behavior token) — = web-treeview', async ({ page }) => {
		await clickNode(page, 'A-child-1');
		await page.keyboard.press('Control+c');
		await expect(page.getByTestId('last-log')).toHaveText('copied 1');

		await tree(page).locator('.stv__node[data-tree-path="2"] .stv__toggle-icon--expand').first().click(); // collapse Folder B
		await expect(nodeByName(page, 'B-child-1')).toBeHidden();
		await clickNode(page, 'Folder B');
		await expect(nodeByName(page, 'B-child-1')).toBeHidden(); // still collapsed

		await page.evaluate(() => {
			document.documentElement.style.setProperty('--base-scroll-behavior', 'instant');
			// A small scroll box around the tree, scrolled to the top, so the pasted row (under
			// Folder B) lands off-screen and the reveal has to move it (core scrollIntoContainer
			// only scrolls when something is out of view).
			const host = document.querySelector('.stv__container')!.parentElement as HTMLElement;
			host.style.maxHeight = '60px';
			host.style.overflowY = 'auto';
			host.scrollTop = 0;
			const calls: (string | undefined)[] = ((window as any).revealCalls = []);
			const orig = Element.prototype.scrollTo as (...a: unknown[]) => void;
			(Element.prototype as any).scrollTo = function (this: Element, o?: unknown, ...rest: unknown[]) {
				calls.push(typeof o === 'object' && o ? (o as ScrollToOptions).behavior : undefined);
				return orig.call(this, o, ...rest);
			};
		});
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		const pasted = tree(page).locator('.stv__node[data-tree-path^="2."] span[data-name="A-child-1"]');
		await expect(pasted).toHaveCount(1); // Folder B opened, the copy is in it
		// Revealed: the box scrolled (with the token's behavior) and the copy sits inside it.
		await expect.poll(() => page.evaluate(() => (window as any).revealCalls)).toContain('instant');
		const isInsideBox = () =>
			page.evaluate(() => {
				const host = document.querySelector('.stv__container')!.parentElement as HTMLElement;
				const r = document.querySelector('.stv__node[data-tree-path^="2."] span[data-name="A-child-1"]')!.getBoundingClientRect();
				const b = host.getBoundingClientRect();
				return r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
			});
		await expect.poll(isInsideBox).toBe(true);
	});

	test('cut dims the node; Escape cancels and un-dims', async ({ page }) => {
		await clickNode(page, 'A-child-2');
		await page.keyboard.press('Control+x');
		await expect(page.getByTestId('last-log')).toHaveText('cut 1');
		await expect(tree(page).locator('.cut-dimmed span[data-name="A-child-2"], span.cut-dimmed[data-name="A-child-2"]')).toHaveCount(1);

		await page.keyboard.press('Escape');
		await expect(page.getByTestId('last-log')).toHaveText('cut-cancelled');
		await expect(tree(page).locator('.cut-dimmed')).toHaveCount(0);
	});

	test('cut + paste moves the node (count stays the same)', async ({ page }) => {
		const before = await tree(page).locator('.stv__node-content').count();

		// Cut B-child-1, paste under Folder A.
		await clickNode(page, 'B-child-1');
		await page.keyboard.press('Control+x');
		await clickNode(page, 'Folder A');
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		// Total node count unchanged — moved, not duplicated.
		await expect.poll(() => tree(page).locator('.stv__node-content').count()).toBe(before);
		// And exactly one B-child-1 still exists.
		expect(await countByName(page, 'B-child-1')).toBe(1);
	});

	test('pasting a copy whose name collides under the target gets a "Copy N" suffix', async ({ page }) => {
		// Folder A already contains A-child-1. Copy it, focus Folder A, paste → the
		// copy joins as a sibling of the original, so beforePasteCallback renames it.
		await clickNode(page, 'A-child-1');
		await page.keyboard.press('Control+c');
		await clickNode(page, 'Folder A');
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		await expect.poll(() => countByName(page, 'A-child-1 Copy 1')).toBe(1);
		// The original is still there, unrenamed.
		expect(await countByName(page, 'A-child-1')).toBe(1);
	});

	test('repeated pastes number sequentially (Copy 1, 2, 3) without compounding', async ({ page }) => {
		await clickNode(page, 'A-child-1');
		await page.keyboard.press('Control+c');
		await clickNode(page, 'Folder A');
		for (let i = 0; i < 3; i++) await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		await expect.poll(() => countByName(page, 'A-child-1 Copy 1')).toBe(1);
		expect(await countByName(page, 'A-child-1 Copy 2')).toBe(1);
		expect(await countByName(page, 'A-child-1 Copy 3')).toBe(1);
		// No compounded "(copy) (copy)"-style names leaked in.
		expect(await countByName(page, 'A-child-1 Copy 1 Copy 1')).toBe(0);
	});

	test('a COPY stays on the clipboard and can be pasted multiple times', async ({ page }) => {
		const before = await tree(page).locator('.stv__node-content').count();

		await clickNode(page, 'A-child-1');
		await page.keyboard.press('Control+c');

		await clickNode(page, 'Folder B');
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		// Paste again — a copy must persist on the clipboard (it's not a move).
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		await expect.poll(() => tree(page).locator('.stv__node-content').count()).toBe(before + 2);
	});

	test('a CUT is one-shot — the clipboard clears after the first paste', async ({ page }) => {
		await clickNode(page, 'B-child-1');
		await page.keyboard.press('Control+x');
		await clickNode(page, 'Folder A');
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');

		const afterFirst = await tree(page).locator('.stv__node-content').count();
		// Second paste should be a no-op — clipboard was cleared by the move.
		await page.keyboard.press('Control+v');
		await page.waitForTimeout(150);
		expect(await tree(page).locator('.stv__node-content').count()).toBe(afterFirst);
	});

	test('Ctrl+C then Ctrl+V without moving pastes a sibling copy into the same folder', async ({ page }) => {
		// Select A-child-1 (a child of Folder A), copy, and paste WITHOUT moving focus.
		// Pasting onto the copied node itself would hit the paste-into-self guard;
		// beforePaste redirects into the parent so it lands as a sibling.
		await clickNode(page, 'A-child-1');
		await page.keyboard.press('Control+c');
		await page.keyboard.press('Control+v');
		// Without the parent redirect this would hit the paste-into-self guard and
		// report a failure; the redirect makes it a successful sibling paste.
		await expect(page.getByTestId('last-log')).toHaveText('pasted 1');
		await expect.poll(() => countByName(page, 'A-child-1 Copy 1')).toBe(1);
	});

	test('multi-select (Ctrl+click) copies several nodes at once', async ({ page }) => {
		// Click first, Ctrl+click second → highlight set of 2.
		await nodeByName(page, 'A-child-1').click();
		await nodeByName(page, 'A-child-2').click({ modifiers: ['Control'] });
		await tree(page).focus();
		await page.keyboard.press('Control+c');
		await expect(page.getByTestId('last-log')).toHaveText('copied 2');

		await clickNode(page, 'Folder B');
		await page.keyboard.press('Control+v');
		await expect(page.getByTestId('last-log')).toHaveText('pasted 2');
	});
});
