import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Custom-renderer pointer drag on /test/custom-drag: a TreeProvider list attached with
 * controller.attachPointerDrag(el) (core createPointerDrag). Sources and targets are [data-tree-path]
 * elements; [data-drop-position] pads inside them fix the position. Bravo only allows
 * before / after. Replaces the removed HTML5 API (startDrag / dropAt …).
 */

const PAGE = '/test/custom-drag';

async function pointerDragTo(page: Page, src: Locator, dst: Locator, opts?: { hold?: boolean }) {
	const from = await src.boundingBox();
	const to = await dst.boundingBox();
	if (!from || !to) throw new Error('Missing boundingBox');
	const fx = from.x + from.width / 2;
	const fy = from.y + from.height / 2;
	await page.mouse.move(fx, fy);
	await page.mouse.down();
	await page.mouse.move(fx + 8, fy + 8, { steps: 3 });
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
	if (!opts?.hold) await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await expect(page.getByTestId('chip-Charlie')).toBeVisible();
});

test('a drop pad fixes the position (child)', async ({ page }) => {
	await pointerDragTo(page, page.getByTestId('chip-Alpha'), page.getByTestId('pad-Charlie-child'));
	await expect(page.getByTestId('log')).toHaveText('Alpha child Charlie');
});

test('hover state follows the pad while the drag is held', async ({ page }) => {
	await pointerDragTo(page, page.getByTestId('chip-Alpha'), page.getByTestId('pad-Charlie-after'), { hold: true });
	await expect(page.getByTestId('hover')).toHaveText('Charlie:after');
	await page.keyboard.press('Escape');
	await page.mouse.up();
	await expect(page.getByTestId('hover')).toHaveText(':');
	await expect(page.getByTestId('log')).toHaveText('');
});

test('the [data-tree-path] element itself is a target (position from the pointer)', async ({ page }) => {
	await pointerDragTo(page, page.getByTestId('chip-Charlie'), page.getByTestId('chip-Alpha'));
	await expect(page.getByTestId('log')).toHaveText(/^Charlie (before|after|child) Alpha$/);
});

test('a pad whose position the node disallows is not a target', async ({ page }) => {
	await pointerDragTo(page, page.getByTestId('chip-Alpha'), page.getByTestId('pad-Bravo-child'));
	await expect(page.getByTestId('log')).toHaveText('');
	await pointerDragTo(page, page.getByTestId('chip-Alpha'), page.getByTestId('pad-Bravo-before'));
	await expect(page.getByTestId('log')).toHaveText('Alpha before Bravo');
});
