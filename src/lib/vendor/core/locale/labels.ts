/**
 * UI strings (SPEC §12.24, rulebook D-NC-24): one seam every component resolves its texts through.
 *
 * Keys are flat `<elementType>.<name>` (`buttons.add`, `tooltips.clearAll`); the FULL key prefixes the
 * component name: `web-grid.buttons.add`. Per key: the instance `labels` (short key, or the full key — a
 * string, `''` included, wins) → the page-wide flat dictionary `window.components.locale.labels['<full key>']`
 * → the component's built-in English default. An `ariaLabels.x` / `tooltips.x` nobody set takes a customized
 * sibling with the same `<name>` first (`buttons.x`, `labels.x`, … — {@link getLabelFallbackKeys}). A key the instance set is formatted as is (`{name}`); any other
 * goes to the element's own `translateCallback`, then `window.components.locale.translateCallback` (i18next / ICU /
 * the app's own lookup — one element needs no page setup; each gets the
 * full key, the resolved template and the RAW params; `null` / `undefined` = "not mine"), else the default
 * `{name}` replacement — `{ctx.remaining}` reads a dotted path (a component passes the text spot's callback context as
 * `{ ctx }`; `ctx.count` = the number the text's noun agrees with, for plural rules) — a NUMBER is shown through
 * `formatNumber` (the resolved locale and separators: `12 345` in Czech). Pass a string for a number that mustn't be
 * grouped (a year, an id). A per-call `{ fallback }` ({@link LabelOptions}) stands in for the built-in default (a key
 * with neither shows the key itself). Then escaping:
 *
 * - {@link Labels.text} — for `textContent` / attributes: nothing is escaped (text can't inject).
 * - {@link Labels.html} — for `innerHTML`: with `window.components.security.shouldEscapeLabels`
 *   off (default) the template is HTML and the placeholder VALUES are escaped (they are data — a
 *   typed value, a file name); on, the finished label is escaped as a whole.
 */

import { escapeHtml } from '../dom/escape-html.js';
import { runSafely } from '../logging/safe-call.js';
import { getPageLocale, getPageSecurity, type TranslateCallback } from './page-locale.js';
import { resolveLocale } from './settings.js';
import { formatNumber } from './numbers.js';

export type LabelParams = Readonly<Record<string, unknown>>;

/** Per-call options of {@link Labels.text} / {@link Labels.html}. */
export interface LabelOptions {
  /**
   * This call's default text — used exactly where the built-in default (`defaults[key]`) would be, and
   * instead of it: after the instance `labels`, the page dictionary and the `translateCallback`s (which
   * get it as `template`); `{name}` / `{ctx.*}` placeholders and the `html()` escaping apply to it like
   * to a built-in default (a template, not data). For a key with no built-in entry (a derived key: a
   * command, a group); without it such a key shows the key itself.
   */
  fallback?: string;
}

export interface Labels<L extends object> {
  /** The resolved template for `key` (unformatted). */
  template(key: keyof L & string): string;
  /** Formatted, NOT escaped — for `textContent`, `aria-label`, `title`, `placeholder`. */
  text(key: keyof L & string, params?: LabelParams, options?: LabelOptions): string;
  /** Formatted for `innerHTML` (escaping per `window.components.security.shouldEscapeLabels`). */
  html(key: keyof L & string, params?: LabelParams, options?: LabelOptions): string;
  /** Every resolved template — for a renderer that takes a labels object. */
  all(): L;
}

/**
 * The labels a component hands to a user callback (`ctx.labels`): only `text()` / `html()`, the two paths that
 * run the whole chain (instance → page dictionary → the element's then the page's `translateCallback` →
 * default, numbers locale-formatted). No `template()` / `all()` — those skip the callbacks.
 */
export type LabelsView<L extends object> = Readonly<Pick<Labels<L>, 'text' | 'html'>>;

/** `ctx.labels` for a callback context: a frozen `{ text, html }` over the component's labels (SPEC §12.24). */
export function createLabelsView<L extends object>(labels: Labels<L>): LabelsView<L> {
  return Object.freeze({
    text: (key: keyof L & string, params?: LabelParams, options?: LabelOptions) => labels.text(key, params, options),
    html: (key: keyof L & string, params?: LabelParams, options?: LabelOptions) => labels.html(key, params, options),
  });
}

export interface CreateLabelsOptions {
  /**
   * The component name — the prefix of the full keys (`web-grid` → `web-grid.buttons.add`). Pass the
   * component's own name, so a custom tag (`my-grid`) still reads `web-grid.*` from the app dictionary.
   * Default: the host's `localName`.
   */
  tag?: string;
  /** The element's own locale (its `locale` input), for `translateCallback`'s `ctx.locale`. */
  getLocale?: () => string | null | undefined;
  /**
   * The element's own `translateCallback` (asked before the page-wide one; `null` = not mine → the page's).
   * Default: `host.translateCallback` (the component's input row), read per call.
   */
  getTranslateCallback?: () => TranslateCallback | null | undefined;
}

