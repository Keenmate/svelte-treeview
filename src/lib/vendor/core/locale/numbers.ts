/**
 * Numbers with the resolved separators (SPEC §12.24): a page that sets
 * `window.components.locale.decimalSeparator` gets it in every component's number display and
 * every number a user types (a grid cell editor, a filter).
 */

import { resolveLocaleSettings } from './settings.js';
import { getPageLocale } from './page-locale.js';
import type { LocaleSettings } from './page-locale.js';
import { runSafely } from '../logging/safe-call.js';

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
  const resolved = resolveLocaleSettings(settings);
  const parts = new Intl.NumberFormat(resolved.locale, { minimumFractionDigits, maximumFractionDigits, useGrouping: shouldGroup }).formatToParts(value);
  return parts
    .map((p) => (p.type === 'decimal' ? resolved.decimalSeparator : p.type === 'group' ? resolved.thousandsSeparator : p.value))
    .join('');
}

/** Spaces a typed number may carry as grouping (any whitespace, no-break, narrow no-break, thin). */
const SPACES = /[\s   ]+/g;
/** Placeholder for a group mark while the integer part is checked. */
const GROUP = '_';

/** `parseNumberCallback` context: the typed text and the resolved separators. */
export interface ParseNumberContext {
  /** What the user typed (untrimmed). */
  text: string;
  /** The resolved BCP-47 locale. */
  locale: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  /** The built-in parse of `text` (what core would answer without the callback). */
  parseDefault(): number | null;
}

/**
 * Override how typed numbers are read: return the number, `null` = not a number, `undefined` = "not mine"
 * (the next rule decides: the element's own callback → `window.components.locale.parseNumberCallback` → core).
 */
export type ParseNumberCallback = (ctx: ParseNumberContext) => number | null | undefined;

export interface ParseNumberOptions extends LocaleSettings {
  /** The element's own `parseNumberCallback` (asked before the page-wide one). */
  parseNumberCallback?: ParseNumberCallback | null;
}

/**
 * Parse a number the user typed with the resolved separators: `'1 234,5'` → `1234.5` for `cs`.
 * Grouping is optional, but a group separator (the locale's, or any space) must sit in a real group
 * position — the last group 3 digits, the ones before it 2–3 (Indian grouping), the first 1–3:
 * `'1.234,5'` → `1234.5` but `'1.5'` → `null` for `de` (never a silent 15). `−` (U+2212) and `+` are
 * accepted; a `.` is also the decimal point when it can't be a group separator (`'1.5'` in `cs`).
 * An element's `parseNumberCallback`, then `window.components.locale.parseNumberCallback`, may answer
 * first. Not a number → `null`.
 */
export function parseNumber(text: string, options: ParseNumberOptions = {}, source?: unknown): number | null {
  if (typeof text !== 'string') return null;
  const { parseNumberCallback, ...settings } = options;
  const resolved = resolveLocaleSettings(settings, source);
  const parseDefault = (): number | null => parseNumberDefault(text, resolved.decimalSeparator, resolved.thousandsSeparator);
  const callbacks: Array<[unknown, string]> = [
    [parseNumberCallback, 'parseNumberCallback'],
    [getPageLocale()?.parseNumberCallback, 'window.components.locale.parseNumberCallback'],
  ];
  for (const [callback, name] of callbacks) {
    if (typeof callback !== 'function') continue;
    const ctx: ParseNumberContext = {
      text,
      locale: resolved.locale,
      decimalSeparator: resolved.decimalSeparator,
      thousandsSeparator: resolved.thousandsSeparator,
      parseDefault,
    };
    const result = runSafely(() => (callback as ParseNumberCallback)(ctx), {
      source,
      message: `${name} threw for "${text}" — the next rule decides`,
    });
    if (!result.isOk || result.value === undefined) continue;
    return typeof result.value === 'number' && Number.isFinite(result.value) ? result.value : null;
  }
  return parseDefault();
}

function parseNumberDefault(text: string, decimalSeparator: string, thousandsSeparator: string): number | null {
  let s = text.trim().replace(/−/g, '-');
  if (s === '' || s.includes(GROUP)) return null;
  const isSpaceGroup = thousandsSeparator !== '' && thousandsSeparator.trim() === '';
  // Group marks → one placeholder: the locale's separator, and any run of spaces.
  if (thousandsSeparator && !isSpaceGroup && thousandsSeparator !== decimalSeparator) s = s.split(thousandsSeparator).join(GROUP);
  s = s.replace(SPACES, GROUP);
  if (decimalSeparator !== '.') s = s.split(decimalSeparator).join('.');
  const sign = /^[-+]/.test(s) ? s[0] : '';
  if (sign) s = s.slice(1);
  const match = /^([\d_]*)(\.\d*)?(e[-+]?\d+)?$/i.exec(s);
  if (!match) return null;
  const [, intPart = '', fraction = '', exponent = ''] = match;
  // Grouped: first 1–3 digits, then groups of 2–3 (Indian lakh), the last one exactly 3.
  if (intPart.includes(GROUP) && !/^\d{1,3}(_\d{2,3})*_\d{3}$/.test(intPart)) return null;
  const digits = intPart.split(GROUP).join('');
  if (digits === '' && fraction.length < 2) return null;
  const n = Number(`${sign}${digits}${fraction}${exponent}`);
  return Number.isFinite(n) ? n : null;
}
