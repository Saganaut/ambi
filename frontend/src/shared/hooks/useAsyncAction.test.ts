// Re-entrancy and lifecycle semantics of the shared async-action guard: calls
// made while one is in flight are dropped, the busy flag and error clear
// however the handler settles, and an unmount mid-flight updates nothing.
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncAction } from "./useAsyncAction";

/** A promise the test settles by hand, so a run can be held mid-flight. */
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("useAsyncAction", () => {
  it("drops a call made while the previous one is still in flight", async () => {
    const gate = deferred();
    const handler = vi.fn(() => gate.promise);
    const { result } = renderHook(() => useAsyncAction(handler));

    await act(async () => {
      // Both fire before React can re-render with the busy flag set — the
      // double-click case the guard exists for.
      void result.current[0]();
      void result.current[0]();
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.current[1].isRunning).toBe(true);

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.current[1].isRunning).toBe(false);
  });

  it("passes the caller's arguments through and runs again once settled", async () => {
    const handler = vi.fn((_id: string) => Promise.resolve());
    const { result } = renderHook(() => useAsyncAction(handler));

    await act(async () => {
      await result.current[0]("first");
    });
    await act(async () => {
      await result.current[0]("second");
    });

    expect(handler.mock.calls).toEqual([["first"], ["second"]]);
    expect(result.current[1].isRunning).toBe(false);
  });

  it("clears the busy flag and reports the error when the handler rejects", async () => {
    const boom = new Error("nope");
    const handler = vi.fn((): Promise<void> => Promise.reject(boom));
    const { result } = renderHook(() => useAsyncAction(handler));

    await act(async () => {
      // The rejection is captured, not re-thrown at the call site.
      await result.current[0]();
    });

    expect(result.current[1].isRunning).toBe(false);
    expect(result.current[1].error).toBe(boom);

    // A failed run must not wedge the guard.
    handler.mockImplementation(() => Promise.resolve());
    await act(async () => {
      await result.current[0]();
    });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.current[1].error).toBeNull();
    expect(result.current[1].isRunning).toBe(false);
  });

  it("clears a reported error on reset", async () => {
    const handler = vi.fn(() => Promise.reject(new Error("nope")));
    const { result } = renderHook(() => useAsyncAction(handler));

    await act(async () => {
      await result.current[0]();
    });
    expect(result.current[1].error).toBeInstanceOf(Error);

    act(() => {
      result.current[1].reset();
    });

    expect(result.current[1].error).toBeNull();
  });

  it("calls the latest handler without restarting the guard", async () => {
    const first = vi.fn(() => Promise.resolve());
    const second = vi.fn(() => Promise.resolve());
    const { result, rerender } = renderHook(
      ({ handler }: { handler: () => Promise<void> }) =>
        useAsyncAction(handler),
      { initialProps: { handler: first } },
    );

    rerender({ handler: second });
    await act(async () => {
      await result.current[0]();
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("updates no state when the caller unmounts mid-flight", async () => {
    const gate = deferred();
    const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result, unmount } = renderHook(() =>
      useAsyncAction(() => gate.promise),
    );

    await act(async () => {
      void result.current[0]();
    });
    unmount();
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    await waitFor(() => {
      expect(warn).not.toHaveBeenCalled();
    });
    warn.mockRestore();
  });
});