const hasOwn = (value: unknown, name: string): boolean =>
  value !== null && (typeof value === 'object' || typeof value === 'function') && Object.prototype.hasOwnProperty.call(value, name);

/**
 * `{name}` → `params.name`; `{ctx.item.text}` → a dotted path, own properties at every step (a component passes the
 * text spot's callback context as `{ ctx }`, so a label template and the `get*Callback` read the same fields). An
 * unknown placeholder stays as written; `null` / `undefined` → `''`. `formatValue` turns a found value into its
 * display text (default `String`).
 */
export function formatLabel(template: string, params?: LabelParams, formatValue: (value: unknown) => string = String): string {
  if (!params) return template;
  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path: string) => {
    let value: unknown = params;
    for (const name of path.split('.')) {
      if (!hasOwn(value, name)) return match;
      value = (value as Record<string, unknown>)[name];
    }
    return value === null || value === undefined ? '' : formatValue(value);
  });
}

const isPlain = (value: unknown): value is Record<string, unknown> | unknown[] => {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Params for an HTML label: every string escaped, at any depth of plain objects / arrays (a `ctx.item.text`
 * is data too). Other values (numbers, elements, class instances, functions) pass as they are; a cycle is kept.
 */
function escapeParams(params: LabelParams): LabelParams {
  const seen = new WeakMap<object, unknown>();
  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') return escapeHtml(value);
    if (!isPlain(value)) return value;
    const done = seen.get(value);
    if (done) return done;
    const copy: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {};
    seen.set(value, copy);
    for (const [name, item] of Object.entries(value)) (copy as Record<string, unknown>)[name] = visit(item);
    return copy;
  };
  return visit(params) as LabelParams;
}

type LabelSource = 'instance' | 'page' | 'default';

/** An instance's `labels`: short keys (`buttons.add`) and / or full keys (`web-grid.buttons.add`). */
export type OwnLabels<L extends object> = Partial<L> | Readonly<Record<string, unknown>> | null | undefined;

/**
 * Twins share `<name>`: a NON-visible key nobody set (`ariaLabels.x`, `tooltips.x` on its built-in English) takes
 * the first CUSTOMIZED sibling, visible texts first — so a page that translates only the visible caption doesn't
 * leave the screen-reader name / tooltip in English (WCAG 2.5.3). Other types never fall back.
 */
const SIBLINGS: Readonly<Record<string, readonly string[]>> = {
  ariaLabels: ['buttons', 'labels', 'headers', 'messages', 'menuItems', 'tooltips'],
  tooltips: ['buttons', 'labels', 'menuItems', 'ariaLabels'],
};

/** The sibling keys `key` falls back to (`ariaLabels.clear` → `buttons.clear`, …), in order; `[]` for a visible type. */
export function getLabelFallbackKeys(key: string): string[] {
  const dot = key.indexOf('.');
  if (dot < 0) return [];
  const types = SIBLINGS[key.slice(0, dot)];
  return types ? types.map((type) => `${type}${key.slice(dot)}`) : [];
}

/** The default of `key`: this call's `fallback` → the built-in `defaults[key]` → the key itself. */
function defaultTemplate(defaults: object, key: string, fallback?: string): string {
  if (typeof fallback === 'string') return fallback;
  const builtIn = (defaults as Record<string, unknown>)[key];
  return typeof builtIn === 'string' ? builtIn : key;
}

function lookup<L extends object>(tag: string, defaults: L, own: OwnLabels<L>, key: string, fallback?: string): { template: string; source: LabelSource } {
  const full = `${tag}.${key}`;
  const mine = (own as Record<string, unknown> | null | undefined)?.[key] ?? (own as Record<string, unknown> | null | undefined)?.[full];
  if (typeof mine === 'string') return { template: mine, source: 'instance' };
  const page = getPageLocale()?.labels?.[full];
  if (typeof page === 'string') return { template: page, source: 'page' };
  return { template: defaultTemplate(defaults, key, fallback), source: 'default' };
}

const hasKey = (defaults: object, key: string): boolean => Object.prototype.hasOwnProperty.call(defaults, key);

/**
 * Resolve `key` (short: `buttons.add`): `own[key]` / `own['<tag>.<key>']` → page-wide `labels['<tag>.<key>']`
 * → a customized sibling (`ariaLabels.x` / `tooltips.x` only, {@link getLabelFallbackKeys}) → `defaults[key]` → the key
 * itself. A string wins (`''` is a deliberate empty label); anything else falls through.
 */
export function resolveLabel<L extends object>(tag: string, defaults: L, own: OwnLabels<L>, key: keyof L & string): string {
  const found = lookup(tag, defaults, own, key);
  if (found.source !== 'default') return found.template;
  for (const sibling of getLabelFallbackKeys(key)) {
    if (!hasKey(defaults, sibling)) continue;
    const twin = lookup(tag, defaults, own, sibling);
    if (twin.source !== 'default') return twin.template;
  }
  return found.template;
}

