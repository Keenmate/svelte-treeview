/**
 * Active descendant (SPEC §12.25): focus stays in an input (a combobox, a search field) while
 * ArrowUp / ArrowDown move a highlighted item in a listbox — `aria-activedescendant` on the input
 * points at it. web-commandpalette and web-multiselect each had a copy (one with no ARIA at all).
 *
 * Roles (`combobox` / `listbox` / `option`), `aria-selected` and the highlight class stay the
 * component's: core sets `aria-activedescendant` + `aria-controls`, ids on the items, and calls
 * `activeChangeCallback` to paint; the listbox gets `tabindex="-1"` (unless it has one). Input and
 * listbox must live in the SAME root (an id reference doesn't cross a shadow boundary).
 */

import { createId } from '../dom/create-id.js';
import { findScrollContainer, scrollIntoContainer } from '../dom/scroll-container.js';
import { coreLog } from '../logging/element-logger.js';
import { runSafely } from '../logging/safe-call.js';

export interface ActiveDescendantOptions {
  /** The items in order, read on every key (re-render freely). */
  getItems: () => readonly HTMLElement[];
  /** Enter on the active item. */
  activateCallback?: (item: HTMLElement, index: number, event: KeyboardEvent) => void;
  /** Paint the highlight (`null` = none). Called after `aria-activedescendant` is set. */
  activeChangeCallback?: (item: HTMLElement | null, index: number) => void;
  /** ArrowDown on the last item goes to the first (default `false`). */
  isWrapping?: boolean;
  /** An item the keys skip (default: `aria-disabled="true"`). */
  isSkipped?: (item: HTMLElement) => boolean;
  /** Home / End move in the list (default `false` — they move the caret in the input). */
  hasHomeEnd?: boolean;
  /** Items PageUp / PageDown move (default `10`; `0` = not handled). */
  pageSize?: number;
  /** Scroll the active item into the listbox's scroll container (default `true`). */
  shouldScroll?: boolean;
  /**
   * `false` = ARIA only: no keydown listener — the component handles its own keys and drives `move()` /
   * `setActive()`; core still owns `aria-activedescendant`, ids, `aria-controls` and the scroll. Default `true`.
   */
  shouldHandleKeys?: boolean;
}

export interface ActiveDescendant {
  /** The active item, or `null`. */
  readonly active: HTMLElement | null;
  /** Its index in `getItems()`, or `-1`. */
  readonly activeIndex: number;
  /** Make `target` (index or item) active; `null` / `-1` clears. */
  setActive(target: number | HTMLElement | null): void;
  /** Move by `delta` over the not-skipped items (respecting `isWrapping`). */
  move(delta: number): void;
  /** After a re-render: keep the active item when its element (or id) is still there, else clear. */
  refresh(): void;
  destroy(): void;
}

const isAriaDisabled = (item: HTMLElement): boolean => item.getAttribute('aria-disabled') === 'true';

