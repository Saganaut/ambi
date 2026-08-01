// Covers the bank row's placement branch — the one kind whose "is this scored?"
// state is a target point rather than a value: the trailing toggle sets a
// centre-seeded target and clears it again, a click anywhere on the row arms it
// for the surface while the toggle itself must not, and the branch is purely
// additive — a ranking row still renders neither toggle nor selection. Grid
// shares the arming click but states its answer read-only: unplacing is the
// matrix's job, so the check is a status and never a control.
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

const renderPlacementRow = (hasTarget: boolean) => {
  const props = { ...baseProps(), selected: false, onSelect: vi.fn(), onSetTargetPosition: vi.fn() };
  const { container } = render(<ItemBankRow type="placement" hasTarget={hasTarget} {...props} />);
  return { ...props, row: container.firstElementChild };
};

const renderGridRow = (hasTarget: boolean) => {
  const props = { ...baseProps(), selected: false, onSelect: vi.fn() };
  const { container } = render(
    <ItemBankRow
      type="grid"
      hasTarget={hasTarget}
      meta={hasTarget ? <span>Forest × Small</span> : undefined}
      {...props}
    />,
  );
  return { ...props, row: container.firstElementChild };
};

describe("ItemBankRow (placement)", () => {
  it("offers to set a target on an unplaced row, seeding the surface's centre", async () => {
    const user = userEvent.setup();
    const { onSetTargetPosition } = renderPlacementRow(false);

    const toggle = screen.getByRole("button", { name: "Set a target position for target 1" });
    await user.click(toggle);

    expect(onSetTargetPosition).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
  });

  it("offers to clear the target on a placed row", async () => {
    const user = userEvent.setup();
    const { onSetTargetPosition } = renderPlacementRow(true);

    const toggle = screen.getByRole("button", { name: "Clear the target position for target 1" });
    await user.click(toggle);

    // Unplacing keeps the row: it simply stops keying a right answer.
    expect(onSetTargetPosition).toHaveBeenCalledWith(null);
  });

  it("arms the row on a row click, but never on the toggle's own click", async () => {
    const user = userEvent.setup();
    const { row, onSelect, onSetTargetPosition } = renderPlacementRow(false);

    if (!row) throw new Error("expected the row to render");
    await user.click(row);
    expect(onSelect).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Set a target position for target 1" }));
    // The toggle stops the click short of the row, so setting a target never
    // also arms the row for a placement the author did not ask for.
    expect(onSetTargetPosition).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
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

describe("ItemBankRow (grid)", () => {
  it("shows the answer-set check and the cell name on a placed row", () => {
    renderGridRow(true);

    expect(screen.getByRole("img", { name: "Answer set" })).toBeInTheDocument();
    expect(screen.getByText("Forest × Small")).toBeInTheDocument();
    // The check states the answer, it does not offer to undo it: a Grid item is
    // unplaced by dragging its chip off the matrix, never from the row.
    expect(screen.queryByRole("button", { name: "Answer set" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /target position/ })).not.toBeInTheDocument();
  });

  it("arms the row on a row click", async () => {
    const user = userEvent.setup();
    const { row, onSelect } = renderGridRow(false);

    if (!row) throw new Error("expected the row to render");
    await user.click(row);

    expect(onSelect).toHaveBeenCalledOnce();
  });
});
