// Unit tests for Alert — severity-to-role mapping, dismiss callback, title
// rendering, and icon override.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert } from "./Alert";

describe("Alert", () => {
  describe("role mapping", () => {
    it("uses role=alert for error", () => {
      render(<Alert severity='error'>Boom</Alert>);
      expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    });

    it("uses role=alert for warning", () => {
      render(<Alert severity='warning'>Heads up</Alert>);
      expect(screen.getByRole("alert")).toHaveTextContent("Heads up");
    });

    it("uses role=status for info", () => {
      render(<Alert severity='info'>FYI</Alert>);
      expect(screen.getByRole("status")).toHaveTextContent("FYI");
    });

    it("uses role=status for success", () => {
      render(<Alert severity='success'>Saved</Alert>);
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });
  });

  describe("title", () => {
    it("renders an optional title", () => {
      render(
        <Alert severity='info' title='Heads up'>
          The body text.
        </Alert>,
      );
      expect(screen.getByText("Heads up")).toBeInTheDocument();
      expect(screen.getByText("The body text.")).toBeInTheDocument();
    });

    it("renders body without a title", () => {
      render(<Alert severity='info'>Just the body</Alert>);
      expect(screen.getByText("Just the body")).toBeInTheDocument();
    });
  });

  describe("dismiss", () => {
    it("renders no dismiss button by default", () => {
      render(<Alert severity='info'>Body</Alert>);
      expect(
        screen.queryByRole("button", { name: "Dismiss" }),
      ).not.toBeInTheDocument();
    });

    it("renders a dismiss button when onDismiss is provided", () => {
      render(
        <Alert severity='info' onDismiss={vi.fn()}>
          Body
        </Alert>,
      );
      expect(
        screen.getByRole("button", { name: "Dismiss" }),
      ).toBeInTheDocument();
    });

    it("calls onDismiss when the dismiss button is clicked", async () => {
      const onDismiss = vi.fn();
      render(
        <Alert severity='warning' onDismiss={onDismiss}>
          Body
        </Alert>,
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Dismiss" }),
      );
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("icon override", () => {
    it("renders a custom icon when provided", () => {
      render(
        <Alert severity='info' icon={<svg data-testid='custom-icon' />}>
          Body
        </Alert>,
      );
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });
  });

  describe("severity class", () => {
    it("applies the severity className", () => {
      const { container } = render(
        <Alert severity='error'>Body</Alert>,
      );
      expect(container.firstChild).toHaveClass(/error/);
    });
  });
});
