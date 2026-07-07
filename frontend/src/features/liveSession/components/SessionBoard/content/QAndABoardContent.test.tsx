// Tests for the Q&A board: a participant composes and sends questions (capped
// per player), the revealed list shows askers and host answers, the host can
// type an answer inline, and the word-cloud toggle re-renders the submissions.
// The session connection and the live read model are mocked, with the read
// model mutable per test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QAndAQuestionView, SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";

const h = vi.hoisted(() => ({
  sendAnswer: vi.fn(),
  sendHostAnswer: vi.fn(),
  query: {
    qAndAQuestions: [] as QAndAQuestionView[],
    participants: {} as Record<string, { displayName?: string }>,
    viewerParticipantId: "p-me" as string | null,
    viewerIsHost: false,
  },
}));

vi.mock(
  "@/features/liveSession/views/SessionPage/SessionConnectionContext",
  () => ({
    useSessionConnection: () => ({
      sendAnswer: h.sendAnswer,
      sendHostAnswer: h.sendHostAnswer,
    }),
  }),
);
vi.mock("@/features/liveSession/hooks/useLiveSessionQuery", () => ({
  useLiveSessionQuery: () => h.query,
}));

import { QAndABoardContent } from "./QAndABoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "Q_AND_A",
  qAndA: { moderated: false },
};

const question = (overrides: Partial<QAndAQuestionView>): QAndAQuestionView => ({
  id: "q-1",
  participantId: "p-other",
  text: "Why?",
  ...overrides,
});

const renderContent = (
  mode: BoardQuestionMode = "prompt",
  interactive = true,
  slideView: SlideView = slide,
) =>
  render(
    <QAndABoardContent slide={slideView} mode={mode} interactive={interactive} />,
  );

describe("QAndABoardContent composing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.qAndAQuestions = [];
    h.query.participants = {};
    h.query.viewerParticipantId = "p-me";
    h.query.viewerIsHost = false;
  });

  it("sends the typed question and echoes it locally", async () => {
    renderContent();

    await userEvent.type(screen.getByLabelText("Your question"), "What next?");
    await userEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "QAndAAnswer",
      question: "What next?",
    });
    // The compose box clears; the device's own echo lists the sent question.
    expect(screen.getByLabelText("Your question")).toHaveValue("");
    expect(screen.getByText("What next?")).toBeInTheDocument();
  });

  it("Enter sends; the button is disabled while the draft is blank", async () => {
    renderContent();
    expect(screen.getByRole("button", { name: "Send question" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Your question"), "Ship date?{Enter}");

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "QAndAAnswer",
      question: "Ship date?",
    });
  });

  it("closes the composer with a note once the per-player cap is reached", () => {
    h.query.qAndAQuestions = [
      question({ id: "q-1", participantId: "p-me" }),
      question({ id: "q-2", participantId: "p-me", text: "Also why?" }),
    ];
    renderContent("prompt", true, { ...slide, qAndA: { moderated: false, maxResponses: 2 } });

    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
    expect(screen.getByText(/used your 2 questions/)).toBeInTheDocument();
  });

  it("offers no composer when not interactive or after results", () => {
    renderContent("prompt", false);
    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();

    renderContent("results", true);
    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
  });
});

describe("QAndABoardContent revealed list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.qAndAQuestions = [
      question({ id: "q-1", participantId: "p-other", text: "Why though?" }),
      question({ id: "q-2", participantId: undefined, text: "Who asked?", hostAnswer: "Me." }),
    ];
    h.query.participants = { "p-other": { displayName: "Ada" } };
    h.query.viewerParticipantId = "p-me";
    h.query.viewerIsHost = false;
  });

  it("stays hidden in prompt mode and shows after reveal, with asker names", () => {
    renderContent("prompt");
    expect(screen.queryByText("Why though?")).not.toBeInTheDocument();

    renderContent("liveResults");
    expect(screen.getByText("Why though?")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    // An anonymised submission carries no participantId.
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("Me.")).toBeInTheDocument();
  });

  it("lets only the host type an answer, saving the trimmed text", async () => {
    renderContent("liveResults");
    expect(screen.queryByRole("button", { name: "Answer" })).not.toBeInTheDocument();

    h.query.viewerIsHost = true;
    renderContent("liveResults");
    await userEvent.click(screen.getByRole("button", { name: "Answer" }));
    await userEvent.type(screen.getByLabelText(/Answer to:/), "  Because.  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(h.sendHostAnswer).toHaveBeenCalledWith("el-0", "q-1", "Because.");
  });

  it("toggles to a word cloud of the submissions and back", async () => {
    renderContent("liveResults");

    await userEvent.click(screen.getByRole("button", { name: "Word cloud" }));
    expect(screen.queryByText("Why though?")).not.toBeInTheDocument();
    // "though" survives tokenization; "why"/"who" are stopwords.
    expect(screen.getByRole("button", { name: "though: 1" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByText("Why though?")).toBeInTheDocument();
  });
});
