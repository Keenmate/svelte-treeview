import type { MenuItem, ResolvedActionItem } from '../../actions/types.js';
import type { AnchorOffset, Placement } from '../positioning/types.js';
import type { DeviceClass } from '../environment/environment.js';

/** A viewport point (`clientX` / `clientY`) — where a context menu opens. */
export interface MenuPoint {
  x: number;
  y: number;
}

/**
 * Why a menu closed (the argument of {@link OpenMenuOptions.onClose}):
 * - `'action'` — a leaf item ran (and doesn't keep the menu open)
 * - `'escape'` — Escape on the root menu
 * - `'tab'` — Tab / Shift+Tab (focus leaves the menu)
 * - `'outside-click'` — a pointer press outside every menu level
 * - `'scroll'` — a scroll that moved what the menu belongs to (its `at` element, else the host):
 *   the page or a scroller around it, never one inside the menu or a bare wheel (the popover rule)
 * - `'blur'` — the window lost focus
 * - `'overlay'` — another KM overlay opened (`registerOverlay` coordination)
 * - `'api'` — `handle.close()`
 * - `'empty'` — a keep-open item's refresh left no visible item
 * - `'back'` — the phone Back button / gesture on the root of a sheet (see {@link MenuPresentation})
 * - `'close-button'` — the sheet's close button
 * - `'presentation'` — `'auto'` resolved to another kind while open (floating ⇄ sheet / drawer:
 *   the device class changed, e.g. a foldable unfolded); open it again to get the new one
 *
 * On a sheet, a tap on the backdrop is `'outside-click'`.
 */
export type MenuCloseReason =
  | 'action'
  | 'escape'
  | 'tab'
  | 'outside-click'
  | 'scroll'
  | 'blur'
  | 'overlay'
  | 'api'
  | 'empty'
  | 'back'
  | 'close-button'
  | 'presentation';

/**
 * How a menu is shown:
 * - `'auto'` (default) — by the device class (`classifyDevice()`, SPEC §12.9) through
 *   {@link OpenMenuOptions.presentationMap}: by default a bottom sheet on a phone, the floating
 *   menu on a tablet / desktop
 * - `'floating'` — always the floating menu next to the point / element
 * - `'sheet'` — always the bottom sheet: full width at the bottom over a backdrop, a header
 *   (title + close button), touch-size rows, submenus drill in (a Back row goes up), page
 *   scroll locked, the phone Back button closes it (or goes up one submenu level)
 * - `'drawer'` — the sheet as a full-height side panel on {@link OpenMenuOptions.side}
 */
export type MenuPresentation = 'auto' | ResolvedMenuPresentation;

/** What a menu is rendered as ({@link MenuPresentation} without `'auto'`). */
export type ResolvedMenuPresentation = 'floating' | 'sheet' | 'drawer';

/** `'auto'`'s device class → presentation; classes left out keep the default (`mobile: 'sheet'`, else `'floating'`). */
export type MenuPresentationMap = Partial<Record<DeviceClass, ResolvedMenuPresentation>>;

/** The edge a `'drawer'` slides in from: `'start'` (left in LTR, right in RTL) or `'end'`. */
export type MenuDrawerSide = 'start' | 'end';

/** What activated an item — handed to {@link OpenMenuOptions.runAction}. */
export interface MenuInvocation {
  /** The rendered item element. */
  triggerElement: HTMLElement;
  /** The click / keydown that activated it. */
  sourceEvent: Event;
}

