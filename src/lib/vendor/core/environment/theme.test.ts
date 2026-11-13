// @vitest-environment jsdom
// Vendored from core minus the trailing BlissElement-integration block (no BlissElement here;
// svelte-treeview's own wiring is covered by e2e/theme-context.spec.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTheme,
  getThemeContext,
  getThemeMode,
  observeThemeContext,
  readThemeSignal,
  resolveThemeSource,
  setThemeMode,
  type ColorScheme,
} from './theme.js';

// MutationObserver callbacks run as microtasks.
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const html = (): HTMLElement => document.documentElement;

function host(parent: Element = document.body): HTMLElement {
  const el = document.createElement('div');
  parent.appendChild(el);
  return el;
}

/** Record every scheme a subscription delivers. */
function record(el: Element, source?: Parameters<typeof observeThemeContext>[1]) {
  const seen: (ColorScheme | null)[] = [];
  const unsub = observeThemeContext(el, source, (s) => seen.push(s));
  return { seen, unsub };
}

/** Count MutationObserver constructions (jsdom's is a class, so it can't be spied). */
function countObservers(): { readonly count: number } {
  const Original = globalThis.MutationObserver;
  let count = 0;
  class Counting extends Original {
    constructor(cb: MutationCallback) {
      super(cb);
      count += 1;
    }
  }
  vi.stubGlobal('MutationObserver', Counting);
  return {
    get count() {
      return count;
    },
  };
}

function resetPage(): void {
  for (const el of [html(), document.body]) {
    el.removeAttribute('class');
    el.removeAttribute('data-theme');
    el.removeAttribute('data-bs-theme');
  }
  document.body.innerHTML = '';
}

beforeEach(() => {
  __resetTheme();
  resetPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetTheme();
  vi.unstubAllGlobals();
  resetPage();
});

describe('readThemeSignal', () => {
  it('reads data-theme, then data-bs-theme, then a .dark / .light class', () => {
    const el = document.createElement('div');
    expect(readThemeSignal(el)).toBeNull();
    el.classList.add('dark');
    expect(readThemeSignal(el)).toBe('dark');
    el.setAttribute('data-bs-theme', 'light');
    expect(readThemeSignal(el)).toBe('light');
    el.setAttribute('data-theme', 'dark');
    expect(readThemeSignal(el)).toBe('dark');
  });

  it('ignores named themes that are not a scheme and falls through', () => {
    const el = document.createElement('div');
    el.setAttribute('data-theme', 'corporate');
    el.classList.add('dark');
    expect(readThemeSignal(el)).toBe('dark');
  });
});

describe('page detection', () => {
  it('reads <html> first, then <body>', () => {
    document.body.classList.add('dark');
    expect(getThemeContext()).toBe('dark');
    html().setAttribute('data-theme', 'light');
    expect(getThemeContext()).toBe('light');
  });

  it('delivers the current scheme immediately and then only on change', async () => {
    html().classList.add('dark');
    const { seen } = record(host());
    expect(seen).toEqual(['dark']);

    html().classList.add('unrelated'); // same result: no notification
    await tick();
    expect(seen).toEqual(['dark']);

    html().classList.remove('dark');
    await tick();
    expect(seen).toEqual(['dark', null]);

    html().setAttribute('data-bs-theme', 'dark');
    await tick();
    expect(seen).toEqual(['dark', null, 'dark']);
  });

  it('a throwing listener is logged and the others still hear the flip', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    observeThemeContext(host(), undefined, (scheme) => {
      if (scheme === 'dark') throw new Error('boom');
    });
    const { seen } = record(host());
    html().classList.add('dark');
    await tick();
    expect(seen).toEqual([null, 'dark']);
    expect(error.mock.calls.flat().join(' ')).toContain('theme listener threw');
  });

  it('uses ONE observer for every page subscriber (detect once, reuse)', () => {
    const observers = countObservers();
    const subs = Array.from({ length: 50 }, () => record(host()));
    expect(observers.count).toBe(1);
    for (const s of subs) s.unsub();
  });

  it('stops observing when the last subscriber leaves', async () => {
    const a = record(host());
    const b = record(host());
    a.unsub();
    b.unsub();
    html().classList.add('dark');
    await tick();
    expect(a.seen).toEqual([null]);
    expect(b.seen).toEqual([null]);
  });

  it('re-attaches to a swapped <body> (Turbo / htmx navigation)', async () => {
    const { seen } = record(host());
    const fresh = document.createElement('body');
    html().replaceChild(fresh, document.body);
    await tick();
    fresh.classList.add('dark');
    await tick();
    expect(seen).toEqual([null, 'dark']);
  });
});

