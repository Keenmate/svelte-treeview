import { describe, it, expect } from 'vitest';
import { resolveLabel, DEFAULT_LABELS } from './labels.js';

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
