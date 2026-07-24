// AddOptionButton is a hover/focus-safe portal affordance: the trigger remains
// inside a chart/card while the actionable button escapes any clipping parent.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddOptionButton } from "./AddOptionButton";

describe("AddOptionButton", () => {
  it("portals the action and invokes it after hovering the trigger", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<AddOptionButton onClick={onClick} />);

    await user.hover(screen.getByRole("button", { name: "Add option" }));

    const popover = await screen.findByRole("dialog", { name: "Add option" });
    const action = within(popover).getByRole("button", { name: "Add option" });
    expect(popover.parentElement).not.toBe(container);

    await user.hover(action);
    await user.click(action);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("moves keyboard focus to the portalled action", async () => {
    const user = userEvent.setup();
    render(<AddOptionButton onClick={vi.fn()} />);

    await user.tab();

    const popover = await screen.findByRole("dialog", { name: "Add option" });
    expect(document.activeElement).toBe(
      within(popover).getByRole("button", { name: "Add option" }),
    );
  });
});
