// Tests for MCQ answering on the board: a participant drafts a selection and
// submits (publishing an McqAnswer), the button is gated on having a selection,
// and the surface is read-only when not interactive. The session connection and
// useSession are mocked.
//
// TODO(migration): stubbed pending liveSession migration. The slice-backed
// round-trip (dispatch → interactiveSessionSlice → useSession → locked-in
// state, plus the submissionsClosing end-submit flush) is gone with the slice;
// those assertions are dropped until the slice is rebuilt. useSession is mocked
// to a static live view here.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { McqQuestion } from "@types/elements";

const h = vi.hoisted(() => ({ sendAnswer: vi.fn() }));

vi.mock("@/features/liveSession/views/SessionPage/SessionConnectionContext", () => ({
  useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
}));
vi.mock("@/features/liveSession/views/SessionPage/useSession", () => ({
  useSession: () => ({
    roundResult: null,
    myAnswer: null,
    submissionsClosing: null,
  }),
}));

import { McqBoardContent } from "./McqBoardContent";

const question = {
  kind: "McqQuestion",
  id: "el-0",
  options: [
    { id: "a", text: "Alpha" },
    { id: "b", text: "Bravo" },
  ],
  correctOptionIds: ["a"],
  allowMultipleSelect: false,
} as unknown as McqQuestion;

const renderContent = (interactive = true) =>
  render(
    <McqBoardContent question={question} mode='prompt' interactive={interactive} />,
  );

describe("McqBoardContent answering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the selected option", async () => {
    renderContent();

    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in answer" }),
    );

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      kind: "McqAnswer",
      optionIds: ["a"],
    });
  });

  it("does not submit with no selection (button disabled)", () => {
    renderContent();
    expect(
      screen.getByRole("button", { name: "Lock in answer" }),
    ).toBeDisabled();
  });

  it("is read-only when not interactive (projected / revealed view)", () => {
    renderContent(false);
    expect(
      screen.queryByRole("button", { name: "Lock in answer" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeDisabled();
  });
});
