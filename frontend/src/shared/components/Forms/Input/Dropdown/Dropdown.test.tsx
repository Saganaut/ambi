// Dropdown tests cover portalled rendering, selection, search, and dismissal.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dropdown } from "./Dropdown";

const OPTIONS = [
  { value: "exact", label: "An exact value" },
  { value: "range", label: "A range of values" },
];

interface ControlledDropdownProps {
  searchable?: boolean;
  multiple?: boolean;
  compact?: boolean;
}

const ControlledDropdown = ({
  searchable = false,
  multiple = false,
  compact = false,
}: ControlledDropdownProps) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <Dropdown
      id='grading'
      label='Accepted as correct'
      options={OPTIONS}
      value={value}
      onChange={setValue}
      searchable={searchable}
      multiple={multiple}
      compact={compact}
    />
  );
};

describe("Dropdown", () => {
  it("portals the listbox outside an overflow-constrained host", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div style={{ overflow: "hidden" }}>
        <ControlledDropdown />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(container).not.toContainElement(listbox);
  });

  it("selects a single option and closes the listbox", async () => {
    const user = userEvent.setup();
    render(<ControlledDropdown />);

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));
    await user.click(screen.getByRole("option", { name: "A range of values" }));

    expect(screen.getByRole("button", { name: "Accepted as correct" })).toHaveTextContent(
      "A range of values",
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Accepted as correct" }),
    );
  });

  it("filters searchable options and resets the query after dismissal", async () => {
    const user = userEvent.setup();
    render(<ControlledDropdown searchable />);

    const trigger = screen.getByRole("button", { name: "Accepted as correct" });
    await user.click(trigger);
    await user.type(screen.getByRole("textbox", { name: "Search options" }), "range");

    expect(screen.queryByRole("option", { name: "An exact value" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "A range of values" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    await user.click(trigger);
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(2);
  });

  it("dismisses after an outside press", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ControlledDropdown />
        <button type='button' onClick={vi.fn()}>
          Outside
        </button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));
    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps the portal inside a native dialog top layer", async () => {
    const user = userEvent.setup();
    render(
      <dialog open>
        <ControlledDropdown />
      </dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));

    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("listbox"));
  });

  it("inherits custom theme properties from the trigger", async () => {
    const user = userEvent.setup();
    render(
      <div style={{ "--text-secondary": "theme-text" } as React.CSSProperties}>
        <ControlledDropdown />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));

    const panel = screen.getByRole("listbox").parentElement;
    await waitFor(() => {
      expect(panel).toHaveStyle({ "--text-secondary": "theme-text" });
    });
  });

  it("opens and navigates options with listbox keys", async () => {
    const user = userEvent.setup();
    render(<ControlledDropdown />);

    const trigger = screen.getByRole("button", { name: "Accepted as correct" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");

    expect(document.activeElement).toBe(
      screen.getByRole("option", { name: "An exact value" }),
    );

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(
      screen.getByRole("option", { name: "A range of values" }),
    );

    await user.keyboard("{Enter}");
    expect(trigger).toHaveTextContent("A range of values");
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps a multiple listbox open while toggling options", async () => {
    const user = userEvent.setup();
    render(<ControlledDropdown multiple />);

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));
    await user.click(screen.getByRole("option", { name: "An exact value" }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "An exact value" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("right-aligns a compact panel with its trigger", async () => {
    const user = userEvent.setup();
    render(<ControlledDropdown compact />);

    await user.click(screen.getByRole("button", { name: "Accepted as correct" }));

    expect(screen.getByRole("listbox").parentElement).toHaveAttribute(
      "data-placement",
      "bottom-end",
    );
  });
});