/** The text of an HTML fragment (tags dropped, entities decoded); inert — a `<template>` runs nothing. */
function htmlToText(html: string): string {
  if (!html.includes('<') && !html.includes('&')) return html;
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent ?? '';
}

/**
 * The labels of one component instance. `getOwn` reads the instance `labels` input on every call, so
 * a changed input or page-wide object is picked up by the next render (re-render on
 * `localeChanged()` / a `labels` update).
 *
 * ```ts
 * #labels = createLabels(this, DEFAULT_LABELS, () => this.config.labels, { tag: 'web-dropzone', getLocale: () => this.config.locale });
 * button.setAttribute('aria-label', this.#labels.text('ariaLabels.cancelFile', { name: file.name }));
 * row.innerHTML = this.#labels.html('labels.addNew', { value: typed });
 * ```
 *
 * A public engine without its element passes `host: null` with `tag` and `getTranslateCallback` (its own
 * options): same resolution order; a throwing callback is logged by core (no element logger).
 */
export function createLabels<L extends object>(
  host: Element | null,
  defaults: L,
  getOwn: () => OwnLabels<L>,
  options: CreateLabelsOptions = {},
): Labels<L> {
  const tag = options.tag ?? host?.localName ?? '';
  const own = (): OwnLabels<L> => {
    const value = getOwn();
    return value && typeof value === 'object' ? value : null;
  };
  const template = (key: keyof L & string): string => resolveLabel(tag, defaults, own(), key);

  /**
   * One key, without the sibling fallback: the instance text (a template, never sent to a callback) → the
   * element's `translateCallback` → the page-wide one (a finished text) → the page dictionary → the built-in
   * default (`source: 'default'`) — this call's `fallback` in its place when given.
   */
  const resolveOne = (key: string, values: LabelParams | undefined, fallback?: string): { template: string; text?: string; source: LabelSource | 'callback' } => {
    const found = lookup(tag, defaults, own(), key, fallback);
    if (found.source === 'instance') return found; // written for this element: the app dictionary must not overwrite it
    const ownCallback = options.getTranslateCallback ? options.getTranslateCallback() : (host as { translateCallback?: unknown } | null)?.translateCallback;
    const callbacks: Array<[unknown, string]> = [
      [ownCallback, 'translateCallback'],
      [getPageLocale()?.translateCallback, 'window.components.locale.translateCallback'],
    ];
    for (const [callback, name] of callbacks) {
      if (typeof callback !== 'function') continue;
      const result = runSafely(
        () => (callback as TranslateCallback)({ component: tag, key: `${tag}.${key}`, template: found.template, params: values ?? {}, locale: resolveLocale(options.getLocale?.(), host ?? undefined) }),
        { source: host, message: `${name} threw for "${tag}.${key}" — the next rule decides` },
      );
      if (result.isOk && typeof result.value === 'string') return { template: found.template, text: result.value, source: 'callback' };
    }
    return found;
  };

  const format = (key: keyof L & string, params: LabelParams | undefined, isHtml: boolean, fallback: string | undefined): string => {
    const shouldEscapeAll = isHtml && getPageSecurity()?.shouldEscapeLabels === true;
    const values: LabelParams | undefined = params && isHtml && !shouldEscapeAll ? escapeParams(params) : params;
    let resolved = resolveOne(key, values, fallback);
    let isFromTwin = false;
    if (resolved.source === 'default') {
      for (const sibling of getLabelFallbackKeys(key)) {
        if (!hasKey(defaults, sibling)) continue;
        const twin = resolveOne(sibling, values);
        if (twin.source !== 'default') {
          resolved = twin;
          isFromTwin = true;
          break;
        }
      }
    }
    let out = resolved.text;
    if (out === undefined) {
      // The default display formats numbers for the locale (at any depth: `{ctx.count}`); the callback gets the raw values.
      out = formatLabel(resolved.template, values, (v) =>
        typeof v === 'number' && Number.isFinite(v) ? formatNumber(v, { locale: options.getLocale?.() ?? undefined }) : String(v));
    }
    // A twin may be a content label with markup (`buttons.x: '<b>Next</b>'`); a text use (an aria-label / title)
    // takes its text, never the tags.
    if (isFromTwin && !isHtml) out = htmlToText(out);
    return shouldEscapeAll ? escapeHtml(out) : out;
  };

  return {
    template,
    text: (key, params, options) => format(key, params, false, options?.fallback),
    html: (key, params, options) => format(key, params, true, options?.fallback),
    all: () => {
      const out = {} as Record<string, string>;
      for (const key of Object.keys(defaults)) out[key] = template(key as keyof L & string);
      return out as L;
    },
  };
}
