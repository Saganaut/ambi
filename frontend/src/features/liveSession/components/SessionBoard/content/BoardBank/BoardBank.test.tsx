// Unit tests for BoardBank — the unplaced-item row every drag-to-place board
// shares: it renders the board's own chips, swaps in the all-placed line when
// there are none left, shows the board's held prompt only while an item is
// held, and keeps both hints out of the way otherwise. Rendered inside a
// DragDropProvider because `useDroppable` needs the drag context.
import { describe, it, expect } from "vitest";
import { DragDropProvider } from "@dnd-kit/react";
import { render, screen } from "@testing-library/react";
import { BoardBank } from "./BoardBank";

const EMPTY_HINT = "All items placed.";
const HELD_HINT = "Now tap the plane to place it.";

const chips = (labels: string[]) =>
  labels.map((label) => (
    <button key={label} type="button">
      {label}
    </button>
  ));

describe("BoardBank", () => {
  it("renders the board's own chips", () => {
    render(
      <DragDropProvider>
        <BoardBank dropDisabled={false} emptyHint={EMPTY_HINT}>
          {chips(["Samwise", "Boromir"])}
        </BoardBank>
      </DragDropProvider>,
    );

    expect(screen.getByRole("button", { name: "Samwise" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Boromir" })).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_HINT)).not.toBeInTheDocument();
  });

  it("shows the empty hint once every item has been placed", () => {
    render(
      <DragDropProvider>
        <BoardBank dropDisabled={false} emptyHint={EMPTY_HINT}>
          {chips([])}
        </BoardBank>
      </DragDropProvider>,
    );

    expect(screen.getByText(EMPTY_HINT)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the held hint while an item is held, and not otherwise", () => {
    const { rerender } = render(
      <DragDropProvider>
        <BoardBank dropDisabled={false} emptyHint={EMPTY_HINT} heldHint={null}>
          {chips(["Samwise"])}
        </BoardBank>
      </DragDropProvider>,
    );

    expect(screen.queryByText(HELD_HINT)).not.toBeInTheDocument();

    rerender(
      <DragDropProvider>
        <BoardBank dropDisabled={false} emptyHint={EMPTY_HINT} heldHint={HELD_HINT}>
          {chips(["Samwise"])}
        </BoardBank>
      </DragDropProvider>,
    );

    expect(screen.getByText(HELD_HINT)).toBeInTheDocument();
  });

  it("shows both hints when the last held item is the one just placed", () => {
    render(
      <DragDropProvider>
        <BoardBank dropDisabled={false} emptyHint={EMPTY_HINT} heldHint={HELD_HINT}>
          {chips([])}
        </BoardBank>
      </DragDropProvider>,
    );

    expect(screen.getByText(EMPTY_HINT)).toBeInTheDocument();
    expect(screen.getByText(HELD_HINT)).toBeInTheDocument();
  });

  it("wraps the chips in the shared bank row", () => {
    render(
      <DragDropProvider>
        <BoardBank dropDisabled>{chips(["Samwise"])}</BoardBank>
      </DragDropProvider>,
    );

    const row = screen.getByRole("button", { name: "Samwise" }).parentElement;
    expect(row?.className).toContain("bank");
  });
});
