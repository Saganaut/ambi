// Unit tests for the Btn component — covers rendering, interaction, and prop-driven
// className behavior. Variant / size / shape each map to a class in
// Buttons.module.css; the tests assert that class presence is the styling contract.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Btn } from "./Btn";

describe("Btn", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(<Btn>Click me</Btn>);
      expect(
        screen.getByRole("button", { name: "Click me" }),
      ).toBeInTheDocument();
    });

    it("defaults to type=button", () => {
      render(<Btn>Click me</Btn>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });

    it("applies a given type attribute", () => {
      render(<Btn type='submit'>Submit</Btn>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("is not disabled by default", () => {
      render(<Btn>Click me</Btn>);
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("interaction", () => {
    it("calls onClick when clicked", async () => {
      const handleClick = vi.fn();
      render(<Btn onClick={handleClick}>Click me</Btn>);
      await userEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", async () => {
      const handleClick = vi.fn();
      render(
        <Btn disabled onClick={handleClick}>
          Disabled
        </Btn>,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("disabled", () => {
    it("sets the disabled attribute when disabled is true", () => {
      render(<Btn disabled>Disabled</Btn>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("icon", () => {
    it("renders icon in a span when provided", () => {
      render(<Btn icon={<svg data-testid='test-icon' />}>With Icon</Btn>);
      const icon = screen.getByTestId("test-icon");
      expect(icon.closest("span")).toBeInTheDocument();
    });

    it("does not render an icon span when no icon is provided", () => {
      render(<Btn>No Icon</Btn>);
      expect(screen.getByRole("button").querySelector("span")).toBeNull();
    });

    it("sets data-icon-position when an icon is provided", () => {
      render(
        <Btn icon={<svg />} iconPosition='right'>
          Right icon
        </Btn>,
      );
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-icon-position",
        "right",
      );
    });

    it("does not set data-icon-position without an icon", () => {
      render(<Btn>No Icon</Btn>);
      expect(screen.getByRole("button")).not.toHaveAttribute(
        "data-icon-position",
      );
    });
  });

  describe("modifier classes", () => {
    it("defaults to the primary variant class", () => {
      render(<Btn>Default</Btn>);
      expect(screen.getByRole("button").className).toContain("primary");
    });

    it("applies the given variant as a class", () => {
      render(<Btn variant='error'>Error</Btn>);
      expect(screen.getByRole("button").className).toContain("error");
    });

    it("applies ghost as a fill class", () => {
      render(<Btn fill='ghost'>Ghost</Btn>);
      expect(screen.getByRole("button").className).toContain("ghost");
    });

    it("applies bordered as a fill class", () => {
      render(<Btn fill='bordered'>Outline</Btn>);
      expect(screen.getByRole("button").className).toContain("bordered");
    });

    it("defaults to the default fill class", () => {
      render(<Btn>Default fill</Btn>);
      expect(screen.getByRole("button").className).toContain("default");
    });

    it("combines variant and fill independently", () => {
      render(
        <Btn variant='error' fill='ghost'>
          Ghost error
        </Btn>,
      );
      const className = screen.getByRole("button").className;
      expect(className).toContain("error");
      expect(className).toContain("ghost");
    });

    it("defaults to the md size class", () => {
      render(<Btn>Default size</Btn>);
      expect(screen.getByRole("button").className).toContain("md");
    });

    it("applies the given size as a class", () => {
      render(<Btn size='lg'>Large</Btn>);
      expect(screen.getByRole("button").className).toContain("lg");
    });
  });

  describe("shape", () => {
    it("applies the given shape class", () => {
      render(<Btn shape='pill'>Pill</Btn>);
      expect(screen.getByRole("button").className).toContain("pill");
    });

    it("does not apply a shape class for default shape", () => {
      render(<Btn>Default shape</Btn>);
      expect(screen.getByRole("button").className).not.toContain("pill");
    });
  });
});
