/**
 * Associates a tag name with the {@link LoggerBundle} its component was built
 * with, so `BlissElement` can produce instance-scoped loggers (`this.log`)
 * without the component threading the bundle through every element (SPEC §12.3).
 * `registerComponent()` populates it from the `logging` option; the element base
 * reads it lazily by `localName`. One map per page (shared by every copy of core),
 * so an element defined by one copy finds the bundle another copy registered.
 */
import type { LoggerBundle } from './create-loggers.js';
import { sharedState, sharedStateKey } from '../global/shared-state.js';

const byTag = (): Map<string, LoggerBundle<string>> =>
  sharedState(sharedStateKey('logger-bundles'), () => new Map<string, LoggerBundle<string>>());

/** Record the bundle a component registered under `tagName`. */
export function attachLoggerBundle(tagName: string, bundle: LoggerBundle<string>): void {
  byTag().set(tagName.toLowerCase(), bundle);
}

/** The bundle registered for `tagName`, if any. */
export function getLoggerBundle(tagName: string): LoggerBundle<string> | undefined {
  return byTag().get(tagName.toLowerCase());
}
