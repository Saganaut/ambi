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

const ControlledDropdown = ({ searchable = false }: { searchable?: boolean }) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <Dropdown
      id='grading'
      label='Accepted as correct'
      options={OPTIONS}
      value={value}
      onChange={setValue}
      searchable={searchable}
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
});
