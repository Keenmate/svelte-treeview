/**
 * UI strings (SPEC §12.24, rulebook D-NC-24): one seam every component resolves its texts through.
 *
 * Keys are flat `<elementType>.<name>` (`buttons.add`, `tooltips.clearAll`); the FULL key prefixes the
 * component name: `web-grid.buttons.add`. Per key: the instance `labels` (short key, or the full key — a
 * string, `''` included, wins) → the page-wide flat dictionary `window.components.locale.labels['<full key>']`
 * → the component's built-in English default. An `ariaLabels.x` / `tooltips.x` nobody set takes a customized
 * sibling with the same `<name>` first (`buttons.x`, `labels.x`, … — {@link getLabelSiblings}). A key the instance set is formatted as is (`{name}`); any other
 * goes to the element's own `translateCallback`, then `window.components.locale.translateCallback` (i18next / ICU /
 * the app's own lookup — one element needs no page setup; each gets the
 * full key, the resolved template and the RAW params; `null` / `undefined` = "not mine"), else the default
 * `{name}` replacement — a NUMBER param is shown through `formatNumber` (the resolved locale and separators:
 * `12 345` in Czech). Pass a string for a number that mustn't be grouped (a year, an id). Then escaping:
 *
 * - {@link Labels.text} — for `textContent` / attributes: nothing is escaped (text can't inject).
 * - {@link Labels.html} — for `innerHTML`: with `window.components.security.shouldEscapeLabels`
 *   off (default) the template is HTML and the placeholder VALUES are escaped (they are data — a
 *   typed value, a file name); on, the finished label is escaped as a whole.
 */

import { escapeHtml } from '../dom/escape-html.js';
import { callSafely } from '../logging/safe-call.js';
import { getPageLocale, getPageSecurity, type TranslateCallback } from './page-locale.js';
import { resolveLocale } from './settings.js';
import { formatNumber } from './numbers.js';

export type LabelParams = Readonly<Record<string, unknown>>;

export interface Labels<L extends object> {
  /** The resolved template for `key` (unformatted). */
  template(key: keyof L & string): string;
  /** Formatted, NOT escaped — for `textContent`, `aria-label`, `title`, `placeholder`. */
  text(key: keyof L & string, params?: LabelParams): string;
  /** Formatted for `innerHTML` (escaping per `window.components.security.shouldEscapeLabels`). */
  html(key: keyof L & string, params?: LabelParams): string;
  /** Every resolved template — for a renderer that takes a labels object. */
  all(): L;
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

/** `{name}` → `params.name`; an unknown placeholder stays as written. */
export function formatLabel(template: string, params?: LabelParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name] ?? '') : match));
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
export function getLabelSiblings(key: string): string[] {
  const dot = key.indexOf('.');
  if (dot < 0) return [];
  const types = SIBLINGS[key.slice(0, dot)];
  return types ? types.map((type) => `${type}${key.slice(dot)}`) : [];
}

function lookup<L extends object>(tag: string, defaults: L, own: OwnLabels<L>, key: string): { template: string; source: LabelSource } {
  const full = `${tag}.${key}`;
  const mine = (own as Record<string, unknown> | null | undefined)?.[key] ?? (own as Record<string, unknown> | null | undefined)?.[full];
  if (typeof mine === 'string') return { template: mine, source: 'instance' };
  const page = getPageLocale()?.labels?.[full];
  if (typeof page === 'string') return { template: page, source: 'page' };
  const fallback = (defaults as Record<string, unknown>)[key];
  return { template: typeof fallback === 'string' ? fallback : '', source: 'default' };
}

const hasKey = (defaults: object, key: string): boolean => Object.prototype.hasOwnProperty.call(defaults, key);

/**
 * Resolve `key` (short: `buttons.add`): `own[key]` / `own['<tag>.<key>']` → page-wide `labels['<tag>.<key>']`
 * → a customized sibling (`ariaLabels.x` / `tooltips.x` only, {@link getLabelSiblings}) → `defaults[key]`. A string
 * wins (`''` is a deliberate empty label); anything else falls through.
 */
