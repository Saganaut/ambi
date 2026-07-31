// Covers ItemField's opt-in menu sections: a kind whose items carry no color
// or image leaves those props off and the popover narrows to Delete, while a
// fully-wired row still gets the Color swatches and the image controls.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemField } from "./ItemField";
import type { ItemFieldProps } from "./ItemField";

/** The always-required slice — the label field plus its controlled menu. */
const baseProps = (overrides: Partial<ItemFieldProps> = {}): ItemFieldProps => ({
  itemId: "item_1",
  label: "Kigali",
  displayIndex: 2,
  placeholder: "Item 2",
  maxLength: 80,
  open: true,
  onOpenChange: vi.fn(),
  canRemove: true,
  onScheduleLabel: vi.fn(),
  onFlush: vi.fn(),
  onRemove: vi.fn(),
  ...overrides,
});

const renderField = (overrides: Partial<ItemFieldProps> = {}) => {
  const props = baseProps(overrides);
  render(<ItemField {...props} />);
  return props;
};

/** Everything a color-and-image-bearing row passes on top of the base slice. */
const fullProps = (): Partial<ItemFieldProps> => ({
  color: "oklch(0.65 0.4 290)",
  onSetColor: vi.fn(),
  onSetImage: vi.fn(),
  openPicker: vi.fn(),
});

describe("ItemField", () => {
  it("hides the Color section when onSetColor is omitted", () => {
    renderField({ onSetImage: vi.fn(), openPicker: vi.fn() });

    expect(screen.queryByRole("group", { name: "Option color" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Custom color" })).not.toBeInTheDocument();
  });

  it("hides the image controls when onSetImage is omitted", () => {
    renderField({ color: "oklch(0.65 0.4 290)", onSetColor: vi.fn() });

    expect(screen.queryByRole("menuitem", { name: "Upload an image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Remove image" })).not.toBeInTheDocument();
  });

  it("still offers Delete when color and image are both hidden", async () => {
    const user = userEvent.setup();
    const props = renderField();

    expect(screen.queryByRole("group", { name: "Option color" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Upload an image" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(props.onRemove).toHaveBeenCalledOnce();
  });

  it("shows the Color and Image sections when both are supplied", () => {
    renderField(fullProps());

    expect(screen.getByRole("group", { name: "Option color" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Custom color" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Upload an image" })).toBeInTheDocument();
  });
});
