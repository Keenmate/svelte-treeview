/**
 * Icons are DATA (SPEC §12.33): the page hands a component a string, and every component turned it into markup
 * its own way (web-commandpalette's `renderIcon`, `/menu`'s raw `innerHTML`, web-grid / web-treeview / web-
 * multiselect each their own). One rule, keen-pure-admin's icon resolution plus two steps for string data —
 * first match wins:
 *
 * 1. starts with `<` (an `<svg>`, an `<img>`, an `<i class="fa …">`) → inserted raw — the page vouches for it;
 * 2. a built-in name ({@link BUILT_IN_ICON_NAMES}: `close`, `chevron`, `check`, …) → `<span class="km-icon
 *    <prefix>__icon <prefix>__icon--close">`, a glyph masked from the `--base-icon-<name>` token in `currentColor`.
 *    Reserved: the page-wide hook never sees them (a theme restyles them through the token);
 * 3. the element's own `renderIconCallback(name, ctx)`, then the page-wide `window.components.renderIconCallback` →
 *    markup, or `null` / `undefined` = not mine (the next one decides) — one multiselect needs no page setup;
 * 4. ASCII class names (`fa-solid fa-folder`, `bi-gear`, `material-symbols-outlined`) → `<i class="<prefix>__icon
 *    fa-solid fa-folder" aria-hidden="true">` — an icon font (keen-pure-admin's `<i class={name}>`);
 * 5. anything else (an emoji, a letter in another script) → escaped text.
 *
 * `ICON_CSS` (the `.km-icon` rule) goes into the root the icon renders in (`adoptStyles`).
 */

import { escapeHtml } from './escape-html.js';
import { sharedState } from '../global/shared-state.js';
import { publishPageSetting } from '../global/page-setting.js';
import { callSafely } from '../logging/safe-call.js';

export interface RenderIconOptions {
  /** The component's BEM block: adds `<prefix>__icon` (+ `<prefix>__icon--<name>` on a built-in) to the icon. */
  prefix?: string;
  /**
   * The component host: its `renderIconCallback` is the instance hook, `component` / `element` go into the hooks'
   * context, and a throwing hook is logged through its logger.
   */
  host?: Element | null;
  /**
   * The component name for the hooks' `ctx.component` when the host is not the component's own element (a Svelte /
   * React component renders into a plain `<div>`, whose `localName` says nothing). Default: `host.localName`.
   */
  component?: string;
  /**
   * The instance hook. Omitted → read from `host.renderIconCallback` (the component's input row); pass it explicitly
   * when the component keeps it elsewhere. `null` / `undefined` → no instance hook.
   */
  renderIconCallback?: RenderIconCallback | null;
  /** Component extras for the hooks' context (`{ node }`, `{ item }`), next to `component` / `element` / `prefix`. */
  context?: Readonly<Record<string, unknown>>;
}

/** What a `renderIconCallback` (instance or page-wide) receives next to the name, + the component's extras. */
export interface IconRenderContext {
  [extra: string]: unknown;
  /** The component's name (`'web-multiselect'`): the `component` option, else the host's tag; `''` without either. */
  component: string;
  /** The component host, when the caller passed it. */
  element: Element | null;
  /** The component's BEM block (`'ms'`), when the caller passed it. */
  prefix: string;
}

/**
 * An icon hook (the element's `renderIconCallback` and the page-wide one share it): map an icon name (`'fa delete'`, `'lucide-rocket'`, `'star'`) to markup, or answer
 * `null` / `undefined` for a name that isn't yours (the next rule decides). A string is used as is (`''` = no icon).
 */
export type RenderIconCallback = (name: string, ctx: IconRenderContext) => string | null | undefined;

/**
 * The reserved built-in names — the base-css-variables `--base-icon-*` glyphs. Always masked from their token;
 * no hook sees them. Name another set's icon differently (`'fa-solid fa-xmark'`, not `'close'`).
 */
