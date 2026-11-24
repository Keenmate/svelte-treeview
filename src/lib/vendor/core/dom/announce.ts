/**
 * `announce()` (SPEC §12.23): screen-reader announcements for things the user should hear without focus
 * moving — "12 results", "Invalid date", "3 files added".
 *
 * ONE visually hidden live region per document and politeness (`polite` → `role="status"`, `assertive` →
 * `aria-live="assertive"`), created on first use at the end of `<body>` and shared by every component and
 * every bundled copy of core (found by its `data-km-announcer` attribute). The text is cleared and written a
 * moment later, so the same text twice in a row is read again; a newer announcement replaces one not yet
 * written. A modal's inert background skips the regions (`createFocusTrap`), so they keep talking while a
 * dialog is open. SSR / no document → no-op. The visible toast / message stays the component's.
 */

export type AnnouncePoliteness = 'polite' | 'assertive';

export interface AnnounceOptions {
  /** `polite` (default) waits for the reader to finish; `assertive` interrupts — errors only. */
  politeness?: AnnouncePoliteness;
  /** The document to announce in (default: the global one). */
  document?: Document;
}

/** The attribute that marks core's live regions (value = the politeness). @internal */
export const ANNOUNCER_ATTRIBUTE = 'data-km-announcer';

/** The pause between clearing and writing — long enough for readers to notice a change. @internal */
export const ANNOUNCE_DELAY_MS = 50;

const VISUALLY_HIDDEN =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;' +
  'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';

const pending = new WeakMap<Element, ReturnType<typeof setTimeout>>();

function getRegion(doc: Document, politeness: AnnouncePoliteness): HTMLElement {
  const existing = doc.body.querySelector<HTMLElement>(`:scope > [${ANNOUNCER_ATTRIBUTE}="${politeness}"]`);
  if (existing) return existing;
  const region = doc.createElement('div');
  region.setAttribute(ANNOUNCER_ATTRIBUTE, politeness);
  if (politeness === 'polite') region.setAttribute('role', 'status');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = VISUALLY_HIDDEN;
  doc.body.append(region);
  return region;
}

/** Have screen readers read `text` (empty → nothing). */
export function announce(text: string, opts: AnnounceOptions = {}): void {
  const doc = opts.document ?? (typeof document !== 'undefined' ? document : undefined);
  if (!doc?.body || !text) return;
  const region = getRegion(doc, opts.politeness === 'assertive' ? 'assertive' : 'polite');
  const previous = pending.get(region);
  if (previous !== undefined) clearTimeout(previous);
  region.textContent = '';
  pending.set(
    region,
    setTimeout(() => {
      pending.delete(region);
      region.textContent = text;
    }, ANNOUNCE_DELAY_MS),
  );
}
