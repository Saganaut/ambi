/**
 * Run an async handler under a re-entrancy guard: while one call is in flight,
 * further calls are dropped. A `useState` busy flag can't do that on its own —
 * it only reaches the DOM a render later, so a double click (or a click plus a
 * keyboard activation) can start the work twice before the button is disabled.
 * The guard here is a ref set synchronously on entry, with the state flag kept
 * alongside it purely to drive the UI.
 *
 * `run` never rejects: a handler failure is captured on `error` (raw, so the
 * caller formats it with `extractErrorMessage`) and cleared when the next run
 * starts, or by `reset()`.
 *
 * Usage:
 *   const [save, { isRunning, error }] = useAsyncAction(async (item) => { … });
 *   onClick: () => { void save(item); }
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncActionState {
  /** True from the moment `run` is entered until its handler settles. */
  isRunning: boolean;
  /** The last rejection thrown by the handler, or null. */
  error: unknown;
  /** Clear a reported error without running the handler. */
  reset: () => void;
}

type AsyncAction<Args extends unknown[]> = readonly [
  run: (...args: Args) => Promise<void>,
  state: AsyncActionState,
];

const useAsyncAction = <Args extends unknown[]>(
  handler: (...args: Args) => Promise<void>,
): AsyncAction<Args> => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);

  // Keep the latest handler in a ref so `run` stays stable across renders.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args: Args) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setError(null);
    try {
      await handlerRef.current(...args);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err);
    } finally {
      // Always released, so a failed run can be retried rather than wedging
      // the control that fired it.
      runningRef.current = false;
      if (mountedRef.current) setIsRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return [run, { isRunning, error, reset }];
};

export { useAsyncAction };
