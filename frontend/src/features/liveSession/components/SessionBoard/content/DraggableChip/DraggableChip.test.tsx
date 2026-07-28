// Unit tests for DraggableChip — the contract every drag-to-place board leans
// on: the chip stays a plain button for the tap flow (name, pressed state,
// click, disabled), it publishes the item's color as `--chip-accent` without
// swallowing the caller's own inline style or class, and it always carries the
// class that makes its children pointer-transparent (without which dnd-kit's
// pointer sensor refuses to arm). Rendered inside a DragDropProvider because
// `useDraggable` needs the drag context.
import { describe, it, expect, vi } from "vitest";
import { DragDropProvider } from "@dnd-kit/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import { DraggableChip } from "./DraggableChip";

const ACCENT = "#336699";

describe("DraggableChip", () => {
  it("renders its children inside a plain button", () => {
    render(
      <DragDropProvider>
        <DraggableChip itemId="sam" accent={ACCENT} disabled={false} onClick={vi.fn()}>
          <MarkerBadge displayIndex={1} color={ACCENT} label="Samwise" />
        </DraggableChip>
      </DragDropProvider>,
    );

    const chip = screen.getByRole("button", { name: "Samwise" });
    expect(chip).toHaveAttribute("type", "button");
    expect(chip).toBeEnabled();
    expect(screen.getByText("Samwise")).toBeInTheDocument();
  });

  it("publishes the accent and keeps the caller's own class and style", () => {
    render(
      <DragDropProvider>
        <DraggableChip
          itemId="sam"
          className="bankChipFromCaller"
          accent={ACCENT}
          disabled={false}
          ariaLabel="Samwise"
          style={{ left: "25%" }}
          onClick={vi.fn()}
        >
          <span>badge</span>
        </DraggableChip>
      </DragDropProvider>,
    );

    const chip = screen.getByRole("button", { name: "Samwise" });
    expect(chip.style.getPropertyValue("--chip-accent")).toBe(ACCENT);
    expect(chip.style.left).toBe("25%");
    expect(chip.className).toContain("bankChipFromCaller");
    // The pointer-events guard is the chip's own, not the caller's to remember.
    expect(chip.className).toContain("chip");
  });

  it("names itself and reports its pressed state for the tap flow", () => {
    render(
      <DragDropProvider>
        <DraggableChip
          itemId="sam"
          accent={ACCENT}
          disabled={false}
          ariaLabel="Samwise"
          ariaPressed
          onClick={vi.fn()}
        >
          <span aria-hidden="true">1</span>
        </DraggableChip>
      </DragDropProvider>,
    );

    expect(screen.getByRole("button", { name: "Samwise", pressed: true })).toBeInTheDocument();
  });

  it("calls onClick when tapped", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DragDropProvider>
        <DraggableChip
          itemId="sam"
          accent={ACCENT}
          disabled={false}
          ariaLabel="Samwise"
          onClick={onClick}
        >
          <span aria-hidden="true">1</span>
        </DraggableChip>
      </DragDropProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Samwise" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button, and with it the drag source, when told to", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DragDropProvider>
        <DraggableChip itemId="sam" accent={ACCENT} disabled ariaLabel="Samwise" onClick={onClick}>
          <span aria-hidden="true">1</span>
        </DraggableChip>
      </DragDropProvider>,
    );

    const chip = screen.getByRole("button", { name: "Samwise" });
    expect(chip).toBeDisabled();
    await user.click(chip);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards key presses for a placed chip's arrow-key nudging", async () => {
    const onKeyDown = vi.fn();
    const user = userEvent.setup();
    render(
      <DragDropProvider>
        <DraggableChip
          itemId="sam"
          accent={ACCENT}
          disabled={false}
          ariaLabel="Samwise"
          onClick={vi.fn()}
          onKeyDown={onKeyDown}
        >
          <span aria-hidden="true">1</span>
        </DraggableChip>
      </DragDropProvider>,
    );

    screen.getByRole("button", { name: "Samwise" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onKeyDown).toHaveBeenCalled();
  });
});
