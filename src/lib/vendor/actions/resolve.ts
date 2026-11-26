// Vendored from @keenmate/web-components-core c2f5f83 — src/actions/resolve.ts (tracked in scripts/core-sync.json).
// Adapted (see README.md): `coreLog(...)` → the tree's `uiLogger`. Keep in sync by re-copying; don't diverge.
import { runBeforeCallback } from './before-callback.js';
import { uiLogger } from '../../logger.js';
import type {
  ActionEventDetail,
  ActionItem,
  MenuDivider,
  MenuEntry,
  MenuItem,
  ResolvedActionItem,
} from './types.js';

/**
 * Log a throwing item callback through the component behind `logSource` (an
 * element, a shadow root, or a ctx carrying `element`) — `CORE:ACTIONS` when none.
 */
function report(field: string, error: unknown, logSource: unknown): void {
  uiLogger.error(`action item ${field} threw — using the static value`, error);
}

/** Call `cb(ctx)` if set; a throw is logged and falls back to `undefined`. */
function call<Ctx, R>(cb: ((ctx: Ctx) => R) | undefined, ctx: Ctx, field: string, logSource: unknown): R | undefined {
  if (typeof cb !== 'function') return undefined;
  try {
    return cb(ctx);
  } catch (error) {
    report(field, error, logSource);
    return undefined;
  }
}

function classList(value: string | string[] | undefined): string {
  if (!value) return '';
  return (Array.isArray(value) ? value : [value])
    .flatMap((c) => c.split(/\s+/))
    .filter(Boolean)
    .join(' ');
}

/**
 * Resolve every field of an item against `ctx`: the `get*Callback` wins, else
 * the static field, else `defaults` (a component's built-in state, e.g.
 * "select-all is disabled when everything is selected"), else the base
 * default. A throwing callback is logged and the static value used — through
 * the component behind `logSource` (defaults to `ctx`, which is used when it
 * carries the component as `element`).
 */
export function resolveActionItem<Ctx, A extends string>(
  item: ActionItem<Ctx, A>,
  ctx: Ctx,
  defaults: Partial<ResolvedActionItem<A>> = {},
  logSource: unknown = ctx,
): ResolvedActionItem<A> {
  const cbClass = call(item.getClassCallback, ctx, 'getClassCallback', logSource);
  return {
    action: item.action ?? defaults.action ?? 'custom',
    id: item.id ?? defaults.id,
    text: call(item.getTextCallback, ctx, 'getTextCallback', logSource) ?? item.text ?? defaults.text ?? '',
    icon: call(item.getIconCallback, ctx, 'getIconCallback', logSource) ?? item.icon ?? defaults.icon,
    tooltip: call(item.getTooltipCallback, ctx, 'getTooltipCallback', logSource) ?? item.tooltip ?? defaults.tooltip,
    shortcut: item.shortcut ?? defaults.shortcut,
    cssClass: cbClass !== undefined ? classList(cbClass) : classList(item.cssClass ?? defaults.cssClass),
    isVisible: call(item.getIsVisibleCallback, ctx, 'getIsVisibleCallback', logSource) ?? item.isVisible ?? defaults.isVisible ?? true,
    isDisabled:
      call(item.getIsDisabledCallback, ctx, 'getIsDisabledCallback', logSource) ?? item.isDisabled ?? defaults.isDisabled ?? false,
    isDanger: item.isDanger ?? defaults.isDanger ?? false,
    isToggled:
      call(item.getIsToggledCallback, ctx, 'getIsToggledCallback', logSource) ?? item.isToggled ?? defaults.isToggled ?? false,
    isToggle:
      item.isToggled !== undefined || typeof item.getIsToggledCallback === 'function' || defaults.isToggled !== undefined || defaults.isToggle === true,
  };
}

/** A separator entry, optionally labelled. */
export function createMenuDivider(text?: string): MenuDivider {
  return text === undefined ? { divider: true } : { divider: true, text };
}

export function isMenuDivider(entry: unknown): entry is MenuDivider {
  return typeof entry === 'object' && entry !== null && (entry as MenuDivider).divider === true;
}

/**
 * Expand the string shorthand for built-ins: `['add', { id: 'x', text: 'X' }]`
 * → `[{ action: 'add' }, { id: 'x', text: 'X' }]`.
 */
