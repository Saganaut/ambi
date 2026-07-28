// Tests for the numeric board: a participant enters one number and sends it
// (overwriting on resubmit via an "Update answer" affordance), the input is
// gated on a finite in-range value, the projected view and liveResults note
// explain that responses stay hidden, and the revealed round bins the submitted
// values into a histogram with a correct-answer disclosure and the viewer's own
// outcome. The session connection and the live read model are mocked, with the
// read model mutable per test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";

const h = vi.hoisted(() => ({
  sendAnswer: vi.fn(),
  query: {
    phase: "SUBMIT" as string,
    results: null as unknown,
    viewerParticipantId: "me" as string | null,
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

import { NumberBoardContent } from "./NumberBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "NUMBER",
  number: { min: 0, max: 100, unit: "km" },
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
    <NumberBoardContent slide={slideView} mode={mode} interactive={interactive} />,
  );

describe("NumberBoardContent answering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.phase = "SUBMIT";
    h.query.results = null;
    h.query.viewerParticipantId = "me";
  });

  it("sends the entered number and offers to update it", async () => {
    renderContent();
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Your answer"), "42");
    await userEvent.click(screen.getByRole("button", { name: "Send answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "NumberAnswer",
      value: 42,
    });
    // The surface stays editable; the button flips to a resubmit affordance.
    expect(
      screen.getByRole("button", { name: "Update answer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Answer sent — you can update it."),
    ).toBeInTheDocument();
  });

  it("keeps the send button disabled for an out-of-range value", async () => {
    renderContent();
    await userEvent.type(screen.getByLabelText("Your answer"), "150");
    expect(screen.getByRole("button", { name: "Send answer" })).toBeDisabled();
  });

  it("shows the authored unit and bound hint", () => {
    renderContent();
    expect(screen.getByText("km")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a value from 0 km to 100 km."),
    ).toBeInTheDocument();
  });

  it("shows a device instruction instead of the input when not interactive", () => {
    renderContent("prompt", false);
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    expect(
      screen.getByText("Enter your answer on your own device."),
    ).toBeInTheDocument();
  });

  it("notes the round is closed once submissions stop", () => {
    // A LOCKED round keeps mode "prompt" but no longer accepts input.
    h.query.phase = "LOCKED";
    renderContent("prompt", false);
    expect(
      screen.getByText("Answers are in — this round is closed."),
    ).toBeInTheDocument();
  });

  it("notes that responses stay hidden during liveResults", () => {
    renderContent("liveResults");
    expect(
      screen.getByText("Responses stay hidden until the host reveals the results."),
    ).toBeInTheDocument();
    // Still answerable while responses are hidden.
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
  });
});

describe("NumberBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.phase = "REVEAL_RESULTS";
    h.query.results = null;
    h.query.viewerParticipantId = "me";
  });

  it("bins the submitted values into a histogram and discloses the correct answer", () => {
    h.query.results = reveal({
      // Values cluster in the 40–50 bucket; the domain is [0, 100].
      optionCounts: { "42.0": 2, "48.0": 1, "5.0": 1 },
      correctOption: "42.0",
    });
    renderContent("results", false);

    // The 40–50 bucket carries three responses (42 ×2, 48 ×1).
    expect(
      screen.getByLabelText("40 km to 50 km: 3"),
    ).toBeInTheDocument();
    // The 0–10 bucket carries the lone low guess.
    expect(screen.getByLabelText("0 km to 10 km: 1")).toBeInTheDocument();
    // The correct value is disclosed with its unit (in the caption below the
    // chart; it also marks the chart, so scope the assertion to the caption).
    const caption = screen.getByText("Correct answer").closest("p");
    expect(caption).toHaveTextContent("42 km");
    // Response count summary.
    expect(screen.getByText("4 responses")).toBeInTheDocument();
  });

  it("banners the viewer's own outcome", () => {
    h.query.results = reveal({
      optionCounts: { "42.0": 1 },
      outcomes: [
        { participantId: "me", choice: "42.0", correct: true, points: 10, responseTimeMs: 5 },
      ],
      correctOption: "42.0",
    });
    renderContent("results", false);

    expect(screen.getByText("You nailed it ✓")).toBeInTheDocument();
  });

  it("shows no correct disclosure for an unscored (collect-only) round", () => {
    h.query.results = reveal({
      optionCounts: { "12.0": 1, "34.0": 1 },
      correctOption: null,
    });
    renderContent("results", false);

    expect(screen.queryByText("Correct answer")).not.toBeInTheDocument();
    expect(screen.getByText("2 responses")).toBeInTheDocument();
  });

  it("shows an empty state when nothing was submitted", () => {
    h.query.results = reveal({ optionCounts: {} });
    renderContent("results", false);

    expect(
      screen.getByText("No responses were submitted this round."),
    ).toBeInTheDocument();
  });
});
