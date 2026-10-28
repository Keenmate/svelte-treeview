// Vendored from @keenmate/web-components-core v1.0.0-rc14 — src/actions/types.ts.
// Adapted (see README.md): `ComponentContext` is declared locally (svelte has no host element). Keep in sync by re-copying; don't diverge.
/** The context every ctx carries (core: `controller` + `element`; svelte-treeview: `controller`). */
export interface ComponentContext<C = unknown> {
  readonly controller: C;
}

/**
 * Which surface an action was triggered from. The known names keep the
 * vocabulary shared across components; a component may add its own.
 */
export type ActionSource =
  | 'action-buttons'
  | 'toolbar'
  | 'row-toolbar'
  | 'cell-toolbar'
  | 'context-menu'
  | 'header-menu'
  | 'message'
  | 'summary'
  | 'palette'
  | 'keyboard'
  | (string & {});

/**
 * One clickable item — an action button, a toolbar button, a menu item (SPEC
 * §12.11). Every dynamic field is a static value plus a separate
 * `get*Callback(ctx)`; the callback wins when both are set. `Ctx` is the
 * surface context the component builds when it renders or opens the surface
 * (the row a context menu opened on, the picker's selection, …); `A` is the
 * component's built-in action names.
 */
export interface ActionItem<Ctx = ComponentContext, A extends string = string> {
  /** A built-in action name. Omit (or `'custom'`) for a consumer item, identified by {@link id}. */
  action?: A | 'custom';
  /** Identifies a custom item; reported back in the `action` event. */
  id?: string;
  /** Visible label. Plain text. */
  text?: string;
  /** Icon — the component's icon convention (class name, glyph, or markup). */
  icon?: string;
  tooltip?: string;
  /** Display hint for the key chord (`'Ctrl+D'`). Whether it is also bound is the component's call. */
  shortcut?: string;
  /** Extra CSS classes on the item. */
  cssClass?: string;
  /** Default `true`. */
  isVisible?: boolean;
  /** Greyed out, can't be clicked. Default `false`. */
  isDisabled?: boolean;
  /** Destructive styling. Default `false`. */
  isDanger?: boolean;
  /**
   * Toggle state — the thing this item toggles is currently ON (Bold while the
   * caret is in bold text; "Show hidden" checked). Still clickable. A button
   * renders it as `aria-pressed`; a menu item that defines it (or
   * {@link getIsToggledCallback}) is a toggle: `role="menuitemcheckbox"` +
   * `aria-checked`. Not availability: that's {@link isDisabled}.
   */
  isToggled?: boolean;

  getTextCallback?(ctx: Ctx): string;
  getIconCallback?(ctx: Ctx): string;
  getTooltipCallback?(ctx: Ctx): string;
  getClassCallback?(ctx: Ctx): string | string[];
  getIsVisibleCallback?(ctx: Ctx): boolean;
  getIsDisabledCallback?(ctx: Ctx): boolean;
  getIsToggledCallback?(ctx: Ctx): boolean;

  /**
   * Runs on click with the surface context plus the action fields — the same
   * object the `action` event carries. Awaited; the item is busy meanwhile.
   */
  onClick?(ctx: ActionEventDetail<Ctx, A>): void | Promise<void>;
}

/** A menu item: an {@link ActionItem} that may open a submenu. */
export interface MenuItem<Ctx = ComponentContext, A extends string = string> extends ActionItem<Ctx, A> {
  /** Static submenu entries. */
  children?: MenuEntry<Ctx, A>[];
  /** Dynamic / lazy submenu entries — wins over {@link children}. */
  getChildrenCallback?(ctx: Ctx): MenuEntry<Ctx, A>[] | Promise<MenuEntry<Ctx, A>[]>;
  /** Close the menu after this item runs. Default `true`. */
  shouldCloseOnClick?: boolean;
}

/** A separator, optionally labelled (a group heading). Create with `menuDivider()`. */
export interface MenuDivider {
  divider: true;
  text?: string;
}

export type MenuEntry<Ctx = ComponentContext, A extends string = string> = MenuItem<Ctx, A> | MenuDivider;

/**
 * The fields an invocation adds to the surface context. `action`, `id`,
 * `item`, `source`, `sourceEvent`, `triggerElement` and `dataset` are reserved
 * — a surface context can't redeclare them.
 */
export interface ActionInvocation<Ctx = ComponentContext, A extends string = string> {
  /** The built-in name, or `'custom'`. */
  action: A | 'custom';
  id?: string;
  /** The clicked item (for HTML-authored buttons: a synthetic item). */
  item: ActionItem<Ctx, A>;
  source: ActionSource;
  /** The DOM event that triggered it (click, keydown), when there was one. */
  sourceEvent?: Event;
  /** The element that was activated. */
  triggerElement?: HTMLElement;
  /** The trigger's `data-*` attributes, minus `data-action` / `data-id`. */
  dataset: Record<string, string>;
}

/**
 * The detail of every component's `action` event, the argument of its
 * `onAction` twin, of the item's `onClick`, and of `beforeActionCallback`.
 */
export type ActionEventDetail<Ctx = ComponentContext, A extends string = string> = Ctx & ActionInvocation<Ctx, A>;

/** An {@link ActionItem} with every field resolved against a context. */
export interface ResolvedActionItem<A extends string = string> {
  action: A | 'custom';
  id?: string;
  text: string;
  icon?: string;
  tooltip?: string;
  shortcut?: string;
  /** Space-separated; `''` when none. */
  cssClass: string;
  isVisible: boolean;
  isDisabled: boolean;
  isDanger: boolean;
  isToggled: boolean;
}
