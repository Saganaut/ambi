// Unit tests for BoardSubmitBar — the submit contract every answerable board
// leans on: which label the button wears, when the confirmation note appears,
// and the one difference that matters between the two shapes, namely whether a
// submitted answer keeps its button (re-submittable) or loses it (one-shot).
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BoardSubmitBar } from "./BoardSubmitBar";

describe("BoardSubmitBar", () => {
  it("submits from the idle button", async () => {
    const onSubmit = vi.fn();
    render(
      <BoardSubmitBar
        submitted={false}
        disabled={false}
        onSubmit={onSubmit}
        idleLabel="Submit answer"
        resubmitLabel="Update answer"
        submittedNote="Answer submitted ✓"
      />,
    );

    expect(screen.queryByText("Answer submitted ✓")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables the button on an incomplete answer", async () => {
    const onSubmit = vi.fn();
    render(
      <BoardSubmitBar
        submitted={false}
        disabled
        onSubmit={onSubmit}
        idleLabel="Submit answer"
        submittedNote="Answer locked in ✓"
      />,
    );

    const button = screen.getByRole("button", { name: "Submit answer" });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps a live button beside the note when re-submittable", async () => {
    const onSubmit = vi.fn();
    render(
      <BoardSubmitBar
        submitted
        disabled={false}
        onSubmit={onSubmit}
        idleLabel="Submit answer"
        resubmitLabel="Update answer"
        submittedNote="Answer submitted ✓"
      />,
    );

    expect(screen.getByText("Answer submitted ✓")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit answer" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Update answer" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("replaces the button with the note when one-shot", () => {
    render(
      <BoardSubmitBar
        submitted
        disabled={false}
        onSubmit={vi.fn()}
        idleLabel="Lock in answer"
        submittedNote="Answer locked in ✓">
        <span>Pick up to two.</span>
      </BoardSubmitBar>,
    );

    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Pick up to two.")).not.toBeInTheDocument();
  });

  it("renders children before the button", () => {
    render(
      <BoardSubmitBar
        submitted={false}
        disabled={false}
        onSubmit={vi.fn()}
        idleLabel="Lock in answer"
        submittedNote="Answer locked in ✓">
        <span>Pick up to two.</span>
      </BoardSubmitBar>,
    );

    expect(screen.getByText("Pick up to two.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock in answer" })).toBeInTheDocument();
  });

  it("keeps children alongside a submitted re-submittable answer", () => {
    render(
      <BoardSubmitBar
        submitted
        disabled={false}
        onSubmit={vi.fn()}
        idleLabel="Submit answer"
        resubmitLabel="Update answer"
        submittedNote="Answer submitted ✓">
        <span>Now tap a card on the right to match it.</span>
      </BoardSubmitBar>,
    );

    expect(screen.getByText("Answer submitted ✓")).toBeInTheDocument();
    expect(screen.getByText("Now tap a card on the right to match it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update answer" })).toBeInTheDocument();
  });
});
