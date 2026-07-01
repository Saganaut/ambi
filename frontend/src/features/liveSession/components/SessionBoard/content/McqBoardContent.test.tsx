// Tests for MCQ answering on the board: a participant taps an option and submits
// (posting an McqAnswer), the button is gated on having a selection, and the
// surface is read-only when not interactive. The session connection and the live
// read model are mocked to a static prompt-phase view.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../store/liveSessionApi.gen";

const h = vi.hoisted(() => ({ sendAnswer: vi.fn() }));

vi.mock(
  "@/features/liveSession/views/SessionPage/SessionConnectionContext",
  () => ({
    useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
  }),
);
vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => ({
    optionCounts: {},
    results: null,
    phase: "SUBMIT",
    currentSlideId: "el-0",
  }),
}));

import { McqBoardContent } from "./McqBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "MCQ",
  options: [
    { id: "a", text: "Alpha" },
    { id: "b", text: "Bravo" },
  ],
};

const renderContent = (interactive = true) =>
  render(<McqBoardContent slide={slide} mode='prompt' interactive={interactive} />);

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
      answerType: "McqAnswer",
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
