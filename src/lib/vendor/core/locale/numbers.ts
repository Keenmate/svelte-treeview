/**
 * Numbers with the resolved separators (SPEC §12.24): a page that sets
 * `window.components.locale.decimalSeparator` gets it in every component's number display and
 * every number a user types (a grid cell editor, a filter).
 */

import { getLocaleSettings } from './settings.js';
import type { LocaleSettings } from './page-locale.js';

export interface NumberFormatOptions extends LocaleSettings {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Group thousands (default `true`). */
  shouldGroup?: boolean;
}

/**
 * Format `value` with `Intl.NumberFormat` for the resolved locale, then swap in the resolved
 * separators (an instance / page-wide `decimalSeparator` / `thousandsSeparator` wins over the
 * locale's). A non-finite value → `''`.
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const { minimumFractionDigits, maximumFractionDigits, shouldGroup = true, ...settings } = options;
  const resolved = getLocaleSettings(settings);
  const parts = new Intl.NumberFormat(resolved.locale, { minimumFractionDigits, maximumFractionDigits, useGrouping: shouldGroup }).formatToParts(value);
  return parts
    .map((p) => (p.type === 'decimal' ? resolved.decimalSeparator : p.type === 'group' ? resolved.thousandsSeparator : p.value))
    .join('');
}

/** Spaces a typed number may carry as grouping (any whitespace, no-break, narrow no-break, thin). */
const SPACE = /[\s   ]/;
const SPACES = /[\s   ]/g;

/**
 * Parse a number the user typed with the resolved separators: `'1 234,5'` → `1234.5` for `cs`.
 * Grouping is optional; any space is ignored; `−` (U+2212) and `+` are accepted; a `.` is also
 * accepted as the decimal point when it can't be a group separator. Not a number → `null`.
 */
export function parseNumber(text: string, settings: LocaleSettings = {}): number | null {
  if (typeof text !== 'string') return null;
  const { decimalSeparator, thousandsSeparator } = getLocaleSettings(settings);
  let s = text.trim().replace(/−/g, '-');
  if (s === '') return null;
  if (thousandsSeparator && !SPACE.test(thousandsSeparator)) s = s.split(thousandsSeparator).join('');
  s = s.replace(SPACES, '');
  if (decimalSeparator !== '.') s = s.split(decimalSeparator).join('.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
