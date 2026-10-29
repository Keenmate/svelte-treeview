import { describe, it, expect, afterEach } from 'vitest';
import { getPageLoaderCallback } from './loader.js';

const KEY = Symbol.for('@keenmate/web-components-core:loader');
const g = globalThis as any;

describe('getPageLoaderCallback (page-wide hook, read without core)', () => {
	afterEach(() => {
		delete g.components;
		delete g[KEY];
	});

	it('is undefined when nothing is set', () => {
		expect(getPageLoaderCallback()).toBeUndefined();
	});

	it('reads window.components.renderLoaderCallback (plain property or core accessor)', () => {
		const cb = () => {};
		g.components = { renderLoaderCallback: cb };
		expect(getPageLoaderCallback()).toBe(cb);
	});

	it("falls back to core's shared Symbol state; a non-function reads as unset", () => {
		const cb = () => {};
		g[KEY] = { callback: cb };
		expect(getPageLoaderCallback()).toBe(cb);
		g[KEY] = { callback: 'nope' };
		expect(getPageLoaderCallback()).toBeUndefined();
	});
});
