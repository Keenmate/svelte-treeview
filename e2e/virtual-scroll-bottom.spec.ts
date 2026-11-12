import { test, expect } from '@playwright/test';

test('virtual mode: rows are uniform height (no flatGap margin desync)', async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem('svelte-treeview-example-render-mode', 'virtual')
	);
	await page.setViewportSize({ width: 448, height: 630 });
	await page.goto('/examples/search');
	await page.waitForTimeout(1000);

	const el = page.locator('.stv__virtual-scroll').first();
	await el.waitFor();
	await page.waitForTimeout(300);

	// Every rendered row must have the SAME pitch (no 2px gap rows) and zero margin-top.
	const uniform = await el.evaluate((n: HTMLElement) => {
		const rows = Array.from(n.querySelectorAll('.stv__node')) as HTMLElement[];
		const margins = rows.map((r) => getComputedStyle(r).marginTop);
		const pitches: number[] = [];
		for (let i = 1; i < rows.length; i++) pitches.push(rows[i].offsetTop - rows[i - 1].offsetTop);
		const box = Math.round(rows[0].getBoundingClientRect().height);
		return {
			margins: Array.from(new Set(margins)),
			pitches: Array.from(new Set(pitches)),
			box,
			spacer: (n.firstElementChild as HTMLElement).offsetHeight
		};
	});
	console.log('UNIFORM', JSON.stringify(uniform));
	expect(uniform.margins).toEqual(['0px']); // no gap margins in virtual mode
	// Pitch must be uniform within sub-pixel rounding (no 2px gap rows).
	expect(Math.max(...uniform.pitches) - Math.min(...uniform.pitches)).toBeLessThanOrEqual(1);

	// Last item reachable at max scroll.
	await el.evaluate((n: HTMLElement) => {
		n.scrollTop = n.scrollHeight;
	});
	await page.waitForTimeout(400);
	const reach = await el.evaluate((n: HTMLElement) => {
		const rows = Array.from(n.querySelectorAll('.stv__node')) as HTMLElement[];
		const last = rows[rows.length - 1];
		const cr = n.getBoundingClientRect();
		const lr = last.getBoundingClientRect();
		return {
			path: last.getAttribute('data-tree-path'),
			overshoot: Math.round(lr.bottom - cr.bottom)
		};
	});
	console.log('REACH', JSON.stringify(reach));
	expect(reach.overshoot).toBeLessThanOrEqual(1); // last row fully visible
});

test('flat mode: rows have the same uniform pitch as virtual (no first-child gap)', async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem('svelte-treeview-example-render-mode', 'flat')
	);
	await page.goto('/examples/search');
	const tree = page.locator('.stv__tree--flat').first();
	await tree.locator('.stv__node').first().waitFor();

	const { margins, pitches } = await tree.evaluate((n: HTMLElement) => {
		const rows = Array.from(n.querySelectorAll(':scope > .stv__node')) as HTMLElement[];
		const pitches: number[] = [];
		for (let i = 1; i < rows.length; i++) pitches.push(rows[i].offsetTop - rows[i - 1].offsetTop);
		return {
			margins: Array.from(new Set(rows.map((r) => getComputedStyle(r).marginTop))),
			pitches: Array.from(new Set(pitches))
		};
	});
	expect(margins).toEqual(['0px']);
	// Uniform within sub-pixel rounding — a first-child gap row would be 2px off.
	expect(Math.max(...pitches) - Math.min(...pitches)).toBeLessThanOrEqual(1);
});
