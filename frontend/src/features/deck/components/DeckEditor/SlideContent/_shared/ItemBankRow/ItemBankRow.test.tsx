// Covers the bank row's placement branch — the one kind whose "is this scored?"
// state is a target rather than a value. The row owns the two affordances (the
// menu's Set/Clear target entry and the trailing check / question-mark toggle)
// but not their meaning: both delegate to the caller's onSetTarget /
// onClearTarget, so Axis can seed a centre point where Grid, having no centre
// cell, only arms the row. A click anywhere on the row arms it for the surface
// while the toggle itself must not, and the branch is purely additive — a
// ranking row still renders neither toggle nor selection.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemBankRow } from "./ItemBankRow";

/** The wiring every row shares, minus the kind-specific slice. */
const baseProps = () => ({
  item: { id: "target_a", label: "Rivendell" },
  index: 0,
  color: "oklch(0.65 0.4 290)",
  menuOpen: false,
  canRemove: true,
  onMenuOpenChange: vi.fn(),
  onScheduleLabel: vi.fn(),
  onFlush: vi.fn(),
  onSetColor: vi.fn(),
  onSetImage: vi.fn(),
  onRemove: vi.fn(),
  openPicker: vi.fn(),
  handleRef: vi.fn(),
  rootRef: vi.fn(),
  isDragging: false,
});

const renderPlacementRow = (
  hasTarget: boolean,
  overrides: { menuOpen?: boolean; meta?: string } = {},
) => {
  const props = {
    ...baseProps(),
    selected: false,
    onSelect: vi.fn(),
    onSetTarget: vi.fn(),
    onClearTarget: vi.fn(),
    menuOpen: overrides.menuOpen ?? false,
  };
  const { container } = render(
    <ItemBankRow
      type="placement"
      hasTarget={hasTarget}
      meta={overrides.meta === undefined ? undefined : <span>{overrides.meta}</span>}
      {...props}
    />,
  );
  return { ...props, row: container.firstElementChild };
};

describe("ItemBankRow (placement)", () => {
  it("offers to set a target on an unplaced row, leaving what that means to the caller", async () => {
    const user = userEvent.setup();
    const { onSetTarget, onClearTarget } = renderPlacementRow(false);

    const toggle = screen.getByRole("button", { name: "Set a target position for target 1" });
    await user.click(toggle);

    // The row never writes a target itself — Axis seeds a point here, Grid arms.
    expect(onSetTarget).toHaveBeenCalledOnce();
    expect(onClearTarget).not.toHaveBeenCalled();
  });

  it("offers to clear the target on a placed row", async () => {
    const user = userEvent.setup();
    const { onSetTarget, onClearTarget } = renderPlacementRow(true);

    const toggle = screen.getByRole("button", { name: "Clear the target position for target 1" });
    await user.click(toggle);

    // Unplacing keeps the row: it simply stops keying a right answer.
    expect(onClearTarget).toHaveBeenCalledOnce();
    expect(onSetTarget).not.toHaveBeenCalled();
  });

  it("leads the menu with Set target on an unplaced row, closing the menu as it fires", async () => {
    const user = userEvent.setup();
    const { onSetTarget, onMenuOpenChange } = renderPlacementRow(false, { menuOpen: true });

    await user.click(screen.getByRole("menuitem", { name: "Set target" }));

    expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    expect(onSetTarget).toHaveBeenCalledOnce();
  });

  it("leads the menu with Clear target on a placed row", async () => {
    const user = userEvent.setup();
    const { onClearTarget, onMenuOpenChange } = renderPlacementRow(true, { menuOpen: true });

    await user.click(screen.getByRole("menuitem", { name: "Clear target" }));

    expect(onMenuOpenChange).toHaveBeenCalledWith(false);
    expect(onClearTarget).toHaveBeenCalledOnce();
  });

  it("arms the row on a row click, but never on the toggle's own click", async () => {
    const user = userEvent.setup();
    const { row, onSelect, onSetTarget } = renderPlacementRow(false);

    if (!row) throw new Error("expected the row to render");
    await user.click(row);
    expect(onSelect).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Set a target position for target 1" }));
    // The toggle stops the click short of the row, so setting a target never
    // also arms the row for a placement the author did not ask for.
    expect(onSetTarget).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("renders the caller's trailing meta, the status the row itself knows nothing about", () => {
    renderPlacementRow(true, { meta: "Forest × Small" });

    expect(screen.getByText("Forest × Small")).toBeInTheDocument();
  });

  it("leaves a ranking row without a scoring toggle or a selection", () => {
    const { container } = render(<ItemBankRow type="ranking" {...baseProps()} />);

    // Ranking's answer IS the row order, so it carries neither affordance —
    // the placement branch is additive and must not reach it.
    expect(screen.queryByRole("button", { name: /target position/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /scorable/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /correct points/ })).not.toBeInTheDocument();
    expect(container.firstElementChild?.className).not.toContain("selected");
  });
});
