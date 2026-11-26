# Accessibility

`@keenmate/svelte-treeview` follows the [WAI-ARIA Authoring Practices for tree views](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) for keyboard navigation, focus management, and selection semantics.

## Keyboard navigation

The tree is fully navigable from the keyboard. Focus the tree (`Tab` into it), then:

### Movement

| Key | Action |
|-----|--------|
| `ArrowDown` | Move focus to the next visible node at the same level |
| `ArrowUp` | Move focus to the previous visible node at the same level |
| `ArrowRight` | Move focus to the first child (expands the node first if it is collapsed) |
| `ArrowLeft` | Move focus to the parent (does not collapse) |
| `Backspace` | Collapse the parent and focus it |
| `Home` | Focus the first visible node |
| `End` | Focus the last visible node |
| `PageDown` | Jump forward ~10 visible nodes |
| `PageUp` | Jump back ~10 visible nodes |

### Activation

| Key | Action |
|-----|--------|
| `Space` | Selection (WAI-ARIA): with `isCheckboxesShown={true}` toggle the focused node's checkbox; in `selectionMode='multiple'` toggle the focused node in the selection; in `'single'` mode select the focused node. Never expands / collapses. |
| `Enter` | The node's default action: expand / collapse the focused node (every mode). |

### Range selection (`selectionMode='multiple'`)

Hold `Shift` together with any movement key to extend the highlight range from the anchor (last clicked/focused node) to the new position. In `'single'` mode these are no-ops.

| Key | Action |
|-----|--------|
| `Shift+ArrowDown` | Extend selection to the next visible node |
| `Shift+ArrowUp` | Extend selection to the previous visible node |
| `Shift+Home` | Extend selection to the first visible node |
| `Shift+End` | Extend selection to the last visible node |
| `Shift+PageDown` | Extend selection forward ~10 visible nodes |
| `Shift+PageUp` | Extend selection back ~10 visible nodes |

### Pointer modifiers (`selectionMode='multiple'`)

| Gesture | Action |
|---------|--------|
| Click | Move focus and replace the selection with the clicked node |
| `Ctrl+Click` | Toggle the clicked node's selection (additive) |
| `Shift+Click` | Extend selection from the anchor to the clicked node |

Ctrl/Shift+Click does **not** auto-toggle expand/collapse — modifier clicks are reserved for selection management so multi-selecting folders doesn't open them.

### Context menu

| Key | Action |
|-----|--------|
| `Escape` | Close the open context menu |
| `<shortcut>` | Activate the menu item whose `shortcut` matches (supports `Ctrl+`, `Shift+`, `Alt+` modifiers) |

## Focus management

- The tree itself is a single tab stop. `Tab` into the tree, then use arrow keys to move between nodes — no per-node tab stop, as recommended by the WAI-ARIA pattern.
- The tree container (`.stv__container`, `role="tree"`) keeps DOM focus; the focused node is announced through `aria-activedescendant` (it points at the focused row — rows are virtual and re-keyed, so they never take focus themselves).
- The focused node is `bind:focusedNode` on `<Tree>` and `controller.focusedNode`.
- A visible focus ring is rendered via `--stv-checkbox-focus-ring-*` tokens; override these CSS variables to match your design system's focus style.
- After `scrollToPath(path)`, the target node receives the configured `scrollHighlightClass` for `scrollHighlightTimeout` ms so screen-reader users and sighted users alike can locate the moved focus.

## Custom keydown handler

Override or augment the default keymap with `beforeKeydownCallback` — return `false` to suppress the built-in handling (synchronous):

```svelte
<Tree
  nodes={data}
  idMember="path"
  pathMember="path"
  beforeKeydownCallback={({ event, focusedNode, controller }) => {
    if (event.key === 'F2' && focusedNode) {
      startRename(focusedNode);
      return false;  // handled — suppress the tree's own handling
    }
    // return nothing: the tree handles the key
  }}
/>
```

## Selection model

The tree exposes a three-level selection model — see [`docs/examples.md`](./examples.md) for a usage cookbook, and the rc09 notes in [`README.md`](../README.md#whats-new-in-v500-rc09) for the rationale:

- **Focus** (`focusedNode`) — the single node with keyboard cursor on it
- **Selection** (`selectedPaths: Set<string>`) — multi-selection set (Ctrl/Shift+click, Shift+Arrow)
- **Checked** (`checkedPaths: Set<string>`) — checkbox state when `isCheckboxesShown={true}` (folded by `cascadeCheckPolicy` in cascade mode; `controller.allCheckedPaths` lists every ticked node)

When `isCheckboxesShown={false}`, the selection is mirrored into `checkedPaths` automatically — consumers always have a single "what's selected" set to read regardless of UI style.

## Screen reader semantics

The tree is a WAI-ARIA tree (same as `@keenmate/web-treeview`):

- `.stv__container` is `role="tree"`, labelled by `labels['ariaLabels.tree']` ("Tree"); `aria-multiselectable="true"` in `selectionMode='multiple'`.
- Every row is `role="treeitem"` with `aria-level`, `aria-posinset` / `aria-setsize` (over all visible siblings — correct in virtual scroll too), `aria-expanded` (parents only), `aria-selected`, and `aria-checked` when checkboxes are shown (`mixed` = indeterminate).
- `aria-activedescendant` follows the focused node (core `createActiveDescendant`, ARIA-only — the tree keeps its own keys).
- Screen-reader announcements go through core `announce()` (the page's one polite live region): a settled search ("Results: 12" / "No results found"), a drop the tree placed ("Apricot moved into Banana"), a refused drop ("Cannot drop here: …"). The texts are labels (`ariaLabels.searchResults`, `ariaLabels.movedInto`, …, `{ctx.count}` / `{ctx.name}` / `{ctx.target}` placeholders); set one to `''` to silence it.

## See also

- [WAI-ARIA Treeview pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- [`docs/examples.md`](./examples.md) — context menus, multi-select, drag & drop
- Source: keyboard handler — `src/lib/core/TreeEngine.svelte.ts` (`handleKeydown`)
- Source: navigation primitives — `src/lib/core/navigation.ts` (`TreeNavigation` interface)
