/** Wrap `fn` so only its first call runs — for unsubscribe/cleanup functions that may be called twice. Internal. */
export function once(fn: () => void): () => void {
  let isDone = false;
  return () => {
    if (isDone) return;
    isDone = true;
    fn();
  };
}
