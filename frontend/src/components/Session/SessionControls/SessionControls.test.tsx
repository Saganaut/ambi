// Tests for the host admin control bar: host-gating and that each button sends
// the right STOMP action. useSession is mocked so the test drives the component
// off a controllable session view — SessionControls reads everything (session
// fields, the live overlays, roundResult, viewerIsHost) from it, so no Redux
// store is needed.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RoundResultPayload } from "@/store/interactiveSessionSlice";
import type { InteractiveSessionResponse } from "@/store/AmbiApi";
import type { McqQuestion } from "@/types/elements";
import { mockFellowshipSession } from "@/utils/MockData";

const h = vi.hoisted(() => ({
  send: {
    sendStart: vi.fn(),
    sendEndSubmitPhase: vi.fn(),
    sendRevealNow: vi.fn(),
    sendNextRound: vi.fn(),
    sendPauseTimer: vi.fn(),
    sendResumeTimer: vi.fn(),
    sendEndInteractiveSession: vi.fn(),
    sendRestart: vi.fn(),
  },
  confirm: vi.fn(),
  sessionRef: { current: null as InteractiveSessionResponse | null },
  roundResultRef: { current: null as RoundResultPayload | null },
}));

vi.mock("@/pages/SessionPage/SessionConnectionContext", () => ({
  useSessionConnection: () => h.send,
}));
vi.mock("@/components/Common/ConfirmDialog/useConfirm", () => ({
  useConfirm: () => h.confirm,
}));
vi.mock("@/pages/SessionPage/useSession", () => ({
  useSession: () => {
    const interactiveSession = h.sessionRef.current;
    const viewerIsHost =
      !!interactiveSession?.viewerPlayerId &&
      interactiveSession.viewerPlayerId === interactiveSession.hostPlayerId;
    return {
      sessionId: "s1",
      interactiveSession,
      currentDeck: {},
      roundResult: h.roundResultRef.current,
      myAnswer: null,
      submissionsClosing: null,
      viewerIsHost,
    };
  },
}));

import { SessionControls } from "./SessionControls";

const mcq = {
  kind: "McqQuestion",
  id: "el-0",
  options: [],
  correctOptionIds: [],
} as unknown as McqQuestion;

// Built off the real mock session (a valid InteractiveSessionResponse), with
// the round/element/settings overridden for the scenario under test.
const baseSession = (
  overrides: Partial<InteractiveSessionResponse> = {},
): InteractiveSessionResponse => ({
  ...mockFellowshipSession,
  status: "IN_PROGRESS",
  phase: "SUBMIT",
  currentRound: 0,
  deckSnapshot: [mcq],
  settings: {
    ...mockFellowshipSession.settings,
    answerSubmissionMode: "SIMULTANEOUS",
    timePerQuestion: 30,
    showResponses: "ON_CLICK",
  },
  format: "PRESENTATION",
  viewerPlayerId: "host",
  hostPlayerId: "host",
  ...overrides,
});

const renderControls = () => render(<SessionControls />);

describe("SessionControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.confirm.mockResolvedValue(true);
    h.roundResultRef.current = null;
  });

  it("renders nothing for a non-host viewer", () => {
    h.sessionRef.current = baseSession({ viewerPlayerId: "someone-else" });
    const { container } = renderControls();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a Start button in the lobby and sends start", async () => {
    h.sessionRef.current = baseSession({ status: "LOBBY" });
    renderControls();
    // Only the start action shows in the lobby — no reveal control yet.
    expect(
      screen.queryByRole("button", { name: "Reveal answers" }),
    ).not.toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start session" });
    await userEvent.click(start);
    expect(h.send.sendStart).toHaveBeenCalled();
  });

  it("sends end-submit (the generic reveal) for the current element", async () => {
    h.sessionRef.current = baseSession();
    renderControls();
    await userEvent.click(
      screen.getByRole("button", { name: "Reveal answers" }),
    );
    expect(h.send.sendEndSubmitPhase).toHaveBeenCalledWith("el-0");
  });

  it("enables the live-results peek on a live ON_CLICK round and sends revealNow", async () => {
    h.sessionRef.current = baseSession();
    renderControls();
    const reveal = screen.getByRole("button", { name: "Show live results" });
    expect(reveal).not.toBeDisabled();
    await userEvent.click(reveal);
    expect(h.send.sendRevealNow).toHaveBeenCalledWith("el-0");
  });

  it("hides Next round during submit, shows it once the result lands (any mode)", async () => {
    // SIMULTANEOUS, still in the submit window → no Next round yet.
    h.sessionRef.current = baseSession();
    const { unmount } = renderControls();
    expect(
      screen.queryByRole("button", { name: "Next round" }),
    ).not.toBeInTheDocument();
    unmount();

    // Once the round result lands we're in the reveal window — Next round
    // appears even in SIMULTANEOUS, and clicking it advances.
    h.roundResultRef.current = { round: 0, element: mcq, playerResults: [] };
    h.sessionRef.current = baseSession();
    renderControls();
    const next = screen.getByRole("button", { name: "Next round" });
    await userEvent.click(next);
    expect(h.send.sendNextRound).toHaveBeenCalled();
  });

  it("confirms before restarting, then sends restart", async () => {
    h.sessionRef.current = baseSession();
    renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(h.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(h.send.sendRestart).toHaveBeenCalled();
    });
  });

  it("does not restart when the host cancels the confirm", async () => {
    h.confirm.mockResolvedValue(false);
    h.sessionRef.current = baseSession();
    renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Restart" }));
    await waitFor(() => {
      expect(h.confirm).toHaveBeenCalled();
    });
    expect(h.send.sendRestart).not.toHaveBeenCalled();
  });
});
