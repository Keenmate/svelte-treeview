/**
 * `openMenu()` — the shared context / dropdown menu (SPEC §12.13). Renders core
 * `/actions` menu entries (icon, label, shortcut, danger / toggled / disabled,
 * named dividers, `cssClass`), opens submenus (static `children` or a lazy
 * `getChildrenCallback` with a loading row), positions every level through
 * `/positioning` `anchor()`, dismisses on outside interaction, and implements the
 * WAI-ARIA menu keyboard model with roving focus.
 */
import { getMenuChildren, isMenuDivider, resolveMenuEntries } from '../../actions/resolve.js';
import type { MenuEntry, MenuItem, ResolvedActionItem } from '../../actions/types.js';
import { formatShortcut, matchesShortcut } from '../../actions/shortcut.js';
import { deepActiveElement } from '../dom/active-element.js';
import { adoptStyles } from '../dom/adopt-styles.js';
import { ICON_CSS, renderIcon } from '../dom/render-icon.js';
import { animateOut } from '../dom/animate-out.js';
import { composedParent } from '../dom/composed-tree.js';
import { isRtl as isRtlElement } from '../dom/direction.js';
import { sharedState, sharedStateKey } from '../global/shared-state.js';
import { coreLog } from '../logging/element-logger.js';
import { callSafely } from '../logging/safe-call.js';
import { classifyDevice, getEnvironment, observeEnvironment, type DeviceClass } from '../environment/environment.js';
import { adoptMotionStyles } from '../environment/motion.js';
import { registerOverlay, type OverlayHandle } from '../overlay/active-overlay.js';
import { anchor } from '../positioning/anchor.js';
import { inheritTheme } from '../positioning/inherit-theme.js';
import { watchScrollClose } from '../positioning/scroll-close.js';
import type { AnchorHandle } from '../positioning/types.js';
import { startSheetSession } from '../overlay/sheet-session.js';
import { MENU_CSS } from './styles.js';
import { createSheetHeader, SHEET_CHROME_CSS } from '../overlay/sheet-chrome.js';
import type {
  MenuCloseReason,
  MenuHandle,
  MenuPoint,
  MenuPresentation,
  MenuPresentationMap,
  OpenMenuOptions,
  ResolvedMenuPresentation,
} from './types.js';

type Entries<Ctx, A extends string> = readonly (MenuEntry<Ctx, A> | string)[];

/** Delay before a submenu the pointer left collapses (time to cross the gap). */
const SUBMENU_HIDE_DELAY = 150;

const BLOCK = 'km-menu';
const ITEM = `${BLOCK}__item`;
const SHEET = 'km-menu-sheet';

/** `'auto'`'s default policy: the bottom sheet on a phone, the floating menu elsewhere (SPEC §12.13). */
export const DEFAULT_MENU_PRESENTATION_MAP: Readonly<Record<DeviceClass, ResolvedMenuPresentation>> = {
  mobile: 'sheet',
  tablet: 'floating',
  desktop: 'floating',
};

/** `'auto'` → the device class (`classifyDevice()`, SPEC §12.9) looked up in `map`, then the default. */
function resolveMenuPresentation(mode: MenuPresentation | undefined, map: MenuPresentationMap | undefined): ResolvedMenuPresentation {
  if (mode && mode !== 'auto') return mode;
  const cls = classifyDevice(getEnvironment());
  return map?.[cls] ?? DEFAULT_MENU_PRESENTATION_MAP[cls];
}

/** One open menu level. Open levels form a chain: root → submenu → sub-submenu. */
interface Level<Ctx, A extends string> {
  el: HTMLElement;
  /** The item in the parent level that opened this one (`null` for the root). */
  owner: HTMLElement | null;
  /** Re-readable entries (re-rendered after a keep-open item runs). */
  source: () => Entries<Ctx, A> | Promise<Entries<Ctx, A>>;
  position: AnchorHandle | null;
  /** Bumped per (re)fill, so a stale lazy load is dropped. */
  token: number;
}

interface ItemRecord<Ctx, A extends string> {
  item: MenuItem<Ctx, A>;
  resolved: ResolvedActionItem<A>;
  hasChildren: boolean;
}

function isPoint(at: OpenMenuOptions<unknown>['at']): at is MenuPoint {
  return typeof (at as Element).getBoundingClientRect !== 'function';
}

function isThenable<T>(value: unknown): value is PromiseLike<T> {
  return !!value && typeof (value as PromiseLike<T>).then === 'function';
}

/**
 * The open menus, oldest first, page-wide (every copy of core): with two menus open, only
 * the last one handles the keyboard, so one Escape closes one menu.
 */
const openMenuStack = (): object[] => sharedState(sharedStateKey('open-menus'), () => [] as object[]);

/**
 * What a point menu belongs to: the deepest element under the point (through shadow roots), when
 * it is the host or inside it — the clicked row / cell, so a scroller INSIDE the component that
 * moves it closes the menu too. `null` (→ the host) without `elementFromPoint` or off the host.
 */