export function resolveLabel<L extends object>(tag: string, defaults: L, own: OwnLabels<L>, key: keyof L & string): string {
  const found = lookup(tag, defaults, own, key);
  if (found.source !== 'default') return found.template;
  for (const sibling of getLabelSiblings(key)) {
    if (!hasKey(defaults, sibling)) continue;
    const twin = lookup(tag, defaults, own, sibling);
    if (twin.source !== 'default') return twin.template;
  }
  return found.template;
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
 */
export function createLabels<L extends object>(
  host: Element,
  defaults: L,
  getOwn: () => OwnLabels<L>,
  options: CreateLabelsOptions = {},
): Labels<L> {
  const tag = options.tag ?? host.localName;
  const own = (): OwnLabels<L> => {
    const value = getOwn();
    return value && typeof value === 'object' ? value : null;
  };
  const template = (key: keyof L & string): string => resolveLabel(tag, defaults, own(), key);

  /**
   * One key, without the sibling fallback: the instance text (a template, never sent to a callback) → the
   * element's `translateCallback` → the page-wide one (a finished text) → the page dictionary → the built-in
   * default (`source: 'default'`).
   */
  const resolveOne = (key: string, values: LabelParams | undefined): { template: string; text?: string; source: LabelSource | 'callback' } => {
    const found = lookup(tag, defaults, own(), key);
    if (found.source === 'instance') return found; // written for this element: the app dictionary must not overwrite it
    const ownCallback = options.getTranslateCallback ? options.getTranslateCallback() : (host as { translateCallback?: unknown }).translateCallback;
    const callbacks: Array<[unknown, string]> = [
      [ownCallback, 'translateCallback'],
      [getPageLocale()?.translateCallback, 'window.components.locale.translateCallback'],
    ];
    for (const [callback, name] of callbacks) {
      if (typeof callback !== 'function') continue;
      const result = callSafely(
        () => (callback as TranslateCallback)({ component: tag, key: `${tag}.${key}`, template: found.template, params: values ?? {}, locale: resolveLocale(options.getLocale?.(), host) }),
        { source: host, message: `${name} threw for "${tag}.${key}" — the next rule decides` },
      );
      if (result.isOk && typeof result.value === 'string') return { template: found.template, text: result.value, source: 'callback' };
    }
    return found;
  };

  const format = (key: keyof L & string, params: LabelParams | undefined, isHtml: boolean): string => {
    const shouldEscapeAll = isHtml && getPageSecurity()?.shouldEscapeLabels === true;
    const values: LabelParams | undefined =
      params && isHtml && !shouldEscapeAll
        ? Object.fromEntries(Object.entries(params).map(([name, v]) => [name, typeof v === 'string' ? escapeHtml(v) : v]))
        : params;
    let resolved = resolveOne(key, values);
    if (resolved.source === 'default') {
      for (const sibling of getLabelSiblings(key)) {
        if (!hasKey(defaults, sibling)) continue;
        const twin = resolveOne(sibling, values);
        if (twin.source !== 'default') {
          resolved = twin;
          break;
        }
      }
    }
    let out = resolved.text;
    if (out === undefined) {
      // The default display formats numbers for the locale; the callback gets the raw values.
      const shown = values
        ? Object.fromEntries(
            Object.entries(values).map(([name, v]) => [name, typeof v === 'number' && Number.isFinite(v) ? formatNumber(v, { locale: options.getLocale?.() ?? undefined }) : v]),
          )
        : values;
      out = formatLabel(resolved.template, shown);
    }
    return shouldEscapeAll ? escapeHtml(out) : out;
  };

  return {
    template,
    text: (key, params) => format(key, params, false),
    html: (key, params) => format(key, params, true),
    all: () => {
      const out = {} as Record<string, string>;
      for (const key of Object.keys(defaults)) out[key] = template(key as keyof L & string);
      return out as L;
    },
  };
}