/** Options for {@link openMenu}. */
export interface OpenMenuOptions<Ctx, A extends string = string> {
  /** A viewport point (cursor) — or an element the menu drops down from. */
  at: MenuPoint | Element;
  /**
   * Where the menu levels are appended — usually the component's shadow root
   * (or an element inside it), so its CSS custom properties reach the menu.
   * The menu stylesheet is adopted into that root.
   */
  host: ShadowRoot | HTMLElement;
  /**
   * Run an activated leaf item — normally the component's wrapper over core
   * `runAction()` (`beforeActionCallback` → `onClick` → built-in → `action`
   * event), building the detail from `ctx` + the invocation. A leaf closes
   * the menu first (unless `shouldCloseOnClick: false`), then runs; a keep-open
   * item runs, and its menu level re-renders once the returned promise settles.
   */
  runAction?(item: MenuItem<Ctx, A>, invocation: MenuInvocation): unknown;
  /** Called once when the menu closes, with the reason. Not called when nothing was shown. */
  onClose?(reason: MenuCloseReason): void;
  /**
   * Fill one item element yourself. Runs after the element got its classes /
   * ARIA / `data-*`; when you leave it empty the default content (icon, label,
   * shortcut) is rendered.
   */
  renderItemCallback?(item: MenuItem<Ctx, A>, element: HTMLElement, ctx: Ctx, resolved: ResolvedActionItem<A>): void;
  /**
   * Take over the whole menu: fill `menuElement` yourself. Core still
   * positions it and dismisses it (outside press, scroll, blur, Escape, Tab);
   * `entries`, `renderItemCallback` and item keyboard navigation are not used.
   * Call `close()` to dismiss it (reason `'api'`).
   */
  renderMenuCallback?(menuElement: HTMLElement, close: () => void): void;
  /** A component's built-in state for an item (see `resolveMenuEntries`). */
  defaults?(item: MenuItem<Ctx, A>): Partial<ResolvedActionItem<A>> | undefined;
  /** Rewrite an item before it is resolved, at every level (e.g. give a built-in its submenu). */
  prepareItemCallback?(item: MenuItem<Ctx, A>): MenuItem<Ctx, A>;
  /** Root placement. Default `'bottom-start'`. */
  placement?: Placement;
  /** Root offset from `at`. Default `0` for a point; for an element, the page's `--base-dropdown-offset` (`4` when unset). */
  offset?: number | AnchorOffset;
  /** Extra classes on every menu level (root and submenus) — a component's scoping hook. */
  cssClass?: string;
  /** Focus the first enabled item on open — use it when the menu was opened from the keyboard. Default `false`. */
  shouldFocusFirst?: boolean;
  /**
   * Where focus goes when the menu closes while it holds focus (Escape, Tab, an
   * item ran, `close()`). Not used for an outside press / scroll / blur — focus
   * follows the user there.
   */
  returnFocusTo?: HTMLElement | null;
  /**
   * Close on an outside pointer press, a scroll that moves what the menu belongs to,
   * window blur, and when another KM overlay opens. Default `true`; `false`
   * keeps it open until Escape / an item / `close()` (a debug or pinned menu).
   */
  shouldCloseOnOutsideInteraction?: boolean;
  /** `registerOverlay` group for "one overlay open at a time". Default: the ungrouped group. */
  overlayGroup?: unknown;
  /** The menu's UI strings (the `labels` convention: a partial object, English defaults). */
  labels?: MenuLabels;
  /** Copy the nearest `data-theme` from this element onto each menu level (portaled menus, C-CS-10). */
  inheritThemeFrom?: HTMLElement;
  /** Floating menu, bottom sheet or side drawer. Default `'auto'` (a sheet on a phone). See {@link MenuPresentation}. */
  presentation?: MenuPresentation;
  /**
   * `'auto'`'s policy per device class, e.g. `{ mobile: 'drawer', tablet: 'drawer' }`. While the
   * menu is open a device-class change re-resolves it: sheet ⇄ drawer switches in place, a switch
   * to / from `'floating'` closes it (`'presentation'`).
   */
  presentationMap?: MenuPresentationMap;
  /** The edge a `'drawer'` slides in from. Default `'start'`. */
  side?: MenuDrawerSide;
  /**
   * The menu's name: the sheet header's title and the accessible name (`aria-label`) of the
   * root menu (and of the sheet dialog). A drilled-in submenu's header shows the item that opened it.
   */
  title?: string;
}

/** UI strings of {@link openMenu}; each key is optional and falls back to its default. */
export interface MenuLabels {
  /** Text of the row shown while a lazy submenu loads. Default `'…'`. */
  loading?: string;
  /** Sheet: the row on top of a drilled-in submenu that goes up one level. Default `'Back'`. */
  back?: string;
  /** Sheet: the accessible name of the header's close button. Default `'Close'`. */
  close?: string;
}

/** Returned by {@link openMenu}. */
export interface MenuHandle {
  /** `false` once closed — or from the start, when no item was visible (nothing is rendered then). */
  readonly isOpen: boolean;
  /** The root menu element (`null` when nothing was rendered). */
  readonly element: HTMLElement | null;
  /** Close the menu (reason `'api'`). Idempotent. */
  close(): void;
  /** Focus the first enabled item of the root menu. */
  focusFirst(): void;
  /** Recompute the position of every open level. */
  update(): void;
}
