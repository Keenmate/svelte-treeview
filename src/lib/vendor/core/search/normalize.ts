import type { SearchBehavior } from './types.js';

/** Letters `normalized` folds by hand — they have no Unicode decomposition (or, for `ς`,
 *  lowercase differently by position) so stripping combining marks alone misses them. */
const FOLD_EXTRA: Record<string, string> = {
  'ł': 'l', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'ħ': 'h', 'ı': 'i', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ς': 'σ',
  'ŧ': 't', 'þ': 'th', 'ĳ': 'ij', 'ŀ': 'l',
};
const FOLD_EXTRA_RE = /[łøđðħıßæœςŧþĳŀ]/g;

/**
 * Scripts whose combining marks are DIACRITICS (an accent on a letter that is still the same
 * letter for search: `č` ~ `c`). Elsewhere a mark is part of the letter — a Devanagari vowel
 * sign, a kana dakuten (`が` ≠ `か`) — and is kept.
 */
const DIACRITIC_BASE = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u;
const MARK = /\p{M}/u;

/**
 * Fold one code point under `behavior`. `afterDiacriticBase` says whether the last base
 * character (ignoring marks) was Latin / Greek / Cyrillic — a lone combining mark that NFC
 * couldn't compose belongs to it. Returns the folded string and the new base state.
 */
function foldCodePoint(ch: string, behavior: SearchBehavior, afterDiacriticBase: boolean): [string, boolean] {
  if (behavior === 'exact') return [ch, afterDiacriticBase];
  if (behavior === 'case-insensitive') {
    if (MARK.test(ch)) {
      // `İ` lowercases to `i` + combining dot; the dot is noise for a case-insensitive search.
      return [ch === '̇' && afterDiacriticBase ? '' : ch, afterDiacriticBase];
    }
    let lower = ch.toLowerCase();
    if (lower === 'i̇') lower = 'i'; // İ
    else if (lower === 'ς') lower = 'σ';
    else if (lower === 'ß') lower = 'ss'; // ß / ẞ: `Straße` ~ `STRASSE`
    return [lower, DIACRITIC_BASE.test(ch)];
  }
  // normalized: compatibility decomposition (ligatures `ﬁ` → `fi`, full-width `Ａ` → `A`,
  // a no-break space → a space), diacritics stripped, lowercased, hand folds. The hand folds
  // go first: NFKD would turn `ŀ` into `l·`.
  const extra = FOLD_EXTRA[ch.toLowerCase()];
  if (extra !== undefined) return [extra, true];
  let out = '';
  let base = afterDiacriticBase;
  for (const part of ch.normalize('NFKD')) {
    if (MARK.test(part)) {
      if (!base) out += part;
      continue;
    }
    base = DIACRITIC_BASE.test(part);
    out += part;
  }
  return [out.toLowerCase().replace(FOLD_EXTRA_RE, (c) => FOLD_EXTRA[c] ?? c), base];
}

/**
 * Fold `text` (already NFC) code point by code point, recording for every folded UTF-16 unit
 * the `[start, end)` of the source code point it came from — what highlighting maps match
 * ranges back with. {@link normalizeSearchText} is the folded string of this, so matching and
 * highlighting can never disagree.
 *
 * @internal shared by `normalizeSearchText` and `findHighlightRanges`.
 */
export function foldWithSourceMap(nfc: string, behavior: SearchBehavior): { folded: string; start: number[]; end: number[] } {
  let folded = '';
  const start: number[] = [];
  const end: number[] = [];
  let afterDiacriticBase = false;
  const isExact = behavior === 'exact';
  for (let i = 0; i < nfc.length; ) {
    const code = nfc.charCodeAt(i);
    if (code < 0x80) {
      // ASCII fast path — what foldCodePoint answers for it: lowercased (unless exact), a letter is a Latin base.
      const ch = nfc[i]!;
      folded += isExact ? ch : ch.toLowerCase();
      start.push(i);
      end.push(i + 1);
      afterDiacriticBase = (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
      i += 1;
      continue;
    }
    const ch = String.fromCodePoint(nfc.codePointAt(i)!);
    const [f, base] = foldCodePoint(ch, behavior, afterDiacriticBase);
    afterDiacriticBase = base;
    for (let k = 0; k < f.length; k++) {
      start.push(i);
      end.push(i + ch.length);
    }
    folded += f;
    i += ch.length;
  }
  return { folded, start, end };
}

/**
 * The standard search normalization, used by built-in search for both the item values and
 * the term — and exported so a custom search (`searchCallback`, `getSearchValueCallback`,
 * `getSearchTermCallback`, a FlexSearch encoder) can prepare text exactly the same way.
 *
 * - `normalized` (default) — lowercase, diacritics stripped: `Český` → `cesky`, `Łódź` → `lodz`;
 *   ligatures / full-width forms / no-break spaces folded (`ﬁ` → `fi`). Marks that are part of
 *   the letter in their script (Devanagari vowel signs, kana dakuten) are kept.
 * - `case-insensitive` — case folded: `Český` → `český`, `İstanbul` → `istanbul`, `ß` → `ss`
 * - `exact` — unchanged
 *
 * Every mode applies Unicode NFC first, so a composed `č` and a decomposed `c` + combining
 * caron compare equal.
 */
const ASCII_RE = /^[\x00-\x7f]*$/;

export function normalizeSearchText(text: string, behavior: SearchBehavior = 'normalized'): string {
  // ASCII is its own NFC / NFKD and has no marks: every behavior is a lowercase (or nothing) — ~100× faster.
  if (ASCII_RE.test(text)) return behavior === 'exact' ? text : text.toLowerCase();
  const nfc = text.normalize('NFC');
  if (behavior === 'exact') return nfc;
  return foldWithSourceMap(nfc, behavior).folded;
}
