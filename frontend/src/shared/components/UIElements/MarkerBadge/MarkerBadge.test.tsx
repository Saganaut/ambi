// Unit tests for MarkerBadge — the view contract its wrappers rely on: the
// numbered disc, the optional label and thumbnail, and the color custom
// property that tints the disc.
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

  describe("image", () => {
    it("renders a decorative thumbnail when a source is given", () => {
      const { container } = render(
        <MarkerBadge
          displayIndex={1}
          color="oklch(0.65 0.4 290)"
          imageSrc="https://example.test/thumb.png"
        />,
      );

      const image = container.querySelector("img");
      expect(image).toHaveAttribute("src", "https://example.test/thumb.png");
      expect(image).toHaveAttribute("alt", "");
    });

    it("renders no image without a source", () => {
      const { container } = render(<MarkerBadge displayIndex={1} color="oklch(0.65 0.4 290)" />);
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });

    it("renders no image for a null source", () => {
      const { container } = render(
        <MarkerBadge displayIndex={1} color="oklch(0.65 0.4 290)" imageSrc={null} />,
      );
      expect(container.querySelector("img")).not.toBeInTheDocument();
    });
  });

  describe("color", () => {
    it("exposes the resolved color as the badge's custom property", () => {
      const { container } = render(<MarkerBadge displayIndex={1} color="#ff8800" />);
      const badge = container.firstElementChild as HTMLElement;
      expect(badge.style.getPropertyValue("--marker-badge-color")).toBe("#ff8800");
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
