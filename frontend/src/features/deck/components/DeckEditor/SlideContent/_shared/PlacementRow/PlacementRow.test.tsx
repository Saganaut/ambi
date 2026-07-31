// Covers the row thumbnail's overlaid remove-image button: it appears only for
// a row that has an image, names itself after the row's noun and number, and
// clears the image without letting the click select the row.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { emptyImage, externalImage } from "@utils/image";
import { PlacementRow } from "./PlacementRow";
import type { PlacementRowProps } from "./PlacementRow";

const renderRow = (overrides: Partial<PlacementRowProps> = {}) => {
  const props: PlacementRowProps = {
    item: { id: "item_1", label: "Kigali" },
    index: 2,
    color: "oklch(0.65 0.4 290)",
    itemNoun: "Item",
    labelMaxLength: 60,
    menuOpen: false,
    canRemove: true,
    onMenuOpenChange: vi.fn(),
    onScheduleLabel: vi.fn(),
    onFlush: vi.fn(),
    onSetColor: vi.fn(),
    onSetImage: vi.fn(),
    onRemove: vi.fn(),
    openPicker: vi.fn(),
    ...overrides,
  };
  render(<PlacementRow {...props} />);
  return props;
};

describe("PlacementRow", () => {
  it("offers no remove-image button for a row without an image", () => {
    renderRow();

    expect(screen.queryByRole("button", { name: /remove item/i })).not.toBeInTheDocument();
  });

  it("names the remove-image button after the row's noun and number", () => {
    renderRow({
      item: { id: "item_1", label: "Kigali", image: externalImage("https://img.test/a.png") },
      itemNoun: "Target",
    });

    expect(screen.getByRole("button", { name: "Remove target 3 image" })).toBeInTheDocument();
  });

  it("clears the row's image without selecting the row", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const props = renderRow({
      item: { id: "item_1", label: "Kigali", image: externalImage("https://img.test/a.png") },
      onSelect,
    });

    await user.click(screen.getByRole("button", { name: "Remove item 3 image" }));

    expect(props.onSetImage).toHaveBeenCalledExactlyOnceWith(emptyImage());
    expect(onSelect).not.toHaveBeenCalled();
  });
});
