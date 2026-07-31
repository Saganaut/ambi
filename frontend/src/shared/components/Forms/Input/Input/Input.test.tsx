// Input tests cover the shared field-control contract and accessible message wiring.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import shared from "../Input.module.css";
import { Input } from "./Input";

describe("Input", () => {
  it("connects a generated id across the label, field, and error message", () => {
    render(<Input label='Deck name' errorMessage='Name is required.' />);

    const input = screen.getByRole("textbox", { name: "Deck name" });
    const message = screen.getByText("Name is required.");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", message.id);
    expect(input.id).not.toBe("");
  });

  it("uses the shared field chrome", () => {
    render(<Input ariaLabel='Deck name' />);

    expect(screen.getByRole("textbox", { name: "Deck name" })).toHaveClass(
      shared.fieldControl,
    );
  });
});
