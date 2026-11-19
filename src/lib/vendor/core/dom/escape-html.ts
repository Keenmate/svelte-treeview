/**
 * Escape a value for HTML (`&`, `<`, `>`, `"`, `'`) — element content and quoted attribute values.
 * Takes any value, since page data often holds a number (a badge count): `null` / `undefined` → `''`,
 * anything else through `String()`.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]!);
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
