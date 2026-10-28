# svelte-treeview ↔ web-treeview parity

Living checklist against the sibling `@keenmate/web-treeview` (`<web-treeview>`). The API sections
(inputs, state, events, callbacks, methods, labels, exports) mirror web-treeview's `docs/parity.md`
and are filled by the API parity pass. **Any public API change must update this file and be
mirrored in the sibling library (or recorded here as intentional).**

## 10. CSS custom properties

One token list for both libraries — `--wtv-<name>` (web) = `--stv-<name>` (svelte). 195 shared names; the few library-only names belong to a feature only that library renders. Every token chains to `--base-*` the same way (checked by `npm run check:contract` and the `contract-parity` e2e spec in each repo); both `component-variables.manifest.json` list the same names. Motion: only `--*-transition-fast | -normal | -medium | -slow` (→ `--base-duration-*`) and `--*-ease-*`; `prefers-reduced-motion` sets the speeds to `0s`; motion off = `--*-transition-*: 0s` (no prop / attribute).

### Shared names

| group | names |
|---|---|
| sizing | `rem` |
| color | `accent-color`, `accent-color-hover`, `active-bg`, `danger-color`, `danger-text-color`, `hover-bg`, `main-bg`, `shadow-color`, `success-color`, `text-color-1`, `text-color-3`, `text-color-on-accent` |
| surface | `elevated-bg`, `focused-bg`, `node-info-reveal-bg`, `node-info-reveal-border-color`, `node-info-reveal-text-color`, `selected-bg`, `selected-bg-hover`, `selected-fill-bg` |
| border | `border-color`, `border-radius-lg`, `border-radius-sm`, `border-width`, `input-border-color`, `selected-preset-ring-color` |
| state | `disabled-opacity`, `focused-outline`, `focused-text-color`, `selected-fill-text-color`, `selected-outline`, `selected-text-color` |
| typography | `font-family`, `font-size`, `font-size-sm`, `font-size-xs`, `font-weight-medium`, `font-weight-semibold` |
| spacing | `spacing-lg`, `spacing-md`, `spacing-sm`, `spacing-xl`, `spacing-xs` |
| animation | `ease-in`, `ease-out`, `ease-standard`, `node-transition`, `spinner-duration`, `toggle-icon-transition`, `transition-fast`, `transition-medium`, `transition-normal`, `transition-slow` |
| tree | `focused-outline-offset`, `icon-collapse`, `icon-expand`, `icon-leaf`, `icon-rotate-collapsed`, `icon-rotate-expanded`, `icon-size-glyph`, `indent-size`, `node-bg-active`, `node-bg-hover`, `node-border-radius`, `node-icon-color`, `node-icon-margin-right`, `node-icon-width`, `node-info-bg-hover`, `node-info-color`, `node-info-color-hover`, `node-padding`, `scroll-highlight-box-shadow`, `toggle-icon-color`, `toggle-icon-size`, `toggle-icon-width` |
| icon | `icon-info` |
| checkbox | `checkbox-bg`, `checkbox-border-color`, `checkbox-border-radius`, `checkbox-border-width`, `checkbox-checked-bg`, `checkbox-checked-bg-hover`, `checkbox-checked-border-color`, `checkbox-checkmark-color`, `checkbox-focus-box-shadow`, `checkbox-focus-ring-color`, `checkbox-focus-ring-width`, `checkbox-gap`, `checkbox-scale`, `checkbox-size`, `icon-check`, `icon-check-size`, `icon-indeterminate` |
| dnd | `drag-denied-flash-bg`, `drag-over-bg`, `drag-over-border`, `drag-over-box-shadow`, `drag-over-highlight-bg`, `drag-over-highlight-border`, `dragged-opacity`, `dragged-scale`, `drop-arrow-after-image`, `drop-arrow-after-rotation`, `drop-arrow-before-image`, `drop-arrow-before-rotation`, `drop-arrow-child-image`, `drop-arrow-child-rotation`, `drop-arrow-position`, `drop-arrow-size`, `drop-glow-after-color`, `drop-glow-before-color`, `drop-glow-child-bg`, `drop-glow-child-color`, `drop-glow-size`, `drop-invalid-bg`, `drop-invalid-border-color`, `drop-valid-bg`, `drop-valid-border-color`, `drop-zone-after-bg`, `drop-zone-after-bg-active`, `drop-zone-after-box-shadow-active`, `drop-zone-after-text-color`, `drop-zone-after-text-color-active`, `drop-zone-before-bg`, `drop-zone-before-bg-active`, `drop-zone-before-box-shadow-active`, `drop-zone-before-text-color`, `drop-zone-before-text-color-active`, `drop-zone-border-radius`, `drop-zone-child-bg`, `drop-zone-child-bg-active`, `drop-zone-child-box-shadow-active`, `drop-zone-child-text-color`, `drop-zone-child-text-color-active`, `scroll-highlight-bg`, `touch-ghost-bg`, `touch-ghost-box-shadow`, `touch-ghost-text-color` |
| empty | `drop-placeholder-bg`, `drop-placeholder-bg-hover`, `drop-placeholder-border`, `drop-placeholder-border-color-hover`, `drop-placeholder-border-radius`, `drop-placeholder-box-shadow-hover`, `drop-placeholder-color`, `drop-placeholder-min-height`, `drop-placeholder-scale-hover` |
| tooltip | `tooltip-bg`, `tooltip-border-radius`, `tooltip-box-shadow`, `tooltip-font-size`, `tooltip-max-width`, `tooltip-min-width`, `tooltip-padding`, `tooltip-text-color`, `tooltip-width`, `tooltip-z-index` |
| context-menu | `context-menu-bg`, `context-menu-bg-hover`, `context-menu-border`, `context-menu-border-radius`, `context-menu-box-shadow`, `context-menu-danger-bg-hover`, `context-menu-danger-color`, `context-menu-disabled-opacity`, `context-menu-divider-color`, `context-menu-divider-label-color`, `context-menu-divider-margin`, `context-menu-font-size`, `context-menu-icon-font-size`, `context-menu-icon-width`, `context-menu-item-gap`, `context-menu-item-padding`, `context-menu-min-width`, `context-menu-padding`, `context-menu-shortcut-color`, `context-menu-shortcut-font-size`, `context-menu-text-color`, `context-menu-text-color-hover`, `context-menu-toggled-color`, `context-menu-z-index` |
| loading | `expand-spinner-color`, `expand-spinner-size`, `expand-spinner-track`, `expand-spinner-width`, `loading-bg`, `loading-color`, `spinner-color`, `spinner-size`, `spinner-track` |
| z-index | `z-index-drop-zones`, `z-index-dropdown`, `z-index-ghost`, `z-index-overlay` |

