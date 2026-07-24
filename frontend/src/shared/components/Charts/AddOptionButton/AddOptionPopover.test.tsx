// AddOptionPopover keeps one portalled action tied to an option-owned anchor.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddOptionPopover } from "./AddOptionPopover";

describe("AddOptionPopover", () => {
  it("portals one action from the hovered anchor and closes after adding", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <AddOptionPopover anchor={<div aria-label="Option card">Option one</div>} onAdd={onAdd} />,
    );

    await user.hover(screen.getByLabelText("Option card"));

    const popover = await screen.findByRole("dialog", { name: "Add option" });
    const action = within(popover).getByRole("button", { name: "Add option" });
    expect(screen.getAllByRole("button", { name: "Add option" })).toHaveLength(1);
    expect(popover.parentElement).not.toBe(container);

    await user.hover(action);
    await user.click(action);

    expect(onAdd).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Add option" })).not.toBeInTheDocument();
    });
  });

  it("keeps anchor focus and preserves tab order into the portalled action", async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const anchorRef = vi.fn();
    render(
      <AddOptionPopover
        anchor={
          <div ref={anchorRef} aria-label="Option card" onFocus={onFocus}>
            <button type="button">Edit option</button>
          </div>
        }
        onAdd={vi.fn()}
      />,
    );

    await user.tab();

    const editor = screen.getByRole("button", { name: "Edit option" });
    expect(document.activeElement).toBe(editor);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(anchorRef).toHaveBeenCalledWith(screen.getByLabelText("Option card"));
    const popover = await screen.findByRole("dialog", { name: "Add option" });
    expect(document.activeElement).toBe(editor);

    await user.tab();

    expect(document.activeElement).toBe(
      within(popover).getByRole("button", { name: "Add option" }),
    );
  });

  it("lets a touch interaction edit an option field without opening the add action", async () => {
    const user = userEvent.setup();
    const onEditorFocus = vi.fn();
    render(
      <AddOptionPopover
        anchor={
          <div aria-label="Option card">
            <textarea aria-label="Edit option" onFocus={onEditorFocus} />
            <div aria-hidden="true">Option one</div>
          </div>
        }
        onAdd={vi.fn()}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Edit option" });
    await user.pointer([{ target: editor, keys: "[TouchA]" }]);

    expect(onEditorFocus).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(editor);
    expect(screen.queryByRole("dialog", { name: "Add option" })).not.toBeInTheDocument();

    await user.pointer([{ target: screen.getByLabelText("Option card"), keys: "[TouchA]" }]);

    expect(await screen.findByRole("dialog", { name: "Add option" })).toBeInTheDocument();
  });
});
