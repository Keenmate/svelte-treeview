// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUILT_IN_ICON_NAMES, publishIconHook, renderIcon, type RenderIconCallback } from './render-icon.js';

const setHook = (cb: RenderIconCallback | undefined): void => {
  publishIconHook();
  (window.components as { renderIconCallback?: RenderIconCallback }).renderIconCallback = cb;
};

describe('renderIcon', () => {
  afterEach(() => setHook(undefined));

  it('markup raw, a built-in name masked from its token, class names an icon font, anything else escaped text', () => {
    expect(renderIcon('<svg viewBox="0 0 1 1"></svg>')).toBe('<svg viewBox="0 0 1 1"></svg>');
    expect(renderIcon('settings', { prefix: 'cp' })).toBe(
      '<span class="km-icon cp__icon cp__icon--settings" style="--_km-icon: var(--base-icon-settings, linear-gradient(transparent 0 0))" aria-hidden="true"></span>',
    );
    expect(renderIcon('chevron')).toContain('var(--base-icon-chevron,');
    expect(renderIcon('fa-solid  fa-folder', { prefix: 'tv' })).toBe('<i class="tv__icon fa-solid fa-folder" aria-hidden="true"></i>');
    expect(renderIcon('bi-gear')).toBe('<i class="bi-gear" aria-hidden="true"></i>');
    expect(renderIcon('🚀')).toBe('🚀');
    expect(renderIcon('a"><img src=x onerror=1>')).not.toContain('<img');
    expect(renderIcon('  ')).toBe('');
    expect(renderIcon(null)).toBe('');
  });

  it('the built-in names are the base-css-variables glyphs', () => {
    expect(BUILT_IN_ICON_NAMES).toContain('close');
    expect(BUILT_IN_ICON_NAMES).not.toContain('check-size');
    expect(Object.isFrozen(BUILT_IN_ICON_NAMES)).toBe(true);
  });

  it('window.components.renderIconCallback maps the other names; null falls through; built-ins and markup never reach it', () => {
    const host = document.createElement('web-ms');
    const hook = vi.fn<RenderIconCallback>((name) => (name === 'star' ? '<svg class="star"></svg>' : name === 'none' ? '' : null));
    setHook(hook);
    expect(window.components?.renderIconCallback).toBe(hook);
    expect(Object.keys(window.components ?? {})).not.toContain('renderIconCallback');
    expect(renderIcon('star', { prefix: 'ms', host })).toBe('<svg class="star"></svg>');
    expect(hook).toHaveBeenLastCalledWith('star', { component: 'web-ms', element: host, prefix: 'ms' });
    expect(renderIcon('none')).toBe('');
    expect(renderIcon('fa-solid fa-x')).toBe('<i class="fa-solid fa-x" aria-hidden="true"></i>');
    expect(renderIcon('lucide:rocket')).toBe('lucide:rocket');
    hook.mockClear();
    renderIcon('close');
    renderIcon('<b>x</b>');
    expect(hook).not.toHaveBeenCalled();
  });

  it("the element's own renderIconCallback comes first; null passes the name on to the page hook", () => {
    setHook((name) => (name === 'star' || name === 'moon' ? `<page-${name}>` : null));
    const host = Object.assign(document.createElement('web-ms'), {
      renderIconCallback: vi.fn<RenderIconCallback>((name, ctx) => (name === 'star' ? `<own-star ${String(ctx.item)}>` : null)),
    });
    expect(renderIcon('star', { host, context: { item: 7 } })).toBe('<own-star 7>');
    expect(host.renderIconCallback).toHaveBeenLastCalledWith('star', { item: 7, component: 'web-ms', element: host, prefix: '' });
    expect(renderIcon('moon', { host })).toBe('<page-moon>');
    expect(renderIcon('bi-x', { host })).toBe('<i class="bi-x" aria-hidden="true"></i>');
    expect(renderIcon('star', { host, renderIconCallback: null })).toBe('<page-star>'); // an explicit option wins over the host
    setHook(undefined);
    expect(renderIcon('star', { host })).toBe('<own-star undefined>'); // no page setup needed
    host.renderIconCallback.mockClear();
    renderIcon('close', { host });
    expect(host.renderIconCallback).not.toHaveBeenCalled();
  });

  it('the component option names a host that is not the component element (a framework component in a <div>)', () => {
    const hook = vi.fn<RenderIconCallback>(() => '<own>');
    const host = document.createElement('div');
    expect(renderIcon('star', { host, component: 'svelte-treeview', prefix: 'stv', renderIconCallback: hook })).toBe('<own>');
    expect(hook).toHaveBeenLastCalledWith('star', { component: 'svelte-treeview', element: host, prefix: 'stv' });
    renderIcon('star', { component: 'svelte-treeview', renderIconCallback: hook });
    expect(hook).toHaveBeenLastCalledWith('star', { component: 'svelte-treeview', element: null, prefix: '' });
  });

  it('a throwing hook is logged and the default rendering follows', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    setHook(() => {
      throw new Error('boom');
    });
    expect(renderIcon('bi-gear')).toBe('<i class="bi-gear" aria-hidden="true"></i>');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
