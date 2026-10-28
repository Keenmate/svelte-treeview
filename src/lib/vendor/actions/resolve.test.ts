// @vitest-environment jsdom
// Vendored from @keenmate/web-components-core v1.0.0-rc14 — src/actions/resolve.test.ts.
// Adapted: console.error spies → the tree's uiLogger (see README.md).
import { describe, expect, it, vi } from 'vitest';
import {
  getMenuChildren,
  isActionBusy,
  isMenuDivider,
  menuDivider,
  normalizeActionItems,
  readActionDataset,
  resolveActionItem,
  resolveMenuEntries,
  runAction,
} from './resolve.js';
import { uiLogger } from '../../logger.js';
import type { ActionEventDetail, ActionItem, MenuEntry } from './types.js';

interface RowCtx {
  row: { status: string };
}
const ctx: RowCtx = { row: { status: 'open' } };

describe('resolveActionItem', () => {
  it('base defaults: custom, visible, enabled, not danger / active, no class', () => {
    expect(resolveActionItem({ id: 'x', text: 'X' }, ctx)).toEqual({
      action: 'custom',
      id: 'x',
      text: 'X',
      icon: undefined,
      tooltip: undefined,
      shortcut: undefined,
      cssClass: '',
      isVisible: true,
      isDisabled: false,
      isDanger: false,
      isToggled: false,
    });
  });

  it('callback wins over static, static over component defaults', () => {
    const item: ActionItem<RowCtx> = {
      action: 'archive',
      text: 'Archive',
      isDisabled: false,
      getTextCallback: ({ row }) => `Archive (${row.status})`,
      getIsVisibleCallback: ({ row }) => row.status !== 'archived',
      getIsToggledCallback: () => true,
    };
    const r = resolveActionItem(item, ctx, { isDisabled: true, icon: 'box' });
    expect(r.text).toBe('Archive (open)');
    expect(r.isVisible).toBe(true);
    expect(r.isDisabled).toBe(false); // static beats the built-in default
    expect(r.icon).toBe('box'); // falls back to the default
    expect(r.isToggled).toBe(true);
  });

  it('a component default applies when neither callback nor static is set', () => {
    expect(resolveActionItem({ action: 'select-all' }, ctx, { isDisabled: true, text: 'Select all' })).toMatchObject({
      action: 'select-all',
      text: 'Select all',
      isDisabled: true,
    });
  });

  it('classes: callback replaces static; arrays and spaces normalized', () => {
    expect(resolveActionItem({ cssClass: 'a  b' }, ctx).cssClass).toBe('a b');
    expect(resolveActionItem({ cssClass: 'a', getClassCallback: () => ['c', 'd e'] }, ctx).cssClass).toBe('c d e');
  });

  it('a throwing callback is logged and the static value used', () => {
    const error = vi.spyOn(uiLogger, 'error').mockImplementation(() => {});
    const r = resolveActionItem(
      { text: 'Static', getTextCallback: () => { throw new Error('x'); } },
      ctx,
    );
    expect(r.text).toBe('Static');
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});

describe('dividers + shorthand', () => {
  it('menuDivider / isMenuDivider', () => {
    expect(menuDivider()).toEqual({ divider: true });
    expect(menuDivider('Danger zone')).toEqual({ divider: true, text: 'Danger zone' });
    expect(isMenuDivider(menuDivider())).toBe(true);
    expect(isMenuDivider({ text: 'x' })).toBe(false);
    expect(isMenuDivider(null)).toBe(false);
  });

  it('normalizeActionItems expands string built-ins', () => {
    expect(normalizeActionItems(['add', { id: 'x', text: 'X' }])).toEqual([{ action: 'add' }, { id: 'x', text: 'X' }]);
    expect(normalizeActionItems(undefined)).toEqual([]);
  });
});

describe('resolveMenuEntries', () => {
  it('drops hidden items and trims leading / trailing / doubled dividers', () => {
    const entries: MenuEntry<RowCtx>[] = [
      menuDivider(),
      { id: 'a', text: 'A' },
      { id: 'hidden', text: 'H', isVisible: false },
      menuDivider(),
      menuDivider('Group'),
      { id: 'b', text: 'B', getIsVisibleCallback: () => true },
      menuDivider(),
      { id: 'c', text: 'C', getIsVisibleCallback: () => false },
    ];
    const out = resolveMenuEntries(entries, ctx);
    expect(out.map((e) => (e.kind === 'item' ? e.resolved.id : `--${e.text ?? ''}`))).toEqual(['a', '--Group', 'b']);
  });

  it('marks submenus and applies per-item defaults; strings are built-ins', () => {
    const out = resolveMenuEntries<RowCtx, 'sort-asc'>(
      ['sort-asc', { id: 'more', text: 'More', children: [{ id: 'x', text: 'X' }] }],
      ctx,
      (item) => (item.action === 'sort-asc' ? { text: 'Sort ascending' } : undefined),
    );
    expect(out[0]).toMatchObject({ kind: 'item', resolved: { action: 'sort-asc', text: 'Sort ascending' }, hasChildren: false });
    expect(out[1]).toMatchObject({ kind: 'item', hasChildren: true });
  });
});

describe('getMenuChildren', () => {
  it('callback (async) wins over static children; a throw falls back', async () => {
    const error = vi.spyOn(uiLogger, 'error').mockImplementation(() => {});
    expect(await getMenuChildren({ children: [{ id: 's' }] }, ctx)).toEqual([{ id: 's' }]);
    expect(await getMenuChildren({ children: [{ id: 's' }], getChildrenCallback: async () => [{ id: 'd' }] }, ctx)).toEqual([
      { id: 'd' },
    ]);
    expect(
      await getMenuChildren({ children: [{ id: 's' }], getChildrenCallback: () => { throw new Error('x'); } }, ctx),
    ).toEqual([{ id: 's' }]);
    expect(await getMenuChildren({}, ctx)).toEqual([]);
    error.mockRestore();
  });
});

describe('readActionDataset', () => {
  it('copies data-* except action / id', () => {
    const btn = document.createElement('button');
    btn.dataset.action = 'custom';
    btn.dataset.id = 'confirm';
    btn.dataset.orderId = '42';
    expect(readActionDataset(btn)).toEqual({ orderId: '42' });
    expect(readActionDataset(null)).toEqual({});
  });
});

describe('runAction', () => {
  function detail(item: ActionItem<RowCtx>, trigger?: HTMLElement): ActionEventDetail<RowCtx> {
    return { ...ctx, action: item.action ?? 'custom', id: item.id, item, source: 'row-toolbar', triggerElement: trigger, dataset: {} };
  }

  it('order: before → onClick → built-in → action event, all with the same object', async () => {
    const order: string[] = [];
    const item: ActionItem<RowCtx> = { action: 'delete', onClick: async () => void order.push('onClick') };
    const d = detail(item);
    const seen: unknown[] = [];
    const ok = await runAction({
      detail: d,
      beforeActionCallback: (x) => void (order.push('before'), seen.push(x)),
      emitAction: (x) => void (order.push('event'), seen.push(x)),
      runBuiltIn: (x) => void (order.push('built-in'), seen.push(x)),
    });
    expect(ok).toBe(true);
    expect(order).toEqual(['before', 'onClick', 'built-in', 'event']);
    expect(seen.every((x) => x === d)).toBe(true);
  });

  it('beforeActionCallback false (async) cancels everything', async () => {
    const onClick = vi.fn();
    const emitAction = vi.fn();
    const runBuiltIn = vi.fn();
    const ok = await runAction({
      detail: detail({ action: 'delete', onClick }),
      beforeActionCallback: async () => false,
      emitAction,
      runBuiltIn,
    });
    expect(ok).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
    expect(emitAction).not.toHaveBeenCalled();
    expect(runBuiltIn).not.toHaveBeenCalled();
  });

  it('the item is busy while pending: aria-busy set, a second activation ignored', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const item: ActionItem<RowCtx> = { id: 'save', onClick: () => gate };
    const btn = document.createElement('button');
    const emitAction = vi.fn();
    const first = runAction({ detail: detail(item, btn), emitAction });
    await Promise.resolve();
    expect(isActionBusy(item)).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    await expect(runAction({ detail: detail(item, btn), emitAction })).resolves.toBe(false);
    release();
    await expect(first).resolves.toBe(true);
    expect(emitAction).toHaveBeenCalledOnce();
    expect(isActionBusy(item)).toBe(false);
    expect(btn.hasAttribute('aria-busy')).toBe(false);
  });

  it('a throwing onClick is logged; the built-in and the event still run', async () => {
    const error = vi.spyOn(uiLogger, 'error').mockImplementation(() => {});
    const emitAction = vi.fn();
    const runBuiltIn = vi.fn();
    await runAction({
      detail: detail({ action: 'today', onClick: () => { throw new Error('x'); } }),
      emitAction,
      runBuiltIn,
    });
    expect(emitAction).toHaveBeenCalledOnce();
    expect(runBuiltIn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it('the event sees the state the built-in left (an async built-in is awaited)', async () => {
    const rows = ['a', 'b'];
    let seen: string[] = [];
    await runAction({
      detail: detail({ action: 'delete' }),
      runBuiltIn: async () => {
        await Promise.resolve();
        rows.pop();
      },
      emitAction: () => void (seen = [...rows]),
    });
    expect(seen).toEqual(['a']);
  });

  it('a throwing built-in is logged; the event still fires', async () => {
    const error = vi.spyOn(uiLogger, 'error').mockImplementation(() => {});
    const emitAction = vi.fn();
    const ok = await runAction({
      detail: detail({ action: 'delete' }),
      runBuiltIn: () => {
        throw new Error('boom');
      },
      emitAction,
    });
    expect(ok).toBe(true);
    expect(emitAction).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
