// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveLabel, createTreeLabels, DEFAULT_LABELS } from './labels.js';
import { observePageLocale } from '../vendor/core/locale/page-locale.js';

type PageComponents = { locale?: unknown; security?: unknown };
const components = () => (window as unknown as { components: PageComponents }).components;

describe('resolveLabel', () => {
	it('falls back to the English default for a missing / undefined key', () => {
		expect(resolveLabel(undefined, 'messages.noData')).toBe('No data');
		expect(resolveLabel({ 'messages.noData': undefined }, 'messages.noData')).toBe('No data');
		expect(resolveLabel({}, 'ariaLabels.loading')).toBe('Loading…');
	});
	it("keeps '' as deliberately empty", () => {
		expect(resolveLabel({ 'messages.noResults': '' }, 'messages.noResults')).toBe('');
	});
	it('takes the short or the full key and fills {name} placeholders', () => {
		expect(resolveLabel({ 'messages.noData': 'Nothing in {where}' }, 'messages.noData', { where: 'here' })).toBe(
			'Nothing in here'
		);
		expect(resolveLabel({ 'svelte-treeview.messages.noData': 'Full' }, 'messages.noData')).toBe('Full');
	});
	it('defaults use the single … character', () => {
		for (const v of Object.values(DEFAULT_LABELS)) expect(v).not.toContain('...');
	});
});

describe('labels — page-wide window.components.locale', () => {
	afterEach(() => {
		components().locale = null;
	});

	it("the flat page dictionary ('svelte-treeview.<key>') sits between the prop and the English default", () => {
		resolveLabel(undefined, 'messages.noData'); // publishes the accessor
		components().locale = {
			labels: {
				'svelte-treeview.messages.noData': 'Žádná data',
				'svelte-treeview.ariaLabels.loading': '',
				'web-treeview.messages.noResults': 'x'
			}
		};
		expect(resolveLabel(undefined, 'messages.noData')).toBe('Žádná data');
		expect(resolveLabel({ 'messages.noData': 'Mine' }, 'messages.noData')).toBe('Mine');
		expect(resolveLabel(undefined, 'ariaLabels.loading')).toBe('');
		expect(resolveLabel(undefined, 'messages.noResults')).toBe('No results found');
	});

	it('the tree translateCallback, then the page one: full key, raw params; a throw / non-string passes on', () => {
		resolveLabel(undefined, 'messages.noData');
		let own: ((ctx: { key: string }) => unknown) | null = ({ key }) => (key.endsWith('noData') ? 'own' : null);
		const labels = createTreeLabels(() => ({ 'messages.dropHere': 'Prop {n}' }), () => own as never);
		components().locale = {
			translateCallback: ({ component, key, template, params }: { component: string; key: string; template: string; params: Record<string, unknown> }) =>
				`${component}|${key}|${template}|${String(params.n ?? '')}`
		};
		expect(labels.text('messages.noData')).toBe('own');
		expect(labels.text('messages.noResults', { n: 3 })).toBe('svelte-treeview|svelte-treeview.messages.noResults|No results found|3');
		expect(labels.text('messages.dropHere', { n: 3 })).toBe('Prop 3'); // a prop key never goes to a callback
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		own = () => { throw new Error('boom'); };
		components().locale = { translateCallback: () => 42 };
		expect(labels.text('messages.noData')).toBe('No data');
		error.mockRestore();
	});

	it('notifies observers when the page-wide object is replaced', () => {
		let calls = 0;
		const off = observePageLocale(() => calls++);
		components().locale = { labels: { 'svelte-treeview.messages.noData': 'A' } };
		expect(calls).toBe(1);
		off();
	});
});
