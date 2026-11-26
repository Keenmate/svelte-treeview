/**
 * Selection model (SPEC §12.27): which keys are selected, the anchor, and the click / keyboard
 * rules every list, tree and grid had its own copy of (web-multiselect, web-treeview, web-grid,
 * web-dropzone). File-manager rules:
 *
 * - click → only this key (anchor = key);
 * - Ctrl / Cmd + click → toggle this key (anchor = key);
 * - Shift + click → the range anchor … key replaces the selection (the anchor stays);
 * - Ctrl + Shift + click → the range is added.
 *
 * `single` mode: a click selects the key, Ctrl + click on the selected key clears it, Shift is ignored.
 * Keys come in the component's current display order (`getOrderedKeys`) — a range is what the user
 * SEES between two rows (filtered / sorted / collapsed rows excluded). Cascades (tree parents),
 * cell ranges and groups stay the component's.
 */

import { runSafely } from '../logging/safe-call.js';

export type KeySelectionMode = 'single' | 'multiple';

export interface SelectionChange<K> {
  added: K[];
  removed: K[];
  /** Every selected key after the change, in selection order. */
  values: K[];
}

export interface SelectionOptions<K> {
  /** `'multiple'` (default) or `'single'` — a function when it's a live input. */
  mode?: KeySelectionMode | (() => KeySelectionMode);
  /** Every key in display order — ranges and `selectAll` use it. */
  getOrderedKeys: () => readonly K[];
  /** A key that can't be selected (a disabled row, a group header); default: all can. */
  isSelectable?: (key: K) => boolean;
  /** After every change (not called when nothing changed, nor for `isSilent` writes). */
  changeCallback?: (change: SelectionChange<K>) => void;
  /** Log source for a throwing `changeCallback`. */
  logSource?: unknown;
}

export interface WriteOptions {
  /** Don't call `changeCallback` (a programmatic write the component reports itself, or not at all). */
  isSilent?: boolean;
}

export interface KeySelection<K> {
  /** Apply a click with its modifier keys (`metaKey` counts as Ctrl). */
  click(key: K, modifiers?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }): void;
  /** Flip one key (Space in a multiple list, a checkbox); the anchor moves to it. */
  toggle(key: K, options?: WriteOptions): void;
  /** Shift + Arrow: the range anchor … key; `isAdditive` keeps the rest (Ctrl + Shift). The anchor stays. */
  extendTo(key: K, options?: { isAdditive?: boolean } & WriteOptions): void;
  /** Every selectable key (`multiple` only). */
  selectAll(options?: WriteOptions): void;
  clear(options?: WriteOptions): void;
  /** Replace the selection (a `value` input); unselectable / unknown keys are kept — the component decides. */
  set(keys: Iterable<K>, options?: WriteOptions): void;
  has(key: K): boolean;
  /** Selected keys in selection order. */
  values(): K[];
  readonly size: number;
  /** The range start (`null` = none); `setAnchor` moves it without selecting (keyboard focus). */
  readonly anchor: K | null;
  setAnchor(key: K | null): void;
}

export function createSelection<K>(options: SelectionOptions<K>): KeySelection<K> {
  const { getOrderedKeys, changeCallback } = options;
  const isSelectable = options.isSelectable ?? ((): boolean => true);
  const mode = (): KeySelectionMode => {
    const m = typeof options.mode === 'function' ? options.mode() : options.mode;
    return m === 'single' ? 'single' : 'multiple';
  };
  let selected = new Set<K>();
  let anchor: K | null = null;

  /** Replace the selection with `next`; report the difference. */
  const commit = (next: Set<K>, opts: WriteOptions = {}): void => {
    const added = [...next].filter((k) => !selected.has(k));
    const removed = [...selected].filter((k) => !next.has(k));
    selected = next;
    if ((!added.length && !removed.length) || opts.isSilent || !changeCallback) return;
    runSafely(() => changeCallback({ added, removed, values: [...selected] }), { source: options.logSource ?? null, message: 'selection changeCallback threw' });
  };

  /** The selectable keys between `a` and `b` (inclusive) in display order; `[b]` when `a` isn't shown. */
  const rangeKeys = (a: K | null, b: K): K[] => {
    const keys = getOrderedKeys();
    const j = keys.indexOf(b);
    const i = a === null ? -1 : keys.indexOf(a);
    if (j === -1) return [];
    if (i === -1) return isSelectable(b) ? [b] : [];
    const [lo, hi] = i <= j ? [i, j] : [j, i];
    return keys.slice(lo, hi + 1).filter(isSelectable);
  };

  const toggle = (key: K, opts: WriteOptions = {}): void => {
    if (!isSelectable(key)) return;
    anchor = key;
    if (selected.has(key)) {
      const next = new Set(selected);
      next.delete(key);
      commit(next, opts);
    } else commit(mode() === 'single' ? new Set([key]) : new Set([...selected, key]), opts);
  };

  const extendTo = (key: K, opts: { isAdditive?: boolean } & WriteOptions = {}): void => {
    if (mode() === 'single') {
      if (isSelectable(key)) {
        anchor = key;
        commit(new Set([key]), opts);
      }
      return;
    }
    const range = rangeKeys(anchor, key);
    if (!range.length) return;
    if (anchor === null) anchor = key;
    commit(opts.isAdditive ? new Set([...selected, ...range]) : new Set(range), opts);
  };

  return {
    click(key, modifiers = {}) {
      if (!isSelectable(key)) return;
      const isCtrl = !!(modifiers.ctrlKey || modifiers.metaKey);
      if (mode() === 'single') {
        if (isCtrl && selected.has(key)) return toggle(key);
        anchor = key;
        return commit(new Set([key]));
      }
      if (modifiers.shiftKey) return extendTo(key, { isAdditive: isCtrl });
      if (isCtrl) return toggle(key);
      anchor = key;
      commit(new Set([key]));
    },
    toggle,
    extendTo,
    selectAll(opts) {
      if (mode() === 'single') return;
      commit(new Set(getOrderedKeys().filter(isSelectable)), opts);
    },
    clear(opts) {
      commit(new Set(), opts);
    },
    set(keys, opts) {
      const next = new Set(keys);
      if (mode() === 'single' && next.size > 1) commit(new Set([[...next][0]!]), opts);
      else commit(next, opts);
    },
    has: (key) => selected.has(key),
    values: () => [...selected],
    get size() {
      return selected.size;
    },
    get anchor() {
      return anchor;
    },
    setAnchor(key) {
      anchor = key;
    },
  };
}
