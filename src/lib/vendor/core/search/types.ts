/**
 * Search vocabulary shared by every component with a search box (SPEC §12.11). The two
 * axes are independent: `SearchBehavior` decides how text is normalized, `SearchMatch`
 * decides where the term must sit. Built-in search works on strings only; anything richer
 * goes through a component's `searchCallback` with a {@link SearchCallbackContext}.
 */

/**
 * How built-in search normalizes text before matching (see `normalizeSearchText`).
 *
 * - `normalized` (default) — ignores case and diacritics: `ces` matches `Český`, `muller` matches `Müller`
 * - `case-insensitive` — ignores case only: `čes` matches `Český`, `ces` does not
 * - `exact` — case- and diacritic-sensitive
 */
export type SearchBehavior = 'normalized' | 'case-insensitive' | 'exact';

/**
 * Where in an item's search value built-in search looks for the term.
 *
 * - `contains` (default) — anywhere
 * - `equals` — the whole value (codes: `haxkl324` finds `HAxKL324` but not `HAxKL3245`;
 *   case/accents per `SearchBehavior`)
 * - `starts-with` / `ends-with` — at the start / end of the whole value
 * - `word-starts-with` / `word-ends-with` — at the start / end of any word
 *   (a word is a run of letters, digits and combining marks)
 * - `regex` — the term is a regular expression, tested against the RAW search value
 *   (`SearchBehavior` does not apply)
 */
export type SearchMatch =
  | 'contains'
  | 'equals'
  | 'starts-with'
  | 'word-starts-with'
  | 'ends-with'
  | 'word-ends-with'
  | 'regex';

/** Context passed to a component's `getSearchTermCallback`. */
export interface SearchTermContext {
  /** The term to prepare (as typed, after any `beforeSearchCallback` rewrite). */
  term: string;
  /** Which search the term is being prepared for: built-in matching, or the consumer's `searchCallback`. */
  target: 'internal' | 'callback';
  /** The current search behavior. */
  behavior: SearchBehavior;
  /** The current search match. */
  match: SearchMatch;
}

/**
 * What a `getSearchTermCallback` may return. `null` / `undefined` / `''` = no search.
 * Built-in search accepts a string or a RegExp; objects are for a custom `searchCallback`.
 */
export type PreparedSearchTerm = string | RegExp | Record<string, unknown> | null | undefined;

/**
 * One searchable record paired with its search value (the raw `searchValueMember` /
 * `getSearchValueCallback` output). `data` is the component's own record (an option,
 * a tree node, a row …) — domain-neutral; `item` is reserved for action items.
 */
export interface SearchEntry<T = any> {
  data: T;
  searchValue: unknown;
}

/**
 * The single argument of a component's `searchCallback(ctx)`. Components add
 * their component context (`controller`, `element`) on top.
 */
export interface SearchCallbackContext<T = any, TTerm = string | RegExp | Record<string, unknown>> {
  /**
   * The term to search for: the typed text (after any `beforeSearchCallback`
   * rewrite), or — when `getSearchTermCallback` is set — what it returned for
   * `target: 'callback'` (a string, RegExp or object; narrow it via `TTerm`).
   * There is no separate raw/prepared pair; the typed text is on the element.
   */
  term: TTerm;
  /** Aborted when a newer search supersedes this one — pass it to `fetch`. */
  signal: AbortSignal;
  /**
   * Every current item with its search value. Built on first access; each value is
   * computed once and the array is the SAME reference until the items change, so a
   * search engine can key its index on it.
   */
  readonly entries: ReadonlyArray<SearchEntry<T>>;
}

/** A term ready for built-in matching: nothing, normalized text, or a stateless RegExp. */
export type ActiveSearchTerm =
  | { readonly kind: 'none' }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'regex'; readonly re: RegExp };

/** A half-open `[start, end)` range of UTF-16 indices. */
export type SearchRange = [start: number, end: number];

/** Highlight ranges together with the text they index into (see `findHighlightRanges`). */
export interface HighlightResult {
  /** The text the ranges refer to — the input, NFC-normalized for text terms. Render THIS. */
  text: string;
  /** Sorted, non-overlapping, non-empty ranges into {@link HighlightResult.text}. */
  ranges: SearchRange[];
}
