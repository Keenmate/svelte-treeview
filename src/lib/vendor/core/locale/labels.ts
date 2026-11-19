/**
 * UI strings (SPEC §12.24, rulebook D-NC-24): one seam every component resolves its texts through.
 *
 * Per key: the instance `labels` (partial; a string — `''` included — wins) → the page-wide
 * `window.components.locale.labels[tag]` → the component's built-in English default. Then
 * formatting: `window.components.locale.formatLabelCallback` (ICU / FormatJS / i18next) or the
 * default `{name}` replacement. Then escaping:
 *
 * - {@link Labels.text} — for `textContent` / attributes: nothing is escaped (text can't inject).
 * - {@link Labels.html} — for `innerHTML`: with `window.components.security.shouldEscapeLabels`
 *   off (default) the template is HTML and the placeholder VALUES are escaped (they are data — a
 *   typed value, a file name); on, the finished label is escaped as a whole.
 */

import { escapeHtml } from '../dom/escape-html.js';
import { callSafely } from '../logging/safe-call.js';
import { getPageLocale, getPageSecurity } from './page-locale.js';
import { resolveLocale } from './settings.js';

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
  /** The component tag the page-wide labels are keyed by (default: the host's `localName`). */
  tag?: string;
  /** The element's own locale (its `locale` input), for `formatLabelCallback`'s `ctx.locale`. */
  getLocale?: () => string | null | undefined;
}

/** `{name}` → `params.name`; an unknown placeholder stays as written. */
export function formatLabel(template: string, params?: LabelParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name] ?? '') : match));
}

/**
 * Resolve `key`: `own[key]` → page-wide `labels[tag][key]` → `defaults[key]`. A string wins (`''` is a
 * deliberate empty label); anything else falls through.
 */
export function resolveLabel<L extends object>(tag: string, defaults: L, own: Partial<L> | null | undefined, key: keyof L & string): string {
  const mine = own?.[key];
  if (typeof mine === 'string') return mine;
  const page = getPageLocale()?.labels?.[tag]?.[key];
  if (typeof page === 'string') return page;
  const fallback = defaults[key];
  return typeof fallback === 'string' ? fallback : '';
}

/**
 * The labels of one component instance. `getOwn` reads the instance `labels` input on every call, so
 * a changed input or page-wide object is picked up by the next render (re-render on
 * `localeChanged()` / a `labels` update).
 *
 * ```ts
 * #labels = createLabels(this, DEFAULT_LABELS, () => this.config.labels, { getLocale: () => this.config.locale });
 * button.setAttribute('aria-label', this.#labels.text('cancelFile', { name: file.name }));
 * row.innerHTML = this.#labels.html('addNew', { value: typed });
 * ```
 */
export function createLabels<L extends object>(
  host: Element,
  defaults: L,
  getOwn: () => Partial<L> | null | undefined,
  options: CreateLabelsOptions = {},
): Labels<L> {
  const tag = options.tag ?? host.localName;
  const own = (): Partial<L> | null | undefined => {
    const value = getOwn();
    return value && typeof value === 'object' ? value : null;
  };
  const template = (key: keyof L & string): string => resolveLabel(tag, defaults, own(), key);

  const format = (key: keyof L & string, params: LabelParams | undefined, isHtml: boolean): string => {
    const raw = template(key);
    const shouldEscapeAll = isHtml && getPageSecurity()?.shouldEscapeLabels === true;
    const values: LabelParams | undefined =
      params && isHtml && !shouldEscapeAll
        ? Object.fromEntries(Object.entries(params).map(([name, v]) => [name, typeof v === 'string' ? escapeHtml(v) : v]))
        : params;
    const callback = getPageLocale()?.formatLabelCallback;
    let out = formatLabel(raw, values);
    if (typeof callback === 'function') {
      const result = callSafely(
        () => callback({ component: tag, key, template: raw, params: values ?? {}, locale: resolveLocale(options.getLocale?.(), host) }),
        { source: host, message: `formatLabelCallback threw for "${tag}.${key}" — using the default formatting` },
      );
      if (result.isOk && typeof result.value === 'string') out = result.value;
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
