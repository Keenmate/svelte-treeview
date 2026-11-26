// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetElementSizeObservers, createElementSizeObserver, observeElementSize, type ElementSize } from './element-size.js';

// jsdom has no ResizeObserver and no layout — drive both with controllable mocks.
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly cb: ResizeObserverCallback;
  readonly observed = new Set<Element>();
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    MockResizeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.add(el);
  }
  unobserve(el: Element): void {
    this.observed.delete(el);
  }
  disconnect(): void {
    this.observed.clear();
  }
  /** Test hook: deliver a resize for the given elements (no borderBoxSize → the offset size is read). */
  emit(...els: Element[]): void {
    this.cb(
      els.map((target) => ({ target }) as unknown as ResizeObserverEntry),
      this as unknown as ResizeObserver,
    );
  }
  /** Test hook: deliver one entry carrying a logical `borderBoxSize`, like a real observer. */
  emitBox(target: Element, inlineSize: number, blockSize: number): void {
    this.cb([{ target, borderBoxSize: [{ inlineSize, blockSize }] } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

/** The single shared observer the module created (there is only ever one live). */
function observer(): MockResizeObserver {
  return MockResizeObserver.instances[MockResizeObserver.instances.length - 1]!;
}

/** The element's layout size (offsetWidth / offsetHeight — what core reads without an entry). */
function setSize(el: Element, width: number, height = 100): void {
  Object.defineProperties(el, {
    offsetWidth: { value: width, configurable: true },
    offsetHeight: { value: height, configurable: true },
  });
}

function sized(width: number, height = 100): HTMLElement {
  const el = document.createElement('div');
  setSize(el, width, height);
  return el;
}

beforeEach(() => {
  MockResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  __resetElementSizeObservers();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('observeElementSize', () => {
  it('fires immediately with the current border box, then observes the element', () => {
    const el = sized(800);
    const seen: ElementSize[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size));
    expect(seen).toEqual([{ width: 800, height: 100 }]);
    expect(observer().observed.has(el)).toBe(true);
    unsub();
  });

  it('can opt out of the immediate fire', () => {
    const el = sized(800);
    const cb = vi.fn();
    const unsub = observeElementSize(el, cb, { shouldFireImmediately: false });
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it('fires on a box change (leading edge)', () => {
    const el = sized(800);
    const seen: number[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size.width), { shouldFireImmediately: false });
    setSize(el, 420);
    observer().emit(el);
    expect(seen).toEqual([420]);
    unsub();
  });

  it('throttles a resize burst to one leading + one trailing notify', () => {
    vi.useFakeTimers();
    const el = sized(800);
    const seen: number[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size.width), { shouldFireImmediately: false });
    setSize(el, 600);
    observer().emit(el); // leading — fires now
    setSize(el, 500);
    observer().emit(el); // within 30ms — schedules trailing
    setSize(el, 420);
    observer().emit(el); // within 30ms — coalesced into that trailing
    expect(seen).toEqual([600]);
    vi.advanceTimersByTime(30);
    expect(seen).toEqual([600, 420]); // trailing carries the settled width
    unsub();
  });

  it('dedupes identical consecutive sizes', () => {
    const el = sized(800);
    const cb = vi.fn();
    const unsub = observeElementSize(el, cb); // immediate fire at 800
    cb.mockClear();
    observer().emit(el); // same 800 — no change
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it('throttleMs: 0 disables throttling (every change fires)', () => {
    const el = sized(800);
    const seen: number[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size.width), { shouldFireImmediately: false, throttleMs: 0 });
    setSize(el, 600);
    observer().emit(el);
    setSize(el, 500);
    observer().emit(el);
    expect(seen).toEqual([600, 500]);
    unsub();
  });

  it('shares one observer across elements and fans out per target', () => {
    const a = sized(800);
    const b = sized(300);
    const seenA: number[] = [];
    const seenB: number[] = [];
    const ua = observeElementSize(a, (s) => seenA.push(s.width), { shouldFireImmediately: false });
    const ub = observeElementSize(b, (s) => seenB.push(s.width)); // immediate → baseline 300
    expect(seenB).toEqual([300]);
    expect(MockResizeObserver.instances).toHaveLength(1); // one shared observer
    setSize(a, 420);
    observer().emit(a, b); // one delivery, two targets
    expect(seenA).toEqual([420]);
    expect(seenB).toEqual([300]); // b's size didn't change → deduped against its baseline
    ua();
    ub();
  });

  it('unobserves on unsubscribe and disconnects when the last target leaves', () => {
    const a = sized(800);
    const b = sized(300);
    const ua = observeElementSize(a, () => {}, { shouldFireImmediately: false });
    const ub = observeElementSize(b, () => {}, { shouldFireImmediately: false });
    const ro = observer();
    ua();
    expect(ro.observed.has(a)).toBe(false);
    expect(ro.observed.has(b)).toBe(true); // still watched
    ub();
    expect(ro.observed.size).toBe(0); // disconnected
  });

  it('stops firing after unsubscribe', () => {
    const el = sized(800);
    const cb = vi.fn();
    const unsub = observeElementSize(el, cb, { shouldFireImmediately: false });
    unsub();
    setSize(el, 420);
    // The shared observer was disconnected; a stray emit reaches nobody.
    observer().emit(el);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('SSR / no ResizeObserver', () => {
  it('fires once (0×0 when no layout) and returns a working no-op unsubscribe', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const el = document.createElement('div'); // no getBoundingClientRect stub → 0×0
    const seen: ElementSize[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size));
    expect(seen).toEqual([{ width: 0, height: 0 }]);
    expect(() => unsub()).not.toThrow();
  });
});

// Review V-15: the layout size, not the transformed visual box.
describe('observeElementSize — layout size', () => {
  it('reads the untransformed size: a scaled element reports its real width', () => {
    const el = sized(200, 40);
    el.getBoundingClientRect = () => ({ width: 190, height: 38 }) as DOMRect; // transform: scale(.95)
    const seen: ElementSize[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size), { throttleMs: 0 });
    observer().emitBox(el, 250, 50);
    expect(seen).toEqual([{ width: 200, height: 40 }, { width: 250, height: 50 }]);
    unsub();
  });

  it('maps the logical borderBoxSize back to width / height in a vertical writing mode', () => {
    const el = sized(40, 200);
    el.style.writingMode = 'vertical-rl';
    document.body.appendChild(el);
    const seen: ElementSize[] = [];
    const unsub = observeElementSize(el, (size) => seen.push(size), { throttleMs: 0, shouldFireImmediately: false });
    observer().emitBox(el, 300, 60); // inline axis is vertical here
    expect(seen).toEqual([{ width: 60, height: 300 }]);
    unsub();
    el.remove();
  });

  it('an SVG element (no offset size) falls back to its bounding box', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.getBoundingClientRect = () => ({ width: 64, height: 32 }) as DOMRect;
    const seen: ElementSize[] = [];
    const unsub = observeElementSize(svg, (size) => seen.push(size));
    expect(seen).toEqual([{ width: 64, height: 32 }]);
    unsub();
  });
});

describe('createElementSizeObserver', () => {
  it('one listener for a changing set of elements over the shared observer', () => {
    const a = sized(100);
    const b = sized(200);
    document.body.append(a, b);
    const seen: [Element, number][] = [];
    const set = createElementSizeObserver((size, el) => seen.push([el, size.width]), { throttleMs: 0 });
    set.observe(a);
    set.observe(b);
    set.observe(a); // already watched
    expect(seen).toEqual([[a, 100], [b, 200]]);
    expect(observer().observed.has(a) && observer().observed.has(b)).toBe(true);
    setSize(b, 250);
    observer().emit(b);
    expect(seen.at(-1)).toEqual([b, 250]);
    set.unobserve(a);
    expect(observer().observed.has(a)).toBe(false);
    set.disconnect();
    expect(MockResizeObserver.instances.every((ro) => ro.observed.size === 0)).toBe(true);
    a.remove();
    b.remove();
  });

  it('drops an element that left the page at its next entry', () => {
    const a = sized(100);
    document.body.append(a);
    const cb = vi.fn();
    const set = createElementSizeObserver(cb, { throttleMs: 0, shouldFireImmediately: false });
    set.observe(a);
    a.remove();
    setSize(a, 120);
    observer()?.emit(a);
    expect(cb).not.toHaveBeenCalled();
    set.disconnect();
  });
});
