// Covers the statement row's shared label field: focusing it opens the same
// full popover every other item bank gets (color, image, Delete), the label
// edit reports just the new text, removal lives in that menu rather than on a
// standalone button — and the row's drag track still commits a target.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ScaleItem } from "@deck/store/deckApi.gen";
import type { Identified } from "../_shared";
import { ScaleStatementEditable } from "./ScaleStatementEditable";

const statement = (overrides: Partial<ScaleItem> = {}): Identified<ScaleItem> => ({
  id: "stmt_a",
  label: "Team spirit",
  color: "oklch(0.65 0.4 290)",
  ...overrides,
});

const renderStatement = ({
  item = statement(),
  menuOpen = false,
  correctValue,
}: { item?: Identified<ScaleItem>; menuOpen?: boolean; correctValue?: number } = {}) => {
  const props = {
    statement: item,
    sortIndex: 1,
    menuOpen,
    canRemove: true,
    correctValue,
    min: 1,
    max: 5,
    tolerance: 0.4,
    leftLabel: "Strongly disagree",
    rightLabel: "Strongly agree",
    onMenuOpenChange: vi.fn(),
    onScheduleLabel: vi.fn(),
    onCommitCorrectValue: vi.fn(),
    onScheduleCorrectValue: vi.fn(),
    onClearCorrectValue: vi.fn(),
    onFlush: vi.fn(),
    onSetColor: vi.fn(),
    onSetImage: vi.fn(),
    onRemove: vi.fn(),
    openPicker: vi.fn(),
  };
  const view = render(<ScaleStatementEditable {...props} />);
  return {
    props,
    reopen: () => {
      view.rerender(<ScaleStatementEditable {...props} menuOpen />);
    },
  };
};

describe("ScaleStatementEditable", () => {
  it("opens the full color / image / Delete menu when the label is focused", async () => {
    const user = userEvent.setup();
    const { props, reopen } = renderStatement();

    await user.click(screen.getByRole("textbox"));

    expect(props.onMenuOpenChange).toHaveBeenCalledWith(true);

    reopen();

    expect(screen.getByRole("group", { name: "Option color" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Upload an image" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("schedules the label as the user types", async () => {
    const user = userEvent.setup();
    const { props } = renderStatement({ item: statement({ label: "" }) });

    await user.type(screen.getByRole("textbox"), "Pace");

    expect(props.onScheduleLabel).toHaveBeenLastCalledWith("Pace");
  });

  it("deletes the statement via the popover, not a standalone button", async () => {
    const user = userEvent.setup();
    const { props } = renderStatement({ menuOpen: true });

    expect(screen.queryByRole("button", { name: /remove statement/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(props.onRemove).toHaveBeenCalledOnce();
  });

  it("commits the target where the pointer leaves the drag track", async () => {
    const user = userEvent.setup();
    const { props } = renderStatement({ correctValue: 2 });

    const marker = screen.getByRole("slider", { name: "Correct answer for statement 2" });
    const track = marker.parentElement as HTMLElement;
    // jsdom lays nothing out and implements no pointer capture, so the track's
    // geometry and capture are stubbed: 200 px wide at the viewport's left
    // edge, i.e. clientX 150 is three quarters along (value 4 on a 1…5 scale).
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
    } as DOMRect);
    const captured = new Set<number>();
    track.setPointerCapture = (pointerId: number) => {
      captured.add(pointerId);
    };
    track.hasPointerCapture = (pointerId: number) => captured.has(pointerId);

    await user.pointer([
      { keys: "[MouseLeft>]", target: track, coords: { clientX: 100 } },
      { target: track, coords: { clientX: 150 } },
      { keys: "[/MouseLeft]", target: track, coords: { clientX: 150 } },
    ]);

    expect(props.onCommitCorrectValue).toHaveBeenCalledExactlyOnceWith(4);
  });
});
