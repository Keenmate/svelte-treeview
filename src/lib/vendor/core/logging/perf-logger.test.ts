// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPerfLogger } from './perf-logger.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createPerfLogger', () => {
  it('times a span and returns elapsed ms', () => {
    const perf = createPerfLogger('PERFA');
    perf.start('load');
    const ms = perf.end('load');
    expect(typeof ms).toBe('number');
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it('measure() records the span and returns the wrapped result', () => {
    const perf = createPerfLogger('PERFB');
    expect(perf.measure('calc', () => 21 * 2)).toBe(42);
  });

  it('warns and returns 0 when end() has no matching start()', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const perf = createPerfLogger('PERFC');
    expect(perf.end('missing')).toBe(0);
    expect(spy).toHaveBeenCalledOnce();
    expect(String(spy.mock.calls[0]![0])).toContain('%c[PERFC:PERF]');
  });

  it('summary() and clear() do not throw', () => {
    const perf = createPerfLogger('PERFD');
    perf.measure('a', () => 1);
    expect(() => perf.summary()).not.toThrow();
    perf.clear();
    expect(() => perf.summary()).not.toThrow();
  });
});

// Review L-15.
describe('createPerfLogger — growth and nesting', () => {
  it('records nothing while PERF is silent (the default warn level)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const perf = createPerfLogger('PERFQUIET');
    for (let i = 0; i < 3; i++) perf.measure('x', () => i);
    perf.summary();
    expect([...log.mock.calls, ...debug.mock.calls]).toHaveLength(0); // not even "summary — 3 spans"
  });

  it('a nested start() of the same label is closed in order, not overwritten', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); // bound when the logger is created
    const perf = createPerfLogger('PERFNEST');
    perf.start('render');
    perf.start('render');
    expect(perf.end('render')).toBeGreaterThanOrEqual(0);
    expect(perf.end('render')).toBeGreaterThanOrEqual(0);
    expect(perf.end('render')).toBe(0); // both closed — the third has no start
    expect(warn).toHaveBeenCalledOnce();
  });

  it('measure() still times a throwing function', () => {
    const perf = createPerfLogger('PERFTHROW');
    expect(() => perf.measure('boom', () => { throw new Error('x'); })).toThrow('x');
  });
});
