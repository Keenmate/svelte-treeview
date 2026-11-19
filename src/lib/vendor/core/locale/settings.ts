/**
 * Resolved locale settings (SPEC §12.24): per key, the instance value → the page-wide
 * `window.components.locale` → derived from `Intl` for the resolved locale. Month / weekday names
 * and number separators always come from `Intl`; core ships no language tables.
 */

import { coreLog } from '../logging/element-logger.js';
import { getPageLocale, type LocaleSettings } from './page-locale.js';

/** Every setting answered. */
export interface ResolvedLocaleSettings {
  locale: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartDay: number;
  decimalSeparator: string;
  thousandsSeparator: string;
}

const FALLBACK_LOCALE = 'en-US';

/** A usable BCP-47 tag, or `null` (`'auto'`, empty, not a string, or one `Intl` rejects). */
function validLocale(value: unknown, source: unknown): string | null {
  if (typeof value !== 'string' || value === '' || value === 'auto') return null;
  try {
    return Intl.getCanonicalLocales(value)[0] ?? null;
  } catch {
    coreLog(source ?? null, 'INIT', 'ELEMENT').warn(`invalid locale "${value}" — ignored`);
    return null;
  }
}

/**
 * The locale to use: `instanceLocale` (an element's `locale` input; `'auto'` / empty = unset) →
 * `window.components.locale.locale` → `navigator.language` → `en-US`. An invalid tag warns
 * (through `source`'s logger) and falls through to the next layer.
 */
export function resolveLocale(instanceLocale?: string | null, source?: unknown): string {
  return (
    validLocale(instanceLocale, source) ??
    validLocale(getPageLocale()?.locale, null) ??
    validLocale(typeof navigator !== 'undefined' ? navigator.language : undefined, null) ??
    FALLBACK_LOCALE
  );
}

/** Week info: `getWeekInfo()` (current spec) or the older `weekInfo` getter. 1 = Monday … 7 = Sunday. */
type IntlLocaleWithWeek = Intl.Locale & { getWeekInfo?: () => { firstDay?: number }; weekInfo?: { firstDay?: number } };

/** Regions whose week starts on Sunday / Saturday, for engines without `Intl.Locale` week info. */
const SUNDAY_REGIONS = new Set(['US', 'CA', 'MX', 'BR', 'JP', 'KR', 'TW', 'HK', 'IL', 'PH', 'IN', 'ZA', 'AU', 'SA', 'PE', 'CO', 'GT', 'DO', 'VE', 'TH']);
const SATURDAY_REGIONS = new Set(['AE', 'AF', 'BH', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SY', 'SD']);
/** Region guessed from a language alone (`ja` → JP). */
const LANGUAGE_REGIONS: Record<string, string> = { ja: 'JP', ko: 'KR', he: 'IL', en: 'US', fa: 'IR', ar: 'EG' };

/** First day of the week for `locale`: 0 = Sunday … 6 = Saturday. */
export function getWeekStartDay(locale: string): number {
  try {
    const intl = new Intl.Locale(locale) as IntlLocaleWithWeek;
    const firstDay = (typeof intl.getWeekInfo === 'function' ? intl.getWeekInfo() : intl.weekInfo)?.firstDay;
    if (typeof firstDay === 'number' && firstDay >= 1 && firstDay <= 7) return firstDay % 7;
    const region = intl.maximize?.().region ?? intl.region ?? LANGUAGE_REGIONS[intl.language];
    if (region && SUNDAY_REGIONS.has(region)) return 0;
    if (region && SATURDAY_REGIONS.has(region)) return 6;
  } catch {
    // an invalid tag — Monday
  }
  return 1;
}

/** `'12h'` when the locale's clock uses AM / PM. */
export function getTimeFormat(locale: string): '12h' | '24h' {
  try {
    const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
    if (cycle) return cycle === 'h11' || cycle === 'h12' ? '12h' : '24h';
    const hour12 = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;
    return hour12 ? '12h' : '24h';
  } catch {
    return '24h';
  }
}

/** The locale's numeric date pattern in `YYYY` / `MM` / `DD` tokens: `en-US` → `MM/DD/YYYY`, `de` → `DD.MM.YYYY`. */
export function getDateFormat(locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(2026, 10, 17));
    return parts
      .map((p) => (p.type === 'year' ? 'YYYY' : p.type === 'month' ? 'MM' : p.type === 'day' ? 'DD' : p.type === 'literal' ? p.value : ''))
      .join('');
  } catch {
    return 'YYYY-MM-DD';
  }
}

