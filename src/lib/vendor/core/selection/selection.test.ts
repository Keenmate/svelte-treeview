import { describe, expect, it, vi } from 'vitest';
import { createSelection } from './selection.js';

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

const setup = (opts: Record<string, unknown> = {}) => {
  let keys = [...KEYS];
  const changeCallback = vi.fn();
  const sel = createSelection<string>({ getOrderedKeys: () => keys, changeCallback, ...opts });
  return { sel, changeCallback, setKeys: (k: string[]) => (keys = k) };
};

describe('createSelection — multiple', () => {
  it('click selects one; Ctrl toggles; Shift selects the range from the anchor; Ctrl+Shift adds it', () => {
    const { sel, changeCallback } = setup();
    sel.click('b');
    expect(sel.values()).toEqual(['b']);
    expect(changeCallback).toHaveBeenLastCalledWith({ added: ['b'], removed: [], values: ['b'] });
    sel.click('d', { shiftKey: true });
    expect(sel.values()).toEqual(['b', 'c', 'd']);
    expect(sel.anchor).toBe('b');
    sel.click('a', { shiftKey: true }); // the range flips around the same anchor
    expect(sel.values().sort()).toEqual(['a', 'b']);
    sel.click('f', { ctrlKey: true });
    expect(sel.values().sort()).toEqual(['a', 'b', 'f']);
    expect(sel.anchor).toBe('f');
    sel.click('d', { ctrlKey: true, shiftKey: true });
    expect(sel.values().sort()).toEqual(['a', 'b', 'd', 'e', 'f']);
    sel.click('a', { metaKey: true }); // Cmd = Ctrl
    expect(sel.has('a')).toBe(false);
  });

  it('no change → no changeCallback; isSilent writes stay quiet', () => {
    const { sel, changeCallback } = setup();
    sel.click('a');
    sel.click('a');
    expect(changeCallback).toHaveBeenCalledTimes(1);
    sel.set(['c', 'd'], { isSilent: true });
    expect(changeCallback).toHaveBeenCalledTimes(1);
    expect(sel.values()).toEqual(['c', 'd']);
  });

  it('ranges follow the display order and skip unselectable keys; selectAll; clear', () => {
    const { sel, setKeys } = setup({ isSelectable: (k: string) => k !== 'c' });
    setKeys(['f', 'e', 'd', 'c', 'b', 'a']); // sorted descending
    sel.click('e');
    sel.click('b', { shiftKey: true });
    expect(sel.values()).toEqual(['e', 'd', 'b']);
    sel.click('c'); // not selectable: nothing happens
    expect(sel.size).toBe(3);
    sel.selectAll();
    expect(sel.size).toBe(5);
    sel.clear();
    expect(sel.size).toBe(0);
  });

  it('extendTo (Shift+Arrow) keeps the anchor; setAnchor moves it without selecting', () => {
    const { sel } = setup();
    sel.setAnchor('c');
    expect(sel.size).toBe(0);
    sel.extendTo('e');
    expect(sel.values()).toEqual(['c', 'd', 'e']);
    sel.extendTo('d');
    expect(sel.values()).toEqual(['c', 'd']);
    expect(sel.anchor).toBe('c');
  });

  it('a filtered-out anchor: Shift+click selects just the key', () => {
    const { sel, setKeys } = setup();
    sel.click('b');
    setKeys(['d', 'e', 'f']);
    sel.click('e', { shiftKey: true });
    expect(sel.values()).toEqual(['e']);
  });

  it('a throwing changeCallback is logged; the selection still changes', () => {
    const { sel } = setup({ changeCallback: () => { throw new Error('x'); } });
    sel.click('a');
    expect(sel.values()).toEqual(['a']);
  });
});

describe('createSelection — single', () => {
  it('one key at a time; Ctrl+click on the selected one clears; Shift ignored; selectAll no-op', () => {
    let mode: 'single' | 'multiple' = 'single';
    const { sel } = setup({ mode: () => mode });
    sel.click('a');
    sel.click('c', { shiftKey: true });
    expect(sel.values()).toEqual(['c']);
    sel.click('c', { ctrlKey: true });
    expect(sel.size).toBe(0);
    sel.toggle('b');
    sel.toggle('d');
    expect(sel.values()).toEqual(['d']);
    sel.selectAll();
    expect(sel.values()).toEqual(['d']);
    sel.set(['a', 'b']);
    expect(sel.values()).toEqual(['a']);
    mode = 'multiple'; // a live input
    sel.click('c', { ctrlKey: true });
    expect(sel.values()).toEqual(['a', 'c']);
  });
});