describe('setThemeMode', () => {
  it('forces every subscriber and pauses detection; auto re-detects', async () => {
    const { seen } = record(host());
    setThemeMode('dark');
    expect(getThemeMode()).toBe('dark');
    expect(seen).toEqual([null, 'dark']);

    html().classList.add('light'); // ignored while forced
    await tick();
    expect(seen).toEqual([null, 'dark']);

    setThemeMode('auto');
    expect(seen).toEqual([null, 'dark', 'light']);
  });

  it('pausing and resuming reuses the same observer', async () => {
    const observers = countObservers();
    const { seen } = record(host());
    for (let i = 0; i < 5; i++) {
      setThemeMode('dark');
      setThemeMode('auto');
    }
    expect(observers.count).toBe(1);

    html().classList.add('light'); // the re-attached observer still works
    await tick();
    expect(seen.at(-1)).toBe('light');
  });

  it('beats a theme-source element', () => {
    const panel = document.createElement('section');
    panel.classList.add('panel', 'dark');
    document.body.appendChild(panel);
    const { seen } = record(host(panel), '.panel');
    setThemeMode('light');
    expect(seen).toEqual(['dark', 'light']);
  });

  it('warns and ignores an unknown mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setThemeMode('sepia' as never);
    expect(getThemeMode()).toBe('auto');
    expect(warn).toHaveBeenCalled();
  });
});

