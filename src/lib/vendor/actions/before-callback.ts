// Vendored from @keenmate/web-components-core v1.0.0-rc14 — src/element/before-callback.ts.
// Adapted (see README.md): `coreLog(source, 'UI', 'ELEMENT')` → the tree's `uiLogger`. Keep in sync by re-copying; don't diverge.
import { uiLogger } from '../../logger.js';

/**
 * The one `before*Callback` contract (SPEC §12.5): one `ctx` argument; the
 * return value decides —
 *
 * | returns | meaning |
 * |---|---|
 * | `false` | reject — nothing starts |
 * | nothing (`undefined`) | continue unchanged |
 * | any other value (incl. `null`) | continue with that value — what it replaces is the hook's documented contract |
 *
 * Unset → continue. A throw rejects (a crashed guard must not let a delete
 * through) and is logged as an error — through the component behind the
 * optional `logSource` (an element, a shadow root, or a ctx carrying the
 * component as `element`; defaults to `ctx`), else `CORE:ELEMENT`.
 */
export type BeforeCallbackResult<V = unknown> =
  | { readonly isRejected: true }
  | { readonly isRejected: false; readonly hasValue: false }
  | { readonly isRejected: false; readonly hasValue: true; readonly value: V };

type BeforeFn<Ctx> = ((ctx: Ctx) => unknown) | null | undefined;

const REJECTED = Object.freeze({ isRejected: true as const });
const CONTINUE = Object.freeze({ isRejected: false as const, hasValue: false as const });

function interpret<V>(result: unknown): BeforeCallbackResult<V> {
  if (result === false) return REJECTED;
  if (result === undefined) return CONTINUE;
  return { isRejected: false, hasValue: true, value: result as V };
}

function report(name: string, error: unknown, logSource: unknown): void {
  uiLogger.error(`${name} threw — treated as reject`, error);
}

/** Run an async-capable `before*Callback` (sync or `Promise` results both work). */
export async function runBeforeCallback<Ctx, V = unknown>(
  fn: BeforeFn<Ctx>,
  ctx: Ctx,
  name = 'before*Callback',
  logSource: unknown = ctx,
): Promise<BeforeCallbackResult<V>> {
  if (typeof fn !== 'function') return CONTINUE;
  try {
    return interpret<V>(await fn(ctx));
  } catch (error) {
    report(name, error, logSource);
    return REJECTED;
  }
}

/**
 * Run a `before*Callback` that must answer synchronously because its native
 * trigger needs the answer now (`dragstart`, `keydown`). A returned `Promise`
 * is a usage error: warned, and treated as "continue".
 */
export function runBeforeCallbackSync<Ctx, V = unknown>(
  fn: BeforeFn<Ctx>,
  ctx: Ctx,
  name = 'before*Callback',
  logSource: unknown = ctx,
): BeforeCallbackResult<V> {
  if (typeof fn !== 'function') return CONTINUE;
  try {
    const result = fn(ctx);
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      uiLogger.warn(`${name} must be synchronous; a returned Promise is ignored (continuing)`);
      return CONTINUE;
    }
    return interpret<V>(result);
  } catch (error) {
    report(name, error, logSource);
    return REJECTED;
  }
}

/**
 * Run an async-capable `before*Callback`, answering **synchronously when the
 * hook does**: a plain return yields a result now, a returned `Promise` yields
 * a `Promise` of the result. For flows that are synchronous today (a click
 * that selects in the same tick) and must stay so for sync hooks, while still
 * accepting async ones. Branch with `instanceof Promise`.
 */
export function runBeforeCallbackEager<Ctx, V = unknown>(
  fn: BeforeFn<Ctx>,
  ctx: Ctx,
  name = 'before*Callback',
  logSource: unknown = ctx,
): BeforeCallbackResult<V> | Promise<BeforeCallbackResult<V>> {
  if (typeof fn !== 'function') return CONTINUE;
  let result: unknown;
  try {
    result = fn(ctx);
  } catch (error) {
    report(name, error, logSource);
    return REJECTED;
  }
  if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
    return Promise.resolve(result).then(
      (value) => interpret<V>(value),
      (error) => {
        report(name, error, logSource);
        return REJECTED;
      },
    );
  }
  return interpret<V>(result);
}
