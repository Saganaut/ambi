// Tests for the Grid board: tap-to-place from the bank into cells, submit
// gated on all items placed, pick-back-up, live per-cell counts from the
// itemId@cell tally keys, and the read-only projected view. The session
// connection and the live read model are mocked, with the read model mutable
// per test.
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

import { GridBoardContent } from "./GridBoardContent";

const slide: SlideView = {
  id: "el-0",
  contentType: "GRID",
  grid: {
    rowLabels: ["Mammal", "Bird"],
    colLabels: ["Flies", "Walks"],
    items: [
      { id: "bat", label: "Bat" },
      { id: "pen", label: "Penguin" },
    ],
  },
};

const renderContent = (mode: BoardQuestionMode = "prompt", interactive = true) =>
  render(<GridBoardContent slide={slide} mode={mode} interactive={interactive} />);

/** Pick `chip` from the bank, then place it via the named cell target. */
const place = async (chip: string, cellName: RegExp) => {
  await userEvent.click(screen.getByRole("button", { name: chip }));
  await userEvent.click(screen.getByRole("button", { name: cellName }));
};

describe("GridBoardContent placing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = {};
    h.query.results = null;
    h.query.viewerParticipantId = "p-me";
  });

  it("places items from the bank and submits the full placement map", async () => {
    renderContent();
    // Nothing held yet → no place targets, and Submit is gated.
    expect(screen.queryByRole("button", { name: /Place in/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock in answer" })).toBeDisabled();

    await place("Bat", /Place in Mammal × Flies/);
    await place("Penguin", /Place in Bird × Walks/);
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "GridAnswer",
      placements: { bat: "0,0", pen: "1,1" },
    });
    expect(screen.getByText("Answer locked in ✓")).toBeInTheDocument();
  });

  it("submit stays gated until every item is placed", async () => {
    renderContent();

    await place("Bat", /Place in Mammal × Flies/);

    expect(screen.getByRole("button", { name: "Lock in answer" })).toBeDisabled();
    expect(h.sendAnswer).not.toHaveBeenCalled();
  });

  it("a placed chip can be picked back up and re-placed", async () => {
    renderContent();

    await place("Bat", /Place in Mammal × Flies/);
    await userEvent.click(
      screen.getByRole("button", { name: /Pick Bat back up from Mammal × Flies/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Place in Bird × Walks/ }));
    await place("Penguin", /Place in Mammal × Walks/);
    await userEvent.click(screen.getByRole("button", { name: "Lock in answer" }));

    expect(h.sendAnswer).toHaveBeenCalledWith("el-0", {
      answerType: "GridAnswer",
      placements: { bat: "1,1", pen: "0,1" },
    });
  });

  it("is read-only when not interactive (projected / host view)", () => {
    renderContent("prompt", false);

    expect(screen.queryByRole("button", { name: "Lock in answer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bat" })).not.toBeInTheDocument();
  });
});

describe("GridBoardContent results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.query.optionCounts = { "bat@0,0": 3, "pen@0,0": 1, "pen@1,1": 2, "bat@1,0": 0 };
    h.query.results = null;
  });

  it("sums the itemId@cell tally into per-cell counts once revealed", () => {
    renderContent("liveResults");

    // 0,0 holds bat(3)+pen(1)=4; 1,1 holds 2; zero-count keys don't render.
    expect(screen.getByLabelText("4 placements")).toBeInTheDocument();
    expect(screen.getByLabelText("2 placements")).toBeInTheDocument();
    expect(screen.queryByLabelText("0 placements")).not.toBeInTheDocument();
  });

  it("banners the viewer's own outcome at results", () => {
    h.query.results = {
      slideId: "el-0",
      outcomes: [{ participantId: "p-me", choice: null, correct: true, points: 0, responseTimeMs: 5 }],
      optionCounts: {},
      correctOption: null,
      scoreboard: [],
      terminal: false,
    };
    renderContent("results", false);

    expect(screen.getByText("You sorted everything correctly ✓")).toBeInTheDocument();
  });
});
