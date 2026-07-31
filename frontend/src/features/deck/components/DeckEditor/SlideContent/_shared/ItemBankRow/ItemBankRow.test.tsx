// Covers ItemBankRow's label binding for item kinds whose persisted text uses a different field.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ItemBankRow } from "./ItemBankRow";

describe("ItemBankRow", () => {
  it("renders an explicit label instead of the placeable item's label", () => {
    render(
      <ItemBankRow
        item={{ id: "option-1", label: "stale label" }}
        label="Persisted option text"
        index={0}
        color="#336699"
        menuOpen={false}
        canRemove
        onMenuOpenChange={vi.fn()}
        onScheduleLabel={vi.fn()}
        onFlush={vi.fn()}
        onSetColor={vi.fn()}
        onSetImage={vi.fn()}
        onRemove={vi.fn()}
        openPicker={vi.fn()}
        scored
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("Persisted option text");
  });
});