**Context menu:** the names are the same; web's are unset inputs mapped onto web-components-core's `--_km-menu-*` (defaults live in core, a page-wide `--km-menu-*` reaches the tree), svelte renders its own menu and declares them with defaults.

### Same name, different default

Kept as each library looked before (aligning them changes one library's look — open).

| name | why |
|---|---|
| `drop-placeholder-min-height` | same 60px; web reads --wtv-tree-min-height |
| `expand-spinner-size` | web 0.9em, svelte = the glyph box (1em) |
| `indent-size` | rendering model: web flat rows (level − 1) × 16px; svelte nested children 8px per level + the toggle column |
| `node-icon-margin-right` | web 4px, svelte 6px |
| `node-padding` | svelte pill hugs the label (4px / 4px), web 4px / 8px — kept, both libraries look as before |
| `toggle-icon-size` | web glyph 12px in a 24px column; svelte 16px glyph, slot = glyph + 1px |
| `toggle-icon-width` | see toggle-icon-size |

### Library-only names

| name | library: why |
|---|---|
| `children-margin-top` | svelte: nested children container (web renders flat rows) |
| `context-menu-arrow-font-size` | web: core's menu draws the submenu arrow as a text glyph (svelte: a mask icon) |
| `cut-opacity` | web: dims cut nodes; svelte keeps `cutPaths` but does not render the dimming yet (API gap) |
| `drag-denied-badge-color` | svelte: the no-entry badge is a mask icon (web: a text glyph) |
| `drop-zone-max-width` | svelte: width cap of a side drop zone (web: sized by JS) |
| `icon-arrow-left` | svelte: arrows of the scrollToPath highlight |
| `icon-arrow-right` | svelte: arrows of the scrollToPath highlight |
| `icon-ban` | svelte: the no-entry badge is a mask icon (web: a text glyph) |
| `icon-chevron-right` | svelte: submenu arrow mask of its own menu |
| `node-height` | web: min row height — the virtual scroller needs a fixed row |
| `node-path-color` | svelte: the path shown next to the label |
| `node-path-font-size` | svelte: the path shown next to the label |
| `scroll-highlight-arrow-color` | svelte: arrows of the scrollToPath highlight |
| `text-color-4` | svelte: its own menu's faint text (web: core's menu) |
| `toggle-icon-margin-right` | svelte: gap after the toggle (web: the toggle column has a fixed width) |
| `tree-min-height` | web: min height of the empty / loading tree (svelte sizes the drop placeholder only) |
