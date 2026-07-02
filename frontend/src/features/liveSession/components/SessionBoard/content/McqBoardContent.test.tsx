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
    { id: "c", text: "Charlie" },
  ],
};

// A slide variant with a maxSelections cap, spread over the base slide.
const cappedSlide = (max: number): SlideView => ({
  ...slide,
  answerSettings: { maxSelections: max },
});

const renderContent = (slideView: SlideView = slide, interactive = true) =>
  render(
    <McqBoardContent slide={slideView} mode='prompt' interactive={interactive} />,
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
      answerType: "McqAnswer",
      optionIds: ["a"],
    });
  });

  it("single-select (default) replaces the prior pick", async () => {
    renderContent();

    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    await userEvent.click(screen.getByRole("button", { name: "Bravo" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in answer" }),
    );

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "McqAnswer",
      optionIds: ["b"],
    });
  });

  it("multi-select submits every chosen option", async () => {
    renderContent(cappedSlide(0)); // 0 = unlimited

    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    await userEvent.click(screen.getByRole("button", { name: "Charlie" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in answer" }),
    );

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "McqAnswer",
      optionIds: ["a", "c"],
    });
  });

  it("blocks selecting past the cap, but the chosen ones can be swapped", async () => {
    renderContent(cappedSlide(2));

    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    await userEvent.click(screen.getByRole("button", { name: "Bravo" }));
    // At the cap of 2, the third option is disabled.
    expect(screen.getByRole("button", { name: "Charlie" })).toBeDisabled();

    // Deselecting Alpha frees a slot so Charlie becomes selectable again.
    await userEvent.click(screen.getByRole("button", { name: "Alpha" }));
    await userEvent.click(screen.getByRole("button", { name: "Charlie" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Lock in answer" }),
    );

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "McqAnswer",
      optionIds: ["b", "c"],
    });
  });

  it("does not submit with no selection (button disabled)", () => {
    renderContent();
    expect(
      screen.getByRole("button", { name: "Lock in answer" }),
    ).toBeDisabled();
  });

  it("is read-only when not interactive (projected / revealed view)", () => {
    renderContent(slide, false);
    expect(
      screen.queryByRole("button", { name: "Lock in answer" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeDisabled();
  });
});
