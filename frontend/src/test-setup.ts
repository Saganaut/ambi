// Vitest global test setup — extends expect with jest-dom matchers and registers DOM cleanup after each test.
import { expect, afterEach, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

expect.extend(matchers);
afterEach(cleanup);

// jsdom has no ResizeObserver; @dnd-kit constructs one at import time. A
// no-op stub is enough — no test asserts on resize behaviour.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
}