/**
 * The custom element that owns `el`: `el` itself or its closest custom-element ancestor in the same tree, else
 * the shadow host of the root `el` lives in, else `el`. A component passes an overlay layer inside its shadow root
 * as `host`; its `renderIconCallback` lives on the component element.
 */
function findComponentElement(el: Element): Element {
  for (let n: Element | null = el; n; n = n.parentElement) if (n.localName.includes('-')) return n;
  const root = el.getRootNode();
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root.host : el;
}

function elementAtPoint(point: MenuPoint, hostEl: Element): Element | null {
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null; // elementFromPoint throws on NaN
  let el = document.elementFromPoint(point.x, point.y);
  while (el?.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(point.x, point.y);
    if (!inner || inner === el) break;
    el = inner;
  }
  for (let n: Element | null = el; n; n = composedParent(n)) if (n === hostEl) return el;
  return null;
}

function addClasses(el: HTMLElement, classes: string | undefined): void {
  for (const c of (classes ?? '').split(/\s+/)) if (c) el.classList.add(c);
}

/**
 * Open a menu of `entries` resolved against `ctx` (the surface context — the
 * node / row / selection it opened on). Returns a handle; when no item is
 * visible nothing is rendered and the handle is already closed.
 */
export function openMenu<Ctx, A extends string = string>(
  entries: Entries<Ctx, A> | null | undefined,
  ctx: Ctx,
  opts: OpenMenuOptions<Ctx, A>,
): MenuHandle {
  const host = opts.host;
  const styleRoot = (typeof ShadowRoot !== 'undefined' && host instanceof ShadowRoot
    ? host
    : host.getRootNode()) as Document | ShadowRoot;
  const isCustom = typeof opts.renderMenuCallback === 'function';
  const shouldDismissOutside = opts.shouldCloseOnOutsideInteraction ?? true;

  const records = new WeakMap<HTMLElement, ItemRecord<Ctx, A>>();
  const chain: Level<Ctx, A>[] = [];
  let isOpen = true;
  let collapseTimer: ReturnType<typeof setTimeout> | null = null;
  /** Hover intent: a sibling's submenu opens after a short delay while another submenu is open. */
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  const hostElement = typeof ShadowRoot !== 'undefined' && host instanceof ShadowRoot ? host.host : (host as Element);
  /** The component the menu belongs to (its icon hook): `host` is often a layer inside the component's shadow root. */
  const componentElement = findComponentElement(hostElement);
  /** The element the menu was opened from (focus returns there). */
  const opener: Element = opts.returnFocusTo ?? (opts.at instanceof Element ? opts.at : hostElement);
  /** Right-to-left (the opener's `dir`): submenus open to the left and ← / → swap. */
  const isRtl = isRtlElement(opener);
  /** This menu's place in the page-wide stack of open menus — only the topmost handles keys. */
  const menuToken = {};
  let overlay: OverlayHandle | null = null;
  let detachListeners: (() => void) | null = null;

  // ── Phone sheet (SPEC §12.13) ─────────────────────────────────────────────
  /** A bottom sheet instead of floating panels: submenus drill in, a backdrop, Back closes. */
  let presentation = resolveMenuPresentation(opts.presentation, opts.presentationMap);
  const isSheet = presentation !== 'floating';
  /** `'auto'`: stop re-resolving the presentation on device-class changes (set while open). */
  let stopPresentationWatch: (() => void) | null = null;
  /** The sheet (`role=dialog`): header + the levels, only the deepest one shown. */
  let sheet: HTMLElement | null = null;
  let sheetHeader: HTMLElement | null = null;
  let sheetTitle: HTMLElement | null = null;
  let backdrop: HTMLElement | null = null;
  /** Undo the sheet session: scroll lock + the history entry. */
  let endSheetSession: (() => void) | null = null;
  /** The "Back" rows at the top of a drilled-in submenu (sheet only; not action items). */
  const backRows = new WeakSet<HTMLElement>();

  // ── Rendering ──────────────────────────────────────────────────────────

  const createLevelElement = (isSubmenu: boolean): HTMLElement => {
    const el = document.createElement('div');
    el.className = isSubmenu ? `${BLOCK} ${BLOCK}--submenu` : BLOCK;
    if (isCustom && !isSubmenu) el.classList.add(`${BLOCK}--custom`);
    if (isSheet) {
      el.classList.add(`${BLOCK}--sheet`);
      if (opts.inheritThemeFrom) inheritTheme(opts.inheritThemeFrom, el);
    }
    addClasses(el, opts.cssClass);
    if (!isCustom) el.setAttribute('role', 'menu');
    el.tabIndex = -1;
    return el;
  };

  const prepare = (raw: MenuEntry<Ctx, A> | string): MenuEntry<Ctx, A> | string => {
    if (!opts.prepareItemCallback) return raw;
    const entry = typeof raw === 'string' ? ({ action: raw } as MenuItem<Ctx, A>) : raw;
    return isMenuDivider(entry) ? entry : opts.prepareItemCallback(entry);
  };

  /** Sheet: the "Back" row on top of a drilled-in submenu (goes up one level). */
  const addBackRow = (level: Level<Ctx, A>): void => {
    if (!isSheet || !level.owner) return;
    const row = document.createElement('div');
    row.className = `${ITEM} ${ITEM}--back`;
    row.setAttribute('role', 'menuitem');
    row.tabIndex = -1;
    const label = document.createElement('span');
    label.className = `${BLOCK}__label`;
    label.textContent = opts.labels?.back ?? 'Back';
    row.appendChild(label);
    row.addEventListener('mouseenter', () => row.focus({ preventScroll: true }));
    backRows.add(row);
    level.el.prepend(row);
  };

  /** Render `list` into a level. Returns the number of items rendered. */
  const renderLevel = (level: Level<Ctx, A>, list: Entries<Ctx, A>): number => {
    const el = level.el;
    el.textContent = '';
    el.removeAttribute('aria-busy');
    addBackRow(level);
    const resolvedEntries = resolveMenuEntries(list.map(prepare), ctx, opts.defaults, host);
    // Any icon at this level → every item gets the icon column, so labels line up.
    const hasIcons = resolvedEntries.some((e) => e.kind === 'item' && !!e.resolved.icon);
    el.classList.toggle(`${BLOCK}--has-icons`, hasIcons);
    let count = 0;
    for (const entry of resolvedEntries) {
      if (entry.kind === 'divider') {
        const divider = document.createElement('div');
        divider.className = `${BLOCK}__divider`;
        divider.setAttribute('role', 'separator');
        if (entry.text) {
          divider.classList.add(`${BLOCK}__divider--named`);
          divider.textContent = entry.text;
        }
        el.appendChild(divider);
        continue;
      }
      const { item, resolved, hasChildren } = entry;
      const itemEl = document.createElement('div');
      itemEl.className = ITEM;
      // A toggle (defines its toggle state) is a menuitemcheckbox; the rest are menuitems.
      itemEl.setAttribute('role', resolved.isToggle ? 'menuitemcheckbox' : 'menuitem');
      if (resolved.isToggle) itemEl.setAttribute('aria-checked', String(resolved.isToggled));
      itemEl.tabIndex = -1;
      itemEl.dataset.action = resolved.action;
      if (resolved.id !== undefined) itemEl.dataset.id = resolved.id;
      if (resolved.isDisabled) {
        itemEl.classList.add(`${ITEM}--disabled`);
        itemEl.setAttribute('aria-disabled', 'true');
      }
      if (resolved.isDanger) itemEl.classList.add(`${ITEM}--danger`);
      if (resolved.isToggled) itemEl.classList.add(`${ITEM}--toggled`);
      if (hasChildren) {
        itemEl.classList.add(`${ITEM}--has-submenu`);
        itemEl.setAttribute('aria-haspopup', 'menu');
        itemEl.setAttribute('aria-expanded', 'false');
      }
      addClasses(itemEl, resolved.cssClass);
      if (resolved.tooltip) itemEl.title = resolved.tooltip;

      opts.renderItemCallback?.(item, itemEl, ctx, resolved);
      if (!itemEl.hasChildNodes()) {
        if (hasIcons) {
          const icon = document.createElement('span');
          icon.className = `${BLOCK}__icon`;
          icon.setAttribute('aria-hidden', 'true');
          // Icons are data (SPEC §12.33): markup raw, built-in names masked, the component's then the page hook (ctx.item = the entry), icon-font classes, else text.
          if (resolved.icon) icon.innerHTML = renderIcon(resolved.icon, { host: componentElement, context: { item } });
          itemEl.appendChild(icon);
        }
        const label = document.createElement('span');
        label.className = `${BLOCK}__label`;
        label.textContent = resolved.text;
        itemEl.appendChild(label);
        if (resolved.shortcut) {
          const shortcut = document.createElement('span');
          shortcut.className = `${BLOCK}__shortcut`;
          shortcut.textContent = formatShortcut(resolved.shortcut);
          itemEl.appendChild(shortcut);
        }
      }

      records.set(itemEl, { item, resolved, hasChildren });
      itemEl.addEventListener('mouseenter', () => onItemEnter(itemEl));
      itemEl.addEventListener('mouseleave', () => onItemLeave(itemEl));
      el.appendChild(itemEl);
      count++;
    }
    return count;
  };

  const showLoading = (level: Level<Ctx, A>): void => {
    const loading = document.createElement('div');
    loading.className = `${BLOCK}__loading`;
    loading.setAttribute('role', 'none');
    loading.textContent = opts.labels?.loading ?? '…';
    level.el.replaceChildren(loading);
    addBackRow(level);
    level.el.setAttribute('aria-busy', 'true'); // cleared when the items are rendered
  };

  /**
   * (Re)fill a level from its source: synchronously for a static list, else
   * a loading row until the promise resolves. `onFilled(count)` runs once the
   * items are in (not when the level was closed or refilled meanwhile).
   */
  const fillLevel = (level: Level<Ctx, A>, onFilled?: (count: number) => void): void => {
    const token = ++level.token;
    let result: Entries<Ctx, A> | Promise<Entries<Ctx, A>>;
    try {
      result = level.source();
    } catch (error) {
      coreLog(host, 'UI', 'MENU').error('menu entries threw', error);
      result = [];
    }
    if (!isThenable<Entries<Ctx, A>>(result)) {
      onFilled?.(renderLevel(level, result));
      return;
    }
    showLoading(level);
    void Promise.resolve(result).then(
      (list) => {
        if (token !== level.token || !chain.includes(level)) return;
        const count = renderLevel(level, list ?? []);
        level.position?.update();
        onFilled?.(count);
      },
      (error) => {
        coreLog(host, 'UI', 'MENU').error('menu entries threw', error);
        if (token === level.token && chain.includes(level)) onFilled?.(renderLevel(level, []));
      },
    );
  };

  // ── Levels ─────────────────────────────────────────────────────────────

  const levelIndexOf = (el: Element): number => chain.findIndex((l) => l.el.contains(el));

  /** Close every level from `depth` down (submenus only — the root closes via `close()`). */
  const collapseFrom = (depth: number): void => {
    while (chain.length > Math.max(depth, 1)) {
      const level = chain.pop()!;
      const hadFocus = level.el.contains(deepActiveElement());
      level.position?.destroy();
      level.el.remove();
      level.owner?.setAttribute('aria-expanded', 'false');
      syncSheet(); // the parent level is shown again before its item takes focus
      if (hadFocus) level.owner?.focus({ preventScroll: true });
    }
  };

  /** Go up one level from `depth` (a submenu): close it, focus the item that opened it. */
  const goUp = (depth: number): void => {
    const owner = chain[depth]?.owner;
    collapseFrom(depth);
    focusItem(owner ?? undefined);
  };

  /** Sheet: show only the deepest level; the header names it (the menu title, else the submenu's item). */
  const syncSheet = (): void => {
    if (!sheet) return;
    const last = chain.length - 1;
    chain.forEach((level, i) => (level.el.hidden = i !== last));
    const owner = chain[last]?.owner;
    const title = owner ? (records.get(owner)?.resolved.text ?? '') : (opts.title ?? '');
    if (sheetTitle) sheetTitle.textContent = title;
  };

  const cancelCollapse = (): void => {
    if (collapseTimer !== null) clearTimeout(collapseTimer);
    collapseTimer = null;
    if (openTimer !== null) clearTimeout(openTimer);
    openTimer = null;
  };

  const scheduleCollapse = (depth: number): void => {
    cancelCollapse();
    collapseTimer = setTimeout(() => {
      collapseTimer = null;
      if (isOpen) collapseFrom(depth);
    }, SUBMENU_HIDE_DELAY);
  };

  /** The focusable rows of a level: enabled items (+ the sheet's Back row). */
  const enabledItems = (level: Level<Ctx, A>): HTMLElement[] =>
    Array.from(level.el.children).filter(
      (el): el is HTMLElement =>
        backRows.has(el as HTMLElement) ||
        (records.has(el as HTMLElement) && !records.get(el as HTMLElement)!.resolved.isDisabled),
    );

  const focusItem = (el: HTMLElement | undefined): void => {
    el?.focus({ preventScroll: false });
  };

  /** Open the submenu of `owner` (at `depth`), optionally focusing its first item once loaded. */
  const openSubmenu = (depth: number, owner: HTMLElement, shouldFocus: boolean): void => {
    const record = records.get(owner);
    if (!record?.hasChildren || record.resolved.isDisabled) return;
    const open = chain[depth + 1];
    if (open?.owner === owner) {
      if (shouldFocus) focusItem(enabledItems(open)[0]);
      return;
    }
    collapseFrom(depth + 1);
    const { item } = record;
    const level: Level<Ctx, A> = {
      el: createLevelElement(true),
      owner,
      source:
        typeof item.getChildrenCallback === 'function'
          ? () => getMenuChildren(item, ctx, host)
          : () => item.children ?? [],
      position: null,
      token: 0,
    };
    chain.push(level);
    owner.setAttribute('aria-expanded', 'true');
    // The submenu is named by the item that opened it (WAI-ARIA menu pattern).
    const ownerLabel = record.resolved.text;
    if (ownerLabel) level.el.setAttribute('aria-label', ownerLabel);
    if (!isSheet) {
      level.el.addEventListener('mouseenter', cancelCollapse);
      level.el.addEventListener('mouseleave', () => {
        const index = chain.indexOf(level);
        if (index > 0) scheduleCollapse(index);
      });
    }
    wireLevel(level);
    if (sheet) {
      // Drill in: the submenu replaces its parent in the sheet (Back row on top).
      sheet.appendChild(level.el);
      syncSheet();
    } else host.appendChild(level.el);
    fillLevel(level, (count) => {
      if (count === 0) {
        collapseFrom(chain.indexOf(level));
        return;
      }
      // The sheet hid the item that had focus: focus moves into the submenu (its Back row,
      // or its first item when the keyboard opened it — like the floating menu).
      const rows = enabledItems(level);
      if (shouldFocus) focusItem(rows.find((r) => !backRows.has(r)) ?? rows[0]);
      else if (isSheet) rows[0]?.focus({ preventScroll: true });
    });
    // A lazy submenu still loading: its Back row holds focus meanwhile.
    if (isSheet && chain.includes(level) && level.el.getAttribute('aria-busy') === 'true') {
      level.el.querySelector<HTMLElement>(`.${ITEM}--back`)?.focus({ preventScroll: true });
    }
    // A static list with no visible entries collapsed the level synchronously above —
    // never position a level that is already gone (its anchor would never be destroyed).
    if (!chain.includes(level) || isSheet) return;
    level.position = anchor(level.el, owner, {
      placement: isRtl ? 'left-start' : 'right-start',
      offset: { mainAxis: 0, crossAxis: -4 },
      shift: 8,
      maxHeight: { padding: 8 },
      ...(opts.inheritThemeFrom ? { inheritThemeFrom: opts.inheritThemeFrom } : {}),
    });
  };

  // ── Pointer ────────────────────────────────────────────────────────────

  const onItemEnter = (itemEl: HTMLElement): void => {
    if (!isOpen) return;
    const depth = levelIndexOf(itemEl);
    if (depth < 0) return;
    cancelCollapse();
    const record = records.get(itemEl)!;
    if (!record.resolved.isDisabled) itemEl.focus({ preventScroll: true });
    if (isSheet) return; // a sheet drills in on a tap / Enter only — never on hover
    const openChild = chain[depth + 1];
    if (record.hasChildren && !record.resolved.isDisabled) {
      // Hover intent: with ANOTHER item's submenu open, the pointer may only be crossing
      // this item on its way there — open this submenu after the same short delay instead
      // of collapsing the other one at once. Entering the open submenu cancels it.
      if (openChild && openChild.owner !== itemEl) {
        openTimer = setTimeout(() => {
          openTimer = null;
          if (isOpen) openSubmenu(depth, itemEl, false);
        }, SUBMENU_HIDE_DELAY);
      } else openSubmenu(depth, itemEl, false);
    } else if (openChild) scheduleCollapse(depth + 1);
  };

  const onItemLeave = (itemEl: HTMLElement): void => {
    // A sheet hides the parent level when it drills in, which fires mouseleave on the item that
    // opened the submenu — collapsing it again. Sheets close a level only by Back / close.
    if (isSheet) return;
    const depth = levelIndexOf(itemEl);
    if (depth >= 0 && chain[depth + 1]?.owner === itemEl) scheduleCollapse(depth + 1);
  };

  const wireLevel = (level: Level<Ctx, A>): void => {
    if (isCustom) return;
    level.el.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const itemEl = target?.closest?.(`.${ITEM}`) as HTMLElement | null;
      if (!itemEl || !level.el.contains(itemEl)) return;
      if (backRows.has(itemEl)) {
        goUp(chain.indexOf(level));
        return;
      }
      const record = records.get(itemEl);
      if (!record || record.resolved.isDisabled) return;
      if (record.hasChildren) openSubmenu(chain.indexOf(level), itemEl, false);
      else activate(itemEl, event);
    });
  };

  // ── Activation ─────────────────────────────────────────────────────────

  /** Run a leaf: close first (unless it keeps the menu open), then hand it to `runAction`. */
  const activate = (itemEl: HTMLElement, event: Event): void => {
    const record = records.get(itemEl);
    if (!record || record.resolved.isDisabled || record.hasChildren) return;
    const isKeptOpen = record.item.shouldCloseOnClick === false;
    if (!isKeptOpen) close('action');
    let result: unknown;
    try {
      result = opts.runAction?.(record.item, { triggerElement: itemEl, sourceEvent: event });
    } catch (error) {
      coreLog(host, 'UI', 'MENU').error('menu runAction threw', error);
    }
    if (!isKeptOpen) {
      // Nobody awaits a closed menu's action: log a rejection instead of leaving it unhandled.
      if (isThenable(result)) {
        Promise.resolve(result).catch((error: unknown) => coreLog(host, 'UI', 'MENU').error('menu runAction rejected', error));
      }
      return;
    }
    const level = chain.find((l) => l.el.contains(itemEl));
    const refresh = (): void => {
      if (!isOpen || !level || !chain.includes(level)) return;
      const wasFocused = level.el.contains(deepActiveElement());
      const key = `${record.resolved.action}\u0000${record.resolved.id ?? ''}`;
      collapseFrom(chain.indexOf(level) + 1);
      fillLevel(level, (count) => {
        // Every item of the menu is hidden now: don't leave an empty box open.
        if (count === 0) {
          if (level === chain[0]) close('empty');
          else collapseFrom(chain.indexOf(level));
          return;
        }
        if (!wasFocused) return;
        const same = enabledItems(level).find((el) => {
          const r = records.get(el)?.resolved;
          return !!r && `${r.action}\u0000${r.id ?? ''}` === key;
        });
        focusItem(same ?? enabledItems(level)[0]);
      });
    };
    void Promise.resolve(result).then(refresh, refresh);
  };

  // ── Keyboard ───────────────────────────────────────────────────────────

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isOpen || event.isComposing) return;
    // Two menus open (a context menu over a pinned one): only the topmost one handles keys.
    const stack = openMenuStack();
    if (stack[stack.length - 1] !== menuToken) return;
    const path = event.composedPath();
    // The sheet's header (its close button) counts as inside the open level; Enter / Space
    // there is the button's own (native click).
    const isInHeader = !!sheetHeader && path.includes(sheetHeader);
    if (isInHeader && (event.key === 'Enter' || event.key === ' ')) return;
    const inside = isInHeader ? chain.length - 1 : chain.findIndex((l) => path.includes(l.el));
    // Keyboard-modal only while focus is in the menu, on its opener, or nowhere in
    // particular (the body). Focus in an unrelated field (a pinned menu beside a form, a
    // right-click menu over an editor) keeps its keys — only Escape still closes the menu.
    const isTargetNeutral = path[0] === document.body || path[0] === document.documentElement || path[0] === hostElement;
    if (inside < 0 && !path.includes(opener) && !isTargetNeutral) {
      if (event.key === 'Escape' && shouldDismissOutside) close('escape');
      return;
    }
    const depth = inside < 0 ? chain.length - 1 : inside;
    const level = chain[depth]!;
    const focused = (path.find(
      (n) => n instanceof HTMLElement && (records.has(n) || backRows.has(n)) && level.el.contains(n),
    ) ?? null) as HTMLElement | null;
    const record = focused ? (records.get(focused) ?? null) : null;
    const isBackRow = !!focused && backRows.has(focused);

    if (event.key === 'Tab') {
      // A custom menu (renderMenuCallback) may hold a form: Tab moves between its fields.
      if (isCustom && inside >= 0) return;
      close('tab'); // focus returns, then the browser moves it on — no preventDefault
      return;
    }
    // Logical keys: in a right-to-left menu ← opens a submenu and → goes back.
    const key = isRtl && event.key === 'ArrowRight' ? 'ArrowLeft' : isRtl && event.key === 'ArrowLeft' ? 'ArrowRight' : event.key;
    if (isCustom) {
      if (event.key !== 'Escape') return;
      close('escape');
    } else {
      switch (key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          const items = enabledItems(level);
          if (!items.length) break;
          const at = focused ? items.indexOf(focused) : -1;
          const step = event.key === 'ArrowDown' ? 1 : -1;
          const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
          focusItem(items[next]);
          break;
        }
        case 'Home':
          focusItem(enabledItems(level)[0]);
          break;
        case 'End':
          focusItem(enabledItems(level).at(-1));
          break;
        case 'ArrowRight':
          if (focused && record?.hasChildren) openSubmenu(depth, focused, true);
          break;
        case 'ArrowLeft':
          if (depth > 0) goUp(depth);
          break;
        case 'Escape':
          if (depth > 0) goUp(depth);
          else close('escape');
          break;
        case 'Enter':
        case ' ':
          if (isBackRow && depth > 0) {
            goUp(depth);
            break;
          }
          if (!focused || !record || record.resolved.isDisabled) break;
          if (record.hasChildren) openSubmenu(depth, focused, true);
          else activate(focused, event);
          break;
        default: {
          // An item's shortcut (`/actions` syntax: a letter, case-insensitive, a key name like `F2`, or a
          // chord like `Ctrl+C`): the current level first, then its ancestors.
          for (let d = depth; d >= 0; d--) {
            const hit = enabledItems(chain[d]!).find((el) => matchesShortcut(event, records.get(el)?.resolved.shortcut));
            if (!hit) continue;
            if (records.get(hit)!.hasChildren) openSubmenu(d, hit, true);
            else activate(hit, event);
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
          }
          return;
        }
      }
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  // ── Dismiss ────────────────────────────────────────────────────────────

  const isInside = (event: Event): boolean => {
    const path = event.composedPath();
    return (!!sheet && path.includes(sheet)) || chain.some((l) => path.includes(l.el));
  };

  const attachListeners = (): void => {
    const onPointerDown = (e: Event) => {
      // The sheet's backdrop closes on its `click` (so the tap can't click through to the page).
      if (!isInside(e) && !(backdrop && e.composedPath().includes(backdrop))) close('outside-click');
    };
    const onBlur = () => close('blur');
    // keydown in capture on the document: the menu is keyboard-modal while open,
    // whether focus is in it (submenu nav) or still on the opener (shortcuts, ↓).
    document.addEventListener('keydown', onKeydown, true);
    let stopScrollClose: (() => void) | undefined;
    if (shouldDismissOutside) {
      document.addEventListener('pointerdown', onPointerDown, true);
      // The popover's scroll rule (SPEC §12.2): only a scroll of the page or of a scroller around
      // what the menu belongs to (its `at` element; for a point, the element under it inside the host — the
      // clicked cell / row, so the component's own scroller counts — else the host),
      // once that has actually moved; never a scroll inside the menu, never a bare wheel.
      const hostEl = typeof ShadowRoot !== 'undefined' && host instanceof ShadowRoot ? host.host : (host as Element);
      // A sheet is modal over a scroll-locked page: nothing behind it can scroll.
      if (!isSheet) {
        stopScrollClose = watchScrollClose({
          reference: opts.at instanceof Element ? opts.at : (elementAtPoint(opts.at, hostEl) ?? hostEl),
          isInside,
          onScroll: () => close('scroll'),
        });
      }
      window.addEventListener('blur', onBlur);
      // In the page-wide overlay tree (SPEC §12.9): a menu opened from inside another
      // overlay (a context menu in a dropdown) is its child and doesn't dismiss it.
      overlay = registerOverlay(() => close('overlay'), opts.overlayGroup, { getElement: () => sheet ?? chain[0]?.el });
      const hostElement = typeof ShadowRoot !== 'undefined' && host instanceof ShadowRoot ? host.host : (host as Element);
      overlay.activate({ trigger: opts.returnFocusTo ?? (opts.at instanceof Element ? opts.at : hostElement) });
    }
    detachListeners = () => {
      document.removeEventListener('keydown', onKeydown, true);
      if (!shouldDismissOutside) return;
      document.removeEventListener('pointerdown', onPointerDown, true);
      stopScrollClose?.();
      window.removeEventListener('blur', onBlur);
      overlay?.deactivate();
      overlay?.destroy();
      overlay = null;
    };
  };

  function close(reason: MenuCloseReason): void {
    if (!isOpen) return;
    isOpen = false;
    const stack = openMenuStack();
    const at = stack.indexOf(menuToken);
    if (at >= 0) stack.splice(at, 1);
    const active = deepActiveElement();
    const hadFocus = (!!sheet && !!active && sheet.contains(active)) || chain.some((l) => l.el.contains(active));
    cancelCollapse();
    stopPresentationWatch?.();
    stopPresentationWatch = null;
    detachListeners?.();
    detachListeners = null;
    for (const level of chain.splice(0).reverse()) {
      level.position?.destroy();
      if (!sheet) level.el.remove(); // a sheet's levels leave with it
    }
    if (sheet && backdrop) removeSheetAnimated(sheet, backdrop);
    endSheetSession?.();
    endSheetSession = null;
    // A sheet is modal: a backdrop tap dismisses it like Escape (focus goes back to the opener).
    const isPointerAway =
      (reason === 'outside-click' && !isSheet) || reason === 'scroll' || reason === 'blur' || reason === 'overlay';
    if (hadFocus && !isPointerAway && opts.returnFocusTo?.isConnected) {
      opts.returnFocusTo.focus({ preventScroll: true });
    }
    // A throwing onClose must not escape close() (or the document listener that called it).
    const { onClose } = opts;
    if (onClose) callSafely(() => onClose(reason), { source: host, coreCategory: 'MENU', message: 'menu onClose threw' });
  }

  // ── Open ───────────────────────────────────────────────────────────────

  adoptStyles(styleRoot, MENU_CSS, SHEET_CHROME_CSS, ICON_CSS);
  const rootLevel: Level<Ctx, A> = {
    el: createLevelElement(false),
    owner: null,
    source: () => entries ?? [],
    position: null,
    token: 0,
  };
  chain.push(rootLevel);
  let count = 0;
  if (isCustom) {
    opts.renderMenuCallback!(rootLevel.el, () => close('api'));
    count = 1;
  } else {
    fillLevel(rootLevel, (n) => (count = n));
  }
  if (count === 0) {
    chain.length = 0;
    isOpen = false;
    return {
      isOpen: false,
      element: null,
      close() {},
      focusFirst() {},
      update() {},
    };
  }
  openMenuStack().push(menuToken); // only once it really opens (close() removes it)
  wireLevel(rootLevel);
  if (opts.title) rootLevel.el.setAttribute('aria-label', opts.title);

  if (isSheet) openSheet();
  else {
    host.appendChild(rootLevel.el);
    positionRoot();
  }
  attachListeners();
  if (!opts.presentation || opts.presentation === 'auto') {
    // A device-class change while open (a foldable unfolds, DevTools emulation): sheet ⇄ drawer
    // switches in place; to / from the floating menu is another structure, so it closes.
    stopPresentationWatch = observeEnvironment(
      () => {
        const next = resolveMenuPresentation(opts.presentation, opts.presentationMap);
        if (!isOpen || next === presentation) return;
        if ((next === 'floating') !== !isSheet) {
          close('presentation');
          return;
        }
        presentation = next;
        applySheetKind();
      },
      { shouldFireImmediately: false },
    );
  }

  /** Sheet vs drawer (and the drawer's physical edge: `side` + the opener's direction). */
  function applySheetKind(): void {
    if (!sheet || !backdrop) return;
    const isDrawer = presentation === 'drawer';
    const isLeft = (opts.side ?? 'start') === 'start' ? !isRtl : isRtl;
    sheet.classList.toggle(`${SHEET}--drawer`, isDrawer);
    sheet.classList.toggle(`${SHEET}--left`, isDrawer && isLeft);
    sheet.classList.toggle(`${SHEET}--right`, isDrawer && !isLeft);
  }

  /** Close animation (motion tokens, SPEC §12.16), then out of the DOM; none → removed at once. */
  function removeSheetAnimated(sheetEl: HTMLElement, backdropEl: HTMLElement): void {
    // Each its own modifier; both go once the longer of the two animations ends.
    animateOut([sheetEl, backdropEl], {
      className: (el) => (el === backdropEl ? `${SHEET}-backdrop--closing` : `${SHEET}--closing`),
      onDone: () => {
        sheetEl.remove();
        backdropEl.remove();
      },
    });
  }

  /** Sheet: backdrop + `role=dialog` sheet (header: title + close) at the bottom; scroll lock + Back. */
  function openSheet(): void {
    backdrop = document.createElement('div');
    backdrop.className = `${SHEET}-backdrop`;
    backdrop.addEventListener('click', () => close('outside-click'));
    // A press on the backdrop must not pull focus out of the sheet (it returns to the opener on close).
    backdrop.addEventListener('mousedown', (e) => e.preventDefault());
    sheet = document.createElement('div');
    sheet.className = SHEET;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (opts.title) sheet.setAttribute('aria-label', opts.title);
    // The shared sheet chrome (core `createSheetHeader`, SPEC \u00a712.9); `__header` / `__title` /
    // `__close` stay as the menu's own hooks.
    const chrome = createSheetHeader({
      title: '',
      closeLabel: opts.labels?.close ?? 'Close',
      onClose: () => close('close-button'),
    });
    sheetHeader = chrome.header;
    sheetHeader.classList.add(`${SHEET}__header`);
    sheetTitle = chrome.title;
    sheetTitle?.classList.add(`${SHEET}__title`);
    chrome.close.classList.add(`${SHEET}__close`);
    sheet.append(sheetHeader, rootLevel.el);
    if (opts.inheritThemeFrom) {
      inheritTheme(opts.inheritThemeFrom, sheet);
      inheritTheme(opts.inheritThemeFrom, backdrop);
    }
    applySheetKind();
    host.append(backdrop, sheet);
    // Durations come from the motion tokens: make sure OS reduced motion / data-motion reach them.
    adoptMotionStyles(sheet);
    syncSheet();
    // Scroll lock + the phone Back entry: up one submenu level (the entry is re-armed), else close.
    const session = startSheetSession(sheet, {
      shouldObserveKeyboardInset: false, // no text field in a menu
      logSource: host instanceof ShadowRoot ? host.host : host instanceof Element ? host : undefined,
      onBack: () => {
        if (!isOpen) return;
        if (chain.length > 1) {
          goUp(chain.length - 1);
          session.rearmBack();
        } else close('back');
      },
    });
    endSheetSession = session.end;
    // Modal: focus moves into the sheet (and returns to `returnFocusTo` on close).
    if (!opts.shouldFocusFirst) rootLevel.el.focus({ preventScroll: true });
  }

  /** Floating: anchor the root level at the point / element. */
  function positionRoot(): void {
    const at = opts.at;
    const reference = isPoint(at)
      ? {
          getBoundingClientRect: () =>
            ({ x: at.x, y: at.y, width: 0, height: 0, top: at.y, left: at.x, right: at.x, bottom: at.y }) as DOMRect,
        }
      : at;
    rootLevel.position = anchor(rootLevel.el, reference, {
      placement: opts.placement ?? 'bottom-start',
      // A point menu sits at the cursor; one dropping from an element takes the page's field → panel gap.
      offset: opts.offset ?? (isPoint(at) ? 0 : undefined),
      shift: 8,
      maxHeight: { padding: 8 },
      ...(opts.inheritThemeFrom ? { inheritThemeFrom: opts.inheritThemeFrom } : {}),
    });
    if (isPoint(at)) {
      // Until the first (async) computation lands, show it at the point, not at 0,0.
      rootLevel.el.style.left = `${at.x}px`;
      rootLevel.el.style.top = `${at.y}px`;
    }
  }

  const handle: MenuHandle = {
    get isOpen() {
      return isOpen;
    },
    get element() {
      return rootLevel.el;
    },
    close: () => close('api'),
    focusFirst: () => {
      if (isOpen) focusItem(enabledItems(rootLevel)[0]);
    },
    update: () => {
      for (const level of chain) level.position?.update();
    },
  };
  if (opts.shouldFocusFirst) handle.focusFirst();
  return handle;
}
