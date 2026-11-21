/**
 * The phone Back gesture for a full-screen sheet / modal (SPEC §12.9): one history entry (same
 * URL) while a sheet is open, so Back pops it and runs the sheet's `onBack` (close it, or go up
 * one level) instead of leaving the page. Every component's phone sheet uses it — the menu sheet
 * (/menu), web-grid's cell sheets, web-multiselect's and web-daterangepicker's full-screen / modal
 * panels — never its own `pushState()`.
 *
 * A sheet closed any other way gives its entry back with `history.back()`, deferred one task:
 * a sheet that opens right after (a menu re-opened on another row) adopts the entry instead of
 * racing a `back()` against a new `pushState()`. The listener is detached before that `back()`,
 * so the `popstate` it triggers closes nothing. Page-wide state (every copy of core), one
 * entry for the whole page: a newer claim takes it over (Back runs the newest `onBack`).
 *
 * Scroll: a sheet locks page scroll (`lockBodyScroll()`: body pinned, window scroll 0), so the
 * browser would record 0 for the page's entry and jump to the top on the way back. While an
 * entry is held the page's entry uses `history.scrollRestoration = 'manual'` (the scroll lock
 * restores the position itself); the page's own mode comes back once its entry is current again.
 * Claim before or after `lockBodyScroll()` — either order is safe.
 */
import { sharedState, sharedStateKey } from '../global/shared-state.js';

interface BackEntryState {
  isPushed: boolean;
  pendingBack: ReturnType<typeof setTimeout> | null;
  onBack: (() => void) | null;
  listener: (() => void) | null;
  /** The page's `history.scrollRestoration` while ours is `'manual'`; `null` = not overridden. */
  savedRestoration: ScrollRestoration | null;
}

const state = (): BackEntryState =>
  sharedState(sharedStateKey('back-entry'), () => ({ isPushed: false, pendingBack: null, onBack: null, listener: null, savedRestoration: null }));

function detach(s: BackEntryState): void {
  if (s.listener) window.removeEventListener('popstate', s.listener);
  s.listener = null;
}

/** Before the push: the page's entry (and so ours, which inherits it) restores no scroll. */
function suspendScrollRestoration(s: BackEntryState): void {
  if (!('scrollRestoration' in history) || s.savedRestoration !== null) return;
  s.savedRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
}

/**
 * Back on the page's entry: give it its own mode again — one task later. The browser restores the
 * traversed entry's scroll AFTER `popstate` and reads the mode then; resuming inside the handler
 * would let it apply the 0 recorded while the page was pinned. A claim meanwhile keeps 'manual'.
 */
function resumeScrollRestoration(s: BackEntryState): void {
  setTimeout(() => {
    if (s.savedRestoration === null || s.isPushed) return;
    history.scrollRestoration = s.savedRestoration;
    s.savedRestoration = null;
  }, 0);
}

/**
 * Hold the history entry for an open sheet: `onBack` runs when the user presses Back (the
 * entry is gone by then). Call it again from `onBack` to re-arm the entry (one submenu level
 * up, the sheet stays open). Returns the release (idempotent).
 */
export function claimBackEntry(onBack: () => void): () => void {
  if (typeof window === 'undefined' || typeof history === 'undefined') return () => {};
  const s = state();
  if (s.pendingBack !== null) {
    clearTimeout(s.pendingBack);
    s.pendingBack = null;
  }
  if (!s.isPushed) {
    suspendScrollRestoration(s);
    history.pushState({ kmBackEntry: true }, '');
    s.isPushed = true;
  }
  s.onBack = onBack;
  detach(s);
  const listener = (): void => {
    // Our entry is gone (Back): run the handler without popping again.
    detach(s);
    s.isPushed = false;
    resumeScrollRestoration(s);
    const back = s.onBack;
    s.onBack = null;
    back?.();
  };
  s.listener = listener;
  window.addEventListener('popstate', listener);
  let isReleased = false;
  return () => {
    if (isReleased) return;
    isReleased = true;
    if (s.onBack !== onBack) return; // re-claimed by a newer sheet, or Back already ran
    s.onBack = null;
    detach(s);
    if (!s.isPushed || s.pendingBack !== null) return;
    s.pendingBack = setTimeout(() => {
      s.pendingBack = null;
      if (s.onBack || !s.isPushed) return; // adopted meanwhile, or popped by Back
      s.isPushed = false;
      // Resume once the page's entry is current again (a re-claim meanwhile keeps 'manual').
      window.addEventListener('popstate', () => resumeScrollRestoration(s), { once: true });
      history.back();
    }, 0);
  };
}
