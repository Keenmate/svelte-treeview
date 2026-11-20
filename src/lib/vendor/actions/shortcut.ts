/**
 * Keyboard shortcuts (SPEC §12.12): ONE syntax for an action item's `shortcut`, with parse / match /
 * format / bind — web-grid, web-treeview, web-editor and web-commandpalette each had their own.
 *
 * Syntax: chords joined by `+` (`'Ctrl+D'`, `'Shift+F3'`, `'Mod+Shift+Z'`); a sequence is chords separated
 * by a space (`'g f'`). Modifiers: `Ctrl` / `Control`, `Shift`, `Alt` / `Option`, `Meta` / `Cmd` /
 * `Command`, and `Mod` = ⌘ on Apple platforms, Ctrl elsewhere. The key is a `KeyboardEvent.key` name
 * (`'Delete'`, `'F2'`, `'ArrowUp'`, `'Escape'`, a letter, `'?'`, `'Plus'` / `'Space'` for those two).
 * ProseMirror-style `'Mod-Shift-z'` is read too.
 */
import { getEnvironment } from '../core/environment/environment.js';

/** One key press with its modifiers. `key` is lower-case for single characters. */
export interface KeyChord {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface ShortcutOptions {
  /** Resolve `Mod` and format for Apple platforms. Default: the environment's `isApple`. */
  isApple?: boolean;
}

const MODIFIERS: Record<string, keyof Omit<KeyChord, 'key'> | 'mod'> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  mod: 'mod',
};

const KEY_ALIASES: Record<string, string> = {
  plus: '+',
  space: ' ',
  esc: 'escape',
  del: 'delete',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
};

const isAppleDefault = (opts?: ShortcutOptions): boolean => opts?.isApple ?? getEnvironment().isApple;

function splitChord(text: string): string[] {
  // 'Mod-Shift-z' (ProseMirror) when there is no '+' and a known modifier precedes a '-'.
  if (!text.includes('+') && /^(mod|ctrl|control|shift|alt|option|meta|cmd|command)-/i.test(text)) {
    const parts = text.split('-');
    // 'Ctrl--' = Ctrl + the minus key.
    if (parts.at(-1) === '' && parts.at(-2) === '') return [...parts.slice(0, -2), '-'];
    return parts;
  }
  // 'Ctrl++' = Ctrl + the plus key.
  if (text.endsWith('++')) return [...text.slice(0, -2).split('+'), '+'];
  return text === '+' ? ['+'] : text.split('+');
}

/** Parse one chord (`'Ctrl+Shift+Z'`); `null` when it names no key. */
export function parseKeyChord(text: string, opts?: ShortcutOptions): KeyChord | null {
  const chord: KeyChord = { key: '', ctrl: false, shift: false, alt: false, meta: false };
  for (const raw of splitChord(text.trim())) {
    const part = raw.trim();
    if (!part) continue;
    const mod = MODIFIERS[part.toLowerCase()];
    if (mod === 'mod') chord[isAppleDefault(opts) ? 'meta' : 'ctrl'] = true;
    else if (mod) chord[mod] = true;
    else {
      const lower = part.toLowerCase();
      // A key name (`F2`, `ArrowUp`) is letters / digits only; anything else is free text, not a shortcut.
      if (part.length > 1 && !KEY_ALIASES[lower] && !/^[a-z][a-z0-9]*$/i.test(part)) return null;
      chord.key = KEY_ALIASES[lower] ?? lower;
    }
  }
  return chord.key ? chord : null;
}

/** Parse a shortcut into its chords (one for `'Ctrl+D'`, two for `'g f'`); `[]` when invalid / empty. */
export function parseShortcut(text: string | undefined, opts?: ShortcutOptions): KeyChord[] {
  if (!text?.trim()) return [];
  const parsed = text.trim().split(/\s+/).map((c) => parseKeyChord(c, opts));
  return parsed.every(Boolean) ? (parsed as KeyChord[]) : [];
}

/** `KeyboardEvent.code` for a letter / digit — Alt (Option) on a Mac changes `event.key` (`Alt+D` → `∂`). */
function codeFor(key: string): string | undefined {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return undefined;
}

/**
 * Does `event` press `chord`? Modifiers must match exactly, except Shift for a single character
 * (`'?'` is Shift+/ on most layouts) when the chord lists no modifier at all (`'r'` in a menu matches R).
 */
export function matchesKeyChord(event: KeyboardEvent, chord: KeyChord): boolean {
  if (event.ctrlKey !== chord.ctrl || event.altKey !== chord.alt || event.metaKey !== chord.meta) return false;
  const isChar = chord.key.length === 1;
  const isBare = !chord.ctrl && !chord.alt && !chord.meta && !chord.shift;
  if (!(isChar && isBare) && event.shiftKey !== chord.shift) return false;
  if (event.key.toLowerCase() === chord.key) return true;
  const code = codeFor(chord.key);
  return !!code && event.code === code;
}

/** Does `event` press the (single-chord) `shortcut`? A sequence never matches one event — use {@link bindShortcuts}. */
export function matchesShortcut(event: KeyboardEvent, shortcut: string | KeyChord[] | undefined, opts?: ShortcutOptions): boolean {
  const chords = typeof shortcut === 'string' || shortcut === undefined ? parseShortcut(shortcut, opts) : shortcut;
  return chords.length === 1 && matchesKeyChord(event, chords[0]!);
}