export function normalizeActionItems<T extends ActionItem<any, any>>(
  items: readonly (string | T)[] | null | undefined,
): T[] {
  const out: T[] = [];
  for (const entry of items ?? []) {
    if (entry == null) continue; // a conditional item (`cond && item`) that resolved to nothing
    out.push(typeof entry === 'string' ? ({ action: entry } as T) : entry);
  }
  return out;
}

export type ResolvedMenuEntry<Ctx, A extends string> =
  | { kind: 'item'; item: MenuItem<Ctx, A>; resolved: ResolvedActionItem<A>; hasChildren: boolean }
  | { kind: 'divider'; text?: string };

/**
 * Resolve a menu level: hidden items are dropped, then dividers are trimmed —
 * no leading (unless labelled: a group heading) / trailing divider, no two in a row
 * (when two meet, the later label wins). `null` / `undefined` entries are skipped. `defaults` maps an item to its built-in state. `logSource`: see
 * {@link resolveActionItem}.
 */
export function resolveMenuEntries<Ctx, A extends string>(
  entries: readonly (MenuEntry<Ctx, A> | string)[] | null | undefined,
  ctx: Ctx,
  defaults?: (item: MenuItem<Ctx, A>) => Partial<ResolvedActionItem<A>> | undefined,
  logSource: unknown = ctx,
): ResolvedMenuEntry<Ctx, A>[] {
  const out: ResolvedMenuEntry<Ctx, A>[] = [];
  for (const raw of entries ?? []) {
    if (raw == null) continue; // a conditional entry (`cond && item`) that resolved to nothing
    const entry = typeof raw === 'string' ? ({ action: raw } as MenuItem<Ctx, A>) : raw;
    if (isMenuDivider(entry)) {
      const last = out[out.length - 1];
      if (!last) {
        // Leading: an unlabelled divider is dropped; a labelled one is a group heading — kept.
        if (entry.text !== undefined) out.push({ kind: 'divider', text: entry.text });
        continue;
      }
      const divider: ResolvedMenuEntry<Ctx, A> =
        entry.text === undefined
          ? { kind: 'divider', ...(last.kind === 'divider' && last.text !== undefined ? { text: last.text } : {}) }
          : { kind: 'divider', text: entry.text };
      if (last.kind === 'divider') out[out.length - 1] = divider;
      else out.push(divider);
      continue;
    }
    const resolved = resolveActionItem(entry, ctx, defaults?.(entry), logSource);
    if (!resolved.isVisible) continue;
    const hasChildren = typeof entry.getChildrenCallback === 'function' || !!entry.children?.length;
    out.push({ kind: 'item', item: entry, resolved, hasChildren });
  }
  while (out.length && out[out.length - 1]!.kind === 'divider') out.pop(); // trailing
  return out;
}

/** A menu item's submenu: `getChildrenCallback` (may be async) wins over `children`. `logSource`: see {@link resolveActionItem}. */
export async function loadMenuChildren<Ctx, A extends string>(
  item: MenuItem<Ctx, A>,
  ctx: Ctx,
  logSource: unknown = ctx,
): Promise<MenuEntry<Ctx, A>[]> {
  if (typeof item.getChildrenCallback === 'function') {
    try {
      return (await item.getChildrenCallback(ctx)) ?? [];
    } catch (error) {
      report('getChildrenCallback', error, logSource);
      return item.children ?? [];
    }
  }
  return item.children ?? [];
}

