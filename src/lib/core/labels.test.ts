// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveLabel, DEFAULT_LABELS } from './labels.js';
import { observeLocale } from '../vendor/core/locale/page-locale.js';

type PageComponents = { locale?: unknown; security?: unknown };
const components = () => (window as unknown as { components: PageComponents }).components;

describe('resolveLabel', () => {
	it('falls back to the English default for a missing / undefined key', () => {
		expect(resolveLabel(undefined, 'noData')).toBe('No data');
		expect(resolveLabel({ noData: undefined }, 'noData')).toBe('No data');
		expect(resolveLabel({}, 'loading')).toBe('Loading…');
	});
	it("keeps '' as deliberately empty", () => {
		expect(resolveLabel({ noResults: '' }, 'noResults')).toBe('');
	});
	it('uses the given text and fills {name} placeholders', () => {
		expect(resolveLabel({ noData: 'Nothing in {where}' }, 'noData', { where: 'here' })).toBe(
			'Nothing in here'
		);
	});
	it('defaults use the single … character', () => {
		for (const v of Object.values(DEFAULT_LABELS)) expect(v).not.toContain('...');
	});
});

describe('resolveLabel — page-wide window.components.locale', () => {
	afterEach(() => {
		components().locale = null;
	});

	it("sits between the labels prop and the English default (tag 'svelte-treeview')", () => {
		resolveLabel(undefined, 'noData'); // publishes the accessor
		components().locale = {
			labels: { 'svelte-treeview': { noData: 'Žádná data', loading: '' }, 'web-treeview': { noResults: 'x' } }
		};
		expect(resolveLabel(undefined, 'noData')).toBe('Žádná data');
		expect(resolveLabel({ noData: 'Mine' }, 'noData')).toBe('Mine');
		expect(resolveLabel(undefined, 'loading')).toBe('');
		expect(resolveLabel(undefined, 'noResults')).toBe('No results found');
	});

	it('formats through formatLabelCallback; a throw or a non-string keeps the default formatting', () => {
		resolveLabel(undefined, 'noData');
		components().locale = {
			formatLabelCallback: ({ component, key, template, params }: { component: string; key: string; template: string; params: Record<string, unknown> }) =>
				`${component}.${key}:${template}:${String(params.n ?? '')}`
		};
		expect(resolveLabel({ noData: '{n} items' }, 'noData', { n: 3 })).toBe('svelte-treeview.noData:{n} items:3');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		components().locale = { formatLabelCallback: () => { throw new Error('boom'); } };
		expect(resolveLabel({ noData: '{n} items' }, 'noData', { n: 3 })).toBe('3 items');
		components().locale = { formatLabelCallback: () => 42 };
		expect(resolveLabel({ noData: '{n} items' }, 'noData', { n: 3 })).toBe('3 items');
		error.mockRestore();
	});

	it('notifies observers when the page-wide object is replaced', () => {
		let calls = 0;
		const off = observeLocale(() => calls++);
		components().locale = { labels: { 'svelte-treeview': { noData: 'A' } } };
		expect(calls).toBe(1);
		off();
	});
});

