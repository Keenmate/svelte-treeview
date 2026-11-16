// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetAdoptedStyles, adoptStyles, createStyleSlot } from './adopt-styles.js';

// jsdom has no constructable-stylesheet support, so these exercise the <style>
// fallback path (the observable behavior is identical either way).

function shadow(): ShadowRoot {
  const host = document.createElement('div');
  document.body.append(host);
  return host.attachShadow({ mode: 'open' });
}

afterEach(() => document.body.replaceChildren());

describe('adoptStyles', () => {
  it('injects the CSS into the root', () => {
    const root = shadow();
    adoptStyles(root, '.a { color: red }');
    const styles = root.querySelectorAll('style');
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toBe('.a { color: red }');
  });

  it('adopts multiple sheets in one call', () => {
    const root = shadow();
    adoptStyles(root, '.a {}', '.b {}');
    expect([...root.querySelectorAll('style')].map((s) => s.textContent)).toEqual(['.a {}', '.b {}']);
  });

  it('is idempotent — re-adopting the same string is a no-op', () => {
    const root = shadow();
    adoptStyles(root, '.a {}');
    adoptStyles(root, '.a {}'); // duplicate
    adoptStyles(root, '.a {}', '.b {}'); // .a dedup, .b new
    expect([...root.querySelectorAll('style')].map((s) => s.textContent)).toEqual(['.a {}', '.b {}']);
  });

  it('tracks dedup per root, not globally', () => {
    const a = shadow();
    const b = shadow();
    adoptStyles(a, '.x {}');
    adoptStyles(b, '.x {}'); // different root → still injected
    expect(a.querySelectorAll('style')).toHaveLength(1);
    expect(b.querySelectorAll('style')).toHaveLength(1);
  });

  it('ignores empty strings', () => {
    const root = shadow();
    adoptStyles(root, '', '.a {}');
    expect(root.querySelectorAll('style')).toHaveLength(1);
  });
});

// Review D-03 / D-19 / D-29.
describe('adoptStyles — re-adoption and the constructable path', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetAdoptedStyles();
  });

  it('fallback: a <style> removed by a re-render is added again', () => {
    const root = shadow();
    adoptStyles(root, '.a {}');
    root.replaceChildren(); // the component re-rendered its shadow root
    adoptStyles(root, '.a {}');
    expect(root.querySelectorAll('style')).toHaveLength(1);
  });

  /** A minimal constructable sheet + an adoptedStyleSheets slot on the root (jsdom has neither). */
  function constructableRoot(): ShadowRoot & { adoptedStyleSheets: CSSStyleSheet[] } {
    class FakeSheet {
      css = '';
      replaceSync(css: string): void {
        this.css = css;
      }
    }
    vi.stubGlobal('CSSStyleSheet', FakeSheet);
    const root = shadow() as ShadowRoot & { adoptedStyleSheets: CSSStyleSheet[] };
    Object.defineProperty(root, 'adoptedStyleSheets', { value: [], writable: true, configurable: true });
    return root;
  }

  it('constructable: one sheet object shared by two roots, appended after existing sheets', () => {
    const a = constructableRoot();
    const b = shadow() as ShadowRoot & { adoptedStyleSheets: CSSStyleSheet[] };
    Object.defineProperty(b, 'adoptedStyleSheets', { value: [], writable: true, configurable: true });
    const own = new CSSStyleSheet();
    a.adoptedStyleSheets = [own];
    adoptStyles(a, '.x {}');
    adoptStyles(b, '.x {}');
    expect(a.adoptedStyleSheets).toHaveLength(2);
    expect(a.adoptedStyleSheets[0]).toBe(own);
    expect(a.adoptedStyleSheets[1]).toBe(b.adoptedStyleSheets[0]);
    expect(a.querySelectorAll('style')).toHaveLength(0);
  });

  it('constructable: idempotent, and re-adopts after the list was reassigned', () => {
    const root = constructableRoot();
    adoptStyles(root, '.x {}');
    adoptStyles(root, '.x {}');
    expect(root.adoptedStyleSheets).toHaveLength(1);
    root.adoptedStyleSheets = []; // the component replaced its sheets
    adoptStyles(root, '.x {}');
    expect(root.adoptedStyleSheets).toHaveLength(1);
  });

  it('constructable: another copy of core reuses the same sheet instead of adopting it twice', async () => {
    const root = constructableRoot();
    adoptStyles(root, '.motion {}');
    vi.resetModules();
    const other = await import('./adopt-styles.js'); // a second module instance = another bundle
    expect(other.adoptStyles).not.toBe(adoptStyles);
    other.adoptStyles(root, '.motion {}');
    expect(root.adoptedStyleSheets).toHaveLength(1);
  });
});

describe('createStyleSlot', () => {
  it('creates one element on first set and replaces content on the next', () => {
    const root = shadow();
    const slot = createStyleSlot(root);
    slot.set('.a { color: red }');
    slot.set('.a { color: blue }'); // replaces — no stacking
    const styles = root.querySelectorAll('style');
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toBe('.a { color: blue }');
  });

  it('falsy value clears the element; a later set re-inserts it', () => {
    const root = shadow();
    const slot = createStyleSlot(root);
    slot.set('.a {}');
    expect(root.querySelectorAll('style')).toHaveLength(1);
    slot.set(null);
    expect(root.querySelectorAll('style')).toHaveLength(0);
    slot.set('.b {}');
    expect([...root.querySelectorAll('style')].map((s) => s.textContent)).toEqual(['.b {}']);
  });

  it("position 'first' inserts before existing content, 'last' appends", () => {
    const first = shadow();
    first.append(document.createElement('span'));
    createStyleSlot(first, { position: 'first' }).set('.a {}');
    expect(first.firstElementChild!.tagName).toBe('STYLE');

    const last = shadow();
    last.append(document.createElement('span'));
    createStyleSlot(last, { position: 'last' }).set('.a {}');
    expect(last.lastElementChild!.tagName).toBe('STYLE');
  });

  it('applies cssClass and destroy removes the element', () => {
    const root = shadow();
    const slot = createStyleSlot(root, { cssClass: 'ms-custom-styles' });
    slot.set('.a {}');
    expect(root.querySelector('style')!.className).toBe('ms-custom-styles');
    slot.destroy();
    expect(root.querySelectorAll('style')).toHaveLength(0);
  });
});
