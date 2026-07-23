// Unit tests for AsyncBoundary — composes ErrorBoundary + Suspense, defaults
// to the placeholder Loading/Error fallbacks, and accepts overrides.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AsyncBoundary } from "./AsyncBoundary";

vi.mock("@utils/logger", () => ({
  logger: { error: vi.fn() },
}));

const ThrowingChild = () => {
  throw new Error("boom");
};

describe("AsyncBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders children on the happy path", () => {
    render(
      <AsyncBoundary>
        <p>Loaded content</p>
      </AsyncBoundary>,
    );
    expect(screen.getByText("Loaded content")).toBeInTheDocument();
  });

  it("renders the default ErrorFallback when a child throws", () => {
    render(
      <AsyncBoundary>
        <ThrowingChild />
      </AsyncBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong loading this section.",
    );
  });

  it("renders a custom errorFallback when provided", () => {
    render(
      <AsyncBoundary errorFallback={<p>Custom error</p>}>
        <ThrowingChild />
      </AsyncBoundary>,
    );
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });

  it("renders the default LoadingFallback while a child suspends", () => {
    const pending = new Promise<never>(() => undefined);
    const SuspendingChild = () => {
      throw pending;
    };
    render(
      <AsyncBoundary>
        <SuspendingChild />
      </AsyncBoundary>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("clears a latched error when the key changes, since a new key remounts the boundary", () => {
    // Regression guard: ErrorBoundary never resets `hasError` on its own, and
    // TanStack Router doesn't remount a route component on param-only
    // navigation — callers must key AsyncBoundary by the identifier that
    // should invalidate a caught error (see the deck/session route usages).
    const ToggleThrow = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) throw new Error("boom");
      return <p>Recovered content</p>;
    };

    const { rerender } = render(
      <AsyncBoundary key="a">
        <ToggleThrow shouldThrow={true} />
      </AsyncBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <AsyncBoundary key="b">
        <ToggleThrow shouldThrow={false} />
      </AsyncBoundary>,
    );
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
