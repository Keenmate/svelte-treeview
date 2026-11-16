// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateOut, EXIT_HEIGHT_VAR, readAnimationMs } from './animate-out.js';

/** jsdom has no animations: fake the computed animation longhands per element. */
function fakeAnimation(styles: Map<Element, Partial<Record<'animationName' | 'animationDuration' | 'animationDelay', string>>>): void {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
    const fake = styles.get(el);
    if (!fake) return real(el);
    return { animationName: 'none', animationDuration: '0s', animationDelay: '0s', ...fake } as CSSStyleDeclaration;
  });
}

const div = (): HTMLDivElement => document.body.appendChild(document.createElement('div'));
const end = (el: Element): void => void el.dispatchEvent(new Event('animationend', { bubbles: true }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('readAnimationMs', () => {
  it('is 0 with no animation, or a 0s duration (motion off)', () => {
    const a = div();
    const b = div();
    fakeAnimation(new Map([[b, { animationName: 'fade', animationDuration: '0s' }]]));
    expect(readAnimationMs(a)).toBe(0);
    expect(readAnimationMs(b)).toBe(0);
  });

  it('reads s / ms and adds the delay', () => {
    const a = div();
    const b = div();
    fakeAnimation(new Map([
      [a, { animationName: 'fade', animationDuration: '0.25s' }],
      [b, { animationName: 'fade', animationDuration: '150ms', animationDelay: '0.1s' }],
    ]));
    expect(readAnimationMs(a)).toBe(250);
    expect(readAnimationMs(b)).toBe(250);
  });

  it('takes the longest of several animations, skipping none, repeating a shorter list', () => {
    const a = div();
    fakeAnimation(new Map([[a, { animationName: 'none, fade, slide', animationDuration: '1s, 0.15s, 0.25s', animationDelay: '0.05s' }]]));
    expect(readAnimationMs(a)).toBe(300); // slide: 0.25s + 0.05s (the one delay repeats)
  });
});

describe('animateOut', () => {
  it('with no animation: class + inert on, onDone at once, inert put back, finished true', async () => {
    const el = div();
    let inertDuringDone: boolean | undefined;
    const onDone = vi.fn(() => (inertDuringDone = el.inert));
    const handle = animateOut(el, { className: 'x--closing', onDone });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(inertDuringDone).toBe(true); // still inert while onDone runs
    expect(el.classList.contains('x--closing')).toBe(true); // stays: the caller removes / resets
    expect(el.inert).toBe(false);
    await expect(handle.finished).resolves.toBe(true);
  });

  it('waits for the OWN animationend of every animating element (a child event does not count)', async () => {
    const a = div();
    const b = div();
    const child = a.appendChild(document.createElement('span'));
    fakeAnimation(new Map([
      [a, { animationName: 'out', animationDuration: '0.2s' }],
      [b, { animationName: 'out', animationDuration: '0.2s' }],
    ]));
    const onDone = vi.fn();
    const handle = animateOut([a, b], { className: 'x--closing', onDone });
    end(child);
    end(a);
    expect(onDone).not.toHaveBeenCalled();
    end(b);
    expect(onDone).toHaveBeenCalledTimes(1);
    end(b); // a late event changes nothing
    expect(onDone).toHaveBeenCalledTimes(1);
    await expect(handle.finished).resolves.toBe(true);
  });

  it('gives up waiting after the longest duration + 50ms (no animationend: hidden tab)', () => {
    vi.useFakeTimers();
    const el = div();
    fakeAnimation(new Map([[el, { animationName: 'out', animationDuration: '0.2s' }]]));
    const onDone = vi.fn();
    animateOut(el, { className: 'x--closing', onDone });
    vi.advanceTimersByTime(249);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('cancel(): class, inert and height var come off, onDone never runs, finished false', async () => {
    vi.useFakeTimers();
    const el = div();
    el.inert = false;
    fakeAnimation(new Map([[el, { animationName: 'out', animationDuration: '0.2s' }]]));
    const onDone = vi.fn();
    const handle = animateOut(el, { className: 'x--closing', onDone, shouldSetHeightVar: true });
    expect(el.style.getPropertyValue(EXIT_HEIGHT_VAR)).toBe('0px'); // jsdom: no layout
    handle.cancel();
    expect(el.classList.contains('x--closing')).toBe(false);
    expect(el.inert).toBe(false);
    expect(el.style.getPropertyValue(EXIT_HEIGHT_VAR)).toBe('');
    end(el);
    vi.advanceTimersByTime(1000);
    expect(onDone).not.toHaveBeenCalled();
    await expect(handle.finished).resolves.toBe(false);
    handle.cancel(); // idempotent
  });

  it('shouldSetHeightVar writes each measured height before the class goes on', () => {
    const el = div();
    el.getBoundingClientRect = () => new DOMRect(0, 0, 100, 32);
    let heightAtClass = '';
    const add = el.classList.add.bind(el.classList);
    vi.spyOn(el.classList, 'add').mockImplementation((...tokens: string[]) => {
      heightAtClass = el.style.getPropertyValue(EXIT_HEIGHT_VAR);
      add(...tokens);
    });
    fakeAnimation(new Map([[el, { animationName: 'out', animationDuration: '0.2s' }]]));
    animateOut(el, { className: 'x--closing', shouldSetHeightVar: true });
    expect(heightAtClass).toBe('32px');
  });

  it('keeps an element that was already inert inert; shouldSetInert: false leaves inert alone', () => {
    const a = div();
    a.inert = true;
    animateOut(a, { className: 'x--closing' });
    expect(a.inert).toBe(true);
    const b = div();
    let inertDuringDone: boolean | undefined;
    animateOut(b, { className: 'x--closing', shouldSetInert: false, onDone: () => (inertDuringDone = b.inert) });
    expect(inertDuringDone).toBeFalsy(); // never set (jsdom: undefined)
  });

  it('className as a function: one class per element, onDone waits for all, cancel removes each own class', async () => {
    vi.useFakeTimers();
    const panel = div();
    const backdrop = div();
    fakeAnimation(new Map([
      [panel, { animationName: 'out', animationDuration: '0.2s' }],
      [backdrop, { animationName: 'fade', animationDuration: '0.3s' }],
    ]));
    const className = (el: Element): string => (el === backdrop ? 'x__backdrop--closing' : 'x__panel--closing');
    const onDone = vi.fn();
    animateOut([panel, backdrop], { className, onDone });
    expect(panel.classList.contains('x__panel--closing')).toBe(true);
    expect(backdrop.classList.contains('x__backdrop--closing')).toBe(true);
    expect(panel.classList.contains('x__backdrop--closing')).toBe(false);
    expect(backdrop.inert).toBe(true);
    end(panel);
    expect(onDone).not.toHaveBeenCalled(); // the longer backdrop fade still runs
    end(backdrop);
    expect(onDone).toHaveBeenCalledTimes(1);

    const again = animateOut([panel, backdrop], { className, onDone: vi.fn() });
    again.cancel();
    expect(panel.classList.contains('x__panel--closing')).toBe(false);
    expect(backdrop.classList.contains('x__backdrop--closing')).toBe(false);
    await expect(again.finished).resolves.toBe(false);
  });

  it('a throwing onDone is logged, and finished still resolves true', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handle = animateOut(div(), { className: 'x--closing', onDone: () => { throw new Error('boom'); } });
    await expect(handle.finished).resolves.toBe(true);
    expect(error).toHaveBeenCalled();
  });
});