const KEY_LABELS: Record<string, [text: string, apple: string]> = {
  escape: ['Esc', 'Esc'],
  delete: ['Del', '⌦'],
  backspace: ['Backspace', '⌫'],
  enter: ['Enter', '↩'],
  tab: ['Tab', '⇥'],
  ' ': ['Space', 'Space'],
  arrowup: ['↑', '↑'],
  arrowdown: ['↓', '↓'],
  arrowleft: ['←', '←'],
  arrowright: ['→', '→'],
  pageup: ['PgUp', 'PgUp'],
  pagedown: ['PgDn', 'PgDn'],
  home: ['Home', 'Home'],
  end: ['End', 'End'],
};

function keyLabel(key: string, isApple: boolean): string {
  const known = KEY_LABELS[key];
  if (known) return known[isApple ? 1 : 0];
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1); // 'f2' → 'F2'
}

/**
 * The key caps of a shortcut, per chord, in platform order: `[['Ctrl', 'Shift', 'Z']]` / Apple
 * `[['⇧', '⌘', 'Z']]`; `'g f'` → `[['G'], ['F']]`. For rendering `<kbd>`s.
 */
export function shortcutKeycaps(shortcut: string | undefined, opts?: ShortcutOptions): string[][] {
  const isApple = isAppleDefault(opts);
  return parseShortcut(shortcut, opts).map((c) => {
    const caps: string[] = [];
    if (isApple) {
      if (c.ctrl) caps.push('⌃');
      if (c.alt) caps.push('⌥');
      if (c.shift) caps.push('⇧');
      if (c.meta) caps.push('⌘');
    } else {
      if (c.ctrl) caps.push('Ctrl');
      if (c.meta) caps.push('Win');
      if (c.alt) caps.push('Alt');
      if (c.shift) caps.push('Shift');
    }
    caps.push(keyLabel(c.key, isApple));
    return caps;
  });
}

/**
 * The display text of a shortcut: `'Ctrl+Shift+Z'`, Apple `'⇧⌘Z'`; a sequence joins its chords with a
 * space. Unparseable text comes back unchanged (a free-form hint still shows).
 */
export function formatShortcut(shortcut: string | undefined, opts?: ShortcutOptions): string {
  const caps = shortcutKeycaps(shortcut, opts);
  if (!caps.length) return shortcut ?? '';
  const isApple = isAppleDefault(opts);
  return caps.map((chord) => chord.join(isApple ? '' : '+')).join(' ');
}

/** Is the event's (shadow-piercing) origin a text-entry field — where plain-key shortcuts must not fire? */
export function isTypingTarget(event: Event): boolean {
  const t = (event.composedPath?.()[0] ?? event.target) as Element | null;
  if (!(t instanceof Element)) return false;
  if (t instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'color', 'file', 'image', 'reset', 'submit'].includes(t.type);
  }
  return t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t as HTMLElement).isContentEditable === true;
}

/** One binding for {@link bindShortcuts}. */
export interface ShortcutBinding {
  /** The shortcut (`'Ctrl+D'`, `'g f'`); a falsy / unparseable one is skipped. */
  shortcut: string | undefined;
  /** Runs on a match; then the event's default is prevented, unless it returns `false`. */
  run(event: KeyboardEvent): boolean | void;
  /** Skip this binding right now (disabled item, wrong mode). */
  isEnabled?(): boolean;
  /** Fire while typing in a field too. Default: only chords with Ctrl / Alt / Meta do, plain keys don't. */
  shouldFireWhileTyping?: boolean;
}

export interface BindShortcutsOptions extends ShortcutOptions {
  /** How long a started sequence (`'g'` of `'g f'`) waits for its next key, in ms. Default `1000`. */
  sequenceTimeoutMs?: number;
  /** Listen in the capture phase. Default `false`. */
  shouldCapture?: boolean;
}

/**
 * Listen for `keydown` on `target` and run the matching binding. Handles sequences (`'g f'`), skips
 * plain keys while typing, ignores IME composition and already-handled events. `bindings` may be a
 * function, read on every key (a live list of action items). Returns the unbind.
 */
export function bindShortcuts(
  target: EventTarget,
  bindings: readonly ShortcutBinding[] | (() => readonly ShortcutBinding[]),
  opts: BindShortcutsOptions = {},
): () => void {
  const timeout = opts.sequenceTimeoutMs ?? 1000;
  /** Chords pressed so far of a sequence in progress. */
  let pending: KeyboardEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = (): void => {
    pending = [];
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  const onKeydown = (e: Event): void => {
    const event = e as KeyboardEvent;
    if (event.defaultPrevented || event.isComposing) return;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
    const typing = isTypingTarget(event);
    const list = (typeof bindings === 'function' ? bindings() : bindings)
      .map((b) => ({ b, chords: parseShortcut(b.shortcut, opts) }))
      .filter(({ b, chords }) => chords.length && (b.isEnabled?.() ?? true));
    const presses = [...pending, event];
    let isPrefix = false;
    for (const { b, chords } of list) {
      if (chords.length < presses.length) continue;
      if (!presses.every((p, i) => matchesKeyChord(p, chords[i]!))) continue;
      const first = chords[0]!;
      const isPlain = !first.ctrl && !first.alt && !first.meta;
      if (typing && isPlain && !b.shouldFireWhileTyping) continue;
      if (chords.length > presses.length) {
        isPrefix = true;
        continue;
      }
      reset();
      if (b.run(event) !== false) event.preventDefault();
      return;
    }
    if (isPrefix) {
      pending = presses;
      if (timer) clearTimeout(timer);
      timer = setTimeout(reset, timeout);
      event.preventDefault();
      return;
    }
    reset();
  };

  target.addEventListener('keydown', onKeydown, opts.shouldCapture ?? false);
  return () => {
    reset();
    target.removeEventListener('keydown', onKeydown, opts.shouldCapture ?? false);
  };
}
