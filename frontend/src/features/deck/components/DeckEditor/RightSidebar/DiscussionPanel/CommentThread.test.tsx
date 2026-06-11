// Behavioural tests for a single discussion thread: the whole thread is
// collapsible, resolved threads start collapsed with a badge, the conversation
// renders its comments (soft-deleted ones redacted), and reply / resolve /
// edit-delete wire through to their callbacks. The component is store-free
// (it takes a thread prop), so no provider is needed.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentThread } from "./CommentThread";
import type { CommentResponse, CommentThreadResponse } from "@deck/store/commentApi.gen";

const comment = (overrides: Partial<CommentResponse> = {}): CommentResponse => ({
  id: "c1",
  author: { userId: "u1", name: "Ann", avatar: undefined },
  body: "Opening comment",
  edited: false,
  deleted: false,
  ...overrides,
});

const thread = (overrides: Partial<CommentThreadResponse> = {}): CommentThreadResponse => ({
  id: "t1",
  slideId: "s1",
  status: "OPEN",
  comments: [comment()],
  ...overrides,
});

const handlers = () => ({
  onReply: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onSetStatus: vi.fn(),
});

const renderThread = (
  t: CommentThreadResponse,
  opts: { currentUserId?: string; canInteract?: boolean } = {},
) => {
  const h = handlers();
  render(
    <ul>
      <CommentThread
        thread={t}
        currentUserId={opts.currentUserId ?? "viewer"}
        canInteract={opts.canInteract ?? true}
        {...h}
      />
    </ul>,
  );
  return h;
};

describe("CommentThread", () => {
  it("renders the conversation and collapses/expands the whole thread", async () => {
    const user = userEvent.setup();
    renderThread(
      thread({
        comments: [comment(), comment({ id: "c2", body: "A reply" })],
      }),
    );

    expect(screen.getByText("Opening comment")).toBeInTheDocument();
    expect(screen.getByText("A reply")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse thread" }));

    expect(screen.queryByText("Opening comment")).not.toBeInTheDocument();
    expect(screen.getByText(/2 comments/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand thread" }));
    expect(screen.getByText("Opening comment")).toBeInTheDocument();
  });

  it("starts a resolved thread collapsed, with a badge and a reopen action", async () => {
    const user = userEvent.setup();
    const h = renderThread(thread({ status: "RESOLVED" }));

    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.queryByText("Opening comment")).not.toBeInTheDocument(); // collapsed

    await user.click(screen.getByRole("button", { name: "Expand thread" }));
    await user.click(screen.getByRole("button", { name: "Reopen" }));

    expect(h.onSetStatus).toHaveBeenCalledWith("t1", "OPEN");
  });

  it("resolves an open thread", async () => {
    const user = userEvent.setup();
    const h = renderThread(thread());

    await user.click(screen.getByRole("button", { name: "Resolve" }));
    expect(h.onSetStatus).toHaveBeenCalledWith("t1", "RESOLVED");
  });

  it("renders a soft-deleted comment with a redacted placeholder", () => {
    renderThread(thread({ comments: [comment({ deleted: true, body: undefined })] }));
    expect(screen.getByText("[comment deleted]")).toBeInTheDocument();
  });

  it("shows edit/delete only to the comment's author", () => {
    renderThread(thread(), { currentUserId: "viewer" });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("exposes edit/delete to the author and a reply flow", async () => {
    const user = userEvent.setup();
    const h = renderThread(thread(), { currentUserId: "u1" });

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reply" }));
    await user.type(screen.getByLabelText("Write a reply…"), "My reply");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(h.onReply).toHaveBeenCalledWith("t1", "My reply");
  });
});
