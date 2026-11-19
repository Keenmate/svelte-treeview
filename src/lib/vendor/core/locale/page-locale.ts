/**
 * Page-wide locale (SPEC §12.24): `window.components.locale` and `window.components.security`,
 * both NON-enumerable accessors (enumerating `window.components` still yields tags only).
 *
 * ```js
 * window.components.locale = {
 *   locale: 'en-US',                 // BCP-47; unset = the browser language
 *   dateFormat: 'DD.MM.YYYY',        // unset = derived from the locale
 *   timeFormat: '24h',
 *   weekStartDay: 1,
 *   decimalSeparator: ',', thousandsSeparator: ' ',
 *   labels: { 'web-dropzone': { cancelFile: 'Zrušit {name}' } },
 *   formatLabelCallback: ({ component, key, template, params, locale }) => i18next.t(`${component}.${key}`, params),
 * };
 * window.components.security = { shouldEscapeLabels: true };
 * ```
 *
 * Assigning REPLACES the whole object (stored as a frozen copy — nested mutation throws instead of
 * being silently missed); every live component re-renders its texts. The state is page-wide
 * (`sharedState`): each component bundles its own copy of core.
 */

import { sharedState, sharedStateKey } from '../global/shared-state.js';
import { publishPageSetting } from '../global/page-setting.js';
import { coreLog } from '../logging/element-logger.js';
import { notifyEach } from '../logging/safe-call.js';

/** `formatLabelCallback` context: format `template` (ICU / FormatJS) or look `component.key` up (i18next). */
export interface LabelFormatContext {
  /** The component tag (`web-dropzone`). */
  component: string;
  key: string;
  /** The resolved template: instance `labels` → page-wide labels → the component's English default. */
  template: string;
  /** Placeholder values; HTML-escaped already when the label goes into HTML and labels aren't escaped as a whole. */
  params: Readonly<Record<string, unknown>>;
  /** The resolved BCP-47 locale. */
  locale: string;
}

export type FormatLabelCallback = (ctx: LabelFormatContext) => string;

/** Locale settings: every one optional; an unset one is derived from `Intl` for the resolved locale. */
export interface LocaleSettings {
  /** BCP-47 tag (`cs-CZ`); `'auto'` / unset = the browser language. */
  locale?: string;
  /** Date pattern in `YYYY` / `MM` / `DD` tokens (`DD.MM.YYYY`). */
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  /** First day of the week: 0 = Sunday … 6 = Saturday. */
  weekStartDay?: number;
  decimalSeparator?: string;
  thousandsSeparator?: string;
}

/** `window.components.locale`. */
export interface PageLocale extends LocaleSettings {
  /** Page-wide UI strings per component tag — between an instance's own `labels` and the English defaults. */
  labels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  formatLabelCallback?: FormatLabelCallback;
}

/** `window.components.security`. */
export interface PageSecurity {
  /**
   * `false` (default): labels are HTML — a template may carry markup, placeholder VALUES are escaped.
   * `true`: the finished label is escaped as a whole (labels are plain text).
   */
  shouldEscapeLabels?: boolean;
}

interface LocaleState {
  locale: Readonly<PageLocale> | undefined;
  security: Readonly<PageSecurity> | undefined;
  /** Bumped on every change (page locale, security, browser `languagechange`). */
  revision: number;
  listeners: Set<() => void>;
  isLanguageWatched?: boolean;
}

const STATE_KEY = sharedStateKey('locale');

function state(): LocaleState {
  return sharedState(STATE_KEY, () => ({ locale: undefined, security: undefined, revision: 0, listeners: new Set() }));
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

function freezeLocale(value: Record<string, unknown>): Readonly<PageLocale> {
  const copy: Record<string, unknown> = { ...value };
  if (isPlainObject(value.labels)) {
    const labels: Record<string, Readonly<Record<string, string>>> = {};
    for (const [tag, table] of Object.entries(value.labels)) {
      if (isPlainObject(table)) labels[tag] = Object.freeze({ ...(table as Record<string, string>) });
    }
    copy.labels = Object.freeze(labels);
  } else if (value.labels !== undefined) {
    coreLog(null, 'INIT', 'ELEMENT').warn('window.components.locale.labels must be an object of per-tag label objects — ignored');
    delete copy.labels;
  }
  if (copy.formatLabelCallback !== undefined && typeof copy.formatLabelCallback !== 'function') {
    coreLog(null, 'INIT', 'ELEMENT').warn('window.components.locale.formatLabelCallback must be a function — ignored');
    delete copy.formatLabelCallback;
  }
  return Object.freeze(copy) as Readonly<PageLocale>;
}

function changed(): void {
  const s = state();
  s.revision++;
  notifyEach(s.listeners, undefined, { message: 'locale listener threw' });
}

function setter(key: 'locale' | 'security', freeze: (v: Record<string, unknown>) => object) {
  return (value: unknown): void => {
    const s = state();
    if (value != null && !isPlainObject(value)) {
      coreLog(null, 'INIT', 'ELEMENT').warn(`window.components.${key} must be an object (or null) — ignored`, value);
      return;
    }
    (s as unknown as Record<string, unknown>)[key] = value == null ? undefined : freeze(value);
    changed();
  };
}

/** Browser language changes (`navigator.language`) matter while no page / instance locale is set. */
function watchLanguage(): void {
  const s = state();
  if (s.isLanguageWatched || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  s.isLanguageWatched = true;
  window.addEventListener('languagechange', changed);
}

/**
 * Publish `window.components.locale` + `window.components.security` (a value the page assigned
 * earlier as a plain property is adopted). Idempotent; SSR-safe.
 */
export function publishLocaleHooks(): void {
  publishPageSetting('locale', { get: () => state().locale, set: setter('locale', freezeLocale) });
  publishPageSetting('security', { get: () => state().security, set: setter('security', (v) => Object.freeze({ ...v })) });
  watchLanguage();
}

/** The page-wide locale object (frozen), or `undefined`. */
export function getPageLocale(): Readonly<PageLocale> | undefined {
  publishLocaleHooks();
  return state().locale;
}

/** The page-wide security switches (frozen), or `undefined`. */
export function getPageSecurity(): Readonly<PageSecurity> | undefined {
  publishLocaleHooks();
  return state().security;
}

/** Tests only (`resetPageState`): forget the page-wide locale + security without notifying anyone. */
export function __resetLocale(): void {
  const s = state();
  s.locale = undefined;
  s.security = undefined;
}

/** A counter bumped on every locale change — lets a re-connecting element tell whether it missed one. */
export function getLocaleRevision(): number {
  return state().revision;
}

/**
 * Subscribe to page-wide locale changes (`window.components.locale` / `.security` assigned, the
 * browser language changed); returns the unsubscribe. A BlissElement gets this through the
 * `localeChanged()` hook instead.
 */
export function observeLocale(listener: () => void): () => void {
  publishLocaleHooks();
  const { listeners } = state();
  const wrapped = (): void => listener();
  listeners.add(wrapped);
  return () => listeners.delete(wrapped);
}
