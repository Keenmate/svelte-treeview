import { test, expect, type Page } from '@playwright/test';

/**
 * Drop-target colours follow the page-wide `--base-drop-target-*` tokens
 * (@keenmate/base-css-variables 2.0.0-rc06): the row accepting the drop, the drag-over
 * row and the empty-tree drop placeholder; a refused drop keeps the danger tint.
 * Probes carry the real classes inside the tree's container (pure CSS chain check;
 * web-treeview has the same spec).
 */

const BG = 'rgb(10, 20, 30)';
const BG_ACTIVE = 'rgb(40, 50, 60)';
const BORDER = 'rgb(70, 80, 90)';

async function probe(page: Page, cls: string) {
	await page.evaluate((cls) => {
		const host = document.querySelector('[data-testid="section-single"] .stv__container')!;
		const p = document.createElement('div');
		p.className = cls + ' probe';
		p.textContent = 'probe';
		host.appendChild(p);
	}, cls);
	return page.locator('.probe').last();
}

test.beforeEach(async ({ page }) => {
	await page.goto('/test/drag-drop');
	await expect(page.locator('[data-testid="section-single"] .stv__node').first()).toBeVisible();
	await page.addStyleTag({
		content: `:root { --base-drop-target-bg: ${BG}; --base-drop-target-bg-active: ${BG_ACTIVE}; --base-drop-target-border-color: ${BORDER}; }`
	});
});

test('the row accepting the drop reads --base-drop-target-bg-active / -border-color', async ({ page }) => {
	const p = await probe(page, 'stv__node-content stv__node-content--dragover-highlight');
	await expect(p).toHaveCSS('background-color', BG_ACTIVE);
	await expect(p).toHaveCSS('border-top-color', BORDER);
});

test('a drag-over row reads --base-drop-target-bg / -border-color', async ({ page }) => {
	const p = await probe(page, 'stv__node-content stv__node-content--drag-over');
	await expect(p).toHaveCSS('background-color', BG);
	await expect(p).toHaveCSS('border-top-color', BORDER);
});

test('the empty-tree drop placeholder: idle = --base-drop-target-bg, engaged = -bg-active', async ({ page }) => {
	const idle = await probe(page, 'stv__drop-placeholder');
	await expect(idle).toHaveCSS('background-color', BG);
	await expect(idle).toHaveCSS('border-top-color', BORDER);
	const engaged = await probe(page, 'stv__drop-placeholder stv__drop-placeholder--active');
	await expect(engaged).toHaveCSS('background-color', BG_ACTIVE);
	await expect(engaged).toHaveCSS('border-top-color', BORDER);
});

test('a refused drop keeps the danger tint (not the drop-target tokens)', async ({ page }) => {
	const p = await probe(page, 'stv__node-content stv__node-content--drop-invalid');
	await expect(p).not.toHaveCSS('background-color', BG);
	await expect(p).not.toHaveCSS('background-color', BG_ACTIVE);
	await expect(p).not.toHaveCSS('border-top-color', BORDER);
});
