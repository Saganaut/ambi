// Tests for the free-text board: a participant composes and sends one answer
// (overwriting on resubmit via an "Update answer" affordance), the maxLength cap
// clamps to the global validation bound, the projected view and liveResults note
// explain that answers stay hidden, and the revealed round aggregates distinct
// answers into a list (with correct highlights and an unmatched-answer
// disclosure) or a word cloud. The session connection and the live read model
// are mocked, with the read model mutable per test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";

const h = vi.hoisted(() => ({
  sendAnswer: vi.fn(),
  query: {
    phase: "SUBMIT" as string,
    results: null as unknown,
  },
}));

vi.mock(
  "@/features/liveSession/views/SessionPage/SessionConnectionContext",
  () => ({
    useSessionConnection: () => ({ sendAnswer: h.sendAnswer }),
  }),
);
vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => h.query,
}));

import { TextBoardContent } from "./TextBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "TEXT",
  text: { maxLength: 40 },
};

interface RevealOptions {
  slideId?: string;
  optionCounts?: Record<string, number>;
  outcomes?: {
    participantId: string;
    choice: string | null;
    correct: boolean;
    points: number;
    responseTimeMs: number;
  }[];
  correctOption?: string | null;
}

const reveal = ({
  slideId = "el-0",
  optionCounts = {},
  outcomes = [],
  correctOption = null,
}: RevealOptions) => ({
  slideId,
  optionCounts,
  outcomes,
  correctOption,
  scoreboard: [],
  drawings: null,
  terminal: false,
});

const renderContent = (
  mode: BoardQuestionMode = "prompt",
  interactive = true,
  slideView: SlideView = slide,
) =>
  render(
    <TextBoardContent slide={slideView} mode={mode} interactive={interactive} />,
  );

describe("TextBoardContent composing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.phase = "SUBMIT";
    h.query.results = null;
  });

  it("sends the typed answer and offers to update it", async () => {
    renderContent();
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Your answer"), "Paris");
    await userEvent.click(screen.getByRole("button", { name: "Send answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "TextAnswer",
      text: "Paris",
    });
    // The surface stays editable; the button flips to a resubmit affordance.
    expect(screen.getByLabelText("Your answer")).toHaveValue("Paris");
    expect(
      screen.getByRole("button", { name: "Update answer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Answer sent — you can update it.")).toBeInTheDocument();
  });

  it("Enter submits the answer", async () => {
    renderContent();
    await userEvent.type(screen.getByLabelText("Your answer"), "London{Enter}");

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "TextAnswer",
      text: "London",
    });
  });

  it("caps the input at the effective (min) length limit", () => {
    // Slide limit below the global bound wins.
    renderContent("prompt", true, { ...slide, text: { maxLength: 40 } });
    expect(screen.getByLabelText("Your answer")).toHaveAttribute("maxlength", "40");

    // A slide limit above the global bound clamps to the global 500.
    renderContent("prompt", true, { ...slide, text: { maxLength: 9000 } });
    expect(screen.getAllByLabelText("Your answer")[1]).toHaveAttribute(
      "maxlength",
      "500",
    );
  });

  it("shows a device instruction instead of the composer when not interactive", () => {
    renderContent("prompt", false);
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    expect(
      screen.getByText("Type your answer on your own device."),
    ).toBeInTheDocument();
  });

  it("notes the round is closed once submissions stop", () => {
    // A LOCKED round keeps mode "prompt" but no longer accepts input; the
    // device instruction would be stale, so the note flips to answers-are-in.
    h.query.phase = "LOCKED";
    renderContent("prompt", false);
    expect(
      screen.getByText("Answers are in — this round is closed."),
    ).toBeInTheDocument();

    // Same once responses are revealed (mode "liveResults", closed round).
    h.query.phase = "REVEAL_RESPONSES";
    renderContent("liveResults", false);
    expect(
      screen.getAllByText("Answers are in — this round is closed."),
    ).toHaveLength(2);
  });

  it("notes that answers stay hidden during liveResults", () => {
    renderContent("liveResults");
    expect(
      screen.getByText("Answers stay hidden until the host reveals the results."),
    ).toBeInTheDocument();
    // Still answerable while responses are hidden.
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
  });
});

describe("TextBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.results = null;
  });

  it("aggregates distinct answers and highlights the correct one", () => {
    h.query.results = reveal({
      optionCounts: { Paris: 2, London: 1 },
      outcomes: [
        { participantId: "p-1", choice: "Paris", correct: true, points: 10, responseTimeMs: 5 },
        { participantId: "p-2", choice: "Paris", correct: true, points: 10, responseTimeMs: 7 },
        { participantId: "p-3", choice: "London", correct: false, points: 0, responseTimeMs: 9 },
      ],
      correctOption: "Paris",
    });
    renderContent("results", false);

    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
    // Exactly one row is flagged correct — Paris.
    const correctBadge = screen.getByLabelText("Correct");
    expect(within(correctBadge.closest("li") as HTMLElement).getByText("Paris")).toBeInTheDocument();
    // Correct answer was matched, so no separate disclosure line.
    expect(screen.queryByText("Correct answer")).not.toBeInTheDocument();
  });

  it("discloses a correct answer nobody matched", () => {
    h.query.results = reveal({
      optionCounts: { Paris: 1, Rome: 1 },
      outcomes: [
        { participantId: "p-1", choice: "Paris", correct: false, points: 0, responseTimeMs: 5 },
        { participantId: "p-2", choice: "Rome", correct: false, points: 0, responseTimeMs: 6 },
      ],
      correctOption: "Berlin",
    });
    renderContent("results", false);

    expect(screen.getByText("Correct answer")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(screen.queryByLabelText("Correct")).not.toBeInTheDocument();
  });

  it("defaults a word-cloud slide to the cloud and never grades it", () => {
    h.query.results = reveal({
      optionCounts: { "Machine learning": 2, Robotics: 1 },
      // A word-cloud round is unscored; outcomes carry no correctness.
      outcomes: [],
      correctOption: null,
    });
    renderContent("results", false, {
      ...slide,
      text: { wordCloud: true },
    });

    // Cloud is the default display: the tokenized words appear, weighted by
    // count; the raw list rows do not.
    expect(
      screen.getByRole("button", { name: "machine: 2" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Machine learning")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Correct")).not.toBeInTheDocument();
  });

  it("switches between the list and the word cloud", async () => {
    h.query.results = reveal({ optionCounts: { Paris: 2, London: 1 } });
    renderContent("results", false);

    // List is the default for a scored slide.
    expect(screen.getByText("Paris")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Word cloud" }));
    expect(screen.queryByText("London")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "paris: 2" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByText("London")).toBeInTheDocument();
  });

  it("shows an empty state when nothing was submitted", () => {
    h.query.results = reveal({ optionCounts: {} });
    renderContent("results", false);

    expect(
      screen.getByText("No answers were submitted this round."),
    ).toBeInTheDocument();
  });
});
