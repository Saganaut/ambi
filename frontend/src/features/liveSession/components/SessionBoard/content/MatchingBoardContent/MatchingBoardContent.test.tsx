// Tests for the Matching board: tap-to-pair (hold a left card, tap a right
// card), unlink and steal semantics, the all-matched gating on Submit,
// submit/update resubmit-until-lock, image faces vs phrase faces, the
// per-connection count chips aggregated from the live leftId@rightId tally
// keys, the read-only projected view, and the own-outcome banner (shown on a
// scored round only — a collect-only round has no verdict). The session
// connection and the live read model are mocked, with the read model mutable
// per test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";

const h = vi.hoisted(() => ({
  sendAnswer: vi.fn(),
  query: {
    optionCounts: {} as Record<string, number>,
    results: null as unknown,
    viewerParticipantId: "p-me" as string | null,
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

import { MatchingBoardContent } from "./MatchingBoardContent";

// The wire shape: the right column arrives already de-correlated from the
// authored pairing (id-sorted server-side), so the test data lists it in that
// served order.
const slide: SlideView = {
  id: "el-0",
  contentType: "MATCHING",
  matching: {
    scored: true,
    left: [
      { id: "left-1", label: "Gondor" },
      { id: "left-2", label: "Rohan" },
    ],
    right: [
      { id: "right-a", label: "King Éomer" },
      { id: "right-z", label: "", imageUrl: "https://cdn.test/aragorn.png" },
    ],
  },
};

const renderContent = (
  mode: BoardQuestionMode = "prompt",
  interactive = true,
  slideOverride: SlideView = slide,
) => render(<MatchingBoardContent slide={slideOverride} mode={mode} interactive={interactive} />);

/**
 * Hold `leftName`, then connect it to `rightName`. An unpaired left card is
 * named "Pick up X"; a paired one "X, matched — pick back up".
 */
const pair = async (leftName: string, rightName: string) => {
  await userEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`^(Pick up ${leftName}|${leftName}, matched)`),
    }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: `Match ${leftName} with ${rightName}` }),
  );
};

describe("MatchingBoardContent pairing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("submits the matches map once every left card is paired", async () => {
    renderContent();
    // Nothing paired yet → Submit gated.
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();

    await pair("Gondor", "King Éomer");
    await pair("Rohan", "Card 2");
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "MatchingAnswer",
      matches: { "left-1": "right-a", "left-2": "right-z" },
    });
  });

  it("keeps Submit gated while any left card is unpaired", async () => {
    renderContent();

    await pair("Gondor", "King Éomer");

    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("right cards are inert until a left card is held", () => {
    renderContent();

    expect(screen.getByRole("button", { name: "King Éomer" })).toBeDisabled();
  });

  it("re-connecting the same pair unlinks it", async () => {
    renderContent();

    await pair("Gondor", "King Éomer");
    expect(screen.getByLabelText("Matched with Gondor")).toBeInTheDocument();

    await pair("Gondor", "King Éomer");
    expect(screen.queryByLabelText("Matched with Gondor")).not.toBeInTheDocument();
  });

  it("connecting a claimed right card steals it from the other left card", async () => {
    renderContent();

    await pair("Gondor", "King Éomer");
    await pair("Rohan", "King Éomer");

    // The badge now names Rohan, and Gondor is back to unpaired.
    expect(screen.getByLabelText("Matched with Rohan")).toBeInTheDocument();
    expect(screen.queryByLabelText("Matched with Gondor")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pick up Gondor" })).toBeInTheDocument();
  });

  it("allows resubmitting an adjusted map until the round locks", async () => {
    renderContent();

    await pair("Gondor", "King Éomer");
    await pair("Rohan", "Card 2");
    await userEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByText("Answer submitted ✓")).toBeInTheDocument();

    // The surface stays live after submitting: swap the pairing and re-send.
    await pair("Gondor", "Card 2");
    await pair("Rohan", "King Éomer");
    await userEvent.click(screen.getByRole("button", { name: "Update answer" }));

    expect(h.sendAnswer).toHaveBeenCalledTimes(2);
    expect(h.sendAnswer).toHaveBeenLastCalledWith("el-0", {
      answerType: "MatchingAnswer",
      matches: { "left-1": "right-z", "left-2": "right-a" },
    });
  });

  it("renders an image face when the card carries a resolved imageUrl", () => {
    // The card's accessible name lives on the button (empty alt keeps the
    // image from double-announcing), so the face is asserted structurally.
    const { container } = renderContent();

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.test/aragorn.png");
    // The image card has no phrase, so its button names itself by position.
    expect(screen.getByRole("button", { name: "Card 2" })).toBeInTheDocument();
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.getByRole("button", { name: "Pick up Gondor" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Submit answer" }),
    ).not.toBeInTheDocument();
  });
});

describe("MatchingBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 3 players linked Gondor→Éomer, 1 linked Rohan→Éomer, 2 linked Rohan→the
    // image card; a reconciled-away zero must not surface.
    h.query.optionCounts = {
      "left-1@right-a": 3,
      "left-2@right-a": 1,
      "left-2@right-z": 2,
      "left-1@right-z": 0,
    };
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("aggregates the leftId@rightId tally into per-connection count chips", () => {
    renderContent("liveResults", false);

    expect(screen.getByLabelText("Gondor → King Éomer: 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Rohan → King Éomer: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Rohan → Card 2: 2")).toBeInTheDocument();
    // The zero-count connection does not render a chip.
    expect(screen.queryByLabelText("Gondor → Card 2: 0")).not.toBeInTheDocument();
  });

  it("banners the viewer's own outcome at results on a scored round", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [
        { participantId: "p-me", choice: null, correct: true, points: 0, responseTimeMs: 5 },
      ],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.getByText("You matched every pair ✓")).toBeInTheDocument();
  });

  it("shows no verdict on a collect-only round", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [
        { participantId: "p-me", choice: null, correct: false, points: 0, responseTimeMs: 5 },
      ],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      terminal: false,
    };
    const collectOnly: SlideView = {
      ...slide,
      matching: { ...slide.matching, scored: false },
    };
    renderContent("results", false, collectOnly);

    expect(screen.queryByText(/Not quite/)).not.toBeInTheDocument();
    expect(screen.queryByText(/matched every pair/)).not.toBeInTheDocument();
  });
});