describe('theme-source', () => {
  it('a selector resolves to the nearest matching ancestor', async () => {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.setAttribute('data-bs-theme', 'dark');
    document.body.appendChild(panel);
    const { seen } = record(host(panel), '.panel');
    expect(seen).toEqual(['dark']);

    panel.setAttribute('data-bs-theme', 'light');
    await tick();
    expect(seen).toEqual(['dark', 'light']);
  });

  it('a selector falls back to the first match in the document', () => {
    const panel = document.createElement('aside');
    panel.id = 'theme-root';
    panel.classList.add('dark');
    document.body.appendChild(panel);
    expect(record(host(), '#theme-root').seen).toEqual(['dark']);
  });

  it('"closest" finds the nearest ancestor that carries a signal', () => {
    const outer = document.createElement('div');
    outer.classList.add('light');
    const inner = document.createElement('div');
    inner.setAttribute('data-theme', 'dark');
    outer.appendChild(inner);
    document.body.appendChild(outer);
    const el = host(inner);
    expect(resolveThemeSource(el, 'closest')).toBe(inner);
    expect(record(el, 'closest').seen).toEqual(['dark']);
  });

  describe('"closest" follows ancestors that gain or lose a signal', () => {
    it('a section switched to dark later wins over the page (TH01: no signal at connect)', async () => {
      html().setAttribute('data-theme', 'light');
      const section = document.createElement('section');
      document.body.appendChild(section);
      const { seen } = record(host(section), 'closest');
      expect(seen).toEqual(['light']); // the page, for now

      section.setAttribute('data-theme', 'dark');
      await tick();
      expect(seen).toEqual(['light', 'dark']);
      section.setAttribute('data-theme', 'light');
      await tick();
      expect(seen).toEqual(['light', 'dark', 'light']); // the section is now the watched source
    });

    it('a nearer ancestor gaining a signal takes over; losing it hands back to the farther one', async () => {
      const outer = document.createElement('div');
      outer.classList.add('dark');
      const inner = document.createElement('div');
      outer.appendChild(inner);
      document.body.appendChild(outer);
      const { seen } = record(host(inner), 'closest');
      expect(seen).toEqual(['dark']);

      inner.setAttribute('data-bs-theme', 'light');
      await tick();
      expect(seen).toEqual(['dark', 'light']);
      inner.removeAttribute('data-bs-theme'); // not the page: the outer section again
      await tick();
      expect(seen).toEqual(['dark', 'light', 'dark']);
    });

    it('works across a shadow root, with one shared observer for many subscribers', async () => {
      const counter = countObservers();
      const section = document.createElement('div');
      const shadowHost = document.createElement('div');
      section.appendChild(shadowHost);
      document.body.appendChild(section);
      const root = shadowHost.attachShadow({ mode: 'open' });
      const a = record(host(root as unknown as Element), 'closest');
      const b = record(host(root as unknown as Element), 'closest');
      const before = counter.count;

      section.classList.add('dark');
      await tick();
      expect(a.seen.at(-1)).toBe('dark');
      expect(b.seen.at(-1)).toBe('dark');
      // the ancestors share one observer; the section's own watch adds one when it becomes a source
      expect(counter.count - before).toBeLessThanOrEqual(1);
    });

    it('pauses while a mode is forced and catches up on auto; unsubscribing stops it', async () => {
      const section = document.createElement('section');
      document.body.appendChild(section);
      const { seen, unsub } = record(host(section), 'closest');
      setThemeMode('light');
      section.setAttribute('data-theme', 'dark'); // changed while paused
      await tick();
      expect(seen.at(-1)).toBe('light');
      setThemeMode('auto');
      expect(seen.at(-1)).toBe('dark');

      unsub();
      section.setAttribute('data-theme', 'light');
      await tick();
      expect(seen.at(-1)).toBe('dark');
    });
  });

  it('walks out of shadow roots', () => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('dark');
    const shadowHost = document.createElement('div');
    wrapper.appendChild(shadowHost);
    document.body.appendChild(wrapper);
    const root = shadowHost.attachShadow({ mode: 'open' });
    const el = document.createElement('div');
    root.appendChild(el);
    expect(resolveThemeSource(el, 'closest')).toBe(wrapper);
  });

  it('accepts an Element', () => {
    const panel = document.createElement('div');
    panel.classList.add('dark');
    document.body.appendChild(panel);
    expect(record(host(), panel).seen).toEqual(['dark']);
  });

  it('a source without a signal falls back to the page', async () => {
    html().classList.add('dark');
    const panel = document.createElement('div');
    panel.className = 'panel';
    document.body.appendChild(panel);
    const { seen } = record(host(panel), '.panel');
    expect(seen).toEqual(['dark']);
    panel.classList.add('light');
    await tick();
    expect(seen).toEqual(['dark', 'light']);
  });

  it('<html> / <body> as a source share the page watch', () => {
    const observers = countObservers();
    expect(resolveThemeSource(host(), 'body')).toBeNull();
    record(host(), 'html');
    record(host());
    expect(observers.count).toBe(1);
  });

  it('subscribers of one source share one observer', () => {
    const panel = document.createElement('div');
    panel.className = 'panel dark';
    document.body.appendChild(panel);
    const observers = countObservers();
    record(host(panel), '.panel');
    record(host(panel), '.panel');
    record(host(panel), '.panel');
    expect(observers.count).toBe(2); // the page + this source
  });

  it('an invalid selector warns and uses the page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveThemeSource(host(), '[[nope')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe('shared state', () => {
  it('lives on globalThis so separate copies of core share it', () => {
    setThemeMode('dark');
    const key = Symbol.for('@keenmate/web-components-core/theme@1');
    const shared = (globalThis as unknown as Record<symbol, { mode: string }>)[key];
    expect(shared?.mode).toBe('dark');
  });
});

