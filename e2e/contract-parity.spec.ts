import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/**
 * The tree looks the same with and without @keenmate/base-css-variables.
 *
 * Renders /test/contract-parity standalone and with the contract injected, in light and
 * dark, and compares every color-valued --stv-* token (resolved to sRGB on a probe inside
 * .stv__container). A second pass sets a different accent (--stv-accent-color standalone
 * vs --base-primary-color with the contract): the derived fallbacks are the contract's
 * formulas on --stv-accent-color, so they follow. The static side of the same rule is
 * `npm run check:contract`.
 *
 * Same procedure as the contract's `contractParity()` helper
 * (@keenmate/base-css-variables/testing/parity), which reads a shadow root; the tree is
 * light DOM, so this spec collects the tokens from the document's style sheets.
 */
const require = createRequire(import.meta.url);
const CONTRACT = readFileSync(require.resolve('@keenmate/base-css-variables/base-variables.css'), 'utf8');
const URL = '/test/contract-parity';
const HOST = '#parity .stv__container';
const ACCENT = '#16a34a';

type Vars = { host?: Record<string, string>; root?: Record<string, string> };

async function render(page: Page, scheme: 'light' | 'dark', contract: boolean, vars: Vars) {
	await page.goto(URL);
	await page.waitForSelector(HOST);
	if (contract) await page.addStyleTag({ content: CONTRACT });
	return page.evaluate(
		({ scheme, vars, host }) => {
			document.documentElement.style.colorScheme = scheme;
			const el = document.querySelector<HTMLElement>(host)!;
			for (const [k, v] of Object.entries(vars.root ?? {})) document.documentElement.style.setProperty(k, v);
			for (const [k, v] of Object.entries(vars.host ?? {})) el.style.setProperty(k, v);

			const names = new Set<string>();
			const walk = (rules: CSSRuleList) => {
				for (const r of rules as unknown as CSSStyleRule[]) {
					if (r.style) for (const p of r.style) if (p.startsWith('--stv-')) names.add(p);
					if ((r as unknown as CSSGroupingRule).cssRules) walk((r as unknown as CSSGroupingRule).cssRules);
				}
			};
			for (const s of document.styleSheets) {
				try { walk(s.cssRules); } catch { /* cross-origin */ }
			}

			const wrap = document.createElement('div');
			const probe = document.createElement('span');
			wrap.style.display = 'none';
			wrap.appendChild(probe);
			el.appendChild(wrap);
			const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
			const rgba = (c: string) => {
				ctx.clearRect(0, 0, 1, 1);
				ctx.fillStyle = '#000';
				ctx.fillStyle = c;
				ctx.fillRect(0, 0, 1, 1);
				const d = ctx.getImageData(0, 0, 1, 1).data;
				return `${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)}`;
			};
			const out: Record<string, string> = {};
			for (const name of [...names].sort()) {
				probe.style.color = `var(${name})`;
				wrap.style.color = 'rgb(1, 2, 3)';
				const a = getComputedStyle(probe).color;
				wrap.style.color = 'rgb(4, 5, 6)';
				const b = getComputedStyle(probe).color;
				if (a !== b) continue; // not a color, or currentColor / inherit
				out[name] = rgba(a);
			}
			wrap.remove();
			return out;
		},
		{ scheme, vars, host: HOST }
	);
}

const close = (a: string, b: string) => {
	const x = a.split(',').map(Number), y = b.split(',').map(Number);
	return [0, 1, 2].every((i) => Math.abs(x[i] - y[i]) <= 2) && Math.abs(x[3] - y[3]) <= 0.02;
};

test('standalone colors match the contract (light + dark, default + custom accent)', async ({ page }) => {
	const passes: { pass: string; standalone: Vars; withContract: Vars }[] = [
		{ pass: 'default', standalone: {}, withContract: {} },
		{ pass: 'accent', standalone: { host: { '--stv-accent-color': ACCENT } }, withContract: { root: { '--base-primary-color': ACCENT } } }
	];
	const diffs: unknown[] = [];
	for (const p of passes) {
		for (const scheme of ['light', 'dark'] as const) {
			const a = await render(page, scheme, false, p.standalone);
			const b = await render(page, scheme, true, p.withContract);
			expect(Object.keys(a).length, 'color --stv-* tokens found').toBeGreaterThan(40);
			for (const token of Object.keys(a)) {
				if (token in b && !close(a[token], b[token])) diffs.push({ pass: p.pass, scheme, token, standalone: a[token], contract: b[token] });
			}
		}
	}
	expect(diffs).toEqual([]);
});
