// Unit tests for Pagination — covers page-button rendering, ellipsis
// collapse, callback wiring, ARIA, keyboard nav, and compact mode.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("returns null when there is at most one page", () => {
    const { container } = render(
      <Pagination page={0} pageCount={1} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one button per page when total fits in the slot budget", () => {
    render(<Pagination page={0} pageCount={5} onPageChange={vi.fn()} />);
    // All five page numbers visible.
    [1, 2, 3, 4, 5].forEach((n) => {
      expect(
        screen.getByRole("button", { name: `Go to page ${String(n)}` }),
      ).toBeInTheDocument();
    });
  });

  it("marks the active page with aria-current", () => {
    render(<Pagination page={2} pageCount={5} onPageChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Go to page 3" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("collapses long ranges with an ellipsis", () => {
    render(<Pagination page={5} pageCount={20} onPageChange={vi.fn()} />);
    // Two ellipses around the sibling range.
    const items = screen.getByRole("navigation").querySelectorAll("li");
    const labels = Array.from(items, (li) => li.textContent);
    expect(labels.filter((l) => l === "…").length).toBeGreaterThanOrEqual(1);
    // First page is always visible.
    expect(
      screen.getByRole("button", { name: "Go to page 1" }),
    ).toBeInTheDocument();
    // Last page is always visible.
    expect(
      screen.getByRole("button", { name: "Go to page 20" }),
    ).toBeInTheDocument();
  });

  it("fires onPageChange when a page number is clicked", async () => {
    const onChange = vi.fn();
    render(<Pagination page={0} pageCount={5} onPageChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Go to page 3" }),
    );
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("fires onPageChange via the next chevron", async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onPageChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("fires onPageChange via the prev chevron", async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} pageCount={5} onPageChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Previous page" }),
    );
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("disables prev on the first page", () => {
    render(<Pagination page={0} pageCount={5} onPageChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
  });

  it("disables next on the last page", () => {
    render(<Pagination page={4} pageCount={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("handles arrow-key navigation", async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} pageCount={5} onPageChange={onChange} />);
    // Focus a button inside the nav so the keydown bubbles up.
    const prev = screen.getByRole("button", { name: "Previous page" });
    prev.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(1);
    await userEvent.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("renders a compact label instead of page numbers when compact", () => {
    render(
      <Pagination page={2} pageCount={5} onPageChange={vi.fn()} compact />,
    );
    expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Go to page 3" }),
    ).not.toBeInTheDocument();
  });

  describe("unknown total (hasMore)", () => {
    it("renders Page X without a total when pageCount is omitted", () => {
      render(
        <Pagination page={2} hasMore onPageChange={vi.fn()} />,
      );
      expect(screen.getByText("Page 3")).toBeInTheDocument();
    });

    it("disables next when hasMore is false", () => {
      render(
        <Pagination page={3} hasMore={false} onPageChange={vi.fn()} />,
      );
      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    });

    it("advances page on next when hasMore is true", async () => {
      const onChange = vi.fn();
      render(
        <Pagination page={2} hasMore onPageChange={onChange} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Next page" }));
      expect(onChange).toHaveBeenCalledWith(3);
    });
  });

  it("uses the supplied ariaLabel", () => {
    render(
      <Pagination
        page={0}
        pageCount={3}
        onPageChange={vi.fn()}
        ariaLabel='Decks pagination'
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Decks pagination" }),
    ).toBeInTheDocument();
  });

  it("disables all page buttons when disabled", () => {
    render(
      <Pagination
        page={1}
        pageCount={5}
        onPageChange={vi.fn()}
        disabled
      />,
    );
    expect(
      screen.getByRole("button", { name: "Go to page 3" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