/** The trigger's `data-*` as a plain object, minus `data-action` / `data-id` (reported separately). */
export function readActionDataset(el: HTMLElement | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!el) return out;
  for (const [key, value] of Object.entries(el.dataset)) {
    if (key === 'action' || key === 'id' || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Running activations: per component element (the detail's `element`), the items — by
 * `id` when they have one (a string shorthand creates a fresh object per render, so the
 * object alone would never match), else by object. One instance's pending item doesn't
 * block the same item shared by another instance.
 */
const NO_HOST = {};
const busy = new WeakMap<object, Set<unknown>>();
/** Running count per item key across every host — what `isActionBusy(item)` (no host) answers. */
const busyAnywhere = new Map<unknown, number>();

function busyKey(item: object): unknown {
  const id = (item as { id?: unknown }).id;
  return typeof id === 'string' && id !== '' ? `id:${id}` : item;
}

function busySet(host: object | undefined): Set<unknown> {
  const key = host ?? NO_HOST;
  let set = busy.get(key);
  if (!set) busy.set(key, (set = new Set()));
  return set;
}

/**
 * True while an activation of `item` is running (its `beforeActionCallback` / `onClick` is
 * pending) — on `host` (the component element) when given, else anywhere.
 */
export function isActionBusy(item: object, host?: object): boolean {
  const key = busyKey(item);
  return host === undefined ? (busyAnywhere.get(key) ?? 0) > 0 : busySet(host).has(key);
}

/** The item's disabled state for this activation (`getIsDisabledCallback` wins over `isDisabled`). */
function isItemDisabled<Ctx, A extends string>(detail: ActionEventDetail<Ctx, A>): boolean {
  const item = detail.item as ActionItem<Ctx, A>;
  const fromCallback = call(item.getIsDisabledCallback, detail as unknown as Ctx, 'getIsDisabledCallback', detail);
  return (fromCallback ?? item.isDisabled) === true;
}

export interface RunActionOptions<Ctx, A extends string> {
  /** The full detail: the surface context + the invocation fields, with the component context attached. */
  detail: ActionEventDetail<Ctx, A>;
  /** The component's `beforeActionCallback` — `false` cancels everything (async OK). */
  beforeActionCallback?: ((detail: ActionEventDetail<Ctx, A>) => unknown) | null;
  /** Fire the `action` event (and its `onAction` twin) after the built-in — usually `this.emit('action', detail)`. */
  dispatchAction(detail: ActionEventDetail<Ctx, A>): void;
  /** The built-in behaviour for `detail.action`, if any. */
  runBuiltIn?(detail: ActionEventDetail<Ctx, A>): void | Promise<void>;
}

/**
 * Run one activation in the shared order (SPEC §12.12):
 * `beforeActionCallback` (`false` cancels — nothing else runs) → the item's
 * `onClick` → the built-in behaviour → the `action` event. The event is a
 * notification after the fact: a listener sees the state the built-in left
 * (a deleted row is already gone, an added one is present). A throwing
 * `onClick` or built-in is logged, not thrown, and the event still fires —
 * the activation happened; listeners re-read the actual state. The item is
 * busy while it runs (`aria-busy` on the trigger); a second activation
 * meanwhile is ignored. Resolves `false` when cancelled or ignored as busy.
 */
export async function runAction<Ctx, A extends string>(opts: RunActionOptions<Ctx, A>): Promise<boolean> {
  const { detail } = opts;
  // A disabled item never runs, whoever activated it (a stale button, a keyboard shortcut).
  if (isItemDisabled(detail)) return false;
  const running = busySet((detail as { element?: object }).element);
  const key = busyKey(detail.item as object);
  if (running.has(key)) return false;
  running.add(key);
  busyAnywhere.set(key, (busyAnywhere.get(key) ?? 0) + 1);
  const trigger = detail.triggerElement;
  const previousBusy = trigger?.getAttribute('aria-busy') ?? null;
  trigger?.setAttribute('aria-busy', 'true');
  try {
    const gate = await runBeforeCallback(opts.beforeActionCallback, detail, 'beforeActionCallback', detail);
    if (gate.isRejected) return false;
    if (gate.hasValue && gate.value !== true) {
      // Unlike other before*Callbacks, an action has no value to replace: false cancels, the rest continues.
      uiLogger.warn('beforeActionCallback can only cancel (return false); a returned value is ignored', gate.value);
    }
    if (typeof detail.item.onClick === 'function') {
      try {
        await detail.item.onClick(detail);
      } catch (error) {
        uiLogger.error('action item onClick threw', error);
      }
    }
    if (opts.runBuiltIn) {
      try {
        await opts.runBuiltIn(detail);
      } catch (error) {
        uiLogger.error(`built-in action "${detail.action}" threw`, error);
      }
    }
    try {
      opts.dispatchAction(detail);
    } catch (error) {
      // The action already ran; a throwing notification must not turn it into a rejection.
      uiLogger.error(`action "${detail.action}" event handler threw`, error);
    }
    return true;
  } finally {
    running.delete(key);
    const left = (busyAnywhere.get(key) ?? 1) - 1;
    if (left > 0) busyAnywhere.set(key, left);
    else busyAnywhere.delete(key);
    // Put back an aria-busy the trigger already had (e.g. its own loading state).
    if (previousBusy === null) trigger?.removeAttribute('aria-busy');
    else trigger?.setAttribute('aria-busy', previousBusy);
  }
}