/** The locale's decimal and thousands separators (`Intl.NumberFormat`). */
export function getNumberSeparators(locale: string): { decimalSeparator: string; thousandsSeparator: string } {
  let decimalSeparator = '.';
  let thousandsSeparator = ',';
  try {
    for (const part of new Intl.NumberFormat(locale).formatToParts(1234567.5)) {
      if (part.type === 'decimal') decimalSeparator = part.value;
      else if (part.type === 'group') thousandsSeparator = part.value;
    }
  } catch {
    // an invalid tag — the English pair
  }
  return { decimalSeparator, thousandsSeparator };
}

const isWeekDay = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6;
const isTimeFormat = (v: unknown): v is '12h' | '24h' => v === '12h' || v === '24h';
const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v !== '';
/** A separator may be any string, `''` included (no grouping). */
const isSeparator = (v: unknown): v is string => typeof v === 'string';

/**
 * Every setting answered, per key: `instance` (an element's own inputs; `'auto'` / `null` / unset
 * = not set) → `window.components.locale` → derived from `Intl` for the resolved locale. A page-wide
 * setting applies to every element, also one with its own `locale` (the user's preference — a US
 * user on a German browser), unless the element sets that key itself.
 */
export function getLocaleSettings(instance: LocaleSettings = {}, source?: unknown): ResolvedLocaleSettings {
  const page = getPageLocale() ?? {};
  const locale = resolveLocale(instance.locale, source);
  const pick = <T>(key: keyof LocaleSettings, isValid: (v: unknown) => v is T, derive: () => T): T => {
    if (isValid(instance[key])) return instance[key] as T;
    if (isValid(page[key])) return page[key] as T;
    return derive();
  };
  let separators: ReturnType<typeof getNumberSeparators> | undefined;
  const sep = (): ReturnType<typeof getNumberSeparators> => (separators ??= getNumberSeparators(locale));
  return {
    locale,
    dateFormat: pick('dateFormat', isNonEmpty, () => getDateFormat(locale)),
    timeFormat: pick('timeFormat', isTimeFormat, () => getTimeFormat(locale)),
    weekStartDay: pick('weekStartDay', isWeekDay, () => getWeekStartDay(locale)),
    decimalSeparator: pick('decimalSeparator', isNonEmpty, () => sep().decimalSeparator),
    thousandsSeparator: pick('thousandsSeparator', isSeparator, () => sep().thousandsSeparator),
  };
}

/** Month names January … December from `Intl` (`'long'` / `'short'` / `'narrow'`). */
export function getMonthNames(locale: string, width: 'long' | 'short' | 'narrow' = 'long'): string[] {
  const format = (l: string): string[] => {
    const f = new Intl.DateTimeFormat(l, { month: width, timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, m) => f.format(Date.UTC(2017, m, 1)));
  };
  try {
    return format(locale);
  } catch {
    return format(FALLBACK_LOCALE);
  }
}

/** Weekday names Sunday … Saturday from `Intl` (`'short'` / `'long'` / `'narrow'`); index = 0 Sunday. */
export function getWeekdayNames(locale: string, width: 'long' | 'short' | 'narrow' = 'short'): string[] {
  const format = (l: string): string[] => {
    const f = new Intl.DateTimeFormat(l, { weekday: width, timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, d) => f.format(Date.UTC(2017, 0, d + 1))); // 1 Jan 2017 = Sunday
  };
  try {
    return format(locale);
  } catch {
    return format(FALLBACK_LOCALE);
  }
}
