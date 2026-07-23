// Unit tests for ErrorBoundary — passthrough on the happy path, the custom
// `fallback` override, and `boundaryName` flowing into the logged context.
// (Skips console output during the intentional throws.)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { logger } from "@utils/logger";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("@utils/logger", () => ({
  logger: { error: vi.fn() },
}));

// Suppress React's own console.error noise for the intentional render throws.
const ThrowingChild = () => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders the provided fallback instead of ServerErrorPage when set", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("includes boundaryName in the logged error context", () => {
    render(
      <ErrorBoundary fallback={<p>Fallback</p>} boundaryName='TestBoundary'>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Unhandled React render error",
      expect.objectContaining({ boundaryName: "TestBoundary" }),
    );
  });
});
