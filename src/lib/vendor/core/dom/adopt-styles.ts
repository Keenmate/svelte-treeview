/**
 * Shadow-root style injection (SPEC §12.4). Two primitives for the two CSS
 * shapes every component re-rolls:
 *
 * - {@link adoptStyles} — STATIC, shared stylesheets (the `main.css?inline`
 *   pattern). One `CSSStyleSheet` per unique string, cached and shared across
 *   ALL instances via `adoptedStyleSheets` (that's what constructable sheets are
 *   for); falls back to a `<style>` element where unsupported; SSR-safe.
 * - {@link createStyleSlot} — a PER-INSTANCE, replaceable `<style>` slot (the
 *   `customStylesCallback` pattern: user CSS that changes at runtime). It keeps
 *   ONE element at a consistent position, so re-setting replaces rather than
 *   stacking, fixing the prepend-on-init / append-on-update drift components
 *   have today. `<style>`-based because user CSS may use `@import` (which
 *   constructable stylesheets reject).
 *
 * Core owns the injection mechanism only — the `@layer` order, which file lands
 * in which layer, and the Vite `?inline` import stay authoring concerns governed
 * by the CSS guidelines. These helpers take CSS strings; how you obtained them
 * is your business.
 */

import { sharedState, sharedStateKey } from '../global/shared-state.js';

/**
 * Page-wide (every copy of core shares it — see `shared-state.ts`): one constructable
 * sheet per unique CSS string PER DOCUMENT, and the fallback `<style>` element per root.
 * Per document because a `CSSStyleSheet` can only be adopted into the document whose
 * window constructed it (an iframe needs its own). Shared so a sheet another copy of
 * core already adopted is recognised by identity instead of adopted a second time.
 */
interface AdoptedStylesState {
  sheets: WeakMap<Document, Map<string, CSSStyleSheet>>;
  styleElements: WeakMap<object, Map<string, HTMLStyleElement>>;
  /** Constructable-stylesheet support, probed once per window. */
  isConstructableByWindow: WeakMap<object, boolean>;
}

const state = (): AdoptedStylesState =>
  sharedState(sharedStateKey('adopted-styles@1'), () => ({
    sheets: new WeakMap(),
    styleElements: new WeakMap(),
    isConstructableByWindow: new WeakMap(),
  }));

function documentOf(root: DocumentOrShadowRoot): Document {
  return ((root as unknown as Node).ownerDocument ?? (root as Document)) as Document;
}

/** The window's `CSSStyleSheet` constructor, when that window can construct + adopt sheets. */
function sheetConstructor(root: DocumentOrShadowRoot): typeof CSSStyleSheet | null {
  if (!('adoptedStyleSheets' in root)) return null;
  const view = documentOf(root).defaultView as (Window & { CSSStyleSheet?: typeof CSSStyleSheet }) | null;
  const Ctor = view?.CSSStyleSheet ?? (typeof CSSStyleSheet === 'undefined' ? undefined : CSSStyleSheet);
  if (!Ctor) return null;
  const probes = state().isConstructableByWindow;
  const key = (view ?? globalThis) as object;
  let isConstructable = probes.get(key);
  if (isConstructable === undefined) {
    try {
      new Ctor().replaceSync('');
      isConstructable = true;
    } catch {
      isConstructable = false;
    }
    probes.set(key, isConstructable);
  }
  return isConstructable ? Ctor : null;
}

/**
 * Adopt one or more static stylesheets into `root` (a shadow root or document),
 * sharing one cached `CSSStyleSheet` per unique string across every instance (and
 * every copy of core). Idempotent per root — a string whose sheet the root already
 * has is skipped; one that was dropped meanwhile (the root's `adoptedStyleSheets`
 * reassigned, the fallback `<style>` removed by a re-render) is adopted again.
 * No-op during SSR (`document` absent).
 */
