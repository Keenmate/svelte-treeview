// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPerfLogger } from './perf-logger.js';
import { createLoggers } from './create-loggers.js';

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

  it('maxSpans caps the kept spans (newest win) and the summary counts the dropped ones', () => {
    createLoggers('PERFCAP', ['PERF'] as const).enableLogging('debug');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const perf = createPerfLogger('PERFCAP', { maxSpans: 3, thresholdMs: 1e9 });
    for (let i = 0; i < 5; i++) perf.measure(`s${i}`, () => i);
    log.mockClear();
    perf.summary();
    const text = log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(text).toContain('3 spans (2 older dropped');
    expect(text).toContain('s4');
    expect(text).not.toContain('s0:');
    perf.clear();
    log.mockClear();
    perf.measure('again', () => 0);
    perf.summary();
    expect(log.mock.calls.map((c) => c.join(' ')).join('\n')).not.toContain('dropped');
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

describe('createPerfLogger — items, metadata, threshold, async, counters, summaries', () => {
  const lines = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls.map((c) => c.slice(2).join(' '));

  it('itemCount adds per-item time and items/sec; metadata is appended', () => {
    createLoggers('PERFITEMS', ['PERF'] as const).enableLogging('debug');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const perf = createPerfLogger('PERFITEMS');
    expect(perf.isEnabled).toBe(true);
    perf.start('index', { tree: 'a' });
    perf.end('index', 1000);
    const [line] = lines(log);
    expect(line).toMatch(/^index took [\d.]+ms \| 1\D?000 items \| [\d.]+ms\/item \| .+ items\/sec \| \{"tree":"a"\}$/);
  });

  it('a threshold hides short spans', () => {
    createLoggers('PERFTHRESH', ['PERF'] as const).enableLogging('debug');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const perf = createPerfLogger('PERFTHRESH', { thresholdMs: 1e9 });
    perf.measure('fast', () => 1);
    expect(log).not.toHaveBeenCalled();
    perf.setThreshold(0);
    perf.measure('fast', () => 1);
    expect(log).toHaveBeenCalledOnce();
  });

  it('measureAsync times until the promise settles and returns its value', async () => {
    const perf = createPerfLogger('PERFASYNC');
    await expect(perf.measureAsync('load', async () => 7)).resolves.toBe(7);
    await expect(perf.measureAsync('fail', async () => { throw new Error('x'); })).rejects.toThrow('x');
  });

  it('count() and summarize() report through summary lines', () => {
    createLoggers('PERFCOUNT', ['PERF'] as const).enableLogging('debug');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const perf = createPerfLogger('PERFCOUNT');
    perf.count('lookup');
    perf.count('lookup', 2);
    perf.summary('grid');
    expect(lines(log).join('\n')).toContain('lookup: ×2 (2.00ms)');
    log.mockClear();
    perf.summarize('tree #a', { parse: 10, render: 30 }, 4);
    expect(lines(log)[0]).toBe('tree #a — 40.00ms total | 4 items | 10.00ms/item | 100 items/sec: parse 10.00ms, render 30.00ms');
  });
});
