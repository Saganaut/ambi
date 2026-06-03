/**
 * Debounce a server-write commit. The hook keeps no state — it just buffers
 * the latest value and fires `commit(value)` after `delay` ms of quiet, or
 * immediately when `flush()` is called (typical use: on blur or before a
 * structural change). Unmount also flushes any pending value so quick edits
 * aren't dropped.
 *
 * Usage:
 *   const { schedule, flush } = useDebouncedCommit(commitFn, 500);
 *   onChange: (v) => { setLocal(v); schedule(v); }
 *   onBlur:   () => flush();
 */
import { useCallback, useEffect, useRef } from "react";

interface DebouncedCommit<T> {
  /** Schedule `commit(value)` to run after `delay` ms of quiet. */
  schedule: (value: T) => void;
  /** Flush the pending value immediately (no-op if nothing pending). */
  flush: () => void;
  /** Drop the pending value without committing. */
  cancel: () => void;
}

const useDebouncedCommit = <T,>(
  commit: (value: T) => void,
  delay = 500,
): DebouncedCommit<T> => {
  const pendingRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest commit fn in a ref so the timer always calls the freshest
  // closure without re-creating schedule/flush every render.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current !== null) {
      const { value } = pendingRef.current;
      pendingRef.current = null;
      commitRef.current(value);
    }
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  // Flush on unmount so in-flight edits aren't dropped when the slide changes.
  useEffect(() => flush, [flush]);

  return { schedule, flush, cancel };
};

export { useDebouncedCommit };
