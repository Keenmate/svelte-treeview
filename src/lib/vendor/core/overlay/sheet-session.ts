/**
 * `startSheetSession()` (SPEC §12.9): everything a full-screen sheet / modal needs while open, in one call —
 * page scroll lock, the virtual-keyboard inset, the phone Back entry — with ONE idempotent `end()` for every
 * close path. Web-multiselect, web-daterangepicker, web-grid and the `/menu` sheet assembled these three by
 * hand; web-commandpalette and web-dropzone forgot pieces (Back left the page; the page scrolled under the sheet).
 *
 * It also checks the panel really covers the screen: an ancestor with `transform` / `filter` / … traps a
 * `position: fixed` sheet in its own box — warned once per session through the element's logger, naming it.
 */
import { claimBackEntry } from './back-entry.js';
import { fitToVisibleViewport } from './keyboard-inset.js';
import { lockBodyScroll } from './scroll-lock.js';
import { describeContainingBlockProps, getFixedPositionOffsetParent } from '../positioning/containing-block.js';
import { coreLog } from '../logging/element-logger.js';

export interface SheetSessionOptions {
  /**
   * The phone Back gesture: close the sheet (`() => this.close('back')`). Call {@link SheetSession.rearmBack}
   * from inside it to go up one level instead (a submenu, a nested step) and keep the sheet open.
   * Omit for a sheet Back shouldn't close (rare).
   */
  backCallback?: () => void;
  /** Lock page scroll while open. Default `true`. */
  shouldLockScroll?: boolean;
  /** Track the virtual keyboard (`--km-keyboard-inset` on the panel). Default `true`. */
  shouldFitToVisibleViewport?: boolean;
  /** Warn once when an ancestor traps the fixed panel in its own box. Default `true`. */
  shouldCheckContainingBlock?: boolean;
  /** The element whose logger the warning goes through (default: the panel's shadow host, else the panel). */
  logSource?: Element;
}

export interface SheetSession {
  /** Re-arm the Back entry from inside `backCallback` (one level up; the sheet stays open). */
  rearmBack(): void;
  /** Undo everything (idempotent) — call it on EVERY close: ✕, Escape, a pick, Back, disconnect. */
  end(): void;
  /** `true` once {@link end} ran. */
  readonly isEnded: boolean;
}

/** Start the session for an open, mounted `panel`; returns its handle. SSR-safe (no-op handle). */
export function startSheetSession(panel: HTMLElement, opts: SheetSessionOptions = {}): SheetSession {
  const undo: (() => void)[] = [];
  let releaseBack: (() => void) | undefined;
  let isEnded = false;

  if (opts.shouldLockScroll ?? true) undo.push(lockBodyScroll());
  if (opts.shouldFitToVisibleViewport ?? true) undo.push(fitToVisibleViewport(panel));
  const claim = (): void => {
    if (!opts.backCallback || isEnded) return;
    releaseBack = claimBackEntry(() => opts.backCallback!());
  };
  claim();

  if ((opts.shouldCheckContainingBlock ?? true) && typeof window !== 'undefined' && panel.isConnected) {
    const offsetParent = getFixedPositionOffsetParent(panel);
    if (offsetParent !== window && offsetParent instanceof Element) {
      const root = panel.getRootNode();
      const source = opts.logSource ?? (root instanceof ShadowRoot ? root.host : panel);
      const id = offsetParent.id ? `#${offsetParent.id}` : '';
      const css = describeContainingBlockProps(offsetParent);
      coreLog(source, 'UI', 'ELEMENT').warn(
        `the full-screen sheet is trapped in <${offsetParent.tagName.toLowerCase()}${id}>${css ? ` (${css})` : ''} ` +
          'instead of covering the screen: an ancestor with transform / perspective / filter / backdrop-filter / ' +
          'will-change makes position: fixed relative to it. Move the component out of it or drop the property.',
      );
    }
  }

  return {
    rearmBack: claim,
    end() {
      if (isEnded) return;
      isEnded = true;
      releaseBack?.();
      releaseBack = undefined;
      for (const fn of undo.reverse()) fn();
    },
    get isEnded() {
      return isEnded;
    },
  };
}
