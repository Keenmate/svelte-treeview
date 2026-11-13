// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLogger, isLogLevel, LOG_LEVELS, toLogLevelNumber } from './log-core.js';
import { DEFAULT_CATEGORIES, createLoggers, type LogLevelDesc } from './create-loggers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createLoggers', () => {
  it('builds one logger per default category, namespaced', () => {
    const { loggers, LOGGING_CATEGORIES } = createLoggers('NSDEFAULTS');
    expect(Object.keys(loggers)).toEqual([...DEFAULT_CATEGORIES]);
    expect(LOGGING_CATEGORIES).toEqual([...DEFAULT_CATEGORIES]);
    expect(getLogger('NSDEFAULTS:INIT')).toBe(loggers.INIT);
  });

  it('supports redefined and extended category lists', () => {
    const redefined = createLoggers('NSREDEF', ['INIT', 'DATA', 'INDEX', 'DRAG'] as const);
    expect(Object.keys(redefined.loggers)).toEqual(['INIT', 'DATA', 'INDEX', 'DRAG']);

    const extended = createLoggers('NSEXT', [...DEFAULT_CATEGORIES, 'FILE'] as const);
    expect(Object.keys(extended.loggers)).toEqual(['INIT', 'DATA', 'UI', 'FILE']);
    // typed access to the extra category
    expect(extended.loggers.FILE).toBeDefined();
  });

  it('prepends a colored %c label and leaves message args intact', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { loggers, enableLogging } = createLoggers('NSCOLOR');
    enableLogging();

    loggers.INIT.info('hello', { n: 1 });

    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]!;
    expect(args[0]).toBe('%c[NSCOLOR:INIT]');
    expect(String(args[1])).toContain('color:');
    expect(args[2]).toBe('hello');
    expect(args[3]).toEqual({ n: 1 });
  });

  it('enableLogging() defaults to debug; disableLogging() silences', () => {
    const bundle = createLoggers('NSLEVELS');
    bundle.enableLogging();
    expect(bundle.loggers.INIT.getLevel()).toBe(LOG_LEVELS.DEBUG);
    bundle.disableLogging();
    expect(bundle.loggers.INIT.getLevel()).toBe(LOG_LEVELS.SILENT);
  });

  it('setLogLevel sets all categories; setCategoryLevel sets one', () => {
    const bundle = createLoggers('NSSETLEVEL');
    bundle.setLogLevel('warn');
    expect(bundle.loggers.INIT.getLevel()).toBe(LOG_LEVELS.WARN);
    expect(bundle.loggers.UI.getLevel()).toBe(LOG_LEVELS.WARN);

    bundle.setCategoryLevel('UI', 'trace');
    expect(bundle.loggers.UI.getLevel()).toBe(LOG_LEVELS.TRACE);
    expect(bundle.loggers.INIT.getLevel()).toBe(LOG_LEVELS.WARN); // unchanged
  });

  it('setCategoryLevel accepts the namespaced form (NS:CAT) as well as the bare one', () => {
    const bundle = createLoggers('NSCATNS');
    bundle.setLogLevel('warn');
    bundle.setCategoryLevel('NSCATNS:DATA', 'debug');
    expect(bundle.loggers.DATA.getLevel()).toBe(LOG_LEVELS.DEBUG);
    const loose = bundle.setCategoryLevel as (category: string, level: 'trace' | 'error') => void;
    loose('nscatns:ui', 'error'); // case-insensitive
    expect(bundle.loggers.UI.getLevel()).toBe(LOG_LEVELS.ERROR);
    bundle.setCategoryLevel('OTHER:INIT', 'trace'); // another namespace → ignored
    loose('NOPE', 'trace'); // unknown → ignored
    expect(bundle.loggers.INIT.getLevel()).toBe(LOG_LEVELS.WARN);
  });

  it('forInstance: instance override logs while the type stays silent', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const bundle = createLoggers('NSINST1');
    bundle.disableLogging(); // type-level silent

    let level: LogLevelDesc | undefined;
    const inst = bundle.forInstance('web-x#1', () => level);

    inst.DATA.debug('quiet'); // no override yet → suppressed
    expect(spy).not.toHaveBeenCalled();

    level = 'debug'; // overlay enables THIS instance
    inst.DATA.debug('loud', { n: 1 });
    expect(spy).toHaveBeenCalledOnce();
    const args = spy.mock.calls[0]!;
    expect(args[0]).toBe('%c[NSINST1:DATA]%c web-x#1');
    expect(String(args[1])).toContain('color:');
    expect(args[3]).toBe('loud');
    expect(args[4]).toEqual({ n: 1 });
  });

  it('forInstance: type-level enable makes every instance log without an override', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const bundle = createLoggers('NSINST2');
    bundle.enableLogging(); // type-level debug

    const inst = bundle.forInstance('web-y#2', () => undefined); // no override
    inst.UI.info('hi');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toBe('%c[NSINST2:UI]%c web-y#2');
  });

  it('does not double-wrap the prefix when called twice for the same name', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    createLoggers('NSIDEMP');
    const { loggers, enableLogging } = createLoggers('NSIDEMP'); // second call, same names
    enableLogging();

    loggers.INIT.info('msg');
    const args = spy.mock.calls[0]!;
    expect(args[0]).toBe('%c[NSIDEMP:INIT]'); // single prefix, not doubled
    expect(args[1]).toContain('color:');
  });
});

// Review L-17: one level parser for every caller.
describe('toLogLevelNumber / isLogLevel', () => {
  it('reads names in any case and whole ranks 0-5; anything else is undefined', () => {
    expect(toLogLevelNumber('debug')).toBe(LOG_LEVELS.DEBUG);
    expect(toLogLevelNumber('SILENT')).toBe(LOG_LEVELS.SILENT);
    expect(toLogLevelNumber(4)).toBe(4);
    for (const bad of ['verbose', 2.5, -1, 6, null, undefined, {}]) {
      expect(toLogLevelNumber(bad)).toBeUndefined();
      expect(isLogLevel(bad)).toBe(false);
    }
  });

  it('setLevel() rejects what the parser rejects', () => {
    expect(() => getLogger('L17:CAT').setLevel(2.5 as never, false)).toThrow(/invalid level/);
  });
});

// Review L-15: a repeated createLoggers() of one namespace must not grow the page-wide list.
describe('page-wide bundle list', () => {
  it('a repeated createLoggers() / createPerfLogger() of one namespace replaces its entry', async () => {
    const { createPerfLogger } = await import('./perf-logger.js');
    const state = (globalThis as unknown as Record<symbol, { bundles: Set<{ namespace: string }> }>)[
      Symbol.for('@keenmate/web-components-core:logging')
    ]!;
    const count = (ns: string): number => [...state.bundles].filter((b) => b.namespace === ns).length;
    for (let i = 0; i < 50; i++) createLoggers('L15GROW');
    for (let i = 0; i < 50; i++) createPerfLogger('L15PERF');
    expect(count('L15GROW')).toBe(1);
    expect(count('L15PERF')).toBe(1);
    createLoggers('L15GROW', ['INIT', 'FILE']); // other categories: its own entry
    expect(count('L15GROW')).toBe(2);
  });
});
