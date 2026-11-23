/**
 * The public controller (SPEC §12.34): `el.controller` / `ctx.controller` exposes a component's imperative API
 * WITHOUT the internal engine. web-treeview, web-dropzone, web-multiselect, web-daterangepicker, web-editor and
 * web-commandpalette each hand-built the same thing: forward a list of methods to a target that may not exist
 * yet (built on the first `reinit()`), read state through getters with an empty answer meanwhile, freeze it.
 *
 * ```ts
 * protected override createController(): TreeController {
 *   return createControllerFacade<TreeController>(() => { this.flush(); return this.#engine; }, {
 *     methods: ['expandAll', 'collapseAll', 'getNodeByPath'],
 *     state: { selectedPaths: () => [], focusedNode: null },
 *     writable: ['selectionAnchor'],
 *     emptyResults: { getNodeByPath: () => null },
 *   });
 * }
 * ```
 *
 * The facade is frozen; methods are bound to the target at call time (a rebuilt engine is picked up); state is
 * read live. `createControllerFacade(target, ['a', 'b'])` = methods only.
 */

export interface ControllerFacadeSpec {
  /** Forwarded methods (called on the current target; with no target → `emptyResults[name]?.()`). */
  methods?: readonly string[];
  /** Read-only state: name → the value (or a factory) answered while there is no target. */
  state?: Readonly<Record<string, unknown>>;
  /** State that may also be SET through the controller (forwarded; ignored while there is no target). */
  writable?: readonly string[];
  /** What a method returns while there is no target (a factory, so arrays aren't shared). */
  emptyResults?: Readonly<Record<string, () => unknown>>;
}

type Target = object | null | undefined;

const read = (fallback: unknown): unknown => (typeof fallback === 'function' ? (fallback as () => unknown)() : fallback);

export function createControllerFacade<C extends object>(target: Target | (() => Target), spec: ControllerFacadeSpec | readonly string[]): C {
  const { methods = [], state = {}, writable = [], emptyResults = {} } = Array.isArray(spec) ? { methods: spec as readonly string[] } : (spec as ControllerFacadeSpec);
  const current = (): Record<string, unknown> | null => {
    const t = typeof target === 'function' ? (target as () => Target)() : target;
    return (t ?? null) as Record<string, unknown> | null;
  };
  const facade: Record<string, unknown> = {};
  for (const name of methods) {
    facade[name] = (...args: unknown[]): unknown => {
      const t = current();
      const fn = t?.[name];
      if (typeof fn !== 'function') return emptyResults[name]?.();
      return (fn as (...a: unknown[]) => unknown).apply(t, args);
    };
  }
  for (const [name, empty] of Object.entries(state)) {
    Object.defineProperty(facade, name, {
      enumerable: true,
      get: () => {
        const t = current();
        return t ? t[name] : read(empty);
      },
    });
  }
  for (const name of writable) {
    Object.defineProperty(facade, name, {
      enumerable: true,
      get: () => {
        const t = current();
        return t ? t[name] : read(state[name] ?? null);
      },
      set: (value: unknown) => {
        const t = current();
        if (t) t[name] = value;
      },
    });
  }
  return Object.freeze(facade) as C;
}
