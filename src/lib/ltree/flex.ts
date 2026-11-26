import type { Index } from "flexsearch";
import FlexSearch from "flexsearch";
import { normalizeSearchText } from "../vendor/core/search/normalize.js";

/**
 * The built-in search index. Text is folded by core `normalizeSearchText` (vendored, SPEC §12.11) —
 * the same folding as web-treeview, web-multiselect, the web-grid filter row and web-commandpalette:
 * lowercase, diacritics stripped, plus the letters with no Unicode decomposition
 * (`ł` → `l`, `ß` → `ss`, `æ` → `ae`, …). It is FlexSearch's `normalize` step, so it runs on
 * both the indexed values and the query; FlexSearch's own tokenisation (`full`), numeric
 * splitting and letter dedupe still run after it, unchanged. (Was FlexSearch's
 * `Charset.Normalize`, which left `ł` / `ß` / `æ` unfolded — REVIEW §4.)
 */
export function createSearchIndex(): Index {
	return new FlexSearch.Index({
		tokenize: "full", // Good for most use cases
		resolution: 9, // High resolution for better accuracy
		encoder: { normalize: (text: string) => normalizeSearchText(text) }
	});
}
