// Unit tests for MarkerBadge — the view contract its wrappers rely on: the
// numbered disc, the optional label, the color custom property that tints the
// disc, and the content-driven switch between the bare-disc and pill shapes
// (the badge, not the caller, decides which one it is).
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkerBadge } from "./MarkerBadge";

describe("MarkerBadge", () => {
  describe("index", () => {
    it("renders the display index it is handed", () => {
      render(<MarkerBadge displayIndex={3} color="oklch(0.65 0.4 290)" />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("label", () => {
    it("renders the label when it carries text", () => {
      render(<MarkerBadge displayIndex={1} color="oklch(0.65 0.4 290)" label="North gate" />);
      expect(screen.getByText("North gate")).toBeInTheDocument();
    });

    it("trims the label before rendering it", () => {
      render(<MarkerBadge displayIndex={1} color="oklch(0.65 0.4 290)" label="  North gate  " />);
      expect(screen.getByText("North gate")).toBeInTheDocument();
    });

    it("renders no label element for a blank label", () => {
      const { container } = render(
        <MarkerBadge displayIndex={1} color="oklch(0.65 0.4 290)" label="   " />,
      );
      expect(container.querySelectorAll("span")).toHaveLength(2);
    });

    it("renders no label element when the label is absent", () => {
      const { container } = render(<MarkerBadge displayIndex={1} color="oklch(0.65 0.4 290)" />);
      expect(container.querySelectorAll("span")).toHaveLength(2);
    });
  });

  describe("color", () => {
    it("exposes the resolved color as the badge's custom property", () => {
      const { container } = render(<MarkerBadge displayIndex={1} color="#ff8800" />);
      const badge = container.firstElementChild as HTMLElement;
      expect(badge.style.getPropertyValue("--marker-badge-color")).toBe("#ff8800");
    });
  });

  describe("shape", () => {
    it("stays a bare disc with nothing but the number", () => {
      const { container } = render(<MarkerBadge displayIndex={1} color="#ff8800" />);
      expect(container.firstElementChild?.className).not.toContain("pill");
    });

    it("stays a bare disc when the only label is blank", () => {
      const { container } = render(<MarkerBadge displayIndex={1} color="#ff8800" label="   " />);
      expect(container.firstElementChild?.className).not.toContain("pill");
    });

    it("grows into a pill for a label", () => {
      const { container } = render(
        <MarkerBadge displayIndex={1} color="#ff8800" label="North gate" />,
      );
      expect(container.firstElementChild?.className).toContain("pill");
    });
  });

  describe("className", () => {
    it("keeps the caller's class alongside its own", () => {
      const { container } = render(
        <MarkerBadge displayIndex={1} color="#ff8800" className="wrapperHook" />,
      );
      expect(container.firstElementChild).toHaveClass("wrapperHook");
    });
  });
});
