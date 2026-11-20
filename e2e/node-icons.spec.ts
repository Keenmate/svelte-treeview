import { test, expect, Page } from '@playwright/test';

/**
 * Per-node icons (iconMember/getIconCallback + iconColorMember + the `icon` snippet), drawn by
 * core renderIcon INTO a dedicated <span class="stv__node-icon"> wrapper on EVERY node with an
 * icon (branch + leaf): markup → built-in name → the tree's renderIconCallback → the page-wide
 * window.components.renderIconCallback → icon-font <i class="stv__icon …"> → text.
 * Same scenarios as web-treeview's e2e/node-icons.spec.ts. Fixture: /test/node-icons.
 */

const iconAt = (page: Page, treeId: string, path: string) =>
	page.getByTestId(treeId).locator(`[data-tree-path="${path}"] .stv__node-icon`).first();

test.beforeEach(async ({ page }) => {
	await page.goto('/test/node-icons');
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('tree-default').locator('[data-tree-path="1"]')).toBeVisible();
});

test('default: icon-font classes → <i class="stv__icon …"> inside the wrapper, on branch AND leaf', async ({ page }) => {
	// Branch (Region, has children). (Assert class + tag, not visibility: FontAwesome isn't
	// loaded in the test env, so the empty <i> has no glyph.)
	const branch = iconAt(page, 'tree-default', '1');
	expect(await branch.evaluate((el) => el.tagName)).toBe('SPAN');
	const i = branch.locator('i');
	await expect(i).toHaveClass('stv__icon fa-sitemap');
	await expect(i).toHaveAttribute('aria-hidden', 'true');

	// Leaf (Employee)
	await expect(iconAt(page, 'tree-default', '1.1.1').locator('i')).toHaveClass('stv__icon fa-user');
});

test('default: per-node color from iconColorMember is applied inline on the wrapper', async ({ page }) => {
	const branch = iconAt(page, 'tree-default', '1'); // color #7c3aed
	expect(await branch.evaluate((el) => (el as HTMLElement).style.color)).toBe('rgb(124, 58, 237)');
	// A node with no color → no inline color (inherits currentColor).
	expect(await iconAt(page, 'tree-default', '1.1.1').evaluate((el) => (el as HTMLElement).style.color)).toBe('');
});

test('snippet: the icon snippet renders and receives the resolved value', async ({ page }) => {
	const icon = iconAt(page, 'tree-snippet', '1');
	await expect(icon).toBeVisible();
	const inner = icon.getByTestId('snippet-icon');
	await expect(inner).toHaveText('★');
	await expect(inner).toHaveAttribute('data-value', 'fa-sitemap');
});

test('default: a non-class value (emoji) renders as the icon text', async ({ page }) => {
	const branch = iconAt(page, 'tree-emoji', '1');
	await expect(branch).toHaveText('🗂️');
	expect(await branch.getAttribute('class')).not.toContain('🗂'); // text, not a class
	await expect(iconAt(page, 'tree-emoji', '1.1.1')).toHaveText('👤');
	// A class-like value on the same tree is an icon-font <i>, with no text.
	const cls = iconAt(page, 'tree-emoji', '1.2');
	await expect(cls.locator('i')).toHaveClass('stv__icon fa-building');
	await expect(cls).toHaveText('');
});

test.describe('renderIconCallback (tree) + window.components.renderIconCallback (page)', () => {
	test('the tree hook beats the page hook, with ctx.node + render state + component context', async ({ page }) => {
		const b = iconAt(page, 'tree-custom', '1').locator('b');
		await expect(b).toHaveAttribute('data-hook', 'element');
		await expect(b).toHaveAttribute('data-path', '1');
		await expect(b).toHaveAttribute('data-component', 'svelte-treeview');
		await expect(b).toHaveAttribute('data-prefix', 'stv');
		await expect(b).toHaveAttribute('data-has-controller', 'true');
		await expect(b).toHaveAttribute('data-level', '1');
	});

	test('the tree hook answering null falls through to the page hook', async ({ page }) => {
		await expect(iconAt(page, 'tree-custom', '1.1').locator('b')).toHaveAttribute('data-hook', 'page');
	});

	test('nobody claims a class list → icon-font <i class="stv__icon …">', async ({ page }) => {
		await expect(iconAt(page, 'tree-custom', '1.2').locator('i')).toHaveClass('stv__icon fa-solid fa-building');
	});

	test('a built-in name renders the masked span and is never sent to a hook', async ({ page }) => {
		const span = iconAt(page, 'tree-custom', '1.1.1').locator('span.km-icon');
		await expect(span).toHaveClass(/stv__icon--check/);
		const seen = await page.evaluate(() => (window as any).__seen);
		expect(seen.element).not.toContain('check');
		expect(seen.page).not.toContain('check');
		expect(seen.element).toContain('both');
		// ICON_CSS is adopted into the document (the masked span gets its 1em box).
		expect((await span.boundingBox())!.width).toBeGreaterThan(0);
	});

	test('markup goes in as is; markup never reaches a hook', async ({ page }) => {
		await expect(iconAt(page, 'tree-custom', '1.3').locator('svg[data-testid="raw-svg"]')).toHaveCount(1);
		const seen = await page.evaluate(() => (window as any).__seen);
		expect(seen.element.some((n: string) => n.startsWith('<'))).toBe(false);
	});

	test('no icon value → no wrapper (align off)', async ({ page }) => {
		await expect(page.getByTestId('tree-custom').locator('[data-tree-path="1.4"] .stv__node-icon')).toHaveCount(0);
	});

	test('replacing the hook re-paints the icons; removing it falls back to the page hook', async ({ page }) => {
		await page.evaluate(() => (window as any).__setIconHook('replace'));
		await expect(iconAt(page, 'tree-custom', '1').locator('em')).toHaveText('new');
		await page.evaluate(() => (window as any).__setIconHook('none'));
		await expect(iconAt(page, 'tree-custom', '1').locator('b')).toHaveAttribute('data-hook', 'page');
	});
});

test.describe('context-menu item icons (core renderIcon, like web-treeview\'s core menu)', () => {
	const menuIcon = (page: Page, treeId: string, text: string) =>
		page
			.getByTestId(treeId)
			.locator('.stv__context-menu-item', { hasText: text })
			.first()
			.locator('.stv__context-menu-icon');

	test('callback menu: icon font, the tree hook with ctx.item, text', async ({ page }) => {
		await page.getByTestId('tree-custom').locator('[data-tree-path="1.2"] .stv__node-label').click({ button: 'right' });
		await expect(menuIcon(page, 'tree-custom', 'Font').locator('i')).toHaveClass('stv__icon fa-solid fa-star');
		const b = menuIcon(page, 'tree-custom', 'Hooked').locator('b');
		await expect(b).toHaveAttribute('data-hook', 'element-menu');
		await expect(b).toHaveAttribute('data-item', 'hooked');
		await expect(menuIcon(page, 'tree-custom', 'Emoji')).toHaveText('★');
	});

	test('snippet menu: ContextMenuItem icons reach the enclosing tree hook', async ({ page }) => {
		await page.getByTestId('tree-snippet-menu').locator('[data-tree-path="1"] .stv__node-label').click({ button: 'right' });
		const b = menuIcon(page, 'tree-snippet-menu', 'Hooked').locator('b');
		await expect(b).toHaveAttribute('data-hook', 'element-menu');
		await expect(menuIcon(page, 'tree-snippet-menu', 'Font').locator('i')).toHaveClass('stv__icon fa-solid fa-star');
	});
});
