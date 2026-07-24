// Tests for the Ranking board: tap-to-reorder from a per-round seeded shuffle,
// submit posting the on-screen ordered id list (RankingAnswer) and locking the
// surface, the read-only projected view, live aggregation of the itemId@position
// tally into a mean-ordered ranking, the results-mode correct-position reveal
// (and its null-safe skip), and the own-outcome banner. The session connection
// and the live read model are mocked, with the read model mutable per test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";

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

import { RankingBoardContent } from "./RankingBoardContent";

// Three items; the seeded shuffle is deterministic per slide id, so the starting
// on-screen order is stable across the test run (asserted below).
const slide: SlideView = {
  id: "el-0",
  contentType: "RANKING",
  ranking: {
    items: [
      { id: "gold", label: "Gold" },
      { id: "silver", label: "Silver" },
      { id: "bronze", label: "Bronze" },
    ],
  },
};

const renderContent = (mode: BoardQuestionMode = "prompt", interactive = true) =>
  render(<RankingBoardContent slide={slide} mode={mode} interactive={interactive} />);

/** The current on-screen order, read off the rendered list items. */
const currentOrder = (): string[] =>
  screen.getAllByRole("listitem").map((li) => {
    const label = li.querySelector("[class*='label']");
    return label?.textContent ?? "";
  });

describe("RankingBoardContent ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("renders every item and submits the on-screen ordered id list", async () => {
    renderContent();

    expect(currentOrder()).toHaveLength(3);
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("Bronze")).toBeInTheDocument();

    // Capture the seeded on-screen order, then map its labels back to ids.
    const onScreen = currentOrder();
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    const labelToId: Record<string, string> = { Gold: "gold", Silver: "silver", Bronze: "bronze" };
    expect(h.sendAnswer).toHaveBeenCalledTimes(1);
    const [slideId, payload] = h.sendAnswer.mock.calls[0] as [
      string,
      { answerType: string; orderedItemIds: string[] },
    ];
    expect(slideId).toBe("el-0");
    expect(payload.answerType).toBe("RankingAnswer");
    expect(payload.orderedItemIds).toEqual(onScreen.map((l) => labelToId[l]));
  });

  it("reorders via the move buttons and submits the new order", async () => {
    renderContent();

    const before = currentOrder();
    // Move the top item down one — the first two swap.
    await userEvent.click(screen.getByRole("button", { name: `Move ${before[0]} down` }));

    const after = currentOrder();
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);

    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));
    const labelToId: Record<string, string> = { Gold: "gold", Silver: "silver", Bronze: "bronze" };
    const [, payload] = h.sendAnswer.mock.calls[0] as [string, { orderedItemIds: string[] }];
    expect(payload.orderedItemIds).toEqual(after.map((l) => labelToId[l]));
  });

  it("locks the surface after submitting", async () => {
    renderContent();

    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
    // Move controls are gone once locked.
    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lock in answer" }),
    ).not.toBeInTheDocument();
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lock in answer" }),
    ).not.toBeInTheDocument();
    // The shuffled bank still renders.
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });
});

describe("RankingBoardContent aggregate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // gold ranked mostly first (mean ~0.2), silver mostly second (mean ~1),
    // bronze mostly last (mean ~2). A zero-count key must not disturb ordering.
    h.query.optionCounts = {
      "gold@0": 4,
      "gold@1": 1,
      "silver@1": 4,
      "silver@0": 1,
      "bronze@2": 5,
      "bronze@0": 0,
    };
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("orders rows ascending by mean submitted position", () => {
    renderContent("liveResults", false);

    const order = currentOrder();
    expect(order).toEqual(["Gold", "Silver", "Bronze"]);
    // The mean is shown 1-based for humans: gold = (0·4 + 1·1)/5 = 0.2 → avg 1.2.
    expect(screen.getByText("avg 1.2")).toBeInTheDocument();
  });

  it("no move controls or submit in the aggregate view", () => {
    renderContent("liveResults", true);
    expect(screen.queryByRole("button", { name: /Move/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lock in answer" }),
    ).not.toBeInTheDocument();
  });
});

describe("RankingBoardContent results reveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {
      "gold@0": 4,
      "gold@1": 1,
      "silver@1": 4,
      "silver@0": 1,
      "bronze@2": 5,
    };
    h.query.viewerParticipantId = "p-me";
  });

  it("splits correctOption and shows the correct-position badges", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [],
      optionCounts: {},
      correctOption: "gold,silver,bronze",
      scoreboard: [],
      terminal: false,
    };
    renderContent("results", false);

    // Each item is annotated with its correct 1-based position.
    expect(screen.getByLabelText("Correct position 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Correct position 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Correct position 3")).toBeInTheDocument();
  });

  it("does not crash and shows no badges when correctOption is null", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.queryByLabelText(/Correct position/)).not.toBeInTheDocument();
    // The aggregate ranking still renders.
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("banners the viewer's own outcome at results", () => {
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
    renderContent("results", true);

    expect(screen.getByText("You ranked everything correctly ✓")).toBeInTheDocument();
  });
});