export function createActiveDescendant(input: HTMLElement, listbox: HTMLElement, options: ActiveDescendantOptions): ActiveDescendant {
  const { getItems, activateCallback, activeChangeCallback, isWrapping = false, isSkipped = isAriaDisabled, hasHomeEnd = false, pageSize = 10, shouldScroll = true, shouldHandleKeys = true } = options;
  let active: HTMLElement | null = null;
  let activeId = '';

  if (input.getRootNode() !== listbox.getRootNode()) {
    coreLog(input, 'UI', 'ELEMENT').warn('createActiveDescendant: the input and the listbox are in different roots — aria-activedescendant cannot reach across a shadow boundary');
  }
  // One element as both (a tree / grid body that keeps focus itself): no self-reference, and never take its tab stop.
  const isSame = input === listbox;
  if (!isSame) {
    if (!listbox.id) listbox.id = createId('km-listbox');
    input.setAttribute('aria-controls', listbox.id);
    // A scrolling listbox is a tab stop of its own in Chromium; the input is the one stop here.
    if (!listbox.hasAttribute('tabindex')) listbox.tabIndex = -1;
  }

  const items = (): readonly HTMLElement[] => getItems();

  /** Scroll the listbox (or its nearest scrolling ancestor) — never the page. */
  const reveal = (item: HTMLElement): void => {
    const container = listbox.scrollHeight > listbox.clientHeight ? listbox : findScrollContainer(listbox);
    if (container) scrollIntoContainer(item, { block: 'nearest', container });
  };

  const apply = (next: HTMLElement | null, list: readonly HTMLElement[], isForced = false): void => {
    if (!isForced && next === active && (!next || input.getAttribute('aria-activedescendant') === next.id)) return;
    active = next;
    if (next) {
      if (!next.id) next.id = createId('km-option');
      activeId = next.id;
      input.setAttribute('aria-activedescendant', next.id);
      if (shouldScroll) reveal(next);
    } else {
      activeId = '';
      input.removeAttribute('aria-activedescendant');
    }
    if (activeChangeCallback) runSafely(() => activeChangeCallback(next, next ? list.indexOf(next) : -1), { source: input, message: 'activeChangeCallback threw' });
  };

  /** The next not-skipped index from `from` in `step` direction (`-1` = none). */
  const seek = (list: readonly HTMLElement[], from: number, step: number, canWrap: boolean): number => {
    const n = list.length;
    for (let i = 0, index = from; i < n; i++) {
      index += step;
      if (index < 0 || index >= n) {
        if (!canWrap) return -1;
        index = (index + n) % n;
      }
      if (!isSkipped(list[index]!)) return index;
    }
    return -1;
  };

  const move = (delta: number): void => {
    const list = items();
    if (!list.length) return apply(null, list);
    const current = active ? list.indexOf(active) : -1;
    if (current === -1) {
      const first = delta > 0 ? seek(list, -1, 1, false) : seek(list, list.length, -1, false);
      return apply(first === -1 ? null : list[first]!, list);
    }
    const step = delta > 0 ? 1 : -1;
    let index = current;
    for (let i = 0; i < Math.abs(delta); i++) {
      const next = seek(list, index, step, isWrapping && Math.abs(delta) === 1);
      if (next === -1) break;
      index = next;
    }
    apply(list[index]!, list);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const list = items();
    switch (event.key) {
      case 'ArrowDown':
        move(1);
        break;
      case 'ArrowUp':
        move(-1);
        break;
      case 'PageDown':
        if (!pageSize) return;
        move(pageSize);
        break;
      case 'PageUp':
        if (!pageSize) return;
        move(-pageSize);
        break;
      case 'Home':
      case 'End': {
        if (!hasHomeEnd || !list.length) return;
        const index = event.key === 'Home' ? seek(list, -1, 1, false) : seek(list, list.length, -1, false);
        apply(index === -1 ? null : list[index]!, list);
        break;
      }
      case 'Enter': {
        if (!active || !list.includes(active) || !activateCallback) return;
        const item = active;
        runSafely(() => activateCallback(item, list.indexOf(item), event), { source: input, message: 'activateCallback threw' });
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  };
  if (shouldHandleKeys) input.addEventListener('keydown', onKeydown);

  return {
    get active() {
      return active && items().includes(active) ? active : null;
    },
    get activeIndex() {
      return active ? items().indexOf(active) : -1;
    },
    setActive(target) {
      const list = items();
      const next = typeof target === 'number' ? (list[target] ?? null) : target && list.includes(target) ? target : null;
      apply(next, list);
    },
    move,
    refresh() {
      const list = items();
      if (active && list.includes(active)) {
        if (input.getAttribute('aria-activedescendant') !== active.id) apply(active, list);
        return;
      }
      const same = activeId ? (list.find((item) => item.id === activeId) ?? null) : null;
      apply(same, list, true); // the old element is gone: re-apply, also when that clears
    },
    destroy() {
      input.removeEventListener('keydown', onKeydown);
      input.removeAttribute('aria-activedescendant');
      active = null;
    },
  };
}
