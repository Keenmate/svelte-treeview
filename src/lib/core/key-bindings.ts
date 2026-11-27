/**
 * Key bindings — which navigation action a key press runs (= web-treeview src/key-bindings.ts).
 *
 * A binding maps a key chord in the core shortcut syntax (`'ArrowDown'`, `'Shift+End'`, `'*'`,
 * `'Plus'`, `'Ctrl+ArrowUp'`) to the NAME of a navigation action, or `null` (the tree leaves the
 * key alone). The names are a CLOSED set (`NAVIGATION_ACTIONS`): a binding never becomes a property
 * lookup on the tree or a function call of the consumer's choice — what an action DOES is
 * `navigationOverrides`' job. A value outside the set is warned about and ignored.
 *
 * The active map = the `navigationPreset`'s map with `keyBindings` merged on top (per chord, so
 * `'Right'` replaces `'ArrowRight'`). Bindings are written for left-to-right: in a `dir="rtl"` tree
 * ArrowLeft and ArrowRight swap before the lookup.
 */
import { matchesKeyChord, parseShortcut, type KeyChord } from '../vendor/actions/shortcut.js';
import type { NavigationPreset } from './navigation.js';

/** Every action a key can be bound to — the TreeNavigation methods that take no argument. */
export const NAVIGATION_ACTIONS = [
	'focusNext',
	'focusPrevious',
	'focusNextAtLevel',
	'focusPreviousAtLevel',
	'focusFirstChild',
	'focusParent',
	'collapseParent',
	'expandOrFocusFirstChild',
	'collapseOrFocusParent',
	'expandSiblings',
	'toggleFocusedNodeExpanded',
	'focusFirst',
	'focusLast',
	'focusNextPage',
	'focusPreviousPage',
	'extendSelectionNext',
	'extendSelectionPrevious',
	'extendSelectionToFirst',
	'extendSelectionToLast',
	'extendSelectionNextPage',
	'extendSelectionPreviousPage'
] as const;

/** The name of a navigation action (see {@link NAVIGATION_ACTIONS}). */
export type NavigationAction = (typeof NAVIGATION_ACTIONS)[number];

/** Key chord → action name; `null` = the tree ignores the key (it reaches the page). */
export type TreeKeyBindings = Readonly<Record<string, NavigationAction | null>>;

/** `navigationPreset: 'classic'` — → opens a node and enters it, ← goes to the parent. */
export const CLASSIC_KEY_BINDINGS: TreeKeyBindings = Object.freeze({
	ArrowDown: 'focusNextAtLevel',
	ArrowUp: 'focusPreviousAtLevel',
	ArrowRight: 'focusFirstChild',
	ArrowLeft: 'focusParent',
	Backspace: 'collapseParent',
	Enter: 'toggleFocusedNodeExpanded',
	Home: 'focusFirst',
	End: 'focusLast',
	PageDown: 'focusNextPage',
	PageUp: 'focusPreviousPage',
	'Shift+ArrowDown': 'extendSelectionNext',
	'Shift+ArrowUp': 'extendSelectionPrevious',
	'Shift+Home': 'extendSelectionToFirst',
	'Shift+End': 'extendSelectionToLast',
	'Shift+PageDown': 'extendSelectionNextPage',
	'Shift+PageUp': 'extendSelectionPreviousPage'
});

/** `navigationPreset: 'wai-aria'` — the WAI-ARIA tree pattern: → opens then enters, ← collapses then goes up, `*` expands the siblings. */
export const WAI_ARIA_KEY_BINDINGS: TreeKeyBindings = Object.freeze({
	...CLASSIC_KEY_BINDINGS,
	ArrowRight: 'expandOrFocusFirstChild',
	ArrowLeft: 'collapseOrFocusParent',
	'*': 'expandSiblings'
});

/** The built-in map of each preset. */
export const KEY_BINDING_PRESETS: Readonly<Record<NavigationPreset, TreeKeyBindings>> = Object.freeze({
	classic: CLASSIC_KEY_BINDINGS,
	'wai-aria': WAI_ARIA_KEY_BINDINGS
});

/** One parsed binding. */
export interface CompiledKeyBinding {
	shortcut: string;
	chord: KeyChord;
	action: NavigationAction | null;
}

const ACTION_NAMES: ReadonlySet<string> = new Set(NAVIGATION_ACTIONS);

/** Is `value` the name of a navigation action (the closed set)? */
export function isNavigationAction(value: unknown): value is NavigationAction {
	return typeof value === 'string' && ACTION_NAMES.has(value);
}

const chordId = (c: KeyChord) => `${c.ctrl ? 'c' : ''}${c.alt ? 'a' : ''}${c.shift ? 's' : ''}${c.meta ? 'm' : ''}:${c.key}`;

/**
 * The active bindings: the preset's map with `overrides` merged on top, per chord. An entry whose
 * key isn't one chord, or whose action isn't in {@link NAVIGATION_ACTIONS} (nor `null`), is
 * reported through `warn` and skipped.
 */
export function compileKeyBindings(
	preset: NavigationPreset,
	overrides: TreeKeyBindings | null | undefined,
	warn: (message: string) => void
): CompiledKeyBinding[] {
	const byChord = new Map<string, CompiledKeyBinding>();
	const add = (bindings: TreeKeyBindings) => {
		for (const [shortcut, action] of Object.entries(bindings)) {
			const chords = parseShortcut(shortcut);
			if (chords.length !== 1) {
				warn(`keyBindings: "${shortcut}" is not one key chord — ignored`);
				continue;
			}
			if (action !== null && !isNavigationAction(action)) {
				warn(`keyBindings: "${shortcut}" → ${JSON.stringify(action)} is not a navigation action — ignored`);
				continue;
			}
			byChord.set(chordId(chords[0]), { shortcut, chord: chords[0], action });
		}
	};
	add(KEY_BINDING_PRESETS[preset] ?? CLASSIC_KEY_BINDINGS);
	if (overrides && typeof overrides === 'object') add(overrides);
	return [...byChord.values()];
}

/** The binding `event` presses (ArrowLeft / ArrowRight swapped first when `isRtl`), if any. */
export function findKeyBinding(
	bindings: readonly CompiledKeyBinding[],
	event: KeyboardEvent,
	isRtl: boolean
): CompiledKeyBinding | undefined {
	let pressed: KeyboardEvent = event;
	if (isRtl && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
		const key = event.key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
		pressed = { key, code: key, ctrlKey: event.ctrlKey, altKey: event.altKey, shiftKey: event.shiftKey, metaKey: event.metaKey } as KeyboardEvent;
	}
	return bindings.find((b) => matchesKeyChord(pressed, b.chord));
}