export function adoptStyles(root: DocumentOrShadowRoot, ...cssStrings: string[]): void {
  if (typeof document === 'undefined') return;
  const strings = [...new Set(cssStrings.filter(Boolean))];
  if (strings.length === 0) return;

  const Ctor = sheetConstructor(root);
  if (Ctor) {
    const doc = documentOf(root);
    const byDocument = state().sheets;
    let cache = byDocument.get(doc);
    if (!cache) byDocument.set(doc, (cache = new Map()));
    const current = root.adoptedStyleSheets;
    const missing: CSSStyleSheet[] = [];
    for (const css of strings) {
      let sheet = cache.get(css);
      if (!sheet) {
        sheet = new Ctor();
        sheet.replaceSync(css);
        cache.set(css, sheet);
      }
      if (!current.includes(sheet)) missing.push(sheet);
    }
    if (missing.length > 0) root.adoptedStyleSheets = [...current, ...missing];
    return;
  }

  // Fallback: one <style> per string, re-added if it was removed from the root.
  const byRoot = state().styleElements;
  let elements = byRoot.get(root);
  if (!elements) byRoot.set(root, (elements = new Map()));
  const target: Node = (root as Document).head ?? (root as unknown as Node);
  for (const css of strings) {
    const existing = elements.get(css);
    if (existing && existing.parentNode && (root as unknown as Node).contains(existing)) continue;
    const style = documentOf(root).createElement('style');
    style.textContent = css;
    target.appendChild(style);
    elements.set(css, style);
  }
}

/** @internal Test hook: forget the cached sheets, fallback elements and feature probes. */
export function __resetAdoptedStyles(): void {
  const s = state();
  s.sheets = new WeakMap();
  s.styleElements = new WeakMap();
  s.isConstructableByWindow = new WeakMap();
}

/** A single replaceable `<style>` slot (see {@link createStyleSlot}). */
export interface StyleSlot {
  /** Set the slot's CSS (creating/inserting the element on first non-empty value); falsy clears it. */
  set(css: string | null | undefined): void;
  /** Remove the element from the DOM (a later {@link set} re-inserts it). */
  clear(): void;
  /** Remove the element and drop the reference. */
  destroy(): void;
  /** The `<style>` element while it is in the DOM, else `null`. */
  readonly element: HTMLStyleElement | null;
}

/** Options for {@link createStyleSlot}. */
export interface StyleSlotOptions {
  /**
   * Insert at the start (`'first'`) or end (`'last'`) of the root. Default `'last'`: it wins
   * over the root's other `<style>` elements — but adopted stylesheets (`adoptStyles`) always
   * cascade after every `<style>`, so beat those with `@layer` or specificity.
   */
  position?: 'first' | 'last';
  /** Optional class on the `<style>` element (e.g. for debugging / removal). */
  cssClass?: string;
}

/**
 * Create a per-instance, replaceable style slot in `root`. Backs the
 * `customStylesCallback` pattern: call the callback, `slot.set(result)`; on the
 * next value, `set` again — the same element is reused at the same position, so
 * there is no stacking or prepend/append inconsistency. No-op during SSR.
 */
export function createStyleSlot(
  root: ShadowRoot | Document | HTMLElement,
  opts: StyleSlotOptions = {},
): StyleSlot {
  const position = opts.position ?? 'last';
  const target: Node = (root as Document).head ?? root;
  let element: HTMLStyleElement | null = null;

  const ensureInserted = (): HTMLStyleElement | null => {
    if (typeof document === 'undefined') return null;
    if (!element) {
      element = document.createElement('style');
      if (opts.cssClass) element.className = opts.cssClass;
    }
    if (element.parentNode !== target) {
      if (position === 'first' && target.firstChild) target.insertBefore(element, target.firstChild);
      else target.appendChild(element);
    }
    return element;
  };

  const clear = (): void => {
    element?.remove();
  };

  return {
    set(css) {
      if (!css) {
        clear();
        return;
      }
      const el = ensureInserted();
      if (el) el.textContent = css;
    },
    clear,
    destroy() {
      element?.remove();
      element = null;
    },
    get element() {
      return element?.parentNode ? element : null;
    },
  };
}