export const BUILT_IN_ICON_NAMES: readonly string[] = Object.freeze([
  'add', 'bell', 'caret-down', 'caret-up', 'check', 'chevron', 'clear', 'close', 'collapse', 'copy', 'danger',
  'delete', 'download', 'edit', 'ellipsis', 'expand', 'external-link', 'filter', 'indeterminate', 'info', 'link',
  'refresh', 'remove', 'save', 'search', 'settings', 'success', 'user', 'warning',
]);

const BUILT_IN = new Set(BUILT_IN_ICON_NAMES);
const CLASS_LIST = /^[A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z][A-Za-z0-9_-]*)*$/;

// ---------------------------------------------------------------------------
// Page-wide hook: window.components.renderIconCallback (non-enumerable)
// ---------------------------------------------------------------------------

interface IconHookState {
  callback: RenderIconCallback | undefined;
}

/** On globalThis because each component bundles its own core copy. */
const STATE_KEY = '@keenmate/web-components-core:icon';

function state(): IconHookState {
  return sharedState(STATE_KEY, () => ({ callback: undefined }));
}

/**
 * Publish `window.components.renderIconCallback` as a NON-enumerable accessor (a plain property assigned earlier
 * is adopted). Idempotent; SSR-safe. Called by `registerComponent()` and `renderIcon()`.
 */
export function publishIconHook(): void {
  const s = state();
  publishPageSetting('renderIconCallback', {
    get: () => s.callback,
    set: (value: unknown) => {
      s.callback = typeof value === 'function' ? (value as RenderIconCallback) : undefined;
    },
  });
}

function pageHook(): RenderIconCallback | undefined {
  publishIconHook();
  const cb = typeof window !== 'undefined' ? window.components?.renderIconCallback : state().callback;
  return typeof cb === 'function' ? cb : undefined;
}

// ---------------------------------------------------------------------------
// renderIcon
// ---------------------------------------------------------------------------

/** HTML for an icon value; `''` for none. */
export function renderIcon(icon: string | null | undefined, options: RenderIconOptions = {}): string {
  if (icon == null) return '';
  const value = String(icon).trim();
  if (!value) return '';
  if (value.startsWith('<')) return value;
  const prefix = options.prefix ?? '';
  if (BUILT_IN.has(value)) {
    const own = prefix ? ` ${prefix}__icon ${prefix}__icon--${value}` : '';
    return `<span class="km-icon${own}" style="--_km-icon: var(--base-icon-${value}, linear-gradient(transparent 0 0))" aria-hidden="true"></span>`;
  }
  const host = options.host ?? null;
  const own = 'renderIconCallback' in options ? options.renderIconCallback : (host as { renderIconCallback?: unknown } | null)?.renderIconCallback;
  const hooks: Array<[unknown, string]> = [
    [own, 'renderIconCallback'],
    [pageHook(), 'window.components.renderIconCallback'],
  ];
  for (const [hook, name] of hooks) {
    if (typeof hook !== 'function') continue;
    const ctx: IconRenderContext = { ...options.context, component: options.component ?? host?.localName ?? '', element: host, prefix };
    const result = callSafely(() => (hook as RenderIconCallback)(value, ctx), {
      source: host,
      message: `${name} threw for "${value}" — the next rule decides`,
    });
    if (result.isOk && typeof result.value === 'string') return result.value;
  }
  if (CLASS_LIST.test(value)) {
    const own = prefix ? `${prefix}__icon ` : '';
    return `<i class="${own}${value.split(/\s+/).join(' ')}" aria-hidden="true"></i>`;
  }
  return escapeHtml(value);
}

/** The `.km-icon` drawing rule (1em square, `currentColor`, masked). Adopt it where named icons render. */
export const ICON_CSS = `
@layer component {
.km-icon {
  display: inline-block;
  flex: none;
  inline-size: 1em;
  block-size: 1em;
  vertical-align: -0.125em;
  background-color: currentColor;
  -webkit-mask: var(--_km-icon) center / contain no-repeat;
  mask: var(--_km-icon) center / contain no-repeat;
}
@media (forced-colors: active) {
  .km-icon { background-color: CanvasText; forced-color-adjust: none; }
}
}
`;
